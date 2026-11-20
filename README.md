# Hệ thống Lấy Số Văn Bản Điện Tử (KH, BC, TTr, GM)

Ứng dụng web quản lý và cấp số hiệu văn bản tự động theo 4 mục:
- **KH**: Kế hoạch (VD: `01/KH-KV7`)
- **BC**: Báo cáo (VD: `01/BC-KV7`)
- **TTr**: Tờ trình (VD: `01/TTr-KV7`)
- **GM**: Giấy mời (VD: `01/GM-KV7`)

## Tính năng chính
1. **Tự động nhảy số theo từng loại văn bản và theo năm**: Mỗi mục `KH`, `BC`, `TTr`, `GM` có bộ đếm độc lập, lưu đầy đủ:
   - STT
   - Ngày tháng năm lấy số
   - Số hiệu (VD: `01/KH-KV7`)
   - Trích yếu nội dung
   - Nơi gửi
   - Người ký
   - Người lấy số
   - Ghi chú
2. **Tài khoản & Phân bậc**:
   - **Cán bộ** (`CAN_BO`)
   - **Phó đội trưởng** (`PHO_DOI_TRUONG`)
   - **Đội trưởng** (`DOI_TRUONG`)
   - **Admin** (`ADMIN` - Chỉ duy nhất 1 tài khoản khởi tạo ban đầu: `admin` / mật khẩu `123456`, cho phép đổi tên đăng nhập và mật khẩu).
3. **Ma trận Phân quyền linh hoạt**:
   - Admin (hoặc cấp được ủy quyền) có thể bật/tắt chi tiết từng quyền cho từng bậc tài khoản ngay trên giao diện.

## Hướng dẫn kết nối MongoDB trên Vercel & Deploy

### Bước 1: Tạo Database MongoDB trên Vercel
1. Đăng nhập vào [Vercel Dashboard](https://vercel.com/dashboard).
2. Vào tab **Storage** (hoặc **Marketplace**) -> Chọn **MongoDB Atlas** -> Nhấn **Create / Connect**.
3. Sau khi tạo cluster miễn phí (M0 Free Tier), Vercel sẽ tự động thêm biến môi trường `MONGODB_URI` vào Project của bạn (hoặc bạn copy chuỗi `mongodb+srv://...` từ MongoDB Atlas).

### Bước 2: Cấu hình Biến môi trường trên Vercel
Trong phần **Project Settings -> Environment Variables** trên Vercel, thêm:
- `MONGODB_URI`: Chuỗi kết nối MongoDB của bạn
- `JWT_SECRET`: Một chuỗi ký tự bất kỳ để bảo mật phiên đăng nhập (VD: `kv7_secret_2026_@!`)

### Bước 3: Deploy lên Vercel
- **Cách 1 (Qua GitHub)**: Đẩy thư mục code này lên GitHub, vào Vercel chọn **Add New Project** -> Import repo GitHub -> Nhấn **Deploy**.
- **Cách 2 (Qua Vercel CLI)**:
  ```bash
  npx vercel
  npx vercel --prod
  ```
