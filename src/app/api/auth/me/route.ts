import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, getCurrentUser, signSessionToken } from "@/lib/auth";
import {
  ensureSeedAndSettings,
  findUserById,
  updateUserAccount,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const config = await ensureSeedAndSettings();
    if (!user) {
      return NextResponse.json({ user: null, config }, { status: 401 });
    }
    return NextResponse.json({ user, config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi hệ thống";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Cho phép người dùng (đặc biệt là tài khoản admin khởi tạo) đổi tên tài khoản (username), họ tên, chức danh và mật khẩu của chính mình
export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { username, fullName, positionTitle, currentPassword, newPassword } = body;

    const fullUser = await findUserById(currentUser.id);
    if (!fullUser) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
    }

    // Nếu đổi tên đăng nhập hoặc mật khẩu mới thì bắt buộc xác nhận mật khẩu hiện tại
    const isChangingUsername =
      username && username.trim().toLowerCase() !== fullUser.username;
    const isChangingPassword = newPassword && newPassword.trim().length > 0;

    if (isChangingUsername || isChangingPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Vui lòng nhập mật khẩu hiện tại để xác nhận thay đổi tài khoản/mật khẩu" },
          { status: 400 }
        );
      }
      const match = await bcrypt.compare(currentPassword, fullUser.passwordHash);
      if (!match) {
        return NextResponse.json(
          { error: "Mật khẩu hiện tại không chính xác" },
          { status: 400 }
        );
      }
    }

    const updated = await updateUserAccount(currentUser.id, {
      username: username ? username.trim().toLowerCase() : undefined,
      fullName: fullName ? fullName.trim() : undefined,
      positionTitle: positionTitle !== undefined ? positionTitle.trim() : undefined,
      password: isChangingPassword ? newPassword.trim() : undefined,
    });

    const newToken = await signSessionToken({
      userId: updated.id,
      username: updated.username,
      role: updated.role,
    });

    const res = NextResponse.json({
      user: updated,
      message: "Cập nhật thông tin tài khoản thành công",
    });

    res.cookies.set(COOKIE_NAME, newToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cập nhật thất bại";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
