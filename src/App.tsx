import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { AppShell } from "@/components/planner/AppShell";
import DailyPlanner from "./pages/DailyPlanner";
import WorkoutsRaw from "./pages/Workouts";
import Tutor from "./pages/Tutor";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import PublicAthlete from "./pages/PublicAthlete";
import Leaderboard from "./pages/Leaderboard";
import Championship from "./pages/Championship";
import PracticeTests from "./pages/PracticeTests";
import TestCalendar from "./pages/academic/TestCalendar";
import VocabBuilder from "./pages/academic/VocabBuilder";
import Notes from "./pages/academic/Notes";
import Nutrition from "./pages/Nutrition";
import RecoveryRaw from "./pages/Recovery";
import { AuthProvider } from "@/lib/auth";
import { AuthGate } from "@/components/auth/AuthGate";
import { FloatingXpLayer } from "@/components/fx/FloatingXp";
import { CustomCursor } from "@/components/fx/CustomCursor";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Workouts = WorkoutsRaw as unknown as React.FC;
const Recovery = RecoveryRaw as unknown as React.FC;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FloatingXpLayer />
      <CustomCursor />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/athlete/:username" element={<PublicAthlete />} />
            <Route element={<AuthGate><ErrorBoundary><AppShell /></ErrorBoundary></AuthGate>}>
              <Route path="/" element={<DailyPlanner />} />
              <Route path="/workouts" element={<Workouts />} />
              <Route path="/nutrition" element={<Nutrition />} />
              <Route path="/recovery" element={<Recovery />} />
              <Route path="/macros" element={<Nutrition />} />
              <Route path="/tutor" element={<Tutor />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/championship" element={<Championship />} />
              <Route path="/practice" element={<PracticeTests />} />
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
