import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../services/firebase";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { UserProfile, Referral } from "../types";
import { 
  Trophy, 
  Users, 
  Gamepad2, 
  Coins, 
  Award,
  Loader2,
  Calendar,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { motion } from "motion/react";

interface LeaderboardUser {
  telegramId: string;
  name: string;
  username: string;
  score: number;
}

export const LeaderboardPage: React.FC = () => {
  const { user } = useApp();
  const [activeLeaderboard, setActiveLeaderboard] = useState<"friends" | "games">("friends");
  
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<LeaderboardUser[]>([]);
  const [gamesLeaderboard, setGamesLeaderboard] = useState<LeaderboardUser[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);

  // Load Leaderboards Data
  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        setLoading(true);

        // 1. Fetch Top Games Leaderboard directly from Users sorted by totalGamesWonGems
        const gamesQuery = query(
          collection(db, "users"),
          orderBy("totalGamesWonGems", "desc"),
          limit(10)
        );
        const gamesSnap = await getDocs(gamesQuery);
        const gamesList: LeaderboardUser[] = [];
        
        gamesSnap.forEach((doc) => {
          const u = doc.data() as UserProfile;
          if (u.totalGamesWonGems > 0) {
            gamesList.push({
              telegramId: u.telegramId,
              name: u.firstName,
              username: u.username || "player",
              score: Math.round(u.totalGamesWonGems)
            });
          }
        });

        setGamesLeaderboard(gamesList);

        // 2. Fetch Top Referrals Leaderboard
        // We load referrals where isQualified is true and group them by referrerId
        const referralsQuery = query(
          collection(db, "referrals"),
          where("isQualified", "==", true)
        );
        const referralsSnap = await getDocs(referralsQuery);
        const referrerCounts: { [key: string]: number } = {};
        
        referralsSnap.forEach((doc) => {
          const r = doc.data() as Referral;
          referrerCounts[r.referrerId] = (referrerCounts[r.referrerId] || 0) + 1;
        });

        // Load referrers details
        const referrersList: LeaderboardUser[] = [];
        for (const [referrerId, count] of Object.entries(referrerCounts)) {
          try {
            const rDoc = await getDocs(query(collection(db, "users"), where("telegramId", "==", referrerId)));
            if (!rDoc.empty) {
              const u = rDoc.docs[0].data() as UserProfile;
              referrersList.push({
                telegramId: u.telegramId,
                name: u.firstName,
                username: u.username || "referrer",
                score: count
              });
            }
          } catch (err) {
            console.error(err);
          }
        }

        // Sort desc
        referrersList.sort((a, b) => b.score - a.score);

        setFriendsLeaderboard(referrersList.slice(0, 10));

      } catch (err) {
        console.error("Leaderboards loading error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboards();
  }, []);

  const currentLeaderboard = activeLeaderboard === "friends" ? friendsLeaderboard : gamesLeaderboard;

  // Render rank badge
  const renderRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <span className="w-6 h-6 rounded-full bg-[#ffd700] text-black font-extrabold flex items-center justify-center text-xs shadow-md">
          1
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="w-6 h-6 rounded-full bg-[#c0c0c0] text-black font-extrabold flex items-center justify-center text-xs shadow-md">
          2
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="w-6 h-6 rounded-full bg-[#cd7f32] text-black font-extrabold flex items-center justify-center text-xs shadow-md">
          3
        </span>
      );
    }
    return (
      <span className="w-6 h-6 rounded-full bg-[#242f3d] text-[#708499] font-semibold flex items-center justify-center text-xs">
        {index + 1}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Overview/Banner Card */}
      <div className="bg-gradient-to-r from-amber-500/20 to-red-500/10 p-5 rounded-2xl border border-amber-500/10 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-xl"></div>
        <div className="flex items-start gap-3">
          <Trophy className="text-amber-400 shrink-0 mt-1" size={24} />
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Đua Top Nhận Thưởng Tuần</span>
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
            </h1>
            <p className="text-xs text-gray-300 leading-relaxed mt-0.5">
              Sự kiện diễn ra hàng tuần và tự động reset trao thưởng vào lúc <strong className="text-white">12:00 tối Chủ Nhật</strong> hàng tuần. Cày cuốc để chiếm giữ ngôi vương!
            </p>
          </div>
        </div>

        {/* Cooldown Info bar */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-amber-400 font-semibold">
          <Calendar size={12} />
          <span>Thời gian chốt giải: Chủ Nhật hàng tuần lúc 23:59 (GMT+7)</span>
        </div>
      </div>

      {/* Prize Pool visual reference */}
      <section className="sleek-blur p-4 rounded-xl space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cơ Cấu Giải Thưởng Tuần</h3>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Friends prizes */}
          <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-2">
            <h4 className="font-bold text-amber-400 flex items-center gap-1">
              <Users size={12} />
              Top Mời Bạn Bè
            </h4>
            <div className="space-y-1 text-[10px] text-gray-400">
              <div className="flex justify-between"><span className="text-amber-400 font-bold">Top 1</span><span>5,000 GEM</span></div>
              <div className="flex justify-between"><span className="text-gray-300 font-bold">Top 2</span><span>3,000 GEM</span></div>
              <div className="flex justify-between"><span className="text-[#cd7f32] font-bold">Top 3</span><span>2,000 GEM</span></div>
              <div className="flex justify-between"><span>Top 4-10</span><span>500 GEM</span></div>
            </div>
          </div>

          {/* Games prizes */}
          <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-2">
            <h4 className="font-bold text-emerald-400 flex items-center gap-1">
              <Gamepad2 size={12} />
              Top Thắng Games
            </h4>
            <div className="space-y-1 text-[10px] text-gray-400">
              <div className="flex justify-between"><span className="text-amber-400 font-bold">Top 1</span><span>3,000 GEM</span></div>
              <div className="flex justify-between"><span className="text-gray-300 font-bold">Top 2</span><span>2,000 GEM</span></div>
              <div className="flex justify-between"><span className="text-[#cd7f32] font-bold">Top 3</span><span>1,000 GEM</span></div>
              <div className="flex justify-between"><span>Top 4-10</span><span>May mắn</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard tabs */}
      <div className="sleek-blur rounded-2xl overflow-hidden shadow-md">
        {/* Tab Headers */}
        <div className="flex bg-[#202026] border-b border-blue-500/10 p-1.5 gap-2">
          <button
            onClick={() => setActiveLeaderboard("friends")}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeLeaderboard === "friends"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users size={14} />
            Bảng Vàng Bạn Bè
          </button>
          <button
            onClick={() => setActiveLeaderboard("games")}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeLeaderboard === "games"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Gamepad2 size={14} />
            Bảng Vàng Thách Đấu
          </button>
        </div>

        {/* Leaderboard Lists */}
        <div className="p-4 min-h-[300px]">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          ) : (
            <div className="space-y-1">
              {currentLeaderboard.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 bg-[#16161c]/40 border border-zinc-800 rounded-2xl">
                  <Trophy size={24} className="mx-auto text-zinc-600 mb-2 animate-bounce" />
                  Chưa có dữ liệu xếp hạng thực tế.
                </div>
              ) : (
                currentLeaderboard.map((uItem, index) => {
                  const isCurrentUser = user && uItem.telegramId === user.telegramId;
                  
                  return (
                    <div
                      key={uItem.telegramId}
                      className={`py-3.5 px-3 rounded-xl flex items-center justify-between transition-all ${
                        isCurrentUser 
                          ? "bg-blue-500/10 border border-blue-500/30" 
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {renderRankBadge(index)}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold ${isCurrentUser ? "text-blue-400" : "text-white"}`}>
                              {uItem.name}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[9px] bg-blue-500 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase animate-pulse">
                                Bạn
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400">@{uItem.username}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs font-bold justify-end">
                          {activeLeaderboard === "friends" ? (
                            <>
                              <Award size={12} className="text-emerald-400" />
                              <span className="text-emerald-400 font-mono">{uItem.score} Bạn</span>
                            </>
                          ) : (
                            <>
                              <Coins size={12} className="text-blue-400" />
                              <span className="text-blue-400 font-mono">{uItem.score.toLocaleString()} GEM</span>
                            </>
                          )}
                        </div>
                        <p className="text-[9px] text-gray-500 mt-0.5">
                          {activeLeaderboard === "friends" ? "Đã đạt cấp 2" : "Doanh thu Thắng"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
