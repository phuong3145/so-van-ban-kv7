import fs from "fs";
import os from "os";
import path from "path";
import bcrypt from "bcryptjs";
import {
  RoleType,
  DocCategory,
  RolePermissionsMatrix,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_RECIPIENTS,
  DEFAULT_SIGNERS,
  PermissionKey,
} from "./constants";
import { connectDB } from "./mongodb";
import {
  UserModel,
  DocumentModel,
  CounterModel,
  SystemSettingModel,
} from "./models";

export interface UserDTO {
  id: string;
  username: string;
  fullName: string;
  role: RoleType;
  positionTitle: string;
  isInitialAdmin: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface DocumentDTO {
  id: string;
  category: DocCategory;
  year: number;
  stt: number;
  soHieu: string;
  ngayLaySo: string;
  trichYeu: string;
  noiGui: string;
  nguoiKy: string;
  nguoiLaySoId: string;
  nguoiLaySoName: string;
  ghiChu: string;
  trangThai: "CHO_DUYET" | "DA_BAN_HANH" | "THU_HOI";
  pdfFileId?: string;
  pdfFileName?: string;
  pdfViewLink?: string;
  pdfDownloadLink?: string;
  createdAt: string;
}

export interface SystemConfigDTO {
  unitCode: string;
  unitName: string;
  padZero: boolean;
  rolePermissions: RolePermissionsMatrix;
  recipients: string[];
  signers: string[];
  googleDriveConnected: boolean;
  googleDriveEmail?: string;
  googleDriveRootFolderId?: string;
  storageMode: "MONGODB" | "LOCAL_FALLBACK";
}

interface LocalDBShape {
  users: (UserDTO & { passwordHash: string })[];
  documents: DocumentDTO[];
  counters: Record<string, number>;
  settings: {
    unitCode: string;
    unitName: string;
    padZero: boolean;
    rolePermissions: RolePermissionsMatrix;
    recipients: string[];
    signers: string[];
    googleDriveRefreshToken?: string;
    googleDriveEmail?: string;
    googleDriveRootFolderId?: string;
  };
}

const LOCAL_DB_PATH = process.env.VERCEL
  ? path.join(os.tmpdir(), "so-van-ban-local-db.json")
  : path.join(process.cwd(), ".local-db.json");

function getInitialLocalDB(): LocalDBShape {
  const adminHash = bcrypt.hashSync("123456", 10);
  return {
    users: [
      {
        id: "admin-initial-01",
        username: "admin",
        passwordHash: adminHash,
        fullName: "Quản trị viên hệ thống",
        role: "ADMIN",
        positionTitle: "Quản trị viên",
        isInitialAdmin: true,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ],
    documents: [],
    counters: {},
    settings: {
      unitCode: "KV7",
      unitName: "Đơn vị KV7",
      padZero: true,
      rolePermissions: JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)),
      recipients: [...DEFAULT_RECIPIENTS],
      signers: [...DEFAULT_SIGNERS],
    },
  };
}

function readLocalDB(): LocalDBShape {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      const initData = getInitialLocalDB();
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initData, null, 2), "utf-8");
      return initData;
    }
    const raw = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as LocalDBShape;
    if (!parsed.users || parsed.users.length === 0) {
      const initData = getInitialLocalDB();
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initData, null, 2), "utf-8");
      return initData;
    }
    return parsed;
  } catch {
    return getInitialLocalDB();
  }
}

function writeLocalDB(data: LocalDBShape) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed writing local fallback DB:", e);
  }
}

export async function isMongoConfigured(): Promise<boolean> {
  if (!process.env.MONGODB_URI) return false;
  try {
    await connectDB();
    return true;
  } catch (err) {
    console.error("MongoDB connection failed, falling back to local store:", err);
    return false;
  }
}

export function formatSoHieu(
  stt: number,
  category: DocCategory,
  unitCode: string,
  padZero: boolean
): string {
  const numStr = padZero && stt < 10 ? `0${stt}` : `${stt}`;
  const cleanUnit = unitCode.trim();
  return cleanUnit ? `${numStr}/${category}-${cleanUnit}` : `${numStr}/${category}`;
}

