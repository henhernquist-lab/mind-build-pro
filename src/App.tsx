import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { AppShell } from "@/components/planner/AppShell";
import DailyPlanner from "./pages/DailyPlanner";
import Workouts from "./pages/Workouts";
import Tutor from "./pages/Tutor";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import PublicAthlete from "./pages/PublicAthlete";
import GamesIndex from "./pages/games/GamesIndex";
import BossBattles from "./pages/games/BossBattles";
import FlashcardBattle from "./pages/games/FlashcardBattle";
import DebateClub from "./pages/games/DebateClub";
import GeorgiaConquest from "./pages/games/GeorgiaConquest";
import AlgebraDungeon from "./pages/games/AlgebraDungeon";
import SpeedMathBlitz from "./pages/games/SpeedMathBlitz";
import Leaderboard from "./pages/Leaderboard";
import Championship from "./pages/Championship";
import TestCalendar from "./pages/academic/TestCalendar";
import VocabBuilder from "./pages/academic/VocabBuilder";
import Notes from "./pages/academic/Notes";
import Nutrition from "./pages/Nutrition";
import { AuthProvider } from "@/lib/auth";
import { AuthGate } from "@/components/auth/AuthGate";
import { FloatingXpLayer } from "@/components/fx/FloatingXp";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FloatingXpLayer />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/athlete/:username" element={<PublicAthlete />} />
            <Route element={<AuthGate><AppShell /></AuthGate>}>
              <Route path="/" element={<DailyPlanner />} />
              <Route path="/workouts" element={<Workouts />} />
              <Route path="/nutrition" element={<Nutrition />} />
              <Route path="/macros" element={<Nutrition />} />
              <Route path="/tutor" element={<Tutor />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/games" element={<GamesIndex />} />
              <Route path="/games/bosses" element={<BossBattles />} />
              <Route path="/games/flashcards" element={<FlashcardBattle />} />
              <Route path="/games/debate" element={<DebateClub />} />
              <Route path="/games/georgia" element={<GeorgiaConquest />} />
              <Route path="/games/dungeon" element={<AlgebraDungeon />} />
              <Route path="/games/blitz" element={<SpeedMathBlitz />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/championship" element={<Championship />} />
              <Route path="/tests" element={<TestCalendar />} />
              <Route path="/vocab" element={<VocabBuilder />} />
              <Route path="/notes" element={<Notes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
