import mongoose, { Schema, Document as MongooseDocument } from "mongoose";
import {
  RoleType,
  DocCategory,
  RolePermissionsMatrix,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_RECIPIENTS,
  DEFAULT_SIGNERS,
} from "./constants";

export interface IUser extends MongooseDocument {
  username: string;
  passwordHash: string;
  fullName: string;
  role: RoleType;
  positionTitle?: string;
  isInitialAdmin: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["CAN_BO", "PHO_DOI_TRUONG", "DOI_TRUONG", "ADMIN"],
      default: "CAN_BO",
    },
    positionTitle: { type: String, default: "" },
    isInitialAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export interface IDocumentRecord extends MongooseDocument {
  category: DocCategory;
  year: number;
  stt: number;
  soHieu: string;
  ngayLaySo: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

const DocumentRecordSchema = new Schema<IDocumentRecord>(
  {
    category: { type: String, enum: ["KH", "BC", "TTr", "GM"], required: true },
    year: { type: Number, required: true },
    stt: { type: Number, required: true },
    soHieu: { type: String, required: true },
    ngayLaySo: { type: Date, required: true, default: Date.now },
    trichYeu: { type: String, required: true, trim: true },
    noiGui: { type: String, required: true, trim: true },
    nguoiKy: { type: String, required: true, trim: true },
    nguoiLaySoId: { type: String, required: true },
    nguoiLaySoName: { type: String, required: true },
    ghiChu: { type: String, default: "" },
    trangThai: {
      type: String,
      enum: ["CHO_DUYET", "DA_BAN_HANH", "THU_HOI"],
      default: "DA_BAN_HANH",
    },
    pdfFileId: { type: String, default: "" },
    pdfFileName: { type: String, default: "" },
    pdfViewLink: { type: String, default: "" },
    pdfDownloadLink: { type: String, default: "" },
  },
  { timestamps: true }
);

DocumentRecordSchema.index({ category: 1, year: 1, stt: 1 }, { unique: true });

export interface ICounter extends MongooseDocument {
  key: string; // e.g. "KH_2026"
  category: DocCategory;
  year: number;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  key: { type: String, required: true, unique: true },
  category: { type: String, enum: ["KH", "BC", "TTr", "GM"], required: true },
  year: { type: Number, required: true },
  seq: { type: Number, required: true, default: 0 },
});

export interface ISystemSetting extends MongooseDocument {
  key: string;
  unitCode: string; // e.g., "KV7"
  unitName: string; // e.g., "Đội / Đơn vị KV7"
  padZero: boolean; // Pad 1 -> 01
  rolePermissions: RolePermissionsMatrix;
  recipients: string[];
  signers: string[];
  googleDriveRefreshToken?: string;
  googleDriveEmail?: string;
  googleDriveRootFolderId?: string;
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true, default: "GLOBAL_CONFIG" },
    unitCode: { type: String, default: "KV7" },
    unitName: { type: String, default: "Đơn vị KV7" },
    padZero: { type: Boolean, default: true },
    rolePermissions: {
      type: Schema.Types.Mixed,
      default: DEFAULT_ROLE_PERMISSIONS,
    },
    recipients: {
      type: [String],
      default: DEFAULT_RECIPIENTS,
    },
    signers: {
      type: [String],
      default: DEFAULT_SIGNERS,
    },
    googleDriveRefreshToken: { type: String, default: "" },
    googleDriveEmail: { type: String, default: "" },
    googleDriveRootFolderId: { type: String, default: "" },
  },
  { timestamps: true }
);

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export const DocumentModel =
  mongoose.models.DocumentRecord ||
  mongoose.model<IDocumentRecord>("DocumentRecord", DocumentRecordSchema);

export const CounterModel =
  mongoose.models.Counter || mongoose.model<ICounter>("Counter", CounterSchema);

export const SystemSettingModel =
  mongoose.models.SystemSetting ||
  mongoose.model<ISystemSetting>("SystemSetting", SystemSettingSchema);