export async function ensureSeedAndSettings(): Promise<SystemConfigDTO> {
  const useMongo = await isMongoConfigured();

  if (useMongo) {
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      const passwordHash = await bcrypt.hash("123456", 10);
      await UserModel.create({
        username: "admin",
        passwordHash,
        fullName: "Quản trị viên hệ thống",
        role: "ADMIN",
        positionTitle: "Quản trị viên",
        isInitialAdmin: true,
        isActive: true,
      });
    }

    let setting = await SystemSettingModel.findOne({ key: "GLOBAL_CONFIG" });
    if (!setting) {
      setting = await SystemSettingModel.create({
        key: "GLOBAL_CONFIG",
        unitCode: "KV7",
        unitName: "Đơn vị KV7",
        padZero: true,
        rolePermissions: DEFAULT_ROLE_PERMISSIONS,
        recipients: DEFAULT_RECIPIENTS,
        signers: DEFAULT_SIGNERS,
      });
    } else {
      let needSave = false;
      if (!setting.recipients || setting.recipients.length === 0) {
        setting.recipients = DEFAULT_RECIPIENTS;
        needSave = true;
      }
      if (!setting.signers || setting.signers.length === 0) {
        setting.signers = DEFAULT_SIGNERS;
        needSave = true;
      }
      if (needSave) {
        await setting.save();
      }
    }

    // Merge any new permissions safely
    const mergedPerms: RolePermissionsMatrix = JSON.parse(
      JSON.stringify(DEFAULT_ROLE_PERMISSIONS)
    );
    if (setting.rolePermissions) {
      for (const role of Object.keys(mergedPerms) as RoleType[]) {
        if (setting.rolePermissions[role]) {
          mergedPerms[role] = {
            ...mergedPerms[role],
            ...setting.rolePermissions[role],
          };
        }
      }
    }

    return {
      unitCode: setting.unitCode || "KV7",
      unitName: setting.unitName || "Đơn vị KV7",
      padZero: setting.padZero ?? true,
      rolePermissions: mergedPerms,
      recipients: setting.recipients?.length ? setting.recipients : DEFAULT_RECIPIENTS,
      signers: setting.signers?.length ? setting.signers : DEFAULT_SIGNERS,
      googleDriveConnected: Boolean(
        setting.googleDriveRefreshToken || process.env.GOOGLE_DRIVE_REFRESH_TOKEN
      ),
      googleDriveEmail: setting.googleDriveEmail || "",
      googleDriveRootFolderId: setting.googleDriveRootFolderId || "",
      storageMode: "MONGODB",
    };
  } else {
    const db = readLocalDB();
    return {
      ...db.settings,
      recipients: db.settings.recipients?.length
        ? db.settings.recipients
        : DEFAULT_RECIPIENTS,
      signers: db.settings.signers?.length ? db.settings.signers : DEFAULT_SIGNERS,
      googleDriveConnected: Boolean(
        db.settings.googleDriveRefreshToken || process.env.GOOGLE_DRIVE_REFRESH_TOKEN
      ),
      googleDriveEmail: db.settings.googleDriveEmail || "",
      googleDriveRootFolderId: db.settings.googleDriveRootFolderId || "",
      storageMode: "LOCAL_FALLBACK",
    };
  }
}

export async function hasPermission(
  role: RoleType,
  perm: PermissionKey
): Promise<boolean> {
  if (role === "ADMIN") return true;
  const config = await ensureSeedAndSettings();
  return Boolean(config.rolePermissions?.[role]?.[perm]);
}

export async function findUserByUsername(username: string): Promise<
  (UserDTO & { passwordHash: string }) | null
> {
  await ensureSeedAndSettings();
  const cleanUsername = username.trim().toLowerCase();
  const useMongo = await isMongoConfigured();

  if (useMongo) {
    const u = await UserModel.findOne({ username: cleanUsername });
    if (!u) return null;
    return {
      id: u._id.toString(),
      username: u.username,
      passwordHash: u.passwordHash,
      fullName: u.fullName,
      role: u.role,
      positionTitle: u.positionTitle || "",
      isInitialAdmin: u.isInitialAdmin,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
    };
  } else {
    const db = readLocalDB();
    const u = db.users.find((x) => x.username.toLowerCase() === cleanUsername);
    return u || null;
  }
}

export async function findUserById(id: string): Promise<
  (UserDTO & { passwordHash: string }) | null
> {
  await ensureSeedAndSettings();
  const useMongo = await isMongoConfigured();

  if (useMongo) {
    try {
      const u = await UserModel.findById(id);
      if (!u) return null;
      return {
        id: u._id.toString(),
        username: u.username,
        passwordHash: u.passwordHash,
        fullName: u.fullName,
        role: u.role,
        positionTitle: u.positionTitle || "",
        isInitialAdmin: u.isInitialAdmin,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
      };
    } catch {
      return null;
    }
  } else {
    const db = readLocalDB();
    return db.users.find((x) => x.id === id) || null;
  }
}

