import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { AppShell } from "@/components/planner/AppShell";
import DailyPlanner from "./pages/DailyPlanner";
import Homework from "./pages/Homework";
import Workouts from "./pages/Workouts";
import Tutor from "./pages/Tutor";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DailyPlanner />} />
            <Route path="/homework" element={<Homework />} />
            <Route path="/workouts" element={<Workouts />} />
            <Route path="/tutor" element={<Tutor />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
