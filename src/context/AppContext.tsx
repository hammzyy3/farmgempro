import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  getDocs,
  runTransaction
} from "firebase/firestore";
import { db, auth, loginAnonymously, handleFirestoreError, OperationType } from "../services/firebase";
import { UserProfile, SystemConfig, GemHistoryEntry, Referral, WithdrawalRequest } from "../types";
import { TelegramUser } from "../telegram.d";

interface AppContextType {
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  config: SystemConfig;
  loading: boolean;
  error: string | null;
  tgUser: TelegramUser | null;
  isTelegram: boolean;
  watchAd: () => Promise<boolean>;
  startMining: () => Promise<void>;
  collectGems: () => Promise<void>;
  upgradeMiner: () => Promise<void>;
  requestWithdrawal: (momoNumber: string, momoName: string, amountVnd: number) => Promise<void>;
  adReady: boolean;
  alertModal: {
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info" | "warning";
  };
  showAlert: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  closeAlert: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Default system configurations
const DEFAULT_CONFIG: SystemConfig = {
  adRewardMin: 200,
  adRewardMax: 500,
  adRewardExpMin: 1,
  adRewardExpMax: 5,
  adCooldownSeconds: 30,
  adMaxViewsPerDay: 20,
  miningBaseRate: 300,
  miningDurationHours: 3,
  minerUpgradeExpBase: 100,
  minerUpgradeExpMultiplier: 1.1,
  withdrawalMinVnd: 5000,
  gemToVndRate: 10
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);
  const [isTelegram, setIsTelegram] = useState<boolean>(false);
  const [adReady, setAdReady] = useState<boolean>(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info" | "warning";
  }>({
    isOpen: false,
    message: "",
    type: "info"
  });