export async function listUsers(): Promise<UserDTO[]> {
  await ensureSeedAndSettings();
  const useMongo = await isMongoConfigured();

  if (useMongo) {
    const users = await UserModel.find().sort({ createdAt: 1 });
    return users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      positionTitle: u.positionTitle || "",
      isInitialAdmin: u.isInitialAdmin,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
    }));
  } else {
    const db = readLocalDB();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return db.users.map(({ passwordHash, ...rest }) => rest);
  }
}

export async function createUserAccount(input: {
  username: string;
  password: string;
  fullName: string;
  role: RoleType;
  positionTitle?: string;
}): Promise<UserDTO> {
  await ensureSeedAndSettings();
  const cleanUsername = input.username.trim().toLowerCase();
  if (!cleanUsername) throw new Error("Tên đăng nhập không được để trống");

  // Chỉ có 1 tài khoản ADMIN khởi tạo lúc đầu
  if (input.role === "ADMIN") {
    throw new Error(
      "Hệ thống chỉ cho phép duy nhất 1 tài khoản Admin khởi tạo ban đầu. Bạn có thể đổi tên đăng nhập/mật khẩu của tài khoản Admin đó trong mục Hồ sơ."
    );
  }

  const existing = await findUserByUsername(cleanUsername);
  if (existing) {
    throw new Error("Tên đăng nhập này đã tồn tại");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const useMongo = await isMongoConfigured();

  if (useMongo) {
    const created = await UserModel.create({
      username: cleanUsername,
      passwordHash,
      fullName: input.fullName.trim(),
      role: input.role,
      positionTitle: input.positionTitle?.trim() || "",
      isInitialAdmin: false,
      isActive: true,
    });
    return {
      id: created._id.toString(),
      username: created.username,
      fullName: created.fullName,
      role: created.role,
      positionTitle: created.positionTitle || "",
      isInitialAdmin: created.isInitialAdmin,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
    };
  } else {
    const db = readLocalDB();
    const newUser: UserDTO & { passwordHash: string } = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: cleanUsername,
      passwordHash,
      fullName: input.fullName.trim(),
      role: input.role,
      positionTitle: input.positionTitle?.trim() || "",
      isInitialAdmin: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    writeLocalDB(db);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...dto } = newUser;
    return dto;
  }
}

export async function updateUserAccount(
  targetId: string,
  updates: {
    username?: string;
    fullName?: string;
    password?: string;
    role?: RoleType;
    positionTitle?: string;
    isActive?: boolean;
  }
): Promise<UserDTO> {
  await ensureSeedAndSettings();
  const targetUser = await findUserById(targetId);
  if (!targetUser) throw new Error("Không tìm thấy tài khoản");

  // Không cho phép hạ quyền hoặc khóa tài khoản Admin duy nhất
  if (targetUser.isInitialAdmin || targetUser.role === "ADMIN") {
    if (updates.role && updates.role !== "ADMIN") {
      throw new Error("Không thể hạ cấp quyền của tài khoản Admin duy nhất");
    }
    if (updates.isActive === false) {
      throw new Error("Không thể khóa tài khoản Admin khởi tạo");
    }
  } else {
    // Tài khoản thường không được nâng lên ADMIN
    if (updates.role === "ADMIN") {
      throw new Error("Hệ thống chỉ có duy nhất 1 tài khoản Admin khởi tạo");
    }
  }

  let newUsername = targetUser.username;
  if (updates.username && updates.username.trim().toLowerCase() !== targetUser.username) {
    newUsername = updates.username.trim().toLowerCase();
    const dup = await findUserByUsername(newUsername);
    if (dup && dup.id !== targetId) {
      throw new Error("Tên đăng nhập mới đã được sử dụng bởi tài khoản khác");
    }
  }

  let newPasswordHash = targetUser.passwordHash;
  if (updates.password && updates.password.trim().length > 0) {
    newPasswordHash = await bcrypt.hash(updates.password.trim(), 10);
  }

  const useMongo = await isMongoConfigured();
  if (useMongo) {
    const updated = await UserModel.findByIdAndUpdate(
      targetId,
      {
        username: newUsername,
        fullName: updates.fullName !== undefined ? updates.fullName.trim() : targetUser.fullName,
        passwordHash: newPasswordHash,
        role: updates.role !== undefined ? updates.role : targetUser.role,
        positionTitle:
          updates.positionTitle !== undefined
            ? updates.positionTitle.trim()
            : targetUser.positionTitle,
        isActive: updates.isActive !== undefined ? updates.isActive : targetUser.isActive,
      },
      { new: true }
    );
    if (!updated) throw new Error("Cập nhật thất bại");
    return {
      id: updated._id.toString(),
      username: updated.username,
      fullName: updated.fullName,
      role: updated.role,
      positionTitle: updated.positionTitle || "",
      isInitialAdmin: updated.isInitialAdmin,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    };
  } else {
    const db = readLocalDB();
    const idx = db.users.findIndex((u) => u.id === targetId);
    if (idx === -1) throw new Error("Không tìm thấy tài khoản");
    db.users[idx] = {
      ...db.users[idx],
      username: newUsername,
      fullName: updates.fullName !== undefined ? updates.fullName.trim() : targetUser.fullName,
      passwordHash: newPasswordHash,
      role: updates.role !== undefined ? updates.role : targetUser.role,
      positionTitle:
        updates.positionTitle !== undefined
          ? updates.positionTitle.trim()
          : targetUser.positionTitle,
      isActive: updates.isActive !== undefined ? updates.isActive : targetUser.isActive,
    };
    writeLocalDB(db);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...dto } = db.users[idx];
    return dto;
  }
}

