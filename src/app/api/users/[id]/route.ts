import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  deleteUserAccount,
  hasPermission,
  updateUserAccount,
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

    const canManageUsers = await hasPermission(user.role, "MANAGE_USERS");
    if (!canManageUsers) {
      return NextResponse.json(
        { error: "Bạn không có quyền quản lý tài khoản" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updated = await updateUserAccount(params.id, {
      username: body.username,
      fullName: body.fullName,
      password: body.password,
      role: body.role,
      positionTitle: body.positionTitle,
      isActive: body.isActive,
    });

    return NextResponse.json({
      user: updated,
      message: "Cập nhật tài khoản thành công",
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

    const canManageUsers = await hasPermission(user.role, "MANAGE_USERS");
    if (!canManageUsers) {
      return NextResponse.json(
        { error: "Bạn không có quyền xóa tài khoản" },
        { status: 403 }
      );
    }

    if (params.id === user.id) {
      return NextResponse.json(
        { error: "Không thể tự xóa tài khoản đang đăng nhập" },
        { status: 400 }
      );
    }

    await deleteUserAccount(params.id);
    return NextResponse.json({ message: "Đã xóa tài khoản" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Xóa tài khoản thất bại";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
