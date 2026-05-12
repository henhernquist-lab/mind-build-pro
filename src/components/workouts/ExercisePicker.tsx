import { useState } from "react";
import { Search, Plus, X, Dumbbell, Activity, Timer, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ExerciseType = "weighted" | "bodyweight" | "cardio_timed" | "cardio_distance" | "timed";

export interface Exercise {
  id: string;
  name: string;
  category: string;
  type: ExerciseType;
  muscle_group: string;
}

const EXERCISE_LIBRARY: Exercise[] = [
  // Chest
  { id: "bench_press", name: "Bench Press", category: "Chest", type: "weighted", muscle_group: "Chest" },
  { id: "incline_bench_press", name: "Incline Bench Press", category: "Chest", type: "weighted", muscle_group: "Chest" },
  { id: "decline_bench_press", name: "Decline Bench Press", category: "Chest", type: "weighted", muscle_group: "Chest" },
  { id: "dumbbell_press", name: "Dumbbell Press", category: "Chest", type: "weighted", muscle_group: "Chest" },
  { id: "incline_dumbbell_press", name: "Incline Dumbbell Press", category: "Chest", type: "weighted", muscle_group: "Chest" },
  { id: "push_ups", name: "Push-Ups", category: "Chest", type: "bodyweight", muscle_group: "Chest" },
  { id: "chest_fly", name: "Chest Fly", category: "Chest", type: "weighted", muscle_group: "Chest" },
  { id: "cable_fly", name: "Cable Fly", category: "Chest", type: "weighted", muscle_group: "Chest" },
  { id: "pec_deck", name: "Pec Deck", category: "Chest", type: "weighted", muscle_group: "Chest" },
  { id: "cable_crossover", name: "Cable Crossover", category: "Chest", type: "weighted", muscle_group: "Chest" },

  // Back
  { id: "deadlift", name: "Deadlift", category: "Back", type: "weighted", muscle_group: "Back" },
  { id: "pull_ups", name: "Pull-Ups", category: "Back", type: "bodyweight", muscle_group: "Back" },
  { id: "chin_ups", name: "Chin-Ups", category: "Back", type: "bodyweight", muscle_group: "Back" },
  { id: "bent_over_barbell_row", name: "Bent Over Barbell Row", category: "Back", type: "weighted", muscle_group: "Back" },
  { id: "bent_over_dumbbell_row", name: "Bent Over Dumbbell Row", category: "Back", type: "weighted", muscle_group: "Back" },
  { id: "single_arm_row", name: "Single Arm Row", category: "Back", type: "weighted", muscle_group: "Back" },
  { id: "lat_pulldown", name: "Lat Pulldown", category: "Back", type: "weighted", muscle_group: "Back" },
  { id: "seated_cable_row", name: "Seated Cable Row", category: "Back", type: "weighted", muscle_group: "Back" },
  { id: "t_bar_row", name: "T-Bar Row", category: "Back", type: "weighted", muscle_group: "Back" },
  { id: "face_pull", name: "Face Pull", category: "Back", type: "weighted", muscle_group: "Back" },
  { id: "rack_pull", name: "Rack Pull", category: "Back", type: "weighted", muscle_group: "Back" },

  // Legs
  { id: "squat", name: "Squat", category: "Legs", type: "weighted", muscle_group: "Legs" },
  { id: "front_squat", name: "Front Squat", category: "Legs", type: "weighted", muscle_group: "Legs" },
  { id: "romanian_deadlift", name: "Romanian Deadlift", category: "Legs", type: "weighted", muscle_group: "Legs" },
  { id: "sumo_deadlift", name: "Sumo Deadlift", category: "Legs", type: "weighted", muscle_group: "Legs" },
  { id: "leg_press", name: "Leg Press", category: "Legs", type: "weighted", muscle_group: "Legs" },
  { id: "hack_squat", name: "Hack Squat", category: "Legs", type: "weighted", muscle_group: "Legs" },
  { id: "lunges", name: "Lunges", category: "Legs", type: "weighted", muscle_group: "Legs" },
  { id: "walking_lunges", name: "Walking Lunges", category: "Legs", type: "weighted", muscle_group: "Legs" },
  { id: "bulgarian_split_squat", name: "Bulgarian Split Squat", category: "Legs", type: "weighted", muscle_group: "Legs" },
  { id: "leg_curl", name: "Leg Curl", category: "Legs", type: "weighted", muscle_group: "Legs" },
  { id: "leg_extension", name: "Leg Extension", category: "Legs", type: "weighted", muscle_group: "Legs" },
  { id: "calf_raises", name: "Calf Raises", category: "Legs", type: "weighted", muscle_group: "Legs" },
  { id: "hip_thrust", name: "Hip Thrust", category: "Legs", type: "weighted", muscle_group: "Legs" },
  { id: "glute_bridge", name: "Glute Bridge", category: "Legs", type: "weighted", muscle_group: "Legs" },
  { id: "step_ups", name: "Step Ups", category: "Legs", type: "weighted", muscle_group: "Legs" },

  // Shoulders
  { id: "overhead_press", name: "Overhead Press", category: "Shoulders", type: "weighted", muscle_group: "Shoulders" },
  { id: "seated_dumbbell_press", name: "Seated Dumbbell Press", category: "Shoulders", type: "weighted", muscle_group: "Shoulders" },
  { id: "arnold_press", name: "Arnold Press", category: "Shoulders", type: "weighted", muscle_group: "Shoulders" },
  { id: "lateral_raise", name: "Lateral Raise", category: "Shoulders", type: "weighted", muscle_group: "Shoulders" },
  { id: "front_raise", name: "Front Raise", category: "Shoulders", type: "weighted", muscle_group: "Shoulders" },
  { id: "rear_delt_fly", name: "Rear Delt Fly", category: "Shoulders", type: "weighted", muscle_group: "Shoulders" },
  { id: "upright_row", name: "Upright Row", category: "Shoulders", type: "weighted", muscle_group: "Shoulders" },
  { id: "shrugs", name: "Shrugs", category: "Shoulders", type: "weighted", muscle_group: "Shoulders" },
  { id: "cable_lateral_raise", name: "Cable Lateral Raise", category: "Shoulders", type: "weighted", muscle_group: "Shoulders" },

  // Arms
  { id: "barbell_curl", name: "Barbell Curl", category: "Arms", type: "weighted", muscle_group: "Arms" },
  { id: "dumbbell_curl", name: "Dumbbell Curl", category: "Arms", type: "weighted", muscle_group: "Arms" },
  { id: "hammer_curl", name: "Hammer Curl", category: "Arms", type: "weighted", muscle_group: "Arms" },
  { id: "preacher_curl", name: "Preacher Curl", category: "Arms", type: "weighted", muscle_group: "Arms" },
  { id: "concentration_curl", name: "Concentration Curl", category: "Arms", type: "weighted", muscle_group: "Arms" },
  { id: "cable_curl", name: "Cable Curl", category: "Arms", type: "weighted", muscle_group: "Arms" },
  { id: "skull_crushers", name: "Skull Crushers", category: "Arms", type: "weighted", muscle_group: "Arms" },
  { id: "tricep_pushdown", name: "Tricep Pushdown", category: "Arms", type: "weighted", muscle_group: "Arms" },
  { id: "overhead_tricep_extension", name: "Overhead Tricep Extension", category: "Arms", type: "weighted", muscle_group: "Arms" },
  { id: "tricep_dips", name: "Tricep Dips", category: "Arms", type: "bodyweight", muscle_group: "Arms" },
  { id: "close_grip_bench", name: "Close Grip Bench", category: "Arms", type: "weighted", muscle_group: "Arms" },
  { id: "diamond_push_ups", name: "Diamond Push-Ups", category: "Arms", type: "bodyweight", muscle_group: "Arms" },

  // Core
  { id: "plank", name: "Plank", category: "Core", type: "timed", muscle_group: "Core" },
  { id: "sit_ups", name: "Sit-Ups", category: "Core", type: "bodyweight", muscle_group: "Core" },
  { id: "crunches", name: "Crunches", category: "Core", type: "bodyweight", muscle_group: "Core" },
  { id: "leg_raises", name: "Leg Raises", category: "Core", type: "bodyweight", muscle_group: "Core" },
  { id: "hanging_leg_raise", name: "Hanging Leg Raise", category: "Core", type: "bodyweight", muscle_group: "Core" },
  { id: "russian_twist", name: "Russian Twist", category: "Core", type: "bodyweight", muscle_group: "Core" },
  { id: "cable_crunch", name: "Cable Crunch", category: "Core", type: "weighted", muscle_group: "Core" },
  { id: "ab_wheel_rollout", name: "Ab Wheel Rollout", category: "Core", type: "bodyweight", muscle_group: "Core" },
  { id: "side_plank", name: "Side Plank", category: "Core", type: "timed", muscle_group: "Core" },
  { id: "bicycle_crunches", name: "Bicycle Crunches", category: "Core", type: "bodyweight", muscle_group: "Core" },
  { id: "toe_touches", name: "Toe Touches", category: "Core", type: "bodyweight", muscle_group: "Core" },
  { id: "mountain_climbers", name: "Mountain Climbers", category: "Core", type: "bodyweight", muscle_group: "Core" },

  // Cardio
  { id: "40_yard_dash", name: "40-Yard Dash", category: "Cardio", type: "cardio_timed", muscle_group: "Cardio" },
  { id: "100m_sprint", name: "100m Sprint", category: "Cardio", type: "cardio_timed", muscle_group: "Cardio" },
  { id: "200m_run", name: "200m Run", category: "Cardio", type: "cardio_timed", muscle_group: "Cardio" },
  { id: "400m_run", name: "400m Run", category: "Cardio", type: "cardio_timed", muscle_group: "Cardio" },
  { id: "800m_run", name: "800m Run", category: "Cardio", type: "cardio_timed", muscle_group: "Cardio" },
  { id: "mile_run", name: "Mile Run", category: "Cardio", type: "cardio_timed", muscle_group: "Cardio" },
  { id: "5k_run", name: "5K Run", category: "Cardio", type: "cardio_timed", muscle_group: "Cardio" },
  { id: "shuttle_run", name: "Shuttle Run", category: "Cardio", type: "cardio_timed", muscle_group: "Cardio" },
  { id: "jump_rope", name: "Jump Rope", category: "Cardio", type: "bodyweight", muscle_group: "Cardio" },
  { id: "rowing_machine", name: "Rowing Machine", category: "Cardio", type: "cardio_distance", muscle_group: "Cardio" },
  { id: "assault_bike", name: "Assault Bike", category: "Cardio", type: "cardio_distance", muscle_group: "Cardio" },
  { id: "stair_climber", name: "Stair Climber", category: "Cardio", type: "timed", muscle_group: "Cardio" },
];

const CATEGORIES = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio", "Custom"];

export const ExercisePicker = ({ onSelect, onCancel }: { onSelect: (e: Exercise) => void; onCancel: () => void }) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customGroup, setCustomGroup] = useState("");
  const [customType, setCustomType] = useState<ExerciseType>("weighted");

  const filtered = EXERCISE_LIBRARY.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category ? e.category === category : true;
    return matchesSearch && matchesCat;
  });

  const handleCreate = () => {
    if (!customName) return;
    const custom: Exercise = {
      id: `custom_${Date.now()}`,
      name: customName,
      category: "Custom",
      type: customType,
      muscle_group: customGroup || "Other",
    };
    onSelect(custom);
  };

  return (
    <div className="flex flex-col h-full bg-background border rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Add Exercise</h2>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-5 w-5" /></Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search exercises..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            <Button
              variant={category === null ? "default" : "outline"}
              size="sm"
              onClick={() => {setCategory(null); setCreating(false);}}
            >
              All
            </Button>
            {CATEGORIES.map(c => (
              <Button
                key={c}
                variant={category === c ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCategory(c);
                  if (c === "Custom") setCreating(true);
                  else setCreating(false);
                }}
              >
                {c}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <ScrollArea className="flex-1">
        {creating ? (
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Exercise Name</Label>
              <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. Zercher Squat" />
            </div>
            <div className="space-y-2">
              <Label>Muscle Group</Label>
              <Input value={customGroup} onChange={e => setCustomGroup(e.target.value)} placeholder="e.g. Quads" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={customType} onValueChange={v => setCustomType(v as ExerciseType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weighted">Weighted</SelectItem>
                  <SelectItem value="bodyweight">Bodyweight</SelectItem>
                  <SelectItem value="cardio_timed">Cardio (Timed)</SelectItem>
                  <SelectItem value="cardio_distance">Cardio (Distance)</SelectItem>
                  <SelectItem value="timed">Timed (Hold)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreate}>Create Exercise</Button>
          </div>
        ) : (
          <div className="p-2">
            {filtered.map(e => (
              <button
                key={e.id}
                onClick={() => onSelect(e)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-accent transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                    {e.category === "Cardio" ? <Activity className="h-5 w-5 text-primary" /> :
                     e.type === "timed" ? <Timer className="h-5 w-5 text-primary" /> :
                     <Dumbbell className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.muscle_group}</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors text-primary"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <span className="font-medium">Create Custom Exercise</span>
            </button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