export async function deleteUserAccount(targetId: string): Promise<void> {
  await ensureSeedAndSettings();
  const targetUser = await findUserById(targetId);
  if (!targetUser) throw new Error("Không tìm thấy tài khoản");
  if (targetUser.isInitialAdmin || targetUser.role === "ADMIN") {
    throw new Error("Không thể xóa tài khoản Admin khởi tạo");
  }

  const useMongo = await isMongoConfigured();
  if (useMongo) {
    await UserModel.findByIdAndDelete(targetId);
  } else {
    const db = readLocalDB();
    db.users = db.users.filter((u) => u.id !== targetId);
    writeLocalDB(db);
  }
}

export async function updateSystemSettings(input: {
  unitCode?: string;
  unitName?: string;
  padZero?: boolean;
  rolePermissions?: RolePermissionsMatrix;
  recipients?: string[];
  signers?: string[];
}): Promise<SystemConfigDTO> {
  const current = await ensureSeedAndSettings();
  const useMongo = await isMongoConfigured();

  const updatedUnitCode =
    input.unitCode !== undefined ? input.unitCode.trim() : current.unitCode;
  const updatedUnitName =
    input.unitName !== undefined ? input.unitName.trim() : current.unitName;
  const updatedPadZero =
    input.padZero !== undefined ? input.padZero : current.padZero;
  const updatedPerms =
    input.rolePermissions !== undefined
      ? {
          ...input.rolePermissions,
          ADMIN: DEFAULT_ROLE_PERMISSIONS.ADMIN, // Đảm bảo Admin luôn full quyền
        }
      : current.rolePermissions;
  const updatedRecipients =
    input.recipients !== undefined ? input.recipients : current.recipients;
  const updatedSigners =
    input.signers !== undefined ? input.signers : current.signers;

  if (useMongo) {
    await SystemSettingModel.findOneAndUpdate(
      { key: "GLOBAL_CONFIG" },
      {
        unitCode: updatedUnitCode,
        unitName: updatedUnitName,
        padZero: updatedPadZero,
        rolePermissions: updatedPerms,
        recipients: updatedRecipients,
        signers: updatedSigners,
      },
      { upsert: true, new: true }
    );
    return {
      unitCode: updatedUnitCode,
      unitName: updatedUnitName,
      padZero: updatedPadZero,
      rolePermissions: updatedPerms,
      recipients: updatedRecipients,
      signers: updatedSigners,
      googleDriveConnected: current.googleDriveConnected,
      googleDriveEmail: current.googleDriveEmail,
      googleDriveRootFolderId: current.googleDriveRootFolderId,
      storageMode: "MONGODB",
    };
  } else {
    const db = readLocalDB();
    db.settings = {
      ...db.settings,
      unitCode: updatedUnitCode,
      unitName: updatedUnitName,
      padZero: updatedPadZero,
      rolePermissions: updatedPerms,
      recipients: updatedRecipients,
      signers: updatedSigners,
    };
    writeLocalDB(db);
    return {
      ...db.settings,
      googleDriveConnected: current.googleDriveConnected,
      googleDriveEmail: current.googleDriveEmail,
      googleDriveRootFolderId: current.googleDriveRootFolderId,
      storageMode: "LOCAL_FALLBACK",
    };
  }
}

