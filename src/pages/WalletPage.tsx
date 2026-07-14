import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db, handleFirestoreError, OperationType } from "../services/firebase";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { GemHistoryEntry, WithdrawalRequest } from "../types";
import { 
  Wallet, 
  Coins, 
  History, 
  SendHorizontal, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Phone,
  UserCheck,
  CreditCard
} from "lucide-react";
import { motion } from "motion/react";

export const WalletPage: React.FC = () => {
  const { user, config, requestWithdrawal, showAlert } = useApp();

  const [momoNumber, setMomoNumber] = useState<string>("");
  const [momoName, setMomoName] = useState<string>("");
  const [amountVndStr, setAmountVndStr] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [historyLogs, setHistoryLogs] = useState<GemHistoryEntry[]>([]);
  const [withdrawalsList, setWithdrawalsList] = useState<WithdrawalRequest[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(true);
  const [wdLoading, setWdLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<"earn" | "withdraw">("earn");

  // Fetch 10 most recent gem history logs
  useEffect(() => {
    if (!user) return;

    const path = `users/${user.telegramId}/gemHistory`;
    const q = query(
      collection(db, path),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsub = onSnapshot(q, (snap) => {
      const logs: GemHistoryEntry[] = [];
      snap.forEach((doc) => {
        logs.push(doc.data() as GemHistoryEntry);
      });
      setHistoryLogs(logs);
      setLogsLoading(false);
    }, (err) => {
      console.error("Error fetching gem history logs:", err);
      setHistoryLogs([]);
      setLogsLoading(false);
    });

    return () => unsub();
  }, [user?.telegramId]);

  // Fetch withdrawals list
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "withdrawals"),
      where("userId", "==", user.telegramId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const wds: WithdrawalRequest[] = [];
      snap.forEach((doc) => {
        wds.push(doc.data() as WithdrawalRequest);
      });
      setWithdrawalsList(wds);
      setWdLoading(false);
    }, (err) => {
      console.error("Error fetching withdrawals:", err);
      setWithdrawalsList([]);
      setWdLoading(false);
    });

    return () => unsub();
  }, [user?.telegramId]);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanNum = momoNumber.trim();
    const cleanName = momoName.trim();
    const amountVal = parseInt(amountVndStr, 10);

    if (!cleanNum || !cleanName || isNaN(amountVal)) {
      showAlert("Vui lòng điền đầy đủ tất cả thông tin!", "warning");
      return;
    }

    if (amountVal < config.withdrawalMinVnd) {
      showAlert(`Số tiền rút tối thiểu là ${config.withdrawalMinVnd.toLocaleString()} VNĐ!`, "warning");
      return;
    }

    const requiredGems = amountVal * config.gemToVndRate;
    if (user.gems < requiredGems) {
      showAlert(`Số dư kim cương của bạn không đủ! Cần ${requiredGems.toLocaleString()} GEM.`, "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestWithdrawal(cleanNum, cleanName, amountVal);
      // Reset form
      setAmountVndStr("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const gemsCount = user?.gems || 0;
  const vndValue = gemsCount / config.gemToVndRate;

  return (
    <div className="space-y-6 pb-6">
      {/* Wallet Balance Card */}
      <div className="sleek-blur p-6 rounded-2xl relative overflow-hidden shadow-lg text-center glow-amber">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl"></div>
        <div className="mx-auto w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-3">
          <Wallet className="text-amber-400" size={24} />
        </div>
        <p className="text-xs text-gray-400 uppercase tracking-wider font-extrabold text-gradient">Ví Tài Sản Cá Nhân</p>
        <div className="mt-1 flex items-center justify-center gap-2">
          <Coins className="text-amber-400" size={28} />
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {gemsCount.toLocaleString()}
          </span>
          <span className="text-xs font-bold text-amber-400">GEM</span>
        </div>

        {/* Converted VND Value */}
        <div className="mt-3.5 inline-flex items-center gap-1.5 bg-white/5 border border-white/5 px-4 py-2 rounded-full shadow-sm">
          <span className="text-xs text-gray-400">Giá trị quy đổi:</span>
          <span className="text-sm font-extrabold text-emerald-400">
            {Math.floor(vndValue).toLocaleString()} VNĐ
          </span>
        </div>

        <div className="mt-3 text-[10px] text-gray-500">
          Tỷ giá hiện tại: 10 GEM = 1 VNĐ
        </div>
      </div>

      {/* Rút tiền MoMo section */}
      <section className="bg-[#17212b] p-5 rounded-2xl border border-[#242f3d] space-y-4 shadow-md">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#242f3d] pb-3">
          <SendHorizontal size={16} className="text-[#3390ec]" />
          <span>Yêu Cầu Rút Tiền Về Ví MoMo</span>
        </h2>

        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
          {/* Momo Account Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#708499] flex items-center gap-1.5">
              <Phone size={12} className="text-blue-400" />
              <span>Số tài khoản MoMo:</span>
            </label>
            <input
              type="text"
              required
              placeholder="Nhập số điện thoại liên kết MoMo..."
              value={momoNumber}
              onChange={(e) => setMomoNumber(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full bg-[#101921] border border-[#242f3d] focus:border-[#3390ec] text-sm text-white rounded-xl px-4 py-3 outline-none transition"
            />
          </div>

          {/* Momo Account Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#708499] flex items-center gap-1.5">
              <UserCheck size={12} className="text-blue-400" />
              <span>Tên chủ tài khoản:</span>
            </label>
            <input
              type="text"
              required
              placeholder="Nhập họ và tên không dấu (VÍ DỤ: NGUYEN VAN A)..."
              value={momoName}
              onChange={(e) => setMomoName(e.target.value.toUpperCase())}
              className="w-full bg-[#101921] border border-[#242f3d] focus:border-[#3390ec] text-sm text-white rounded-xl px-4 py-3 outline-none transition"
            />
          </div>

          {/* Amount (VND) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#708499] flex items-center gap-1.5">
              <CreditCard size={12} className="text-blue-400" />
              <span>Số tiền muốn rút (VNĐ):</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Tối thiểu 5,000 VNĐ..."
                value={amountVndStr}
                onChange={(e) => setAmountVndStr(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full bg-[#101921] border border-[#242f3d] focus:border-[#3390ec] text-sm text-white rounded-xl pl-4 pr-16 py-3 outline-none transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#708499]">VNĐ</span>
            </div>

            {/* Gem cost feedback */}
            {amountVndStr && !isNaN(parseInt(amountVndStr, 10)) && (
              <div className="text-[11px] text-orange-400 font-medium">
                Sẽ trừ: {(parseInt(amountVndStr, 10) * config.gemToVndRate).toLocaleString()} GEM
              </div>
            )}
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:bg-white/5 disabled:text-gray-500 text-white rounded-xl font-bold text-sm transition shadow-md flex items-center justify-center gap-2`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin text-white" size={16} />
                <span>Đang xử lý giao dịch...</span>
              </>
            ) : (
              <>
                <SendHorizontal size={16} />
                <span>Xác Nhận Rút Tiền</span>
              </>
            )}
          </button>
        </form>
      </section>

      {/* History Lists Tabs */}
      <section className="sleek-blur rounded-2xl overflow-hidden shadow-md">
        {/* Tab Headers */}
        <div className="flex border-b border-white/5 bg-white/5">
          <button
            onClick={() => setActiveTab("earn")}
            className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition ${
              activeTab === "earn"
                ? "border-amber-500 text-amber-500 bg-transparent"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <History size={14} />
              Lịch sử nhận GEM
            </span>
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition ${
              activeTab === "withdraw"
                ? "border-amber-500 text-amber-500 bg-transparent"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Wallet size={14} />
              Lịch sử rút tiền
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 min-h-[220px]">
          {activeTab === "earn" ? (
            // 1. Gem history
            logsLoading ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="animate-spin text-amber-500" size={24} />
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-xs space-y-2">
                <AlertCircle size={20} />
                <span>Không tìm thấy lịch sử giao dịch nào.</span>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {historyLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white">{log.description}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`font-bold ${log.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {log.amount >= 0 ? `+${log.amount.toLocaleString()}` : `${log.amount.toLocaleString()}`} GEM
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            // 2. Withdrawal requests
            wdLoading ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="animate-spin text-amber-500" size={24} />
              </div>
            ) : withdrawalsList.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-xs space-y-2">
                <AlertCircle size={20} />
                <span>Bạn chưa tạo yêu cầu rút tiền nào.</span>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {withdrawalsList.map((wd) => (
                  <div key={wd.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{wd.amountVnd.toLocaleString()} VNĐ</span>
                        <span className="text-[10px] text-gray-400">({wd.momoNumber})</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(wd.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium text-gray-400">-{wd.gemAmount.toLocaleString()} GEM</p>
                      {wd.status === "pending" ? (
                        <span className="text-[10px] bg-yellow-500/10 text-yellow-500 font-bold px-2 py-0.5 rounded-full mt-1 inline-block">
                          Chờ duyệt
                        </span>
                      ) : wd.status === "approved" ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full mt-1 inline-block">
                          Đã thanh toán
                        </span>
                      ) : (
                        <span className="text-[10px] bg-red-500/10 text-red-400 font-bold px-2 py-0.5 rounded-full mt-1 inline-block">
                          Từ chối
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
};
