import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByUsername } from "@/lib/store";
import { COOKIE_NAME, signSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập và mật khẩu" },
        { status: 400 }
      );
    }

    const user = await findUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: "Tài khoản hoặc mật khẩu không chính xác" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Tài khoản này đã bị khóa. Vui lòng liên hệ Quản trị viên." },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Tài khoản hoặc mật khẩu không chính xác" },
        { status: 401 }
      );
    }

    const token = await signSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;

    const res = NextResponse.json({
      user: safeUser,
      message: "Đăng nhập thành công",
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi máy chủ khi đăng nhập";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
