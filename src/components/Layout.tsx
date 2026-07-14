import React from "react";
import { NavLink, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { 
  Coins, 
  Wallet, 
  Users, 
  Gamepad2, 
  Trophy, 
  ShieldAlert,
  Loader2,
  TrendingUp,
  Flame
} from "lucide-react";
import { motion } from "motion/react";
import { AlertModal } from "./AlertModal";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, error } = useApp();
  
  // Real Telegram environment check
  const isRealTelegram = !!(window.Telegram?.WebApp?.initDataUnsafe?.user?.id);

  // If not inside Telegram, require opening via Telegram
  if (!isRealTelegram) {
    return (
      <div className="min-h-screen bg-[#111114] text-slate-100 flex flex-col items-center justify-center p-6 font-sans max-w-md mx-auto relative shadow-2xl border-x border-zinc-800">
        <div className="sleek-blur p-6 rounded-2xl border border-blue-500/20 text-center space-y-6 shadow-xl max-w-xs w-full py-8 glow-blue">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 mx-auto animate-pulse">
            <Coins size={36} />
          </div>

          <div className="space-y-2">
            <h1 className="text-base font-extrabold text-white uppercase tracking-wide text-gradient">Mở App Qua Telegram</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Trò chơi <strong className="text-white">Farm Gem</strong> được tích hợp và vận hành trực tiếp thông qua nền tảng Telegram Mini App. 
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Vui lòng mở ứng dụng Telegram và bắt đầu cuộc hành trình cùng bot <strong className="text-blue-400">@farmgem2026bot</strong> để bảo mật và đồng bộ dữ liệu.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <a
              href="https://t.me/farmgem2026bot"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <span>Mở Telegram Bot</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121214] text-slate-100 flex flex-col font-sans max-w-md mx-auto relative shadow-2xl overflow-x-hidden pb-24 border-x border-zinc-900">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-[#16161a]/90 backdrop-blur-md px-4 py-3.5 flex items-center justify-between border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-inner border border-blue-400/20">
            {user?.photoUrl ? (
              <img 
                src={user.photoUrl} 
                alt={user.firstName} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              user?.firstName ? user.firstName.charAt(0).toUpperCase() : "G"
            )}
          </div>
          <div>
            <div className="text-xs font-extrabold truncate max-w-[120px] text-white tracking-wide">
              {user?.firstName || "Người chơi"}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-blue-400 font-medium">
              <Flame size={11} className="text-blue-500 animate-pulse" />
              <span>Lv.{user?.minerLevel || 1} Miner</span>
            </div>
          </div>
        </div>

        {/* Balance Stats */}
        <div className="flex items-center gap-2.5">
          {/* Gems Count */}
          <Link 
            to="/wallet" 
            className="flex items-center gap-1.5 bg-blue-950/40 hover:bg-blue-900/40 transition px-3 py-1.5 rounded-full border border-blue-500/20 shadow-sm"
          >
            <Coins size={13} className="text-blue-400" />
            <span className="text-xs font-bold text-blue-400 tracking-wide">
              {user ? Math.round(user.gems).toLocaleString() : "0"}
            </span>
          </Link>

          {/* XP Count */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-full text-[10px] font-semibold text-slate-300">
            <TrendingUp size={11} className="text-emerald-400" />
            <span>{user?.exp || 0} XP</span>
          </div>

          {/* Admin shortcut if appropriate */}
          {user?.isAdmin && (
            <Link to="/admin" className="p-1 text-rose-400 hover:text-rose-300 transition">
              <ShieldAlert size={16} />
            </Link>
          )}
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 px-4 py-4 overflow-y-auto">
        {loading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <p className="text-xs text-slate-400 font-medium">Loading...</p>
          </div>
        ) : error ? (
          <div className="bg-slate-900/60 backdrop-blur rounded-2xl p-4 my-6 text-center border border-rose-500/20">
            <p className="text-rose-400 text-xs mb-2 font-medium">{error}</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </main>

      {/* Floating Bottom Tab Navigation Bar */}
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] bg-[#16161c]/95 backdrop-blur-xl border border-blue-500/20 flex justify-around py-3.5 z-40 shadow-xl shadow-blue-500/5 rounded-3xl">
        <NavLink 
          to="/" 
          className={({ isActive }) => 
            `flex flex-col items-center justify-center gap-1 w-16 transition-all duration-200 ${
              isActive ? "text-blue-400 scale-[1.05]" : "text-slate-400 hover:text-white"
            }`
          }
        >
          <Coins size={18} />
          <span className="text-[9px] font-bold tracking-wider">Kiếm Tiền</span>
        </NavLink>

        <NavLink 
          to="/wallet" 
          className={({ isActive }) => 
            `flex flex-col items-center justify-center gap-1 w-16 transition-all duration-200 ${
              isActive ? "text-blue-400 scale-[1.05]" : "text-slate-400 hover:text-white"
            }`
          }
        >
          <Wallet size={18} />
          <span className="text-[9px] font-bold tracking-wider">Ví Tiền</span>
        </NavLink>

        <NavLink 
          to="/friends" 
          className={({ isActive }) => 
            `flex flex-col items-center justify-center gap-1 w-16 transition-all duration-200 ${
              isActive ? "text-blue-400 scale-[1.05]" : "text-slate-400 hover:text-white"
            }`
          }
        >
          <Users size={18} />
          <span className="text-[9px] font-bold tracking-wider">Bạn bè</span>
        </NavLink>

        <NavLink 
          to="/games" 
          className={({ isActive }) => 
            `flex flex-col items-center justify-center gap-1 w-16 transition-all duration-200 ${
              isActive ? "text-blue-400 scale-[1.05]" : "text-slate-400 hover:text-white"
            }`
          }
        >
          <Gamepad2 size={18} />
          <span className="text-[9px] font-bold tracking-wider">Games</span>
        </NavLink>

        <NavLink 
          to="/leaderboard" 
          className={({ isActive }) => 
            `flex flex-col items-center justify-center gap-1 w-16 transition-all duration-200 ${
              isActive ? "text-blue-400 scale-[1.05]" : "text-slate-400 hover:text-white"
            }`
          }
        >
          <Trophy size={18} />
          <span className="text-[9px] font-bold tracking-wider">Đua Top</span>
        </NavLink>
      </nav>

      {/* Global Centered Visual Alert Popups */}
      <AlertModal />
    </div>
  );
};
