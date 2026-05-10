import { useEffect, useState } from "react";
import { Play, Plus, Clock, Dumbbell, Trophy, ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: string[];
  emoji: string;
}

const DEFAULT_TEMPLATES: WorkoutTemplate[] = [
  { id: "push", name: "Push Day", emoji: "💪", exercises: ["Bench Press", "Shoulder Press", "Incline Press", "Tricep Dips", "Push-Ups"] },
  { id: "pull", name: "Pull Day", emoji: "🔙", exercises: ["Deadlift", "Pull-Ups", "Bent Over Row", "Lat Pulldown", "Bicep Curls"] },
  { id: "legs", name: "Leg Day", emoji: "🦵", exercises: ["Squat", "Romanian Deadlift", "Leg Press", "Lunges", "Calf Raises"] },
  { id: "cardio", name: "Cardio", emoji: "🏃", exercises: ["40-Yard Dash", "100m Sprint", "400m", "Mile Run", "Shuttle Run"] },
  { id: "full", name: "Full Body", emoji: "🔥", exercises: ["Squat", "Bench", "Deadlift", "Pull-Ups", "Push-Ups"] },
];

export const WorkoutHome = ({
  onStart,
  onSelectTemplate,
  recentSessions = [],
  prs = []
}: {
  onStart: () => void;
  onSelectTemplate: (t: WorkoutTemplate) => void;
  recentSessions?: any[];
  prs?: any[];
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Button
        onClick={onStart}
        className="w-full h-20 text-xl font-black rounded-2xl bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black shadow-[0_0_20px_rgba(0,229,255,0.3)] group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 group-active:bg-white/20 transition-colors" />
        <Play className="h-6 w-6 mr-3 fill-black" />
        START WORKOUT
      </Button>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Quick Start Templates</h2>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {DEFAULT_TEMPLATES.map((t) => (
              <Card
                key={t.id}
                onClick={() => onSelectTemplate(t)}
                className="w-48 p-4 shrink-0 cursor-pointer hover:border-[#00E5FF]/50 transition-colors bg-card/50 backdrop-blur"
              >
                <div className="text-3xl mb-2">{t.emoji}</div>
                <div className="font-bold text-lg">{t.name}</div>
                <div className="text-xs text-muted-foreground truncate">{t.exercises.length} exercises</div>
              </Card>
            ))}
            <Card className="w-48 p-4 shrink-0 cursor-pointer border-dashed flex flex-col items-center justify-center gap-2 hover:bg-accent/50 transition-colors">
              <Plus className="h-6 w-6 text-muted-foreground" />
              <div className="font-bold text-sm text-muted-foreground">Custom Template</div>
            </Card>
          </div>
        </ScrollArea>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Recent Sessions</h2>
          <Button variant="ghost" size="sm" className="text-xs text-[#00E5FF]">View All</Button>
        </div>
        {recentSessions.length > 0 ? (
          <div className="space-y-3">
            {recentSessions.map((s, i) => (
              <Card key={i} className="p-4 flex items-center justify-between hover:bg-accent/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-xl">
                    {DEFAULT_TEMPLATES.find(t => s.name.includes(t.name))?.emoji || "🏋️"}
                  </div>
                  <div>
                    <div className="font-bold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.finished_at).toLocaleDateString()} · {Math.floor(s.duration_seconds / 60)} min
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{s.total_volume_lbs} lbs</div>
                  <div className="text-[10px] text-amber-400 font-bold flex items-center justify-end gap-1">
                    <Trophy className="h-3 w-3" /> {s.pr_count} PRs
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed rounded-2xl text-center text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No sessions logged yet.
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-bold">All-Time PR Board</h2>
        </div>
        {prs.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {prs.slice(0, 4).map((pr, i) => (
              <Card key={i} className="p-4 bg-gradient-to-br from-card to-accent/20">
                <div className="text-xs text-muted-foreground uppercase tracking-tight">{pr.exercise_name}</div>
                <div className="text-2xl font-black text-[#00E5FF]">{pr.value} <span className="text-xs font-normal text-muted-foreground">{pr.unit}</span></div>
                <div className="text-[10px] text-muted-foreground mt-1">{new Date(pr.date).toLocaleDateString()}</div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed rounded-2xl text-center text-muted-foreground">
            Hit your first PR to see it here!
          </div>
        )}
      </section>
    </div>
  );
};
