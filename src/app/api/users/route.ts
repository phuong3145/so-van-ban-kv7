import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createUserAccount,
  hasPermission,
  listUsers,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi tải danh sách tài khoản";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const canManageUsers = await hasPermission(user.role, "MANAGE_USERS");
    if (!canManageUsers) {
      return NextResponse.json(
        { error: "Bạn không có quyền thêm hoặc quản lý tài khoản" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { username, password, fullName, role, positionTitle } = body;

    if (!username || !password || !fullName || !role) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ Tên đăng nhập, Mật khẩu, Họ tên và Bậc tài khoản" },
        { status: 400 }
      );
    }

    const newUser = await createUserAccount({
      username,
      password,
      fullName,
      role,
      positionTitle,
    });

    return NextResponse.json({
      user: newUser,
      message: `Đã tạo tài khoản ${newUser.username} thành công`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Không thể tạo tài khoản";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
