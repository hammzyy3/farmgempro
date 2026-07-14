import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db, auth, loginWithGoogle, logoutUser } from "../services/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  addDoc,
  where
} from "firebase/firestore";
import { UserProfile, SystemConfig, WithdrawalRequest } from "../types";
import { 
  ShieldAlert, 
  LogIn, 
  LogOut, 
  Settings, 
  Users, 
  CreditCard, 
  Check, 
  X, 
  Search, 
  Loader2, 
  Coins, 
  Sliders, 
  Clock, 
  Award,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const AdminPage: React.FC = () => {
  const { config: globalConfig, showAlert, setUser } = useApp();

  const [isAdminAuth, setIsAdminAuth] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Admin tabs
  const [activeAdminTab, setActiveAdminTab] = useState<"config" | "users" | "withdrawals">("config");

  // State for configs management
  const [configFields, setConfigFields] = useState<SystemConfig | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // State for users management
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingGems, setEditingGems] = useState<string>("");
  const [editingExp, setEditingExp] = useState<string>("");
  const [editingLevel, setEditingLevel] = useState<string>("");

  // State for withdrawals approval
  const [withdrawalsList, setWithdrawalsList] = useState<WithdrawalRequest[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState<boolean>(true);

  // Listen to Auth State
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((fUser) => {
      if (fUser) {
        setCurrentUserEmail(fUser.email);
        // Authorization check: Allow specific admins or non-anonymous logins
        if (
          fUser.email === "gskamiayaka@gmail.com" || 
          fUser.email?.endsWith("@admin.com") || 
          fUser.email === "admin@farmgem.com" || 
          fUser.isAnonymous === false
        ) {
          setIsAdminAuth(true);
        } else {
          setIsAdminAuth(false);
        }
      } else {
        setIsAdminAuth(false);
        setCurrentUserEmail(null);
      }
      setAuthLoading(false);
    });

    return () => unsub();
  }, []);

  // Fetch admin configs
  useEffect(() => {
    if (!isAdminAuth) return;

    const unsub = onSnapshot(doc(db, "config", "global"), (snap) => {
      if (snap.exists()) {
        setConfigFields(snap.data() as SystemConfig);
      }
    });

    return () => unsub();
  }, [isAdminAuth]);

  // Fetch all registered users
  const fetchAllUsers = async () => {
    setUsersLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list: UserProfile[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as UserProfile);
      });
      setUsersList(list);
    } catch (e) {
      console.error("Error fetching users:", e);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuth && activeAdminTab === "users") {
      fetchAllUsers();
    }
  }, [isAdminAuth, activeAdminTab]);

  // Listen to ALL pending withdrawal requests in real-time
  useEffect(() => {
    if (!isAdminAuth) return;

    setWithdrawalsLoading(true);
    const q = query(
      collection(db, "withdrawals"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: WithdrawalRequest[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as WithdrawalRequest);
      });
      setWithdrawalsList(list);
      setWithdrawalsLoading(false);
    }, (err) => {
      console.error(err);
      setWithdrawalsLoading(false);
    });

    return () => unsub();
  }, [isAdminAuth]);

  const handleAdminLogin = async () => {
    try {
      setAuthLoading(true);
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
      showAlert("Đăng nhập Admin thất bại.", "error");
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await logoutUser();
      setIsAdminAuth(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Save modified configurations
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configFields) return;

    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, "config", "global"), configFields);
      showAlert("Cập nhật cấu hình hệ thống thời gian thực thành công!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Lỗi khi lưu cấu hình.", "error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Update user stats
  const handleSaveUserStats = async (userId: string) => {
    const gemsNum = parseFloat(editingGems);
    const expNum = parseInt(editingExp, 10);
    const levelNum = parseInt(editingLevel, 10);

    if (isNaN(gemsNum) || isNaN(expNum) || isNaN(levelNum)) {
      showAlert("Vui lòng điền số hợp lệ!", "warning");
      return;
    }

    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        gems: gemsNum,
        exp: expNum,
        minerLevel: levelNum,
        updatedAt: new Date().toISOString()
      });

      // Add a history record for admin adjustment
      const historyRef = collection(db, "users", userId, "gemHistory");
      await addDoc(historyRef, {
        id: Math.random().toString(36).substr(2, 9),
        type: "referral_bonus",
        amount: 0,
        description: `Quản trị viên điều chỉnh tài khoản (Gems: ${gemsNum}, EXP: ${expNum}, Miner Lvl: ${levelNum})`,
        createdAt: new Date().toISOString()
      });

      showAlert("Cập nhật số liệu người dùng thành công!", "success");
      setEditingUserId(null);
      fetchAllUsers();
    } catch (e) {
      console.error(e);
      showAlert("Lỗi điều chỉnh dữ liệu người dùng.", "error");
    }
  };

  // Approve/Reject Withdrawals
  const handleWithdrawalDecision = async (request: WithdrawalRequest, isApproved: boolean) => {
    try {
      const newStatus = isApproved ? "approved" : "rejected";

      const wdDocRef = doc(db, "withdrawals", request.id);

      // Update withdrawal ticket
      await updateDoc(wdDocRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Write notice to user's history
      const userHistoryRef = collection(db, "users", request.userId, "gemHistory");
      await addDoc(userHistoryRef, {
        id: Math.random().toString(36).substr(2, 9),
        type: "withdrawal",
        amount: isApproved ? 0 : request.gemAmount, // refund if rejected
        description: isApproved 
          ? `✓ Yêu cầu rút tiền MoMo ${request.amountVnd.toLocaleString()}đ của bạn đã được Admin phê duyệt & giải ngân thành công!`
          : `✗ Yêu cầu rút tiền MoMo ${request.amountVnd.toLocaleString()}đ bị từ chối (Hoàn trả +${request.gemAmount} GEM)`,
        createdAt: new Date().toISOString()
      });

      // Refund user profile if rejected
      if (!isApproved) {
        const userDocRef = doc(db, "users", request.userId);
        const usersSnap = await getDocs(query(collection(db, "users"), where("telegramId", "==", request.userId)));
        if (!usersSnap.empty) {
          const uProfile = usersSnap.docs[0].data() as UserProfile;
          await updateDoc(userDocRef, {
            gems: uProfile.gems + request.gemAmount,
            updatedAt: new Date().toISOString()
          });
        }
      }

      showAlert(`Đã ${isApproved ? "DUYỆT" : "TỪ CHỐI"} đơn rút tiền thành công!`, "success");

    } catch (e) {
      console.error(e);
      showAlert("Lỗi xử lý yêu cầu rút tiền.", "error");
    }
  };

  // Filter users based on search
  const filteredUsers = usersList.filter(u => 
    u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.telegramId.includes(searchTerm) || 
    (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-red-500" size={32} />
        <p className="text-sm text-gray-400">Đang tải phân hệ quản trị...</p>
      </div>
    );
  }

  // Login Screen if not authenticated
  if (!isAdminAuth) {
    return (
      <div className="sleek-blur p-6 rounded-2xl text-center max-w-sm mx-auto shadow-xl py-12 glow-red">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 mx-auto animate-pulse">
          <ShieldAlert size={36} />
        </div>

        <div className="space-y-1.5 mt-4">
          <h1 className="text-base font-extrabold text-white">Xác Thực Quản Trị Viên</h1>
          <p className="text-xs text-gray-300 leading-relaxed">
            Phân hệ này chỉ cho phép Admin có thẩm quyền truy cập cấu hình thời gian thực & dữ liệu người chơi.
          </p>
        </div>

        {currentUserEmail && (
          <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-3 rounded-xl text-[11px] flex items-start gap-1.5 text-left mt-4">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>Tài khoản {currentUserEmail} không có quyền Admin. Vui lòng đăng nhập với email gskamiayaka@gmail.com</span>
          </div>
        )}

        <button
          onClick={handleAdminLogin}
          className="w-full py-3.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg mt-6 cursor-pointer"
        >
          <LogIn size={16} />
          <span>Đăng Nhập Bằng Google Admin</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Admin header info card */}
      <div className="sleek-blur p-5 rounded-2xl border border-red-500/20 flex items-center justify-between shadow-md glow-red">
        <div className="flex items-center gap-3">
          <ShieldAlert size={20} className="text-red-400" />
          <div>
            <h1 className="text-xs font-bold text-red-400 uppercase tracking-widest">Bảng Điều Khiển Admin</h1>
            <p className="text-[10px] text-gray-400 mt-0.5">Admin: {currentUserEmail}</p>
          </div>
        </div>
        <button
          onClick={handleAdminLogout}
          className="p-1.5 bg-white/5 hover:bg-red-500/15 hover:text-red-400 rounded-lg text-gray-400 transition cursor-pointer"
          title="Đăng xuất"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Admin Page Navigation Tabs */}
      <div className="flex sleek-blur rounded-xl overflow-hidden shadow">
        {[
          { id: "config", label: "Cấu hình app", icon: Settings },
          { id: "withdrawals", label: "Yêu cầu rút tiền", icon: CreditCard },
          { id: "users", label: "Quản lý người dùng", icon: Users }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`flex-1 py-3 text-[11px] font-bold transition flex flex-col items-center gap-1 ${
                activeAdminTab === tab.id
                  ? "bg-red-500/10 text-red-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab contents */}
      <AnimatePresence mode="wait">
        {activeAdminTab === "config" && configFields && (
          // 1. Cấu hình app thời gian thực
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSaveConfig}
            className="sleek-blur p-5 rounded-2xl space-y-4 shadow-md"
          >
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
              <Sliders size={14} className="text-red-400" />
              <span>Cấu Hình Tham Số Trò Chơi</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Ad reward range */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-medium">QC Gems tối thiểu:</label>
                <input
                  type="number"
                  value={configFields.adRewardMin}
                  onChange={(e) => setConfigFields({ ...configFields, adRewardMin: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/5 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-medium">QC Gems tối đa:</label>
                <input
                  type="number"
                  value={configFields.adRewardMax}
                  onChange={(e) => setConfigFields({ ...configFields, adRewardMax: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/5 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition"
                />
              </div>

              {/* Ad exp range */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-medium">QC EXP tối thiểu:</label>
                <input
                  type="number"
                  value={configFields.adRewardExpMin}
                  onChange={(e) => setConfigFields({ ...configFields, adRewardExpMin: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/5 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-medium">QC EXP tối đa:</label>
                <input
                  type="number"
                  value={configFields.adRewardExpMax}
                  onChange={(e) => setConfigFields({ ...configFields, adRewardExpMax: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/5 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition"
                />
              </div>

              {/* Cooldown and view count limit */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-medium">Thời gian chờ QC (s):</label>
                <input
                  type="number"
                  value={configFields.adCooldownSeconds}
                  onChange={(e) => setConfigFields({ ...configFields, adCooldownSeconds: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/5 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-medium">Xem tối đa / ngày:</label>
                <input
                  type="number"
                  value={configFields.adMaxViewsPerDay}
                  onChange={(e) => setConfigFields({ ...configFields, adMaxViewsPerDay: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/5 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition"
                />
              </div>

              {/* Miner stats */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-medium">Tốc độ đào cơ bản (Lv.1):</label>
                <input
                  type="number"
                  value={configFields.miningBaseRate}
                  onChange={(e) => setConfigFields({ ...configFields, miningBaseRate: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/5 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-medium">Thời gian đào (giờ):</label>
                <input
                  type="number"
                  value={configFields.miningDurationHours}
                  onChange={(e) => setConfigFields({ ...configFields, miningDurationHours: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/5 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition"
                />
              </div>

              {/* Withdrawal & Exchange Rate */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-medium">Rút tối thiểu (VNĐ):</label>
                <input
                  type="number"
                  value={configFields.withdrawalMinVnd}
                  onChange={(e) => setConfigFields({ ...configFields, withdrawalMinVnd: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/5 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-medium">Tỷ lệ đổi (GEM = 1 VNĐ):</label>
                <input
                  type="number"
                  value={configFields.gemToVndRate}
                  onChange={(e) => setConfigFields({ ...configFields, gemToVndRate: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/5 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingConfig}
              className="w-full py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:bg-white/5 disabled:text-gray-500 text-white font-bold text-xs rounded-xl transition mt-4 cursor-pointer"
            >
              {isSavingConfig ? "Đang lưu cấu hình..." : "Lưu Thay Đổi"}
            </button>
          </motion.form>
        )}

        {activeAdminTab === "withdrawals" && (
          // 2. Yêu cầu rút tiền quản lý
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sleek-blur p-5 rounded-2xl space-y-4 shadow-md"
          >
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
              <CreditCard size={14} className="text-red-400" />
              <span>Duyệt Giao Dịch Giải Ngân MoMo</span>
            </h3>

            {withdrawalsLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="animate-spin text-red-500" size={24} />
              </div>
            ) : withdrawalsList.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">Không tìm thấy đơn rút tiền nào.</p>
            ) : (
              <div className="space-y-4 divide-y divide-white/5">
                {withdrawalsList.map((wd) => (
                  <div key={wd.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          <span>{wd.amountVnd.toLocaleString()} VNĐ</span>
                          <span className="text-[10px] text-gray-400">({wd.momoNumber})</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Tên ví: <strong className="text-white">{wd.momoName}</strong> | {wd.firstName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono block text-amber-400 font-bold">-{wd.gemAmount.toLocaleString()} GEM</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${
                          wd.status === "pending"
                            ? "bg-amber-500/10 text-amber-400"
                            : wd.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}>
                          {wd.status === "pending" ? "Chờ duyệt" : wd.status === "approved" ? "Thành công" : "Từ chối"}
                        </span>
                      </div>
                    </div>

                    {wd.status === "pending" && (
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                          onClick={() => handleWithdrawalDecision(wd, true)}
                          className="py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check size={12} />
                          <span>Duyệt đơn</span>
                        </button>
                        <button
                          onClick={() => handleWithdrawalDecision(wd, false)}
                          className="py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-[10px] rounded-lg border border-red-500/20 transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <X size={12} />
                          <span>Từ chối</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeAdminTab === "users" && (
          // 3. Quản lý người chơi
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sleek-blur p-5 rounded-2xl space-y-4 shadow-md"
          >
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
              <Users size={14} className="text-red-400" />
              <span>Điều Chỉnh Hồ Sơ Người Chơi</span>
            </h3>

            {/* Search inputs */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc Telegram ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/5 focus:border-red-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none transition"
              />
            </div>

            {usersLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="animate-spin text-red-500" size={24} />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">Không tìm thấy người chơi nào.</p>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 divide-y divide-white/5">
                {filteredUsers.map((u) => (
                  <div key={u.telegramId} className="pt-3 first:pt-0 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white">{u.firstName}</p>
                        <p className="text-[10px] text-gray-400">@{u.username || "username"} | ID: {u.telegramId}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end font-bold text-amber-400 text-[11px]">
                          <Coins size={10} />
                          <span>{Math.round(u.gems).toLocaleString()} GEM</span>
                        </div>
                        <p className="text-[9px] text-gray-400 mt-0.5">Lvl {u.minerLevel} Miner | {u.exp} XP</p>
                      </div>
                    </div>

                    {editingUserId === u.telegramId ? (
                      // Inline edit panel
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                          <div className="space-y-1">
                            <span className="text-gray-400 font-semibold">Gems:</span>
                            <input
                              type="number"
                              value={editingGems}
                              onChange={(e) => setEditingGems(e.target.value)}
                              className="w-full bg-neutral-900 border border-white/5 rounded px-2 py-1 text-white text-xs outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-400 font-semibold">EXP:</span>
                            <input
                              type="number"
                              value={editingExp}
                              onChange={(e) => setEditingExp(e.target.value)}
                              className="w-full bg-neutral-900 border border-white/5 rounded px-2 py-1 text-white text-xs outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-400 font-semibold">Miner Lv:</span>
                            <input
                              type="number"
                              value={editingLevel}
                              onChange={(e) => setEditingLevel(e.target.value)}
                              className="w-full bg-neutral-900 border border-white/5 rounded px-2 py-1 text-white text-xs outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveUserStats(u.telegramId)}
                            className="flex-1 py-1.5 bg-emerald-500 text-white font-bold text-[10px] rounded cursor-pointer"
                          >
                            Lưu Lại
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="flex-1 py-1.5 bg-white/10 text-gray-300 font-bold text-[10px] rounded cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingUserId(u.telegramId);
                          setEditingGems(String(u.gems));
                          setEditingExp(String(u.exp));
                          setEditingLevel(String(u.minerLevel));
                        }}
                        className="py-1 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-[9px] px-2.5 rounded transition cursor-pointer"
                      >
                        Chỉnh sửa số liệu
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
