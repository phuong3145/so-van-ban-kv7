export type RoleType = "CAN_BO" | "PHO_DOI_TRUONG" | "DOI_TRUONG" | "ADMIN";

export const ROLE_LABELS: Record<RoleType, string> = {
  CAN_BO: "Cán bộ",
  PHO_DOI_TRUONG: "Phó đội trưởng",
  DOI_TRUONG: "Đội trưởng",
  ADMIN: "Quản trị viên (Admin)",
};

export type DocCategory = "KH" | "BC" | "TTr" | "GM";

export const DOC_CATEGORIES: {
  code: DocCategory;
  name: string;
  badgeColor: string;
  description: string;
}[] = [
  {
    code: "KH",
    name: "Kế hoạch",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Văn bản Kế hoạch công tác, chuyên đề, triển khai nhiệm vụ",
  },
  {
    code: "BC",
    name: "Báo cáo",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "Báo cáo định kỳ, đột xuất, kết quả thực hiện công tác",
  },
  {
    code: "TTr",
    name: "Tờ trình",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    description: "Tờ trình xin chủ trương, phê duyệt phương án, đề xuất",
  },
  {
    code: "GM",
    name: "Giấy mời",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Giấy mời họp, hội nghị, làm việc với các đơn vị/cá nhân",
  },
];

export type PermissionKey =
  | "TAKE_NUMBER"
  | "EDIT_OWN_DOC"
  | "DELETE_OWN_DOC"
  | "EDIT_ANY_DOC"
  | "DELETE_ANY_DOC"
  | "APPROVE_DOC"
  | "INSERT_CUSTOM_NUMBER"
  | "EXPORT_EXCEL"
  | "MANAGE_USERS"
  | "MANAGE_PERMISSIONS";

export interface PermissionMeta {
  key: PermissionKey;
  label: string;
  description: string;
  group: "Văn bản & Lấy số" | "Quản lý sổ & Duyệt" | "Hệ thống & Tài khoản";
}

export const PERMISSIONS_LIST: PermissionMeta[] = [
  {
    key: "TAKE_NUMBER",
    label: "Lấy số văn bản mới",
    description: "Cho phép bấm lấy số tự động vào sổ văn bản (KH, BC, TTr, GM)",
    group: "Văn bản & Lấy số",
  },
  {
    key: "EDIT_OWN_DOC",
    label: "Sửa văn bản do mình lấy số",
    description: "Cho phép cập nhật trích yếu, nơi gửi, người ký, ghi chú của văn bản mình tạo",
    group: "Văn bản & Lấy số",
  },
  {
    key: "DELETE_OWN_DOC",
    label: "Hủy/Xóa văn bản do mình lấy số",
    description: "Cho phép xóa hoặc thu hồi văn bản do chính mình tạo",
    group: "Văn bản & Lấy số",
  },
  {
    key: "EXPORT_EXCEL",
    label: "Xuất sổ văn bản (Excel/CSV)",
    description: "Cho phép tải xuống danh sách sổ văn bản ra file Excel/CSV để lưu trữ, in ấn",
    group: "Văn bản & Lấy số",
  },
  {
    key: "APPROVE_DOC",
    label: "Ký duyệt / Xác nhận văn bản",
    description: "Cho phép đổi trạng thái duyệt văn bản (Chờ duyệt -> Đã ban hành / Thu hồi)",
    group: "Quản lý sổ & Duyệt",
  },
  {
    key: "EDIT_ANY_DOC",
    label: "Chỉnh sửa văn bản của người khác",
    description: "Cho phép chỉnh sửa thông tin mọi văn bản trong sổ của toàn đơn vị",
    group: "Quản lý sổ & Duyệt",
  },
  {
    key: "DELETE_ANY_DOC",
    label: "Xóa văn bản của người khác",
    description: "Cho phép xóa bất kỳ bản ghi văn bản nào trong hệ thống",
    group: "Quản lý sổ & Duyệt",
  },
  {
    key: "INSERT_CUSTOM_NUMBER",
    label: "Chèn số trống / Đặt lại bộ đếm số",
    description: "Cho phép lấy một số thứ tự bất kỳ (chèn số bỏ sót) hoặc cài đặt số hiện tại của sổ",
    group: "Quản lý sổ & Duyệt",
  },
  {
    key: "MANAGE_USERS",
    label: "Quản lý danh sách tài khoản",
    description: "Tạo tài khoản mới, đổi chức vụ (Cán bộ, Phó ĐT, Đội trưởng), đặt lại mật khẩu, khóa TK",
    group: "Hệ thống & Tài khoản",
  },
  {
    key: "MANAGE_PERMISSIONS",
    label: "Cấu hình phân quyền & Đơn vị",
    description: "Thay đổi ma trận phân quyền giữa các cấp tài khoản và ký hiệu hậu tố đơn vị (VD: KV7)",
    group: "Hệ thống & Tài khoản",
  },
];

export type RolePermissionsMatrix = Record<RoleType, Record<PermissionKey, boolean>>;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMatrix = {
  CAN_BO: {
    TAKE_NUMBER: true,
    EDIT_OWN_DOC: true,
    DELETE_OWN_DOC: false,
    EDIT_ANY_DOC: false,
    DELETE_ANY_DOC: false,
    APPROVE_DOC: false,
    INSERT_CUSTOM_NUMBER: false,
    EXPORT_EXCEL: true,
    MANAGE_USERS: false,
    MANAGE_PERMISSIONS: false,
  },
  PHO_DOI_TRUONG: {
    TAKE_NUMBER: true,
    EDIT_OWN_DOC: true,
    DELETE_OWN_DOC: true,
    EDIT_ANY_DOC: true,
    DELETE_ANY_DOC: false,
    APPROVE_DOC: true,
    INSERT_CUSTOM_NUMBER: true,
    EXPORT_EXCEL: true,
    MANAGE_USERS: false,
    MANAGE_PERMISSIONS: false,
  },
  DOI_TRUONG: {
    TAKE_NUMBER: true,
    EDIT_OWN_DOC: true,
    DELETE_OWN_DOC: true,
    EDIT_ANY_DOC: true,
    DELETE_ANY_DOC: true,
    APPROVE_DOC: true,
    INSERT_CUSTOM_NUMBER: true,
    EXPORT_EXCEL: true,
    MANAGE_USERS: true,
    MANAGE_PERMISSIONS: false,
  },
  ADMIN: {
    TAKE_NUMBER: true,
    EDIT_OWN_DOC: true,
    DELETE_OWN_DOC: true,
    EDIT_ANY_DOC: true,
    DELETE_ANY_DOC: true,
    APPROVE_DOC: true,
    INSERT_CUSTOM_NUMBER: true,
    EXPORT_EXCEL: true,
    MANAGE_USERS: true,
    MANAGE_PERMISSIONS: true,
  },
};
