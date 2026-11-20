import {
  DocumentDTO,
  getGoogleDriveCredentials,
  saveGoogleDriveCredentials,
} from "./store";

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

export const ROOT_DRIVE_FOLDER_NAME = "Lấy số văn bản";

export function getGoogleOAuthAuthorizeUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope:
      "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email",
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  email?: string;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.error_description || data.error || "Lỗi xác thực Google OAuth"
    );
  }

  let email = "";
  try {
    const infoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${data.access_token}` },
      }
    );
    if (infoRes.ok) {
      const info = await infoRes.json();
      email = info.email || "";
    }
  } catch {
    // ignore
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    email,
  };
}

export async function getValidDriveAccessToken(): Promise<string> {
  const creds = await getGoogleDriveCredentials();
  if (!creds.refreshToken) {
    throw new Error("DRIVE_NOT_CONNECTED");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        "Token Google Drive đã hết hạn, vui lòng kết nối lại Google Drive."
    );
  }

  return data.access_token as string;
}

async function findOrCreateDriveFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string> {
  const escapedName = folderName.replace(/'/g, "\\'");
  let q = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`;
  if (parentId) {
    q += ` and '${parentId}' in parents`;
  }

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  }

  // Create folder if not found
  const metadata: { name: string; mimeType: string; parents?: string[] } = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.id) {
    throw new Error(
      createData.error?.message || `Không thể tạo thư mục "${folderName}" trên Google Drive`
    );
  }

  return createData.id;
}

/**
 * Đặt tên file PDF theo chuẩn:
 * [Số văn bản ký hiệu] - [Ngày tháng văn bản] - [Trích yếu, nội dung].pdf
 * VD: 01_KH-KV7 - 20-11-2026 - Kế hoạch kiểm tra PCCC.pdf
 */
export function buildFormattedPdfFileName(doc: DocumentDTO): string {
  const cleanSoHieu = doc.soHieu.replace(/\//g, "_").trim();
  const d = new Date(doc.ngayLaySo);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const dateFormatted = `${dd}-${mm}-${yyyy}`;

  const cleanTrichYeu = doc.trichYeu
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cleanGhiChu = (doc.ghiChu || "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = [cleanSoHieu, dateFormatted, cleanTrichYeu];
  if (cleanGhiChu) {
    parts.push(cleanGhiChu);
  }

  return `${parts.join(" - ")}.pdf`;
}

export function getMonthYearFolderName(dateStr: string): string {
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `Tháng ${mm}-${yyyy}`;
}

export async function uploadPdfToGoogleDrive(params: {
  doc: DocumentDTO;
  fileBuffer: Buffer;
  mimeType?: string;
}): Promise<{
  fileId: string;
  fileName: string;
  webViewLink: string;
  webContentLink: string;
  monthFolderName: string;
}> {
  const accessToken = await getValidDriveAccessToken();
  const creds = await getGoogleDriveCredentials();

  // 1. Đảm bảo thư mục gốc "Lấy số văn bản"
  const rootFolderId = await findOrCreateDriveFolder(
    accessToken,
    ROOT_DRIVE_FOLDER_NAME
  );

  if (rootFolderId !== creds.rootFolderId) {
    await saveGoogleDriveCredentials({
      refreshToken: creds.refreshToken,
      email: creds.email,
      rootFolderId,
    });
  }

  // 2. Đảm bảo thư mục con theo tháng năm (VD: "Tháng 11-2026")
  const monthFolderName = getMonthYearFolderName(params.doc.ngayLaySo);
  const monthFolderId = await findOrCreateDriveFolder(
    accessToken,
    monthFolderName,
    rootFolderId
  );

  // 3. Đặt tên file theo: Số văn bản ký hiệu, ngày tháng văn bản, trích yếu, nội dung
  const fileName = buildFormattedPdfFileName(params.doc);

  // 4. Upload Multipart lên Google Drive
  const boundary = "-------314159265358979323846";
  const metadata = {
    name: fileName,
    parents: [monthFolderId],
    mimeType: params.mimeType || "application/pdf",
  };

  const multipartHeader = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n--${boundary}\r\nContent-Type: ${
      params.mimeType || "application/pdf"
    }\r\n\r\n`,
    "utf-8"
  );
  const multipartFooter = Buffer.from(`\r\n--${boundary}--`, "utf-8");

  const bodyBuffer = Buffer.concat([
    multipartHeader,
    params.fileBuffer,
    multipartFooter,
  ]);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: bodyBuffer,
    }
  );

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || !uploadData.id) {
    throw new Error(
      uploadData.error?.message || "Lỗi khi tải file PDF lên Google Drive"
    );
  }

  // Cho phép những người có link trong đơn vị có thể mở xem file PDF
  try {
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone",
        }),
      }
    );
  } catch {
    // ignore permission sharing warning
  }

  return {
    fileId: uploadData.id,
    fileName: uploadData.name || fileName,
    webViewLink:
      uploadData.webViewLink ||
      `https://drive.google.com/file/d/${uploadData.id}/view`,
    webContentLink:
      uploadData.webContentLink ||
      `https://drive.google.com/uc?id=${uploadData.id}&export=download`,
    monthFolderName,
  };
}