export async function saveGoogleDriveCredentials(input: {
  refreshToken: string;
  email?: string;
  rootFolderId?: string;
}): Promise<void> {
  await ensureSeedAndSettings();
  const useMongo = await isMongoConfigured();
  if (useMongo) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = {
      googleDriveRefreshToken: input.refreshToken,
    };
    if (input.email !== undefined) update.googleDriveEmail = input.email;
    if (input.rootFolderId !== undefined)
      update.googleDriveRootFolderId = input.rootFolderId;
    await SystemSettingModel.findOneAndUpdate(
      { key: "GLOBAL_CONFIG" },
      update,
      { upsert: true }
    );
  } else {
    const db = readLocalDB();
    db.settings.googleDriveRefreshToken = input.refreshToken;
    if (input.email !== undefined) db.settings.googleDriveEmail = input.email;
    if (input.rootFolderId !== undefined)
      db.settings.googleDriveRootFolderId = input.rootFolderId;
    writeLocalDB(db);
  }
}

export async function getGoogleDriveCredentials(): Promise<{
  refreshToken: string;
  email: string;
  rootFolderId: string;
}> {
  await ensureSeedAndSettings();
  const useMongo = await isMongoConfigured();
  if (useMongo) {
    const setting = await SystemSettingModel.findOne({ key: "GLOBAL_CONFIG" });
    return {
      refreshToken:
        setting?.googleDriveRefreshToken ||
        process.env.GOOGLE_DRIVE_REFRESH_TOKEN ||
        "",
      email: setting?.googleDriveEmail || "",
      rootFolderId: setting?.googleDriveRootFolderId || "",
    };
  } else {
    const db = readLocalDB();
    return {
      refreshToken:
        db.settings.googleDriveRefreshToken ||
        process.env.GOOGLE_DRIVE_REFRESH_TOKEN ||
        "",
      email: db.settings.googleDriveEmail || "",
      rootFolderId: db.settings.googleDriveRootFolderId || "",
    };
  }
}

export async function addRecipientToSettings(newRecipient: string): Promise<string[]> {
  const clean = newRecipient.trim();
  if (!clean) throw new Error("Tên nơi nhận/gửi không được để trống");

  const current = await ensureSeedAndSettings();
  const exists = current.recipients.some(
    (r) => r.toLowerCase() === clean.toLowerCase()
  );
  if (exists) {
    return current.recipients;
  }

  const updatedList = [...current.recipients, clean];
  const updatedConfig = await updateSystemSettings({ recipients: updatedList });
  return updatedConfig.recipients;
}

export async function getCategoryCounters(
  year: number
): Promise<Record<DocCategory, { currentSeq: number; nextSoHieu: string; totalDocs: number }>> {
  const config = await ensureSeedAndSettings();
  const useMongo = await isMongoConfigured();
  const categories: DocCategory[] = ["KH", "BC", "TTr", "GM"];

  const result = {} as Record<
    DocCategory,
    { currentSeq: number; nextSoHieu: string; totalDocs: number }
  >;

  if (useMongo) {
    for (const cat of categories) {
      const key = `${cat}_${year}`;
      const counter = await CounterModel.findOne({ key });
      const highestDoc = await DocumentModel.findOne({ category: cat, year }).sort({
        stt: -1,
      });
      const totalDocs = await DocumentModel.countDocuments({ category: cat, year });
      const currentSeq = Math.max(counter?.seq || 0, highestDoc?.stt || 0);
      const nextStt = currentSeq + 1;
      result[cat] = {
        currentSeq,
        nextSoHieu: formatSoHieu(nextStt, cat, config.unitCode, config.padZero),
        totalDocs,
      };
    }
  } else {
    const db = readLocalDB();
    for (const cat of categories) {
      const key = `${cat}_${year}`;
      const docsInCat = db.documents.filter((d) => d.category === cat && d.year === year);
      const highestStt = docsInCat.reduce((max, d) => (d.stt > max ? d.stt : max), 0);
      const currentSeq = Math.max(db.counters[key] || 0, highestStt);
      const nextStt = currentSeq + 1;
      result[cat] = {
        currentSeq,
        nextSoHieu: formatSoHieu(nextStt, cat, config.unitCode, config.padZero),
        totalDocs: docsInCat.length,
      };
    }
  }

  return result;
}

