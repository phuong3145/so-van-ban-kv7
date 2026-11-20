import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/googleDrive";
import { getGoogleDriveCredentials, saveGoogleDriveCredentials } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const origin = url.origin;
  const redirectUri = `${origin}/api/drive/callback`;

  if (error || !code) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="vi">
        <head><meta charset="utf-8"><title>Kết nối Google Drive thất bại</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:40px;">
          <h2 style="color:#dc2626;">Kết nối Google Drive không thành công</h2>
          <p>${error || "Không nhận được mã xác thực từ Google."}</p>
          <button onclick="window.close()" style="padding:10px 20px;background:#1e293b;color:#fff;border:none;border-radius:8px;cursor:pointer;">Đóng cửa sổ</button>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const existing = await getGoogleDriveCredentials();
    const refreshTokenToSave = tokens.refresh_token || existing.refreshToken;

    if (!refreshTokenToSave) {
      throw new Error(
        "Google không trả về refresh_token. Vui lòng thử kết nối lại."
      );
    }

    await saveGoogleDriveCredentials({
      refreshToken: refreshTokenToSave,
      email: tokens.email || existing.email,
    });

    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="vi">
        <head><meta charset="utf-8"><title>Đã kết nối Google Drive</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:40px;background:#f8fafc;">
          <div style="max-width:420px;margin:0 auto;background:#fff;padding:28px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.08);">
            <h2 style="color:#059669;margin-top:0;">✓ Đã kết nối Google Drive thành công!</h2>
            <p style="color:#475569;font-size:14px;">Tài khoản: <strong>${tokens.email || "Google Drive"}</strong></p>
            <p style="color:#64748b;font-size:13px;">Hệ thống sẽ tự động tạo thư mục <strong>"Lấy số văn bản"</strong> và các thư mục <strong>"Tháng MM-YYYY"</strong> khi tải file PDF lên.</p>
            <button onclick="if(window.opener){window.opener.postMessage({type:'GOOGLE_DRIVE_CONNECTED'},'*');window.close();}else{window.location.href='/';}" style="margin-top:12px;padding:10px 24px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">
              Hoàn tất & Quay lại
            </button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_DRIVE_CONNECTED' }, '*');
              setTimeout(() => window.close(), 1200);
            }
          </script>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi kết nối Google Drive";
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="vi">
        <head><meta charset="utf-8"><title>Lỗi kết nối Google Drive</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:40px;">
          <h2 style="color:#dc2626;">Lỗi khi lưu kết nối Google Drive</h2>
          <p>${msg}</p>
          <button onclick="window.close()" style="padding:10px 20px;background:#1e293b;color:#fff;border:none;border-radius:8px;cursor:pointer;">Đóng</button>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
