import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../services/firebase";
import { 
  collection, 
  query, 
  where, 
  limit, 
  getDocs, 
  doc, 
  runTransaction, 
  setDoc, 
  orderBy, 
  onSnapshot,
  addDoc
} from "firebase/firestore";
import { GameSession, GemHistoryEntry } from "../types";
import { 
  Gamepad2, 
  Coins, 
  Scissors, 
  Hand, 
  HandMetal, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  Clock,
  History,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const GamesPage: React.FC = () => {
  const { user, config, showAlert, setUser } = useApp();

  const [selectedBet, setSelectedBet] = useState<1000 | 5000 | 10000>(1000);
  const [selectedMove, setSelectedMove] = useState<'rock' | 'paper' | 'scissors' | null>(null);
  
  const [activeGame, setActiveGame] = useState<GameSession | null>(null);
  const [gameLoading, setGameLoading] = useState<boolean>(false);
  const [gameResultMsg, setGameResultMsg] = useState<string | null>(null);
  const [recentGames, setRecentGames] = useState<GameSession[]>([]);
  const [recentLoading, setRecentLoading] = useState<boolean>(true);

  // Sound/Vibe indicator for wins/draws
  const [gameStatus, setGameStatus] = useState<"idle" | "matching" | "ended">("idle");

  // 1. Fetch recent games in real-time
  useEffect(() => {
    const q = query(
      collection(db, "games"),
      where("status", "==", "completed"),
      orderBy("completedAt", "desc"),
      limit(5)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: GameSession[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as GameSession);
      });
      setRecentGames(list);
      setRecentLoading(false);
    }, (err) => {
      console.error("Recent games error:", err);
      setRecentGames([]);
      setRecentLoading(false);
    });

    return () => unsub();
  }, []);

  // 2. Listen to active matching game if user created one, only matching real players
  useEffect(() => {
    if (!user || gameStatus !== "matching" || !activeGame) return;

    const gameDocRef = doc(db, "games", activeGame.id);

    const unsub = onSnapshot(gameDocRef, (snap) => {
      if (snap.exists()) {
        const gameData = snap.data() as GameSession;
        setActiveGame(gameData);

        if (gameData.status === "completed") {
          setGameStatus("ended");
          evaluateResultText(gameData);
        }
      }
    });

    return () => {
      unsub();
    };
  }, [user?.telegramId, gameStatus, activeGame?.id]);

  const evaluateResultText = (game: GameSession) => {
    if (!user) return;
    if (game.winnerId === "draw") {
      setGameResultMsg(`Trận đấu Hòa! Bạn và đối thủ đã ra các chiêu giống nhau. Hệ thống hoàn lại ${game.betTier.toLocaleString()} GEM.`);
    } else if (game.winnerId === user.telegramId) {
      setGameResultMsg(`🎉 Chúc mừng bạn Thắng! Đối thủ ra ${translateMove(game.player1Id === user.telegramId ? game.player2Move : game.player1Move)}. Bạn nhận được ${Math.round(game.betTier * 1.9).toLocaleString()} GEM (đã trừ 5% phí).`);
    } else {
      const oppMove = game.player1Id === user.telegramId ? game.player2Move : game.player1Move;
      setGameResultMsg(`😭 Bạn đã Thua cuộc! Đối thủ ra ${translateMove(oppMove)}. Chúc bạn may mắn ở ván sau!`);
    }
  };

  const translateMove = (move: string | null) => {
    if (!move) return "Ẩn";
    if (move === "rock") return "BÚA ✊";
    if (move === "paper") return "BAO 🖐️";
    if (move === "scissors") return "KÉO ✌️";
    return move;
  };

  // Matchmaking Algorithm
  const playRPS = async () => {
    if (!user || !selectedMove) return;

    if (user.gems < selectedBet) {
      showAlert(`Số dư kim cương không đủ! Cần ${selectedBet.toLocaleString()} GEM để cược.`, "warning");
      return;
    }

    setGameLoading(true);
    setGameResultMsg(null);

    try {
      // Step A: Search for available waiting game rooms
      const q = query(
        collection(db, "games"),
        where("betTier", "==", selectedBet),
        where("status", "==", "waiting")
      );
      
      const snap = await getDocs(q);
      let foundRoom: GameSession | null = null;

      // Filter out rooms created by current user
      snap.forEach((doc) => {
        const room = doc.data() as GameSession;
        if (room.player1Id !== user.telegramId && !foundRoom) {
          foundRoom = room;
        }
      });

      if (foundRoom) {
        // Step B: JOIN existing game room via transaction
        const roomToJoin = foundRoom as GameSession;
        const roomDocRef = doc(db, "games", roomToJoin.id);
        const player1DocRef = doc(db, "users", roomToJoin.player1Id);
        const player2DocRef = doc(db, "users", user.telegramId);

        let winnerId = "";
        let prize = 0;

        await runTransaction(db, async (transaction) => {
          const roomSnap = await transaction.get(roomDocRef);
          if (!roomSnap.exists()) throw new Error("Room missing");

          const roomData = roomSnap.data() as GameSession;
          if (roomData.status !== "waiting" || roomData.player2Id !== null) {
            throw new Error("Room already filled");
          }

          const p1Snap = await transaction.get(player1DocRef);
          const p2Snap = await transaction.get(player2DocRef);

          if (!p1Snap.exists() || !p2Snap.exists()) throw new Error("Users missing");

          const p1Data = p1Snap.data();
          const p2Data = p2Snap.data();

          // Evaluate Winner
          const m1 = roomData.player1Move;
          const m2 = selectedMove; // current user's move

          if (m1 === m2) {
            winnerId = "draw";
          } else if (
            (m1 === "rock" && m2 === "scissors") ||
            (m1 === "paper" && m2 === "rock") ||
            (m1 === "scissors" && m2 === "paper")
          ) {
            winnerId = roomData.player1Id; // Player 1 wins
          } else {
            winnerId = user.telegramId; // Current user wins
          }

          prize = selectedBet * 2 * 0.95; // 5% fee subtracted

          // Update profiles balances
          // Deduct player 2 (current user) bet immediately
          let p2GemsUpdate = p2Data.gems - selectedBet;
          let p1GemsUpdate = p1Data.gems; // player 1 already paid when creating room

          let p1WonGems = p1Data.totalGamesWonGems || 0;
          let p2WonGems = p2Data.totalGamesWonGems || 0;

          if (winnerId === "draw") {
            // Refund Player 1, Refund Player 2
            p1GemsUpdate += selectedBet;
            p2GemsUpdate += selectedBet;
          } else if (winnerId === roomData.player1Id) {
            // Player 1 wins prize
            p1GemsUpdate += prize;
            p1WonGems += prize;
          } else {
            // Current user (Player 2) wins prize
            p2GemsUpdate += prize;
            p2WonGems += prize;
          }

          // Write database updates
          transaction.update(roomDocRef, {
            player2Id: user.telegramId,
            player2Name: user.firstName,
            player2Move: m2,
            status: "completed",
            winnerId,
            completedAt: new Date().toISOString()
          });

          transaction.update(player1DocRef, {
            gems: p1GemsUpdate,
            totalGamesWonGems: p1WonGems,
            updatedAt: new Date().toISOString()
          });

          transaction.update(player2DocRef, {
            gems: p2GemsUpdate,
            totalGamesWonGems: p2WonGems,
            updatedAt: new Date().toISOString()
          });

          // Log history logs for both users
          const p1HistRef = doc(collection(db, "users", roomData.player1Id, "gemHistory"));
          const p2HistRef = doc(collection(db, "users", user.telegramId, "gemHistory"));

          if (winnerId === "draw") {
            transaction.set(p1HistRef, {
              id: p1HistRef.id,
              type: "game_win",
              amount: 0,
              description: `Hòa game Búa Kéo Bao (đã hoàn tiền cược)`,
              createdAt: new Date().toISOString()
            });
            transaction.set(p2HistRef, {
              id: p2HistRef.id,
              type: "game_win",
              amount: 0,
              description: `Hòa game Búa Kéo Bao (đã hoàn tiền cược)`,
              createdAt: new Date().toISOString()
            });
          } else if (winnerId === roomData.player1Id) {
            transaction.set(p1HistRef, {
              id: p1HistRef.id,
              type: "game_win",
              amount: prize - selectedBet,
              description: `Thắng game Búa Kéo Bao cược ${selectedBet}`,
              createdAt: new Date().toISOString()
            });
            transaction.set(p2HistRef, {
              id: p2HistRef.id,
              type: "game_loss",
              amount: -selectedBet,
              description: `Thua game Búa Kéo Bao cược ${selectedBet}`,
              createdAt: new Date().toISOString()
            });
          } else {
            transaction.set(p1HistRef, {
              id: p1HistRef.id,
              type: "game_loss",
              amount: -selectedBet,
              description: `Thua game Búa Kéo Bao cược ${selectedBet}`,
              createdAt: new Date().toISOString()
            });
            transaction.set(p2HistRef, {
              id: p2HistRef.id,
              type: "game_win",
              amount: prize - selectedBet,
              description: `Thắng game Búa Kéo Bao cược ${selectedBet}`,
              createdAt: new Date().toISOString()
            });
          }
        });

        // Set completed game representation
        const completedGame: GameSession = {
          id: roomToJoin.id,
          betTier: selectedBet,
          player1Id: roomToJoin.player1Id,
          player1Name: roomToJoin.player1Name,
          player1Move: roomToJoin.player1Move,
          player2Id: user.telegramId,
          player2Name: user.firstName,
          player2Move: selectedMove,
          status: "completed",
          winnerId,
          prizeGems: prize,
          createdAt: roomToJoin.createdAt,
          completedAt: new Date().toISOString()
        };

        setActiveGame(completedGame);
        setGameStatus("ended");
        evaluateResultText(completedGame);

      } else {
        // Step C: CREATE a new game room
        const newRoomId = `game_${Math.random().toString(36).substr(2, 9)}`;
        const gameDocRef = doc(db, "games", newRoomId);
        const userDocRef = doc(db, "users", user.telegramId);

        const newRoom: GameSession = {
          id: newRoomId,
          betTier: selectedBet,
          player1Id: user.telegramId,
          player1Name: user.firstName,
          player1Move: selectedMove,
          player2Id: null,
          player2Name: null,
          player2Move: null,
          status: "waiting",
          winnerId: null,
          prizeGems: selectedBet * 1.9,
          createdAt: new Date().toISOString(),
          completedAt: null
        };

        await runTransaction(db, async (transaction) => {
          const userSnap = await transaction.get(userDocRef);
          if (!userSnap.exists()) return;

          // Deduct bet gems immediately to register
          transaction.update(userDocRef, {
            gems: userSnap.data().gems - selectedBet,
            updatedAt: new Date().toISOString()
          });

          transaction.set(gameDocRef, newRoom);
        });

        setActiveGame(newRoom);
        setGameStatus("matching");
      }

    } catch (err) {
      console.error("Matchmaking error:", err);
      showAlert("Đã xảy ra lỗi ghép trận. Vui lòng thử lại!", "error");
    } finally {
      setGameLoading(false);
    }
  };

  // Cancel waiting room
  const cancelWaiting = async () => {
    if (!user || !activeGame || gameStatus !== "matching") return;

    setGameLoading(true);

    try {
      const roomDocRef = doc(db, "games", activeGame.id);
      const userDocRef = doc(db, "users", user.telegramId);

      await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomDocRef);
        if (!roomSnap.exists()) return;

        const roomData = roomSnap.data() as GameSession;
        if (roomData.status !== "waiting") {
          throw new Error("Game already started, cannot cancel!");
        }

        const userSnap = await transaction.get(userDocRef);
        if (!userSnap.exists()) return;

        // Refund bet
        transaction.update(userDocRef, {
          gems: userSnap.data().gems + selectedBet,
          updatedAt: new Date().toISOString()
        });

        transaction.update(roomDocRef, {
          status: "cancelled",
          completedAt: new Date().toISOString()
        });
      });

      setGameStatus("idle");
      setActiveGame(null);
      setSelectedMove(null);
      showAlert("Đã hủy tìm kiếm trận đấu & hoàn trả tiền cược thành công.", "success");
    } catch (err) {
      console.error(err);
      showAlert("Trận đấu đã được ghép, không thể hủy!", "error");
    } finally {
      setGameLoading(false);
    }
  };

  const playAgain = () => {
    setGameStatus("idle");
    setActiveGame(null);
    setSelectedMove(null);
    setGameResultMsg(null);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Game Header */}
      <div className="sleek-blur p-5 rounded-2xl relative overflow-hidden shadow-lg glow-amber">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 shrink-0">
            <Gamepad2 size={24} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide text-gradient">Đại Chiến Búa Kéo Bao</h1>
            <p className="text-xs text-gray-300 leading-relaxed mt-0.5">
              Ghép trận trực tiếp cùng những người chơi khác trên hệ thống. Đặt cược kim cương, tung chiêu trí tuệ và giành toàn bộ giải thưởng!
            </p>
          </div>
        </div>

        {/* Total won stats */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <span>Tổng số kim cương thắng games:</span>
          <span className="font-bold text-amber-400 flex items-center gap-1">
            <Coins size={12} />
            {user ? Math.round(user.totalGamesWonGems || 0).toLocaleString() : "0"} GEM
          </span>
        </div>
      </div>

      {/* Main Game Interface Stage */}
      {gameStatus === "idle" && (
        <section className="sleek-blur p-5 rounded-2xl space-y-6 shadow-md">
          {/* Bet Tier Selection */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bước 1: Chọn Mức Cược GEMS</h3>
            <div className="grid grid-cols-3 gap-2.5">
              {[1000, 5000, 10000].map((bet) => (
                <button
                  key={bet}
                  onClick={() => setSelectedBet(bet as any)}
                  className={`py-3.5 px-2 rounded-xl font-extrabold text-xs transition-all border flex flex-col items-center justify-center gap-1.5 shadow-sm ${
                    selectedBet === bet
                      ? "bg-amber-500/10 border-amber-500 text-amber-500"
                      : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  <Coins size={14} className={selectedBet === bet ? "text-amber-400" : "text-gray-500"} />
                  <span>{bet === 1000 ? "Nhỏ" : bet === 5000 ? "Vừa" : "Lớn"}</span>
                  <span className="font-mono text-[10px]">{bet.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Move selection */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bước 2: Tung Chiêu Quyết Định</h3>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: "rock", label: "Búa", icon: HandMetal },
                { id: "scissors", label: "Kéo", icon: Scissors },
                { id: "paper", label: "Bao", icon: Hand }
              ].map((move) => {
                const Icon = move.icon;
                return (
                  <button
                    key={move.id}
                    onClick={() => setSelectedMove(move.id as any)}
                    className={`py-6 rounded-2xl font-bold text-sm transition-all border flex flex-col items-center gap-3 shadow-md ${
                      selectedMove === move.id
                        ? "bg-gradient-to-tr from-amber-500 to-rose-500 border-transparent text-white scale-[1.03]"
                        : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:border-white/10"
                    }`}
                  >
                    <Icon size={32} className={selectedMove === move.id ? "text-white" : "text-gray-400"} />
                    <span>{move.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={playRPS}
            disabled={gameLoading || !selectedMove}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 disabled:bg-white/5 disabled:text-gray-500 text-white font-bold text-sm rounded-xl transition shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            {gameLoading ? (
              <Loader2 className="animate-spin text-white" size={16} />
            ) : (
              <Gamepad2 size={16} />
            )}
            <span>Tìm Trận Đấu Ngay (-{selectedBet.toLocaleString()} GEM)</span>
          </button>
        </section>
      )}

      {/* Matchmaking Loader Screen */}
      {gameStatus === "matching" && (
        <section className="sleek-blur p-8 rounded-2xl text-center space-y-6 shadow-md py-12 glow-amber">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-1.5 rounded-full border-4 border-b-rose-500 border-t-transparent border-l-transparent border-r-transparent animate-spin [animation-duration:1.5s]"></div>
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <Clock size={24} className="animate-pulse text-amber-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-white">Đang tìm đối thủ...</h2>
            <p className="text-xs text-gray-300 px-4 leading-relaxed">
              Hệ thống đang ghép nối bạn với người chơi có cùng mức cược <strong className="text-amber-400 font-mono">{selectedBet.toLocaleString()} GEMS</strong>. Vui lòng không đóng cửa sổ applet!
            </p>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/5 inline-block text-xs">
            <span className="text-gray-400">Tuyệt chiêu đã chọn:</span>{" "}
            <span className="font-bold text-white uppercase">{translateMove(selectedMove)}</span>
          </div>

          <button
            onClick={cancelWaiting}
            disabled={gameLoading}
            className="w-full py-3 bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-transparent text-gray-400 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            {gameLoading ? "Đang hủy..." : "Hủy Tìm Kiếm (Hoàn tiền cược)"}
          </button>
        </section>
      )}

      {/* Game Completed Results Screen */}
      {gameStatus === "ended" && (
        <section className="sleek-blur p-6 rounded-2xl text-center space-y-6 shadow-md py-8">
          {activeGame?.winnerId === "draw" ? (
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500 animate-bounce">
              <HelpCircle size={36} />
            </div>
          ) : activeGame?.winnerId === user?.telegramId ? (
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
              <CheckCircle2 size={36} />
            </div>
          ) : (
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 animate-bounce">
              <XCircle size={36} />
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-lg font-extrabold text-white">Kết Quả Trận Đấu</h2>
            
            {/* Visual match review */}
            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto py-3 bg-white/5 rounded-xl border border-white/5">
              <div className="text-center border-r border-white/5 py-1">
                <span className="text-[10px] text-gray-400 block">Bạn ra:</span>
                <span className="text-lg font-bold block mt-1">
                  {translateMove(activeGame?.player1Id === user?.telegramId ? activeGame?.player1Move : activeGame?.player2Move)}
                </span>
              </div>
              <div className="text-center py-1">
                <span className="text-[10px] text-gray-400 block">Đối thủ ra:</span>
                <span className="text-lg font-bold block mt-1 text-amber-400">
                  {translateMove(activeGame?.player1Id === user?.telegramId ? activeGame?.player2Move : activeGame?.player1Move)}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-300 px-2 leading-relaxed mt-3">{gameResultMsg}</p>
          </div>

          <button
            onClick={playAgain}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-xl font-bold text-sm transition shadow-md active:scale-[0.98] cursor-pointer"
          >
            Chơi Ván Mới
          </button>
        </section>
      )}

      {/* History of other users' games */}
      <section className="sleek-blur p-5 rounded-2xl space-y-4 shadow-md">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-white/5 pb-3 uppercase tracking-wider">
          <History size={14} className="text-amber-400" />
          <span>Giao Chiến Gần Đây Hệ Thống</span>
        </h3>

        {recentLoading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="animate-spin text-amber-500" size={18} />
          </div>
        ) : recentGames.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Chưa có trận đấu nào diễn ra. Hãy mở bát khai hỏa!</p>
        ) : (
          <div className="divide-y divide-white/5">
            {recentGames.map((game) => {
              const isP1Winner = game.winnerId === game.player1Id;
              const isDraw = game.winnerId === "draw";

              return (
                <div key={game.id} className="py-2.5 flex items-center justify-between text-[11px]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 font-semibold text-white">
                      <span className={isP1Winner ? "text-amber-400 font-extrabold" : ""}>{game.player1Name}</span>
                      <span className="text-gray-500 font-normal">vs</span>
                      <span className={(!isP1Winner && !isDraw) ? "text-amber-400 font-extrabold" : ""}>{game.player2Name || "Ẩn danh"}</span>
                    </div>
                    <p className="text-[9px] text-gray-400">
                      Cược: <strong className="text-white font-mono">{game.betTier.toLocaleString()}</strong> | {new Date(game.completedAt || "").toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {isDraw ? (
                      <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">Hòa</span>
                    ) : (
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        +{Math.round(game.betTier * 1.9).toLocaleString()} GEM
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
