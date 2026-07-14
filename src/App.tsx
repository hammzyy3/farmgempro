import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { Layout } from "./components/Layout";
import { EarnPage } from "./pages/EarnPage";
import { WalletPage } from "./pages/WalletPage";
import { FriendsPage } from "./pages/FriendsPage";
import { GamesPage } from "./pages/GamesPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { AdminPage } from "./pages/AdminPage";

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<EarnPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}
