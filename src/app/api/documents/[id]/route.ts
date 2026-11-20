import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  deleteDocumentRecord,
  findDocumentById,
  hasPermission,
  updateDocumentRecord,
} from "@/lib/store";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const doc = await findDocumentById(params.id);
    if (!doc) {
      return NextResponse.json({ error: "Không tìm thấy văn bản" }, { status: 404 });
    }

    const isOwner = doc.nguoiLaySoId === user.id;
    const canEditAny = await hasPermission(user.role, "EDIT_ANY_DOC");
    const canEditOwn = await hasPermission(user.role, "EDIT_OWN_DOC");
    const canApprove = await hasPermission(user.role, "APPROVE_DOC");

    const body = await req.json();

    // Nếu chỉ đổi trạng thái duyệt
    if (
      Object.keys(body).length === 1 &&
      body.trangThai !== undefined &&
      canApprove
    ) {
      const updated = await updateDocumentRecord(params.id, {
        trangThai: body.trangThai,
      });
      return NextResponse.json({
        document: updated,
        message: "Đã cập nhật trạng thái văn bản",
      });
    }

    if (!canEditAny && !(isOwner && canEditOwn)) {
      return NextResponse.json(
        { error: "Bạn không có quyền chỉnh sửa văn bản này" },
        { status: 403 }
      );
    }

    const updated = await updateDocumentRecord(params.id, {
      ngayLaySo: body.ngayLaySo,
      trichYeu: body.trichYeu,
      noiGui: body.noiGui,
      nguoiKy: body.nguoiKy,
      nguoiLaySoName: body.nguoiLaySoName,
      ghiChu: body.ghiChu,
      trangThai: canApprove ? body.trangThai : undefined,
    });

    return NextResponse.json({
      document: updated,
      message: `Đã cập nhật văn bản ${updated.soHieu}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cập nhật thất bại";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const doc = await findDocumentById(params.id);
    if (!doc) {
      return NextResponse.json({ error: "Không tìm thấy văn bản" }, { status: 404 });
    }

    const isOwner = doc.nguoiLaySoId === user.id;
    const canDeleteAny = await hasPermission(user.role, "DELETE_ANY_DOC");
    const canDeleteOwn = await hasPermission(user.role, "DELETE_OWN_DOC");

    if (!canDeleteAny && !(isOwner && canDeleteOwn)) {
      return NextResponse.json(
        { error: "Bạn không có quyền xóa văn bản này" },
        { status: 403 }
      );
    }

    await deleteDocumentRecord(params.id);
    return NextResponse.json({ message: `Đã xóa số văn bản ${doc.soHieu}` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Xóa văn bản thất bại";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
