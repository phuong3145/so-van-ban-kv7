import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hệ thống Lấy số Văn bản Điện tử - KH, BC, TTr, GM",
  description:
    "Hệ thống quản lý, cấp số văn bản tự động (Kế hoạch, Báo cáo, Tờ trình, Giấy mời) và phân quyền cán bộ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