export async function listDocuments(filter: {
  category?: DocCategory | "ALL";
  year?: number;
  search?: string;
}): Promise<DocumentDTO[]> {
  await ensureSeedAndSettings();
  const useMongo = await isMongoConfigured();

  if (useMongo) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};
    if (filter.category && filter.category !== "ALL") {
      query.category = filter.category;
    }
    if (filter.year) {
      query.year = filter.year;
    }
    if (filter.search && filter.search.trim()) {
      const regex = new RegExp(filter.search.trim(), "i");
      query.$or = [
        { soHieu: regex },
        { trichYeu: regex },
        { noiGui: regex },
        { nguoiKy: regex },
        { nguoiLaySoName: regex },
        { ghiChu: regex },
      ];
    }

    const docs = await DocumentModel.find(query).sort({ year: -1, stt: -1, createdAt: -1 });
    return docs.map((d) => ({
      id: d._id.toString(),
      category: d.category,
      year: d.year,
      stt: d.stt,
      soHieu: d.soHieu,
      ngayLaySo: d.ngayLaySo.toISOString(),
      trichYeu: d.trichYeu,
      noiGui: d.noiGui,
      nguoiKy: d.nguoiKy,
      nguoiLaySoId: d.nguoiLaySoId,
      nguoiLaySoName: d.nguoiLaySoName,
      ghiChu: d.ghiChu || "",
      trangThai: d.trangThai,
      pdfFileId: d.pdfFileId || "",
      pdfFileName: d.pdfFileName || "",
      pdfViewLink: d.pdfViewLink || "",
      pdfDownloadLink: d.pdfDownloadLink || "",
      createdAt: d.createdAt.toISOString(),
    }));
  } else {
    const db = readLocalDB();
    let list = [...db.documents];
    if (filter.category && filter.category !== "ALL") {
      list = list.filter((d) => d.category === filter.category);
    }
    if (filter.year) {
      list = list.filter((d) => d.year === filter.year);
    }
    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.soHieu.toLowerCase().includes(q) ||
          d.trichYeu.toLowerCase().includes(q) ||
          d.noiGui.toLowerCase().includes(q) ||
          d.nguoiKy.toLowerCase().includes(q) ||
          d.nguoiLaySoName.toLowerCase().includes(q) ||
          d.ghiChu.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.stt - a.stt;
    });
    return list;
  }
}

