import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../services/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { Referral } from "../types";
import { 
  Users, 
  Copy, 
  Check, 
  Share2, 
  AlertCircle, 
  CheckCircle2, 
  Coins, 
  Award,
  TrendingUp,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";

export const FriendsPage: React.FC = () => {
  const { user } = useApp();
  const [copied, setCopied] = useState<boolean>(false);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loadingFriends, setLoadingFriends] = useState<boolean>(true);

  // Load friends list
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "referrals"),
      where("referrerId", "==", user.telegramId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Referral[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as Referral);
      });
      setReferrals(list);
      setLoadingFriends(false);
    }, (err) => {
      console.error("Error fetching referrals:", err);
      setReferrals([]);
      setLoadingFriends(false);
    });

    return () => unsub();
  }, [user?.telegramId]);

  // Generate invite links
  const botUsername = "farmgem2026bot";
  const inviteUrl = `https://t.me/${botUsername}/app?startapp=${user?.telegramId || ""}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaTelegram = () => {
    const text = encodeURIComponent("⛏️ Hãy tham gia đào Gems miễn phí, xem quảng cáo nhận tiền mặt cùng mình trên Farm Gem nhé! 💎");
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${text}`;
    
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, "_blank");
    }
  };

  // Calculate stats
  const totalEarnedGems = referrals.reduce((sum, ref) => sum + (ref.earnedGems || 0), 0);
  const totalQualifiedCount = referrals.filter(ref => ref.isQualified).length;

  return (
    <div className="space-y-6 pb-6">
      {/* Overview Card */}
      <div className="sleek-blur p-5 rounded-2xl relative overflow-hidden shadow-lg glow-amber">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center shrink-0">
            <Users className="text-amber-500" size={24} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide text-gradient">Chương Trình Đại Sứ Farm Gem</h1>
            <p className="text-xs text-gray-300 leading-relaxed mt-0.5">
              Mời bạn bè cùng tham gia khai thác, nâng cao sức mạnh hầm mỏ để cả hai cùng nhận những phần quà cực khủng từ hệ thống!
            </p>
          </div>
        </div>

        {/* Benefits breakdown */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <Award className="text-emerald-400 mb-1" size={16} />
            <h4 className="text-[11px] font-bold text-white">Thưởng giới thiệu</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">+200 GEM & +20 EXP khi bạn bè đạt máy đào Cấp 2</p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <TrendingUp className="text-amber-500 mb-1" size={16} />
            <h4 className="text-[11px] font-bold text-white">Hưởng 5% doanh thu</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Nhận trọn đời 5% số Gems bạn bè kiếm được từ xem QC</p>
          </div>
        </div>
      </div>

      {/* Referral Link Actions */}
      <section className="sleek-blur p-5 rounded-2xl space-y-4 shadow-md">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Đường Dẫn Mời Bạn Bè</h3>
        
        <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3.5 py-3 overflow-hidden">
          <span className="text-xs text-gray-300 truncate flex-1 select-all">{inviteUrl}</span>
          <button 
            onClick={copyToClipboard}
            className="p-1.5 hover:bg-white/10 rounded-lg transition text-amber-500"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={copyToClipboard}
            className="py-3 bg-white/5 hover:bg-white/10 active:scale-[0.98] text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>Sao chép liên kết</span>
          </button>
          <button
            onClick={shareViaTelegram}
            className="py-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 active:scale-[0.98] text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Share2 size={14} />
            <span>Mở Telegram gửi</span>
          </button>
        </div>
      </section>

      {/* Dashboard Invited Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="sleek-blur p-4 rounded-xl text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold">Tổng số bạn bè</p>
          <p className="text-xl font-extrabold text-white mt-1">{referrals.length}</p>
          <p className="text-[9px] text-amber-500 mt-1">Hợp lệ (Lvl 2): {totalQualifiedCount}</p>
        </div>
        <div className="sleek-blur p-4 rounded-xl text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold">Gems từ bạn bè</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Coins className="text-amber-400" size={14} />
            <span className="text-xl font-extrabold text-amber-400">{totalEarnedGems.toLocaleString()}</span>
          </div>
          <p className="text-[9px] text-emerald-400 mt-1">Doanh thu hoa hồng</p>
        </div>
      </div>

      {/* Invited Friends List */}
      <section className="sleek-blur p-5 rounded-2xl space-y-4 shadow-md">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-3">Danh Sách Bạn Bè Đã Mời</h3>

        {loadingFriends ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="animate-spin text-amber-500" size={20} />
          </div>
        ) : referrals.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs space-y-2">
            <AlertCircle className="mx-auto text-gray-500" size={24} />
            <p>Bạn chưa mời người bạn nào tham gia.</p>
            <p className="text-[10px]">Hãy gửi liên kết mời để cùng bắt đầu cày cuốc nhé!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto pr-1">
            {referrals.map((friend) => (
              <div key={friend.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-white">
                    {friend.referredFirstName}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    @{friend.referredUsername || "username"}
                  </p>
                </div>

                <div className="text-right">
                  {friend.isQualified ? (
                    <div className="flex items-center gap-1 text-emerald-400 font-bold justify-end">
                      <CheckCircle2 size={12} />
                      <span>Đạt yêu cầu</span>
                    </div>
                  ) : (
                    <span className="text-gray-300 bg-white/5 border border-white/5 px-2 py-0.5 rounded text-[10px]">
                      Chưa đạt (Máy Đào Lv.{friend.referredMinerLevel})
                    </span>
                  )}
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Đã nhận: <span className="text-amber-400 font-semibold">+{friend.earnedGems} GEM</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
