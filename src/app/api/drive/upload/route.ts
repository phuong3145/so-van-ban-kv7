import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findDocumentById, updateDocumentRecord } from "@/lib/store";
import { uploadPdfToGoogleDrive } from "@/lib/googleDrive";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const formData = await req.formData();
    const documentId = formData.get("documentId") as string;
    const file = formData.get("file") as File | null;

    if (!documentId) {
      return NextResponse.json(
        { error: "Thiếu mã văn bản (documentId)" },
        { status: 400 }
      );
    }
    if (!file) {
      return NextResponse.json(
        { error: "Vui lòng chọn file PDF văn bản để tải lên" },
        { status: 400 }
      );
    }

    const doc = await findDocumentById(documentId);
    if (!doc) {
      return NextResponse.json(
        { error: "Không tìm thấy bản ghi văn bản" },
        { status: 404 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const driveResult = await uploadPdfToGoogleDrive({
      doc,
      fileBuffer,
      mimeType: file.type || "application/pdf",
    });

    const updatedDoc = await updateDocumentRecord(documentId, {
      pdfFileId: driveResult.fileId,
      pdfFileName: driveResult.fileName,
      pdfViewLink: driveResult.webViewLink,
      pdfDownloadLink: driveResult.webContentLink,
    });

    return NextResponse.json({
      document: updatedDoc,
      drive: driveResult,
      message: `Đã tải file "${driveResult.fileName}" vào thư mục "Lấy số văn bản / ${driveResult.monthFolderName}" trên Google Drive!`,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Lỗi tải file PDF lên Google Drive";
    if (message === "DRIVE_NOT_CONNECTED") {
      return NextResponse.json(
        {
          error:
            "Chưa kết nối tài khoản Google Drive lưu trữ. Vui lòng bấm nút 'Kết nối Google Drive' để cấp quyền lưu file!",
          code: "DRIVE_NOT_CONNECTED",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
