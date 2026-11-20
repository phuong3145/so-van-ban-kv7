import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  ensureSeedAndSettings,
  hasPermission,
  updateSystemSettings,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await ensureSeedAndSettings();
    return NextResponse.json({ config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi tải cấu hình";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const canManagePerms = await hasPermission(user.role, "MANAGE_PERMISSIONS");
    if (!canManagePerms) {
      return NextResponse.json(
        { error: "Bạn không có quyền thay đổi cấu hình phân quyền hệ thống" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updatedConfig = await updateSystemSettings({
      unitCode: body.unitCode,
      unitName: body.unitName,
      padZero: body.padZero,
      rolePermissions: body.rolePermissions,
    });

    return NextResponse.json({
      config: updatedConfig,
      message: "Đã lưu cấu hình hệ thống và phân quyền thành công!",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi lưu cấu hình";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