export async function createDocumentNumber(input: {
  category: DocCategory;
  ngayLaySo?: string;
  trichYeu: string;
  noiGui: string;
  nguoiKy: string;
  nguoiLaySoId: string;
  nguoiLaySoName: string;
  ghiChu?: string;
  customStt?: number;
  trangThai?: "CHO_DUYET" | "DA_BAN_HANH" | "THU_HOI";
}): Promise<DocumentDTO> {
  const config = await ensureSeedAndSettings();
  const useMongo = await isMongoConfigured();

  const dateObj = input.ngayLaySo ? new Date(input.ngayLaySo) : new Date();
  const year = dateObj.getFullYear();
  const counterKey = `${input.category}_${year}`;

  if (useMongo) {
    let assignedStt: number;

    if (input.customStt && input.customStt > 0) {
      const exists = await DocumentModel.findOne({
        category: input.category,
        year,
        stt: input.customStt,
      });
      if (exists) {
        throw new Error(
          `Số thứ tự ${input.customStt} của mục ${input.category} năm ${year} đã tồn tại (${exists.soHieu})!`
        );
      }
      assignedStt = input.customStt;
      const currentCounter = await CounterModel.findOne({ key: counterKey });
      if (!currentCounter || currentCounter.seq < assignedStt) {
        await CounterModel.findOneAndUpdate(
          { key: counterKey },
          { category: input.category, year, seq: assignedStt },
          { upsert: true }
        );
      }
    } else {
      // Đảm bảo counter đồng bộ với số lớn nhất hiện có
      const highestDoc = await DocumentModel.findOne({
        category: input.category,
        year,
      }).sort({ stt: -1 });
      const currentCounter = await CounterModel.findOne({ key: counterKey });
      const baseSeq = Math.max(currentCounter?.seq || 0, highestDoc?.stt || 0);

      const updatedCounter = await CounterModel.findOneAndUpdate(
        { key: counterKey },
        {
          $set: { category: input.category, year },
          $max: { seq: baseSeq },
        },
        { upsert: true, new: true }
      );

      const incCounter = await CounterModel.findOneAndUpdate(
        { key: counterKey },
        { $inc: { seq: 1 } },
        { new: true }
      );
      assignedStt = incCounter ? incCounter.seq : (updatedCounter?.seq || 0) + 1;
    }

    const soHieu = formatSoHieu(
      assignedStt,
      input.category,
      config.unitCode,
      config.padZero
    );

    const created = await DocumentModel.create({
      category: input.category,
      year,
      stt: assignedStt,
      soHieu,
      ngayLaySo: dateObj,
      trichYeu: input.trichYeu.trim(),
      noiGui: input.noiGui.trim(),
      nguoiKy: input.nguoiKy.trim(),
      nguoiLaySoId: input.nguoiLaySoId,
      nguoiLaySoName: input.nguoiLaySoName.trim(),
      ghiChu: input.ghiChu?.trim() || "",
      trangThai: input.trangThai || "DA_BAN_HANH",
    });

    return {
      id: created._id.toString(),
      category: created.category,
      year: created.year,
      stt: created.stt,
      soHieu: created.soHieu,
      ngayLaySo: created.ngayLaySo.toISOString(),
      trichYeu: created.trichYeu,
      noiGui: created.noiGui,
      nguoiKy: created.nguoiKy,
      nguoiLaySoId: created.nguoiLaySoId,
      nguoiLaySoName: created.nguoiLaySoName,
      ghiChu: created.ghiChu || "",
      trangThai: created.trangThai,
      pdfFileId: created.pdfFileId || "",
      pdfFileName: created.pdfFileName || "",
      pdfViewLink: created.pdfViewLink || "",
      pdfDownloadLink: created.pdfDownloadLink || "",
      createdAt: created.createdAt.toISOString(),
    };
  } else {
    const db = readLocalDB();
    let assignedStt: number;

    if (input.customStt && input.customStt > 0) {
      const exists = db.documents.find(
        (d) => d.category === input.category && d.year === year && d.stt === input.customStt
      );
      if (exists) {
        throw new Error(
          `Số thứ tự ${input.customStt} của mục ${input.category} năm ${year} đã tồn tại (${exists.soHieu})!`
        );
      }
      assignedStt = input.customStt;
      if ((db.counters[counterKey] || 0) < assignedStt) {
        db.counters[counterKey] = assignedStt;
      }
    } else {
      const highestStt = db.documents
        .filter((d) => d.category === input.category && d.year === year)
        .reduce((max, d) => (d.stt > max ? d.stt : max), 0);
      const currentSeq = Math.max(db.counters[counterKey] || 0, highestStt);
      assignedStt = currentSeq + 1;
      db.counters[counterKey] = assignedStt;
    }

    const soHieu = formatSoHieu(
      assignedStt,
      input.category,
      config.unitCode,
      config.padZero
    );

    const newDoc: DocumentDTO = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category: input.category,
      year,
      stt: assignedStt,
      soHieu,
      ngayLaySo: dateObj.toISOString(),
      trichYeu: input.trichYeu.trim(),
      noiGui: input.noiGui.trim(),
      nguoiKy: input.nguoiKy.trim(),
      nguoiLaySoId: input.nguoiLaySoId,
      nguoiLaySoName: input.nguoiLaySoName.trim(),
      ghiChu: input.ghiChu?.trim() || "",
      trangThai: input.trangThai || "DA_BAN_HANH",
      createdAt: new Date().toISOString(),
    };

    db.documents.push(newDoc);
    writeLocalDB(db);
    return newDoc;
  }
}

export async function findDocumentById(id: string): Promise<DocumentDTO | null> {
  await ensureSeedAndSettings();
  const useMongo = await isMongoConfigured();
  if (useMongo) {
    try {
      const d = await DocumentModel.findById(id);
      if (!d) return null;
      return {
        id: d._id.toString(),
        category: d.category,
        year: d.year,
        stt: d.stt,
        soHieu: d.soHieu,
        ngayLaySo: d.ngayLaySo.toISOString(),
        trichYeu: d.trichYeu,
        noiGui: d.noiGui,
        nguoiKy: d.nguoiKy,
        nguoiLaySoId: d.nguoiLaySoId,
        nguoiLaySoName: d.nguoiLaySoName,
        ghiChu: d.ghiChu || "",
        trangThai: d.trangThai,
        pdfFileId: d.pdfFileId || "",
        pdfFileName: d.pdfFileName || "",
        pdfViewLink: d.pdfViewLink || "",
        pdfDownloadLink: d.pdfDownloadLink || "",
        createdAt: d.createdAt.toISOString(),
      };
    } catch {
      return null;
    }
  } else {
    const db = readLocalDB();
    return db.documents.find((d) => d.id === id) || null;
  }
}

