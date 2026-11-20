import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DocCategory } from "@/lib/constants";
import {
  createDocumentNumber,
  getCategoryCounters,
  hasPermission,
  listDocuments,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const categoryParam = (searchParams.get("category") || "ALL") as DocCategory | "ALL";
    const yearParam = Number(searchParams.get("year") || new Date().getFullYear());
    const search = searchParams.get("search") || "";

    const [documents, counters] = await Promise.all([
      listDocuments({
        category: categoryParam,
        year: yearParam,
        search,
      }),
      getCategoryCounters(yearParam),
    ]);

    return NextResponse.json({
      documents,
      counters,
      year: yearParam,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi tải sổ văn bản";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const canTakeNumber = await hasPermission(user.role, "TAKE_NUMBER");
    if (!canTakeNumber) {
      return NextResponse.json(
        { error: "Tài khoản của bạn không được cấp quyền lấy số văn bản mới" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      category,
      ngayLaySo,
      trichYeu,
      noiGui,
      nguoiKy,
      nguoiLaySoName,
      ghiChu,
      customStt,
    } = body;

    if (!category || !["KH", "BC", "TTr", "GM"].includes(category)) {
      return NextResponse.json({ error: "Loại văn bản không hợp lệ" }, { status: 400 });
    }
    if (!trichYeu || !trichYeu.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập trích yếu nội dung văn bản" },
        { status: 400 }
      );
    }
    if (!noiGui || !noiGui.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập nơi gửi / nhận" }, { status: 400 });
    }
    if (!nguoiKy || !nguoiKy.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập người ký văn bản" }, { status: 400 });
    }

    let parsedCustomStt: number | undefined = undefined;
    if (customStt !== undefined && customStt !== "" && Number(customStt) > 0) {
      const canInsertCustom = await hasPermission(user.role, "INSERT_CUSTOM_NUMBER");
      if (!canInsertCustom) {
        return NextResponse.json(
          { error: "Bạn không có quyền chèn số thứ tự tùy chỉnh" },
          { status: 403 }
        );
      }
      parsedCustomStt = Number(customStt);
    }

    const doc = await createDocumentNumber({
      category,
      ngayLaySo,
      trichYeu,
      noiGui,
      nguoiKy,
      nguoiLaySoId: user.id,
      nguoiLaySoName: nguoiLaySoName?.trim() || user.fullName,
      ghiChu,
      customStt: parsedCustomStt,
    });

    return NextResponse.json({
      document: doc,
      message: `Đã cấp số hiệu ${doc.soHieu} thành công!`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi khi lấy số văn bản";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