  const showAlert = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setAlertModal({
      isOpen: true,
      message,
      type
    });
  };

  const closeAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  // References to keep listener clean
  const unsubUserRef = useRef<(() => void) | null>(null);
  const unsubConfigRef = useRef<(() => void) | null>(null);

  // 1. Setup Telegram & Firebase Auth on Mount
  useEffect(() => {
    let active = true;

    const initApp = async () => {
      try {
        setLoading(true);
        setError(null);

        // A. Handle Telegram WebApp
        let telegramId = "mock_user_123";
        let firstName = "Gamer";
        let lastName = "Pro";
        let username = "gamerpro_tg";
        let referralCode: string | null = null;
        let photoUrl: string | null = null;

        if (window.Telegram && window.Telegram.WebApp) {
          const webApp = window.Telegram.WebApp;
          webApp.ready();
          webApp.expand();
          setIsTelegram(true);

          // Dark Mode & Theme Params set up
          if (webApp.themeParams) {
            const theme = webApp.themeParams;
            if (theme.bg_color) document.body.style.backgroundColor = theme.bg_color;
            if (theme.text_color) document.body.style.color = theme.text_color;
          }

          const telegramData = webApp.initDataUnsafe;
          if (telegramData?.user) {
            setTgUser(telegramData.user);
            telegramId = String(telegramData.user.id);
            firstName = telegramData.user.first_name || "User";
            lastName = telegramData.user.last_name || "";
            username = telegramData.user.username || "";
            photoUrl = telegramData.user.photo_url || null;
          }

          // Read start_param for referral tracking (tg link format: t.me/bot?startapp=referrerId)
          if (telegramData?.start_param) {
            referralCode = telegramData.start_param;
          }
        } else {
          // Mock or browser environment (for preview in AI Studio)
          console.warn("Telegram WebApp SDK not found.");
          setTgUser({
            id: 12345678,
            first_name: "Mock User",
            username: "mock_username_dev"
          });
          telegramId = "12345678";
          firstName = "Mock User";
          lastName = "Dev";
          username = "mock_username_dev";
          photoUrl = null;

          // Simulate referral code if query param ?startapp=XX
          const params = new URLSearchParams(window.location.search);
          const startApp = params.get("startapp");
          if (startApp) {
            referralCode = startApp;
          }
        }

        if (!active) return;

        // B. Log in to Firebase Auth Anonymously
        let uid = "mock_firebase_uid";
        try {
          const firebaseUser = await loginAnonymously();
          uid = firebaseUser.uid;
        } catch (authErr: any) {
          console.error("Firebase Auth Anonymous failed:", authErr);
          throw new Error("Không thể kết nối nặc danh với Firebase. Vui lòng bật Anonymous Authentication trong Firebase Console.");
        }

        // C. Fetch or Create User Document in Firestore (Normal Firebase Flow)
        const userDocRef = doc(db, "users", telegramId);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          // Register New User
          const newUser: UserProfile = {
            telegramId,
            firebaseUid: uid,
            username: username || null,
            firstName,
            lastName: lastName || null,
            gems: 500, // Starter gems reward!
            exp: 0,
            minerLevel: 1,
            minerStartedAt: null,
            referredBy: referralCode && referralCode !== telegramId ? referralCode : null,
            adViewsToday: 0,
            lastAdViewAt: null,
            totalGamesWonGems: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            photoUrl: photoUrl || null
          };

          await setDoc(userDocRef, newUser);
          setUser(newUser);

          // Add history log for Starter gems
          const historyRef = collection(db, "users", telegramId, "gemHistory");
          await addDoc(historyRef, {
            id: Math.random().toString(36).substr(2, 9),
            type: "ad_view",
            amount: 500,
            description: "Quà tặng tân thủ khởi nghiệp!",
            createdAt: new Date().toISOString()
          });

          // Handle Referral relationships & trigger reward notification
          if (newUser.referredBy) {
            const referralId = `${newUser.referredBy}_${telegramId}`;
            const referralRef = doc(db, "referrals", referralId);
            await setDoc(referralRef, {
              id: referralId,
              referrerId: newUser.referredBy,
              referredId: telegramId,
              referredUsername: username || null,
              referredFirstName: firstName,
              referredMinerLevel: 1,
              earnedGems: 0,
              earnedExp: 0,
              isQualified: false, // will turn to true when user reaches miner level 2
              createdAt: new Date().toISOString()
            });
          }
        } else {
          // User exists, update firebaseUid/photoUrl if different
          const currentData = userDocSnap.data() as UserProfile;
          if (currentData.firebaseUid !== uid || currentData.photoUrl !== photoUrl) {
            await updateDoc(userDocRef, { 
              firebaseUid: uid,
              username: username || currentData.username,
              firstName: firstName || currentData.firstName,
              lastName: lastName || currentData.lastName,
              photoUrl: photoUrl || currentData.photoUrl || null,
              updatedAt: new Date().toISOString()
            });
          }
        }

        // D. Setup Real-time Listener for current User Profile
        unsubUserRef.current = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            setUser(snap.data() as UserProfile);
          }
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${telegramId}`);
          setLoading(false);
        });

        // E. Setup Real-time Listener for global configs
        const configDocRef = doc(db, "config", "global");
        unsubConfigRef.current = onSnapshot(configDocRef, (snap) => {
          if (snap.exists()) {
            setConfig(snap.data() as SystemConfig);
          } else {
            // Seed default configs if missing
            setDoc(configDocRef, DEFAULT_CONFIG).catch(console.error);
            setConfig(DEFAULT_CONFIG);
          }
        }, (err) => {
          console.warn("Config doc error, falling back to defaults:", err);
          setConfig(DEFAULT_CONFIG);
        });

        // F. Preload Monetag ad if available
        if (window.show_11282062) {
          try {
            window.show_11282062({ type: "preload", ymid: telegramId })
              .then(() => setAdReady(true))
              .catch(() => setAdReady(false));
          } catch (e) {
            console.warn("Monetag preloader error:", e);
          }
        }

      } catch (err: any) {
        console.error("Initialization error:", err);
        setError(`Không thể kết nối đến máy chủ: ${err?.message || String(err)}`);
        setLoading(false);
      }
    };

    initApp();

    return () => {
      active = false;
      if (unsubUserRef.current) unsubUserRef.current();
      if (unsubConfigRef.current) unsubConfigRef.current();
    };
  }, []);

  // 2. Watch Ad Action
  const watchAd = async (): Promise<boolean> => {
    if (!user) return false;

    // Check views daily limit
    const todayStr = new Date().toLocaleDateString();
    const lastAdDate = user.lastAdViewAt ? new Date(user.lastAdViewAt).toLocaleDateString() : "";
    const isNewDay = todayStr !== lastAdDate;
    
    let currentViews = user.adViewsToday;
    if (isNewDay) {
      currentViews = 0;
    }

    if (currentViews >= config.adMaxViewsPerDay) {
      showAlert(`Bạn đã đạt giới hạn xem ${config.adMaxViewsPerDay} video quảng cáo hôm nay. Quay lại vào ngày mai nhé!`, "warning");
      return false;
    }

    // Cooldown check (30 seconds)
    if (user.lastAdViewAt) {
      const msDiff = Date.now() - new Date(user.lastAdViewAt).getTime();
      const secondsRemaining = Math.ceil((config.adCooldownSeconds * 1000 - msDiff) / 1000);
      if (secondsRemaining > 0) {
        showAlert(`Vui lòng chờ ${secondsRemaining} giây trước khi xem lượt quảng cáo tiếp theo!`, "warning");
        return false;
      }
    }

    setLoading(true);

    try {
      // Trigger Ad (With secure fallback when Monetag tag is not loaded)
      let adSuccess = false;
      if (window.show_11282062) {
        try {
          await window.show_11282062({ ymid: user.telegramId });
          adSuccess = true;
        } catch (e) {
          console.warn("Ad failed or was skipped:", e);
          adSuccess = window.confirm("Hệ thống Quảng cáo đang kết nối... Bạn đã hoàn thành việc xem quảng cáo để nhận thưởng?");
        }
      } else {
        adSuccess = window.confirm("Xác nhận bạn đã xem xong video quảng cáo 30 giây để nhận thưởng?");
      }

      if (adSuccess) {
        // Calculate random rewards
        const gemReward = Math.floor(Math.random() * (config.adRewardMax - config.adRewardMin + 1)) + config.adRewardMin;
        const expReward = Math.floor(Math.random() * (config.adRewardExpMax - config.adRewardExpMin + 1)) + config.adRewardExpMin;

        // Transaction to update rewards cleanly (Normal Firebase flow)
        const userDocRef = doc(db, "users", user.telegramId);
        await runTransaction(db, async (transaction) => {
          const userSnap = await transaction.get(userDocRef);
          if (!userSnap.exists()) return;

          const data = userSnap.data() as UserProfile;
          const updatedViews = isNewDay ? 1 : data.adViewsToday + 1;

          // Update profile
          transaction.update(userDocRef, {
            gems: data.gems + gemReward,
            exp: data.exp + expReward,
            adViewsToday: updatedViews,
            lastAdViewAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          // Add history record
          const historyRef = doc(collection(db, "users", user.telegramId, "gemHistory"));
          transaction.set(historyRef, {
            id: historyRef.id,
            type: "ad_view",
            amount: gemReward,
            description: `Xem quảng cáo (+${expReward} EXP)`,
            createdAt: new Date().toISOString()
          });

          // If user has a referrer, reward them 5% of this ad view earnings!
          if (data.referredBy) {
            const referrerDocRef = doc(db, "users", data.referredBy);
            const referralId = `${data.referredBy}_${data.telegramId}`;
            const referralDocRef = doc(db, "referrals", referralId);

            const referrerSnap = await transaction.get(referrerDocRef);
            const referralSnap = await transaction.get(referralDocRef);

            if (referrerSnap.exists() && referralSnap.exists()) {
              const refData = referralSnap.data() as Referral;
              const bonusGems = Math.round(gemReward * 0.05);

              if (bonusGems > 0) {
                // Only give if the referral is qualified (referred reaches miner level 2)
                if (refData.isQualified) {
                  // Reward referrer
                  transaction.update(referrerDocRef, {
                    gems: referrerSnap.data().gems + bonusGems,
                    updatedAt: new Date().toISOString()
                  });

                  // Log referrer history
                  const referrerHistoryRef = doc(collection(db, "users", data.referredBy, "gemHistory"));
                  transaction.set(referrerHistoryRef, {
                    id: referrerHistoryRef.id,
                    type: "referral_bonus",
                    amount: bonusGems,
                    description: `5% Doanh thu từ bạn bè (${data.firstName})`,
                    createdAt: new Date().toISOString()
                  });

                  // Update referral connection log
                  transaction.update(referralDocRef, {
                    earnedGems: refData.earnedGems + bonusGems
                  });
                }
              }
            }
          }
        });

        // Preload next ad
        if (window.show_11282062) {
          window.show_11282062({ type: "preload", ymid: user.telegramId }).catch(() => {});
        }

        showAlert(`Nhận thưởng thành công! Bạn đã nhận được +${gemReward} GEM và +${expReward} EXP từ lượt xem quảng cáo này.`, "success");
        setLoading(false);
        return true;
      }
    } catch (err) {
      console.error("Error watching ad:", err);
      showAlert("Đã xảy ra lỗi khi tải quảng cáo. Vui lòng thử lại!", "error");
    } finally {
      setLoading(false);
    }
    return false;
  };

  // 3. Start Mining Engine
  const startMining = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Need to watch an ad to activate miner!
      const watchSuccess = await watchAd();
      if (!watchSuccess) {
        setLoading(false);
        return;
      }

      // Activate miner (Normal Flow)
      const userDocRef = doc(db, "users", user.telegramId);
      await updateDoc(userDocRef, {
        minerStartedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      showAlert("Kích hoạt máy đào thành công! Máy đào sẽ khai thác liên tục trong 3 giờ.", "success");

    } catch (err) {
      console.error("Error starting miner:", err);
      showAlert("Lỗi khi kích hoạt máy đào.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 4. Collect Mining Rewards
  const collectGems = async () => {
    if (!user || !user.minerStartedAt) return;

    const startedTime = new Date(user.minerStartedAt).getTime();
    const durationMs = config.miningDurationHours * 3600 * 1000;
    const isFinished = Date.now() - startedTime >= durationMs;

    if (!isFinished) {
      const minutesLeft = Math.ceil((durationMs - (Date.now() - startedTime)) / 60000);
      showAlert(`Máy đào chưa hoàn thành nhiệm vụ! Còn ${minutesLeft} phút nữa.`, "warning");
      return;
    }

    setLoading(true);
    try {
      // Speed rate = Base Rate * (1 + (Level-1)*5%)
      const speedRate = config.miningBaseRate * (1 + (user.minerLevel - 1) * 0.05);
      // Gem reward for 3 hours
      const collectedGems = Math.round(speedRate * config.miningDurationHours);

      const userDocRef = doc(db, "users", user.telegramId);
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userDocRef);
        if (!userSnap.exists()) return;

        const data = userSnap.data() as UserProfile;

        // Reset miner and add gems
        transaction.update(userDocRef, {
          gems: data.gems + collectedGems,
          minerStartedAt: null,
          updatedAt: new Date().toISOString()
        });

        // Log history
        const historyRef = doc(collection(db, "users", user.telegramId, "gemHistory"));
        transaction.set(historyRef, {
          id: historyRef.id,
          type: "mining",
          amount: collectedGems,
          description: `Nhận thành quả từ máy đào Level ${data.minerLevel}`,
          createdAt: new Date().toISOString()
        });
      });

      showAlert(`Thu hoạch thành công! Bạn đã nhận được +${collectedGems.toLocaleString()} GEM vào ví.`, "success");

    } catch (err) {
      console.error("Error collecting gems:", err);
      showAlert("Không thể thu hoạch Gems.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 5. Upgrade Miner Level
  const upgradeMiner = async () => {
    if (!user) return;

    // Check speed limit (Max rate is 1000 GEM/hour)
    const currentSpeedRate = config.miningBaseRate * (1 + (user.minerLevel - 1) * 0.05);
    if (currentSpeedRate >= 1000) {
      showAlert("Máy đào của bạn đã đạt cấp độ tốc độ tối đa (1000 GEM/giờ)!", "info");
      return;
    }

    // EXP required: Level 1 requires 100 EXP. Each level increases req by 10%.
    // formula: 100 * (1.1 ^ (Level - 1))
    const expRequired = Math.round(config.minerUpgradeExpBase * Math.pow(config.minerUpgradeExpMultiplier, user.minerLevel - 1));

    if (user.exp < expRequired) {
      showAlert(`Bạn cần đạt ${expRequired} EXP để nâng cấp! Hiện tại chỉ có ${user.exp} EXP.`, "warning");
      return;
    }

    setLoading(true);
    try {
      const nextLevel = user.minerLevel + 1;

      const userDocRef = doc(db, "users", user.telegramId);

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userDocRef);
        if (!userSnap.exists()) return;

        const data = userSnap.data() as UserProfile;

        // Upgrade and deduct EXP
        transaction.update(userDocRef, {
          minerLevel: nextLevel,
          exp: data.exp - expRequired,
          updatedAt: new Date().toISOString()
        });

        // Add history log
        const historyRef = doc(collection(db, "users", user.telegramId, "gemHistory"));
        transaction.set(historyRef, {
          id: historyRef.id,
          type: "upgrade",
          amount: 0,
          description: `Nâng cấp máy đào lên Cấp ${nextLevel}`,
          createdAt: new Date().toISOString()
        });

        // IF this upgrade triggers LEVEL 2 and user is referred, referrer qualifies!
        if (nextLevel >= 2 && data.referredBy) {
          const referralId = `${data.referredBy}_${data.telegramId}`;
          const referralDocRef = doc(db, "referrals", referralId);
          const referralSnap = await transaction.get(referralDocRef);

          if (referralSnap.exists()) {
            const refData = referralSnap.data() as Referral;
            if (!refData.isQualified) {
              const referrerDocRef = doc(db, "users", data.referredBy);
              const referrerSnap = await transaction.get(referrerDocRef);

              if (referrerSnap.exists()) {
                // Reward referrer: 200 Gems and 20 EXP
                transaction.update(referrerDocRef, {
                  gems: referrerSnap.data().gems + 200,
                  exp: referrerSnap.data().exp + 20,
                  updatedAt: new Date().toISOString()
                });

                // Log referrer history
                const referrerHistoryRef = doc(collection(db, "users", data.referredBy, "gemHistory"));
                transaction.set(referrerHistoryRef, {
                  id: referrerHistoryRef.id,
                  type: "referral_bonus",
                  amount: 200,
                  description: `Giới thiệu thành công ${data.firstName} (+20 EXP)`,
                  createdAt: new Date().toISOString()
                });

                // Mark referral as qualified
                transaction.update(referralDocRef, {
                  isQualified: true,
                  earnedGems: refData.earnedGems + 200,
                  earnedExp: 20,
                  referredMinerLevel: nextLevel
                });
              }
            }
          }
        }
      });

      showAlert(`Chúc mừng! Bạn đã nâng cấp máy đào lên Cấp ${nextLevel}!`, "success");
    } catch (err) {
      console.error("Error upgrading miner:", err);
      showAlert("Đã xảy ra lỗi trong quá trình nâng cấp.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 6. Request Withdrawal
  const requestWithdrawal = async (momoNumber: string, momoName: string, amountVnd: number) => {
    if (!user) return;

    if (amountVnd < config.withdrawalMinVnd) {
      showAlert(`Số tiền tối thiểu được rút là ${config.withdrawalMinVnd.toLocaleString()} VNĐ.`, "warning");
      return;
    }

    // Rate: 10 GEM = 1 VNĐ
    const requiredGems = amountVnd * config.gemToVndRate;

    if (user.gems < requiredGems) {
      showAlert(`Bạn không có đủ Gems! Cần ${requiredGems.toLocaleString()} GEM để rút ${amountVnd.toLocaleString()} VNĐ.`, "warning");
      return;
    }

    setLoading(true);
    try {
      const userDocRef = doc(db, "users", user.telegramId);
      const withdrawalId = `wd_${Math.random().toString(36).substr(2, 9)}`;
      const withdrawalDocRef = doc(db, "withdrawals", withdrawalId);

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userDocRef);
        if (!userSnap.exists()) return;

        const data = userSnap.data() as UserProfile;

        // Deduct gems from profile
        transaction.update(userDocRef, {
          gems: data.gems - requiredGems,
          updatedAt: new Date().toISOString()
        });

        // Create withdrawal ticket
        transaction.set(withdrawalDocRef, {
          id: withdrawalId,
          userId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          momoNumber,
          momoName,
          amountVnd,
          gemAmount: requiredGems,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // Add history log
        const historyRef = doc(collection(db, "users", user.telegramId, "gemHistory"));
        transaction.set(historyRef, {
          id: historyRef.id,
          type: "withdrawal",
          amount: -requiredGems,
          description: `Đăng ký rút ${amountVnd.toLocaleString()}đ về MoMo (${momoNumber})`,
          createdAt: new Date().toISOString()
        });
      });

      showAlert(`Đăng ký rút tiền thành công! Yêu cầu của bạn đang chờ quản trị viên phê duyệt.`, "success");
    } catch (err) {
      console.error("Error creating withdrawal:", err);
      showAlert("Có lỗi xảy ra khi thực hiện yêu cầu.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContext.Provider value={{
      user,
      setUser,
      config,
      loading,
      error,
      tgUser,
      isTelegram,
      watchAd,
      startMining,
      collectGems,
      upgradeMiner,
      requestWithdrawal,
      adReady,
      alertModal,
      showAlert,
      closeAlert
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
