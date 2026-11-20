"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Save,
  Building2,
} from "lucide-react";
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS_LIST,
  PermissionKey,
  ROLE_LABELS,
  RolePermissionsMatrix,
  RoleType,
} from "@/lib/constants";

interface UserDTO {
  id: string;
  username: string;
  fullName: string;
  role: RoleType;
  positionTitle: string;
  isInitialAdmin: boolean;
  isActive: boolean;
  createdAt?: string;
}

interface SystemConfigDTO {
  unitCode: string;
  unitName: string;
  padZero: boolean;
  rolePermissions: RolePermissionsMatrix;
  recipients?: string[];
  signers?: string[];
  storageMode: "MONGODB" | "LOCAL_FALLBACK";
}

export function UsersManagementPanel({
  currentUser,
  canManageUsers,
}: {
  currentUser: UserDTO;
  canManageUsers: boolean;
}) {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("123456");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<RoleType>("CAN_BO");
  const [newPosition, setNewPosition] = useState("");

  // Edit modal
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<RoleType>("CAN_BO");
  const [editPosition, setEditPosition] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editActive, setEditActive] = useState(true);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        setError(data.error || "Không thể tải danh sách tài khoản");
      }
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          fullName: newFullName,
          role: newRole,
          positionTitle: newPosition,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Tạo tài khoản thất bại");
      } else {
        setSuccess(data.message);
        setShowAddModal(false);
        setNewUsername("");
        setNewFullName("");
        setNewPosition("");
        setNewPassword("123456");
        setNewRole("CAN_BO");
        fetchUsers();
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    }
  }

  function openEditUser(u: UserDTO) {
    setEditingUser(u);
    setEditUsername(u.username);
    setEditFullName(u.fullName);
    setEditRole(u.role);
    setEditPosition(u.positionTitle || "");
    setEditPassword("");
    setEditActive(u.isActive);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editUsername,
          fullName: editFullName,
          role: editRole,
          positionTitle: editPosition,
          password: editPassword || undefined,
          isActive: editActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Cập nhật thất bại");
      } else {
        setSuccess(data.message);
        setEditingUser(null);
        fetchUsers();
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    }
  }

  async function handleDeleteUser(u: UserDTO) {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${u.username}" (${u.fullName})?`)) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xóa thất bại");
      } else {
        setSuccess(data.message);
        fetchUsers();
      }
    } catch {
      setError("Lỗi kết nối");
    }
  }

  const roleBadgeStyle: Record<RoleType, string> = {
    ADMIN: "bg-red-100 text-red-800 border-red-200",
    DOI_TRUONG: "bg-indigo-100 text-indigo-800 border-indigo-200",
    PHO_DOI_TRUONG: "bg-amber-100 text-amber-800 border-amber-200",
    CAN_BO: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-700" />
            Quản lý Tài khoản Cán bộ & Lãnh đạo Đội
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân bậc tài khoản: <strong>Cán bộ</strong> • <strong>Phó đội trưởng</strong> •{" "}
            <strong>Đội trưởng</strong> • <strong>Admin (Duy nhất 1 tài khoản khởi tạo)</strong>
          </p>
        </div>

        {canManageUsers && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg shadow transition"
          >
            <UserPlus className="w-4 h-4" />
            Thêm tài khoản mới
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-3.5">STT</th>
                <th className="px-4 py-3.5">Tài khoản</th>
                <th className="px-4 py-3.5">Họ và tên</th>
                <th className="px-4 py-3.5">Bậc tài khoản</th>
                <th className="px-4 py-3.5">Chức danh / Ghi chú</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                {canManageUsers && <th className="px-4 py-3.5 text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Đang tải danh sách tài khoản...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Chưa có tài khoản nào
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      {u.username}
                      {u.id === currentUser.id && (
                        <span className="ml-2 text-[11px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-sans">
                          Bạn
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{u.fullName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadgeStyle[u.role]}`}
                      >
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.positionTitle || "—"}</td>
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <Unlock className="w-3 h-3" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-md">
                          <Lock className="w-3 h-3" /> Đã khóa
                        </span>
                      )}
                    </td>
                    {canManageUsers && (
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => openEditUser(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Sửa / Đổi TK
                        </button>
                        {!u.isInitialAdmin && u.role !== "ADMIN" && u.id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Xóa
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm tài khoản */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-blue-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Cấp tài khoản mới</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-blue-200 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên đăng nhập *
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="VD: canbo01, doipho01..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu khởi tạo *
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên cán bộ *
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bậc tài khoản *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as RoleType)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-medium"
                >
                  <option value="CAN_BO">Cán bộ</option>
                  <option value="PHO_DOI_TRUONG">Phó đội trưởng</option>
                  <option value="DOI_TRUONG">Đội trưởng</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  * Lưu ý: Tài khoản Admin chỉ có duy nhất 1 tài khoản khởi tạo ban đầu.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chức danh / Tổ công tác
                </label>
                <input
                  type="text"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  placeholder="VD: Đội trưởng Đội KV7"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sửa tài khoản */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                Chỉnh sửa tài khoản: {editingUser.username}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên đăng nhập (Cho phép đổi tên tài khoản) *
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              {!editingUser.isInitialAdmin && editingUser.role !== "ADMIN" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bậc tài khoản *
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as RoleType)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="CAN_BO">Cán bộ</option>
                    <option value="PHO_DOI_TRUONG">Phó đội trưởng</option>
                    <option value="DOI_TRUONG">Đội trưởng</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bậc tài khoản
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Quản trị viên (Admin khởi tạo duy nhất)"
                    className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-100 text-slate-600 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chức danh / Đơn vị
                </label>
                <input
                  type="text"
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đặt lại mật khẩu mới (Để trống nếu không đổi)
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
              </div>

              {!editingUser.isInitialAdmin && editingUser.role !== "ADMIN" && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="chk-active"
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="chk-active" className="text-sm text-slate-700">
                    Cho phép tài khoản hoạt động
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow"
                >
                  Lưu cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function PermissionsMatrixPanel({
  config,
  canManagePermissions,
  onConfigUpdated,
}: {
  config: SystemConfigDTO;
  canManagePermissions: boolean;
  onConfigUpdated: (c: SystemConfigDTO) => void;
}) {
  const [unitCode, setUnitCode] = useState(config.unitCode);
  const [unitName, setUnitName] = useState(config.unitName);
  const [padZero, setPadZero] = useState(config.padZero);
  const [matrix, setMatrix] = useState<RolePermissionsMatrix>(
    config.rolePermissions || DEFAULT_ROLE_PERMISSIONS
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function togglePerm(role: RoleType, key: PermissionKey) {
    if (!canManagePermissions || role === "ADMIN") return;
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: !prev[role]?.[key],
      },
    }));
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitCode,
          unitName,
          padZero,
          rolePermissions: matrix,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Lưu cấu hình thất bại");
      } else {
        setMessage(data.message);
        onConfigUpdated(data.config);
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  }

  const rolesOrder: RoleType[] = ["CAN_BO", "PHO_DOI_TRUONG", "DOI_TRUONG", "ADMIN"];

  return (
    <form onSubmit={handleSaveSettings} className="space-y-6">
      {/* Cấu hình ký hiệu đơn vị */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-700" />
              Cấu hình Ký hiệu Số hiệu Văn bản Đơn vị
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Định dạng số hiệu tự động:{" "}
              <code className="font-mono font-bold text-blue-700">
                {padZero ? "01" : "1"}/KH-{unitCode || "KV7"}
              </code>
              ,{" "}
              <code className="font-mono font-bold text-emerald-700">
                {padZero ? "01" : "1"}/BC-{unitCode || "KV7"}
              </code>
              ,{" "}
              <code className="font-mono font-bold text-amber-700">
                {padZero ? "01" : "1"}/TTr-{unitCode || "KV7"}
              </code>
              ,{" "}
              <code className="font-mono font-bold text-purple-700">
                {padZero ? "01" : "1"}/GM-{unitCode || "KV7"}
              </code>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ký hiệu hậu tố đơn vị (VD: KV7)
            </label>
            <input
              type="text"
              disabled={!canManagePermissions}
              value={unitCode}
              onChange={(e) => setUnitCode(e.target.value)}
              placeholder="VD: KV7"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên đơn vị hiển thị
            </label>
            <input
              type="text"
              disabled={!canManagePermissions}
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="VD: Đội KV7"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-end pb-2">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={!canManagePermissions}
                checked={padZero}
                onChange={(e) => setPadZero(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-slate-700 font-medium">
                Thêm số 0 đằng trước số nhỏ hơn 10 (01, 02...)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Ma trận phân quyền */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-700" />
              Ma trận Phân quyền giữa các Bậc Tài khoản
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tích chọn để cấp hoặc thu hồi quyền hạn tương ứng cho từng nhóm:{" "}
              <strong>Cán bộ</strong>, <strong>Phó đội trưởng</strong>,{" "}
              <strong>Đội trưởng</strong> và <strong>Admin</strong>.
            </p>
          </div>

          {canManagePermissions && (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg shadow transition shrink-0"
            >
              <Save className="w-4 h-4" />
              {saving ? "Đang lưu..." : "Lưu phân quyền & Cấu hình"}
            </button>
          )}
        </div>

        {error && (
          <div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="m-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-700 font-bold">
              <tr>
                <th className="px-5 py-3.5 min-w-[280px]">Chức năng / Quyền hạn</th>
                {rolesOrder.map((r) => (
                  <th key={r} className="px-4 py-3.5 text-center min-w-[130px]">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {PERMISSIONS_LIST.map((perm) => (
                <tr key={perm.key} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900">{perm.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{perm.description}</div>
                  </td>
                  {rolesOrder.map((role) => {
                    const checked =
                      role === "ADMIN" ? true : Boolean(matrix?.[role]?.[perm.key]);
                    const disabled = !canManagePermissions || role === "ADMIN";
                    return (
                      <td key={role} className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => togglePerm(role, perm.key)}
                          className="w-5 h-5 text-blue-700 rounded border-slate-300 focus:ring-blue-600 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </form>
  );
}
