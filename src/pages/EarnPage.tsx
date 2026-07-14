import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { 
  Tv, 
  Cpu, 
  Sparkles, 
  Clock, 
  TrendingUp, 
  ArrowUpCircle,
  Link2,
  AlertCircle,
  Flame,
  CheckCircle2,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const EarnPage: React.FC = () => {
  const { 
    user, 
    config, 
    watchAd, 
    startMining, 
    collectGems, 
    upgradeMiner,
    adReady
  } = useApp();

  const [timeLeft, setTimeLeft] = useState<number>(0); // remaining seconds for miner
  const [adCooldownLeft, setAdCooldownLeft] = useState<number>(0); // ad cooldown seconds
  const [percentDone, setPercentDone] = useState<number>(0);

  // 1. Miner countdown interval
  useEffect(() => {
    if (!user || !user.minerStartedAt) {
      setTimeLeft(0);
      setPercentDone(0);
      return;
    }

    const durationSeconds = config.miningDurationHours * 3600;

    const updateTimer = () => {
      const startTime = new Date(user.minerStartedAt!).getTime();
      const elapsedMs = Date.now() - startTime;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const remaining = durationSeconds - elapsedSeconds;

      if (remaining <= 0) {
        setTimeLeft(0);
        setPercentDone(100);
      } else {
        setTimeLeft(remaining);
        const percent = Math.min(100, Math.max(0, (elapsedSeconds / durationSeconds) * 100));
        setPercentDone(percent);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [user?.minerStartedAt, config.miningDurationHours]);

  // 2. Ad cooldown interval
  useEffect(() => {
    if (!user || !user.lastAdViewAt) {
      setAdCooldownLeft(0);
      return;
    }

    const updateCooldown = () => {
      const lastTime = new Date(user.lastAdViewAt!).getTime();
      const elapsedMs = Date.now() - lastTime;
      const cooldownMs = config.adCooldownSeconds * 1000;
      const remainingMs = cooldownMs - elapsedMs;

      if (remainingMs <= 0) {
        setAdCooldownLeft(0);
      } else {
        setAdCooldownLeft(Math.ceil(remainingMs / 1000));
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);

    return () => clearInterval(interval);
  }, [user?.lastAdViewAt, config.adCooldownSeconds]);

  // Format countdown: hh:mm:ss
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate current mining stats
  const level = user?.minerLevel || 1;
  const currentSpeed = config.miningBaseRate * (1 + (level - 1) * 0.05);
  const nextSpeed = config.miningBaseRate * (1 + level * 0.05);
  const totalEarnedForBatch = Math.round(currentSpeed * config.miningDurationHours);
  const upgradeCost = Math.round(config.minerUpgradeExpBase * Math.pow(config.minerUpgradeExpMultiplier, level - 1));

  // Determine views state
  const todayStr = new Date().toLocaleDateString();
  const lastAdDate = user?.lastAdViewAt ? new Date(user.lastAdViewAt).toLocaleDateString() : "";
  const isNewDay = todayStr !== lastAdDate;
  const adViewsCount = isNewDay ? 0 : (user?.adViewsToday || 0);

  return (
    <div className="space-y-6 pb-4">
      {/* Introduction Card */}
      <div className="sleek-blur p-5 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>
        <div className="flex items-start gap-3">
          <Sparkles className="text-amber-400 shrink-0 mt-1" size={20} />
          <div>
            <h1 className="text-base font-extrabold text-white mb-1 tracking-wide text-gradient">Kiếm Kim Cương & Đổi Tiền Mặt</h1>
            <p className="text-xs text-gray-300 leading-relaxed">
              Chào mừng bạn đến với <strong className="text-white">Farm Gem</strong>! Tại đây bạn có thể xem quảng cáo chất lượng cao, kích hoạt máy đào Gems, vượt link để kiếm kim cương và rút tiền mặt tức thì về ví MoMo.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Xem Quảng Cáo Kiếm Gems */}
      <section className="sleek-blur p-5 rounded-2xl space-y-4 shadow-md glow-amber">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
              <Tv size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Xem Video Quảng Cáo</h2>
              <p className="text-[10px] text-gray-400">Nhận ngay 200 - 500 GEM & 1 - 5 EXP</p>
            </div>
          </div>
          <span className="text-xs font-bold bg-white/5 text-amber-400 px-3 py-1 rounded-full border border-white/5">
            {adViewsCount} / {config.adMaxViewsPerDay} lượt
          </span>
        </div>

        {/* Limit warning */}
        {adViewsCount >= config.adMaxViewsPerDay && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 flex items-start gap-2 text-xs">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>Bạn đã đạt giới hạn xem 20 lượt quảng cáo ngày hôm nay. Vui lòng quay lại vào ngày mai!</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={watchAd}
          disabled={adViewsCount >= config.adMaxViewsPerDay || adCooldownLeft > 0}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
            adViewsCount >= config.adMaxViewsPerDay
              ? "bg-white/5 text-gray-500 cursor-not-allowed"
              : adCooldownLeft > 0
              ? "bg-white/5 text-gray-400 cursor-wait"
              : "bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 active:scale-[0.98] text-white"
          }`}
        >
          {adCooldownLeft > 0 ? (
            <>
              <Clock size={16} className="animate-spin text-[#708499]" />
              <span>Thời gian chờ: {adCooldownLeft}s</span>
            </>
          ) : (
            <>
              <Tv size={16} />
              <span>Xem Quảng Cáo Thưởng (+Gems & EXP)</span>
            </>
          )}
        </button>
      </section>

      {/* 2. Máy Đào Gem Engine */}
      <section className="sleek-blur p-5 rounded-2xl space-y-5 shadow-md glow-emerald">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Cpu size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Trạm Máy Đào Tự Động</h2>
              <p className="text-[10px] text-gray-400">Khai thác ròng rã suốt 3 giờ liên tục</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
            Cấp {level}
          </span>
        </div>

        {/* Level Stats & Upgrade block */}
        <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-400 block mb-1">Tốc độ hiện tại:</span>
              <span className="font-extrabold text-amber-400 text-sm flex items-center gap-1">
                {currentSpeed.toLocaleString()} GEM/giờ
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">Thu hoạch mỗi đợt:</span>
              <span className="font-extrabold text-emerald-400 text-sm">
                +{totalEarnedForBatch.toLocaleString()} GEM
              </span>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400 block">EXP yêu cầu nâng cấp:</span>
              <span className="font-bold text-white">
                {user?.exp || 0} / {upgradeCost} EXP
              </span>
            </div>
            <button
              onClick={upgradeMiner}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1 transition ${
                user && user.exp >= upgradeCost
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm cursor-pointer"
                  : "bg-white/5 text-gray-500"
              }`}
            >
              <ArrowUpCircle size={14} />
              <span>Nâng Cấp</span>
            </button>
          </div>
        </div>

        {/* Dynamic Miner Interactive State */}
        <div className="space-y-4">
          {!user?.minerStartedAt ? (
            // Idle State: Activation required
            <div className="space-y-3 text-center py-2">
              <p className="text-xs text-gray-400 leading-relaxed">
                Máy đào đang trong trạng thái tắt. Xem một quảng cáo để cung cấp năng lượng và khởi động lò đào tự động trong 3 giờ!
              </p>
              <button
                onClick={startMining}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] text-white rounded-xl font-bold text-sm transition shadow-md flex items-center justify-center gap-2"
              >
                <Flame size={16} className="animate-pulse" />
                <span>Xem Quảng Cáo & Kích Hoạt Đào</span>
              </button>
            </div>
          ) : timeLeft > 0 ? (
            // Active Mining Countdown state
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock size={12} className="animate-pulse text-emerald-400" />
                  <span>Đang cày cuốc khai thác...</span>
                </span>
                <span className="font-mono font-bold text-white text-sm">{formatTime(timeLeft)}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                  style={{ width: `${percentDone}%` }}
                ></div>
              </div>

              <button
                disabled
                className="w-full py-3 bg-white/5 text-gray-500 rounded-xl font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Hầm mỏ đang đào ({Math.floor(percentDone)}%)</span>
              </button>
            </div>
          ) : (
            // Mining finished claim rewards state
            <div className="space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-semibold animate-bounce">
                <CheckCircle2 size={16} />
                <span>Khai thác hoàn tất! Bạn thu về {totalEarnedForBatch} Gems!</span>
              </div>
              <button
                onClick={collectGems}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] text-white rounded-xl font-bold text-sm transition shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                <span>Nhận ngay {totalEarnedForBatch} GEM vào Ví</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. Vượt Link Rút Gọn (Sắp ra mắt) */}
      <section className="sleek-blur p-5 rounded-2xl relative overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-[#0d1017]/70 backdrop-blur-[1px] flex flex-col items-center justify-center z-10">
          <div className="sleek-blur px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <Lock size={12} className="text-amber-400" />
            <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Chức năng đang cập nhật</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
              <Link2 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Vượt Link Rút Gọn</h2>
              <p className="text-[10px] text-gray-400">Vượt các liên kết tiếp thị để nhận kim cương siêu khủng</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
