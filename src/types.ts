export interface UserProfile {
  telegramId: string;
  firebaseUid: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  gems: number;
  exp: number;
  minerLevel: number;
  minerStartedAt: string | null; // ISO string when miner starts running (lasts 3 hours)
  referredBy: string | null;
  adViewsToday: number;
  lastAdViewAt: string | null;
  totalGamesWonGems: number; // For gaming leaderboard
  createdAt: string;
  updatedAt: string;
  isAdmin?: boolean;
  photoUrl?: string | null;
}

export interface Referral {
  id: string; // referrerId_referredId
  referrerId: string; // Telegram ID
  referredId: string; // Telegram ID
  referredUsername: string | null;
  referredFirstName: string;
  referredMinerLevel: number;
  earnedGems: number;
  earnedExp: number;
  isQualified: boolean; // reaches miner lvl 2
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string; // Telegram ID
  username: string | null;
  firstName?: string;
  momoNumber: string;
  momoName: string;
  amountVnd: number;
  gemAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface GemHistoryEntry {
  id: string;
  type: 'ad_view' | 'mining' | 'referral_bonus' | 'game_win' | 'game_loss' | 'withdrawal' | 'upgrade';
  amount: number;
  description: string;
  createdAt: string;
}

export interface GameSession {
  id: string;
  betTier: 1000 | 5000 | 10000;
  player1Id: string; // Telegram ID
  player1Name: string;
  player1Move: 'rock' | 'paper' | 'scissors';
  player2Id: string | null;
  player2Name: string | null;
  player2Move: 'rock' | 'paper' | 'scissors' | null;
  status: 'waiting' | 'completed' | 'cancelled';
  winnerId: string | null; // Telegram ID, or 'draw'
  prizeGems: number;
  createdAt: string;
  completedAt: string | null;
}

export interface SystemConfig {
  adRewardMin: number;
  adRewardMax: number;
  adRewardExpMin: number;
  adRewardExpMax: number;
  adCooldownSeconds: number;
  adMaxViewsPerDay: number;
  miningBaseRate: number; // default 300 GEM/hour
  miningDurationHours: number; // default 3 hours
  minerUpgradeExpBase: number; // default 100 EXP
  minerUpgradeExpMultiplier: number; // default 1.1 (10% increase)
  withdrawalMinVnd: number; // default 5000 VND
  gemToVndRate: number; // default 10 (10 GEM = 1 VND)
}