export async function updateDocumentRecord(
  id: string,
  updates: {
    ngayLaySo?: string;
    trichYeu?: string;
    noiGui?: string;
    nguoiKy?: string;
    nguoiLaySoName?: string;
    ghiChu?: string;
    trangThai?: "CHO_DUYET" | "DA_BAN_HANH" | "THU_HOI";
    pdfFileId?: string;
    pdfFileName?: string;
    pdfViewLink?: string;
    pdfDownloadLink?: string;
  }
): Promise<DocumentDTO> {
  await ensureSeedAndSettings();
  const useMongo = await isMongoConfigured();

  if (useMongo) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: Record<string, any> = {};
    if (updates.ngayLaySo) updatePayload.ngayLaySo = new Date(updates.ngayLaySo);
    if (updates.trichYeu !== undefined) updatePayload.trichYeu = updates.trichYeu.trim();
    if (updates.noiGui !== undefined) updatePayload.noiGui = updates.noiGui.trim();
    if (updates.nguoiKy !== undefined) updatePayload.nguoiKy = updates.nguoiKy.trim();
    if (updates.nguoiLaySoName !== undefined)
      updatePayload.nguoiLaySoName = updates.nguoiLaySoName.trim();
    if (updates.ghiChu !== undefined) updatePayload.ghiChu = updates.ghiChu.trim();
    if (updates.trangThai !== undefined) updatePayload.trangThai = updates.trangThai;
    if (updates.pdfFileId !== undefined) updatePayload.pdfFileId = updates.pdfFileId;
    if (updates.pdfFileName !== undefined) updatePayload.pdfFileName = updates.pdfFileName;
    if (updates.pdfViewLink !== undefined) updatePayload.pdfViewLink = updates.pdfViewLink;
    if (updates.pdfDownloadLink !== undefined)
      updatePayload.pdfDownloadLink = updates.pdfDownloadLink;

    const updated = await DocumentModel.findByIdAndUpdate(id, updatePayload, { new: true });
    if (!updated) throw new Error("Không tìm thấy văn bản để cập nhật");

    return {
      id: updated._id.toString(),
      category: updated.category,
      year: updated.year,
      stt: updated.stt,
      soHieu: updated.soHieu,
      ngayLaySo: updated.ngayLaySo.toISOString(),
      trichYeu: updated.trichYeu,
      noiGui: updated.noiGui,
      nguoiKy: updated.nguoiKy,
      nguoiLaySoId: updated.nguoiLaySoId,
      nguoiLaySoName: updated.nguoiLaySoName,
      ghiChu: updated.ghiChu || "",
      trangThai: updated.trangThai,
      pdfFileId: updated.pdfFileId || "",
      pdfFileName: updated.pdfFileName || "",
      pdfViewLink: updated.pdfViewLink || "",
      pdfDownloadLink: updated.pdfDownloadLink || "",
      createdAt: updated.createdAt.toISOString(),
    };
  } else {
    const db = readLocalDB();
    const idx = db.documents.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error("Không tìm thấy văn bản để cập nhật");

    const cur = db.documents[idx];
    db.documents[idx] = {
      ...cur,
      ngayLaySo: updates.ngayLaySo ? new Date(updates.ngayLaySo).toISOString() : cur.ngayLaySo,
      trichYeu: updates.trichYeu !== undefined ? updates.trichYeu.trim() : cur.trichYeu,
      noiGui: updates.noiGui !== undefined ? updates.noiGui.trim() : cur.noiGui,
      nguoiKy: updates.nguoiKy !== undefined ? updates.nguoiKy.trim() : cur.nguoiKy,
      nguoiLaySoName:
        updates.nguoiLaySoName !== undefined
          ? updates.nguoiLaySoName.trim()
          : cur.nguoiLaySoName,
      ghiChu: updates.ghiChu !== undefined ? updates.ghiChu.trim() : cur.ghiChu,
      trangThai: updates.trangThai !== undefined ? updates.trangThai : cur.trangThai,
      pdfFileId: updates.pdfFileId !== undefined ? updates.pdfFileId : cur.pdfFileId,
      pdfFileName: updates.pdfFileName !== undefined ? updates.pdfFileName : cur.pdfFileName,
      pdfViewLink: updates.pdfViewLink !== undefined ? updates.pdfViewLink : cur.pdfViewLink,
      pdfDownloadLink:
        updates.pdfDownloadLink !== undefined ? updates.pdfDownloadLink : cur.pdfDownloadLink,
    };
    writeLocalDB(db);
    return db.documents[idx];
  }
}

export async function deleteDocumentRecord(id: string): Promise<void> {
  await ensureSeedAndSettings();
  const useMongo = await isMongoConfigured();

  if (useMongo) {
    await DocumentModel.findByIdAndDelete(id);
  } else {
    const db = readLocalDB();
    db.documents = db.documents.filter((d) => d.id !== id);
    writeLocalDB(db);
  }
}
