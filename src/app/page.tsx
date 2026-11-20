"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  PlusCircle,
  Search,
  Download,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users,
  Shield,
  LogOut,
  KeyRound,
  Copy,
  Check,
  Database,
  Sparkles,
  Plus,
  ChevronDown,
} from "lucide-react";
import {
  DEFAULT_RECIPIENTS,
  DEFAULT_SIGNERS,
  DOC_CATEGORIES,
  DocCategory,
  PermissionKey,
  ROLE_LABELS,
  RolePermissionsMatrix,
  RoleType,
} from "@/lib/constants";
import { LoginScreen, ProfileAccountModal } from "@/components/AccountViews";
import {
  PermissionsMatrixPanel,
  UsersManagementPanel,
} from "@/components/AdminPanels";

interface UserDTO {
  id: string;
  username: string;
  fullName: string;
  role: RoleType;
  positionTitle: string;
  isInitialAdmin: boolean;
  isActive: boolean;
}

interface DocumentDTO {
  id: string;
  category: DocCategory;
  year: number;
  stt: number;
  soHieu: string;
  ngayLaySo: string;
  trichYeu: string;
  noiGui: string;
  nguoiKy: string;
  nguoiLaySoId: string;
  nguoiLaySoName: string;
  ghiChu: string;
  trangThai: "CHO_DUYET" | "DA_BAN_HANH" | "THU_HOI";
  createdAt: string;
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

type CounterSummary = Record<
  DocCategory,
  { currentSeq: number; nextSoHieu: string; totalDocs: number }
>;

// Component Autocomplete Dropdown cho "Nơi nhận / gửi" với nút [+] thêm vào Database
function RecipientAutocomplete({
  value,
  onChange,
  recipients,
  onRecipientAdded,
}: {
  value: string;
  onChange: (val: string) => void;
  recipients: string[];
  onRecipientAdded: (newList: string[], addedItem: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cleanInput = value.trim();
  const filtered = recipients.filter((r) =>
    r.toLowerCase().includes(cleanInput.toLowerCase())
  );
  const exactExists = recipients.some(
    (r) => r.toLowerCase() === cleanInput.toLowerCase()
  );

  async function handleAddNewRecipient() {
    if (!cleanInput || exactExists || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: cleanInput }),
      });
      const data = await res.json();
      if (res.ok && data.recipients) {
        onRecipientAdded(data.recipients, cleanInput);
        setOpen(false);
      }
    } catch {
      // ignore
    } finally {
      setAdding(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            required
            value={value}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            placeholder="Chọn hoặc nhập nơi nhận/gửi (Đội 1, 2, 3...)"
            className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
          />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {cleanInput && !exactExists && (
          <button
            type="button"
            onClick={handleAddNewRecipient}
            disabled={adding}
            title={`Thêm "${cleanInput}" vào danh sách Nơi nhận/gửi trong CSDL`}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>{adding ? "Đang lưu..." : "Lưu mới"}</span>
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  onChange(item);
                  setOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-sm hover:bg-blue-50 transition flex items-center justify-between ${
                  value === item
                    ? "bg-blue-50/70 font-semibold text-blue-700"
                    : "text-slate-700"
                }`}
              >
                <span>{item}</span>
                {value === item && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            ))
          ) : (
            <div className="px-3.5 py-2.5 text-xs text-slate-500">
              Chưa có &ldquo;<strong>{cleanInput}</strong>&rdquo; trong danh sách.
            </div>
          )}

          {cleanInput && !exactExists && (
            <button
              type="button"
              onClick={handleAddNewRecipient}
              disabled={adding}
              className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>
                {adding
                  ? "Đang thêm vào CSDL..."
                  : `Thêm "${cleanInput}" vào danh sách Nơi nhận/gửi`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [config, setConfig] = useState<SystemConfigDTO | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"SO_VAN_BAN" | "TAI_KHOAN" | "PHAN_QUYEN">(
    "SO_VAN_BAN"
  );
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Document filtering & list
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | "ALL">("ALL");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [counters, setCounters] = useState<CounterSummary | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);

  // Take new number modal
  const [showTakeModal, setShowTakeModal] = useState(false);
  const [formCategory, setFormCategory] = useState<DocCategory>("KH");
  const [formNgayLaySo, setFormNgayLaySo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [formTrichYeu, setFormTrichYeu] = useState("");
  const [formNoiGui, setFormNoiGui] = useState("");
  const [formNguoiKy, setFormNguoiKy] = useState(DEFAULT_SIGNERS[0]);
  const [formNguoiLaySoName, setFormNguoiLaySoName] = useState("");
  const [formGhiChu, setFormGhiChu] = useState("");
  const [submittingDoc, setSubmittingDoc] = useState(false);

  // Newly issued number banner
  const [issuedDoc, setIssuedDoc] = useState<DocumentDTO | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit document modal
  const [editingDoc, setEditingDoc] = useState<DocumentDTO | null>(null);
  const [editNgayLaySo, setEditNgayLaySo] = useState("");
  const [editTrichYeu, setEditTrichYeu] = useState("");
  const [editNoiGui, setEditNoiGui] = useState("");
  const [editNguoiKy, setEditNguoiKy] = useState("");
  const [editNguoiLaySoName, setEditNguoiLaySoName] = useState("");
  const [editGhiChu, setEditGhiChu] = useState("");
  const [editTrangThai, setEditTrangThai] = useState<
    "CHO_DUYET" | "DA_BAN_HANH" | "THU_HOI"
  >("DA_BAN_HANH");

  const [alertError, setAlertError] = useState("");
  const [alertSuccess, setAlertSuccess] = useState("");

  const recipientsList = config?.recipients?.length
    ? config.recipients
    : DEFAULT_RECIPIENTS;
  const signersList = config?.signers?.length
    ? config.signers
    : DEFAULT_SIGNERS;

  const checkPerm = useCallback(
    (perm: PermissionKey): boolean => {
      if (!user) return false;
      if (user.role === "ADMIN") return true;
      return Boolean(config?.rolePermissions?.[user.role]?.[perm]);
    },
    [user, config]
  );

  const loadSession = useCallback(async () => {
    setAuthChecking(true);
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setConfig(data.config);
      } else {
        setUser(null);
        if (data.config) setConfig(data.config);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    setDocsLoading(true);
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
        year: String(selectedYear),
        search: searchQuery,
      });
      const res = await fetch(`/api/documents?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents || []);
        setCounters(data.counters || null);
      }
    } catch {
      // ignore
    } finally {
      setDocsLoading(false);
    }
  }, [user, selectedCategory, selectedYear, searchQuery]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user, fetchDocuments]);

  function openTakeNumberModal(defaultCat?: DocCategory) {
    setFormCategory(
      defaultCat || (selectedCategory !== "ALL" ? selectedCategory : "KH")
    );
    setFormNgayLaySo(new Date().toISOString().slice(0, 10));
    setFormTrichYeu("");
    setFormNoiGui("");
    setFormNguoiKy(signersList[0] || DEFAULT_SIGNERS[0]);
    setFormNguoiLaySoName(user?.fullName || "");
    setFormGhiChu("");
    setAlertError("");
    setShowTakeModal(true);
  }

  async function handleTakeNumberSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingDoc(true);
    setAlertError("");
    setAlertSuccess("");
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formCategory,
          ngayLaySo: formNgayLaySo,
          trichYeu: formTrichYeu,
          noiGui: formNoiGui,
          nguoiKy: formNguoiKy,
          nguoiLaySoName: formNguoiLaySoName,
          ghiChu: formGhiChu,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertError(data.error || "Không thể lấy số văn bản");
      } else {
        setShowTakeModal(false);
        setIssuedDoc(data.document);
        setAlertSuccess(data.message);
        fetchDocuments();
      }
    } catch {
      setAlertError("Lỗi kết nối máy chủ");
    } finally {
      setSubmittingDoc(false);
    }
  }

  function openEditModal(doc: DocumentDTO) {
    setEditingDoc(doc);
    setEditNgayLaySo(doc.ngayLaySo.slice(0, 10));
    setEditTrichYeu(doc.trichYeu);
    setEditNoiGui(doc.noiGui);
    setEditNguoiKy(doc.nguoiKy);
    setEditNguoiLaySoName(doc.nguoiLaySoName);
    setEditGhiChu(doc.ghiChu || "");
    setEditTrangThai(doc.trangThai);
  }

  async function handleUpdateDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDoc) return;
    setAlertError("");
    setAlertSuccess("");
    try {
      const res = await fetch(`/api/documents/${editingDoc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ngayLaySo: editNgayLaySo,
          trichYeu: editTrichYeu,
          noiGui: editNoiGui,
          nguoiKy: editNguoiKy,
          nguoiLaySoName: editNguoiLaySoName,
          ghiChu: editGhiChu,
          trangThai: editTrangThai,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertError(data.error || "Cập nhật thất bại");
      } else {
        setAlertSuccess(data.message);
        setEditingDoc(null);
        fetchDocuments();
      }
    } catch {
      setAlertError("Lỗi kết nối");
    }
  }

  async function handleDeleteDocument(doc: DocumentDTO) {
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa số văn bản "${doc.soHieu}" (${doc.trichYeu})?`
      )
    ) {
      return;
    }
    setAlertError("");
    setAlertSuccess("");
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setAlertError(data.error || "Xóa thất bại");
      } else {
        setAlertSuccess(data.message);
        fetchDocuments();
      }
    } catch {
      setAlertError("Lỗi kết nối");
    }
  }

  function copySoHieu(soHieu: string, id: string) {
    navigator.clipboard.writeText(soHieu);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleExportCSV() {
    if (documents.length === 0) return;
    const headers = [
      "STT",
      "Ngày tháng năm lấy số",
      "Số hiệu",
      "Loại VB",
      "Trích yếu nội dung",
      "Nơi nhận / gửi",
      "Người ký",
      "Người lấy số",
      "Ghi chú",
    ];
    const rows = documents.map((d) => [
      d.stt,
      new Date(d.ngayLaySo).toLocaleDateString("vi-VN"),
      d.soHieu,
      d.category,
      `"${d.trichYeu.replace(/"/g, '""')}"`,
      `"${d.noiGui.replace(/"/g, '""')}"`,
      `"${d.nguoiKy.replace(/"/g, '""')}"`,
      `"${d.nguoiLaySoName.replace(/"/g, '""')}"`,
      `"${(d.ghiChu || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `So-Van-Ban-${selectedCategory}-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-300">Đang khởi tạo hệ thống sổ văn bản...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onLoginSuccess={(u) => {
          setUser(u);
          loadSession();
        }}
      />
    );
  }

  const categoryBadgeMap: Record<DocCategory, string> = {
    KH: "bg-blue-100 text-blue-800 border-blue-200",
    BC: "bg-emerald-100 text-emerald-800 border-emerald-200",
    TTr: "bg-amber-100 text-amber-800 border-amber-200",
    GM: "bg-purple-100 text-purple-800 border-purple-200",
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shadow-inner">
              <FileText className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight">
                  SỔ LẤY SỐ VĂN BẢN ĐIỆN TỬ
                </h1>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 border border-blue-400/30 text-blue-200 font-mono">
                  {config?.unitCode || "KV7"}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {config?.unitName || "Đơn vị KV7"} • Kế hoạch (KH), Báo cáo (BC), Tờ trình (TTr), Giấy mời (GM)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/10 text-slate-200">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {config?.storageMode === "MONGODB"
                  ? "MongoDB Connected"
                  : "Local DB"}
              </span>
            </div>

            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white">{user.fullName}</div>
              <div className="text-[11px] text-blue-300">
                {ROLE_LABELS[user.role]} ({user.username})
              </div>
            </div>

            <button
              onClick={() => setShowProfileModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition border border-white/15"
              title="Đổi tên tài khoản hoặc mật khẩu"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              <span>Đổi TK / Mật khẩu</span>
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-xs font-medium text-white transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thoát</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-950/50 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab("SO_VAN_BAN")}
              className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === "SO_VAN_BAN"
                  ? "border-blue-400 text-white bg-white/5"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              Sổ Lấy Số Văn Bản (KH, BC, TTr, GM)
            </button>

            <button
              onClick={() => setActiveTab("TAI_KHOAN")}
              className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === "TAI_KHOAN"
                  ? "border-blue-400 text-white bg-white/5"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              Quản lý Tài khoản ({ROLE_LABELS[user.role]})
            </button>

            <button
              onClick={() => setActiveTab("PHAN_QUYEN")}
              className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === "PHAN_QUYEN"
                  ? "border-blue-400 text-white bg-white/5"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <Shield className="w-4 h-4" />
              Phân quyền & Cấu hình
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === "SO_VAN_BAN" && (
          <>
            {/* 4 Category Cards: KH, BC, TTr, GM (Đã bỏ "Số tiếp theo dự kiến") */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DOC_CATEGORIES.map((cat) => {
                const stat = counters?.[cat.code];
                const isSelected = selectedCategory === cat.code;
                return (
                  <div
                    key={cat.code}
                    onClick={() =>
                      setSelectedCategory(isSelected ? "ALL" : cat.code)
                    }
                    className={`bg-white rounded-xl p-4 border transition cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between ${
                      isSelected
                        ? "ring-2 ring-blue-600 border-blue-600"
                        : "border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${cat.badgeColor}`}
                        >
                          Mục {cat.code}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          Đã cấp: <strong>{stat?.totalDocs ?? 0}</strong> số
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base mt-2">
                        {cat.name} ({cat.code})
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {cat.description}
                      </p>
                    </div>

                    {checkPerm("TAKE_NUMBER") && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTakeNumberModal(cat.code);
                          }}
                          className="w-full justify-center px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Lấy số {cat.name} ({cat.code})
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Banner hiển thị số vừa cấp */}
            {issuedDoc && (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-emerald-100 uppercase font-semibold">
                      Cấp số văn bản thành công!
                    </div>
                    <div className="text-lg font-bold flex items-center gap-2">
                      <span>Số hiệu:</span>
                      <span className="font-mono bg-white text-emerald-900 px-2.5 py-0.5 rounded-md shadow">
                        {issuedDoc.soHieu}
                      </span>
                      <span className="text-sm font-normal text-emerald-50">
                        — {issuedDoc.trichYeu}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copySoHieu(issuedDoc.soHieu, issuedDoc.id)}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    {copiedId === issuedDoc.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Đã sao chép
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Sao chép số hiệu
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIssuedDoc(null)}
                    className="text-xs text-emerald-100 hover:text-white px-2"
                  >
                    Đóng ✕
                  </button>
                </div>
              </div>
            )}

            {alertError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{alertError}</span>
              </div>
            )}

            {alertSuccess && !issuedDoc && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{alertSuccess}</span>
              </div>
            )}

            {/* Filter & Action Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedCategory === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Tất cả các mục
                </button>
                {DOC_CATEGORIES.map((cat) => (
                  <button
                    key={cat.code}
                    onClick={() => setSelectedCategory(cat.code)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      selectedCategory === cat.code
                        ? "bg-blue-700 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {cat.name} ({cat.code})
                  </button>
                ))}

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      Sổ năm {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm số hiệu, trích yếu, người ký..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                {checkPerm("EXPORT_EXCEL") && (
                  <button
                    onClick={handleExportCSV}
                    disabled={documents.length === 0}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-lg transition"
                  >
                    <Download className="w-4 h-4" />
                    Xuất Excel/CSV
                  </button>
                )}

                {checkPerm("TAKE_NUMBER") && (
                  <button
                    onClick={() => openTakeNumberModal()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-lg shadow transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Lấy số văn bản mới
                  </button>
                )}
              </div>
            </div>

            {/* Table: STT, Ngày tháng năm lấy số, Số hiệu, Trích yếu nội dung, Nơi nhận/gửi, Người ký, Người lấy số, Ghi chú */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600 font-bold">
                    <tr>
                      <th className="px-3.5 py-3.5 text-center w-14">STT</th>
                      <th className="px-3.5 py-3.5 whitespace-nowrap">
                        Ngày tháng năm lấy số
                      </th>
                      <th className="px-3.5 py-3.5 whitespace-nowrap">
                        Số hiệu
                      </th>
                      <th className="px-4 py-3.5 min-w-[240px]">
                        Trích yếu nội dung
                      </th>
                      <th className="px-3.5 py-3.5 min-w-[140px]">
                        Nơi nhận / gửi
                      </th>
                      <th className="px-3.5 py-3.5 whitespace-nowrap">
                        Người ký
                      </th>
                      <th className="px-3.5 py-3.5 whitespace-nowrap">
                        Người lấy số
                      </th>
                      <th className="px-3.5 py-3.5 min-w-[130px]">Ghi chú</th>
                      <th className="px-3.5 py-3.5 text-right whitespace-nowrap">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {docsLoading ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          Đang tải dữ liệu sổ văn bản...
                        </td>
                      </tr>
                    ) : documents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-12 text-center text-slate-500"
                        >
                          <div className="max-w-sm mx-auto space-y-2">
                            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                            <div className="font-semibold text-slate-700">
                              Chưa có văn bản nào trong sổ
                            </div>
                            <p className="text-xs text-slate-500">
                              Hãy nhấn nút <strong>&ldquo;Lấy số văn bản mới&rdquo;</strong> để hệ thống tự động cấp số hiệu theo mục KH, BC, TTr hoặc GM.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      documents.map((doc) => {
                        const isOwner = doc.nguoiLaySoId === user.id;
                        const canEdit =
                          checkPerm("EDIT_ANY_DOC") ||
                          (isOwner && checkPerm("EDIT_OWN_DOC"));
                        const canDelete =
                          checkPerm("DELETE_ANY_DOC") ||
                          (isOwner && checkPerm("DELETE_OWN_DOC"));

                        return (
                          <tr
                            key={doc.id}
                            className="hover:bg-slate-50/90 transition"
                          >
                            <td className="px-3.5 py-3 text-center font-bold text-slate-700">
                              {doc.stt}
                            </td>
                            <td className="px-3.5 py-3 whitespace-nowrap text-slate-700 font-medium">
                              {new Date(doc.ngayLaySo).toLocaleDateString(
                                "vi-VN"
                              )}
                            </td>
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <span
                                  className={`px-2.5 py-1 rounded-md font-mono font-bold text-xs border ${
                                    categoryBadgeMap[doc.category]
                                  }`}
                                >
                                  {doc.soHieu}
                                </span>
                                <button
                                  onClick={() => copySoHieu(doc.soHieu, doc.id)}
                                  title="Sao chép số hiệu"
                                  className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                >
                                  {copiedId === doc.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-900 font-medium">
                              {doc.trichYeu}
                            </td>
                            <td className="px-3.5 py-3 text-slate-700">
                              {doc.noiGui}
                            </td>
                            <td className="px-3.5 py-3 text-slate-800 font-medium whitespace-nowrap">
                              {doc.nguoiKy}
                            </td>
                            <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">
                              {doc.nguoiLaySoName}
                            </td>
                            <td className="px-3.5 py-3 text-slate-500 text-xs">
                              {doc.ghiChu || "—"}
                            </td>
                            <td className="px-3.5 py-3 text-right whitespace-nowrap space-x-1">
                              {canEdit && (
                                <button
                                  onClick={() => openEditModal(doc)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Sửa
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteDocument(doc)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Xóa
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === "TAI_KHOAN" && (
          <UsersManagementPanel
            currentUser={user}
            canManageUsers={checkPerm("MANAGE_USERS")}
          />
        )}

        {activeTab === "PHAN_QUYEN" && config && (
          <PermissionsMatrixPanel
            config={config}
            canManagePermissions={checkPerm("MANAGE_PERMISSIONS")}
            onConfigUpdated={(newCfg) => {
              setConfig(newCfg);
              fetchDocuments();
            }}
          />
        )}
      </main>

      {/* Modal Lấy Số Văn Bản Mới */}
      {showTakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-visible my-8">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-800 to-indigo-900 text-white rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  Lấy Số Văn Bản Mới
                </h3>
                <p className="text-xs text-blue-200">
                  Chọn mục văn bản và điền thông tin để hệ thống cấp số tự động
                </p>
              </div>
              <button
                onClick={() => setShowTakeModal(false)}
                className="text-blue-200 hover:text-white text-sm"
              >
                Đóng ✕
              </button>
            </div>

            <form onSubmit={handleTakeNumberSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mục văn bản (KH, BC, TTr, GM) *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) =>
                      setFormCategory(e.target.value as DocCategory)
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                  >
                    {DOC_CATEGORIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày tháng năm lấy số *
                  </label>
                  <input
                    type="date"
                    required
                    value={formNgayLaySo}
                    onChange={(e) => setFormNgayLaySo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trích yếu nội dung văn bản *
                </label>
                <textarea
                  rows={2}
                  required
                  value={formTrichYeu}
                  onChange={(e) => setFormTrichYeu(e.target.value)}
                  placeholder="Nhập trích yếu nội dung văn bản..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nơi nhận / gửi *{" "}
                    <span className="font-normal text-slate-500">
                      (Nhập mới bấm + để lưu)
                    </span>
                  </label>
                  <RecipientAutocomplete
                    value={formNoiGui}
                    onChange={setFormNoiGui}
                    recipients={recipientsList}
                    onRecipientAdded={(newList, addedItem) => {
                      setConfig((prev) =>
                        prev ? { ...prev, recipients: newList } : prev
                      );
                      setFormNoiGui(addedItem);
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Người ký văn bản *
                  </label>
                  <select
                    value={formNguoiKy}
                    onChange={(e) => setFormNguoiKy(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                  >
                    {signersList.map((signer) => (
                      <option key={signer} value={signer}>
                        {signer}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Người lấy số *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNguoiLaySoName}
                    onChange={(e) => setFormNguoiLaySoName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ghi chú
                  </label>
                  <input
                    type="text"
                    value={formGhiChu}
                    onChange={(e) => setFormGhiChu(e.target.value)}
                    placeholder="Ghi chú thêm (nếu có)..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTakeModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingDoc}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg shadow"
                >
                  {submittingDoc ? "Đang cấp số..." : "Xác nhận Lấy Số"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa văn bản */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-visible">
            <div className="px-6 py-4 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between">
              <h3 className="font-bold text-base">
                Cập nhật văn bản số:{" "}
                <span className="font-mono text-amber-400">
                  {editingDoc.soHieu}
                </span>
              </h3>
              <button
                onClick={() => setEditingDoc(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateDocument} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số hiệu văn bản
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingDoc.soHieu}
                    className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-100 rounded-lg font-mono font-bold text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày tháng năm lấy số *
                  </label>
                  <input
                    type="date"
                    required
                    value={editNgayLaySo}
                    onChange={(e) => setEditNgayLaySo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trích yếu nội dung *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editTrichYeu}
                  onChange={(e) => setEditTrichYeu(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nơi nhận / gửi *
                  </label>
                  <RecipientAutocomplete
                    value={editNoiGui}
                    onChange={setEditNoiGui}
                    recipients={recipientsList}
                    onRecipientAdded={(newList, addedItem) => {
                      setConfig((prev) =>
                        prev ? { ...prev, recipients: newList } : prev
                      );
                      setEditNoiGui(addedItem);
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Người ký văn bản *
                  </label>
                  <select
                    value={editNguoiKy}
                    onChange={(e) => setEditNguoiKy(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-medium text-slate-900"
                  >
                    {!signersList.includes(editNguoiKy) && editNguoiKy && (
                      <option value={editNguoiKy}>{editNguoiKy}</option>
                    )}
                    {signersList.map((signer) => (
                      <option key={signer} value={signer}>
                        {signer}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Người lấy số *
                  </label>
                  <input
                    type="text"
                    required
                    value={editNguoiLaySoName}
                    onChange={(e) => setEditNguoiLaySoName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ghi chú
                  </label>
                  <input
                    type="text"
                    value={editGhiChu}
                    onChange={(e) => setEditGhiChu(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đổi tài khoản & mật khẩu cá nhân */}
      {showProfileModal && (
        <ProfileAccountModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          onUpdated={(updatedUser) => setUser(updatedUser)}
        />
      )}
    </div>
  );
}
