// Strength training utilities — 1RM formulas + percentage table + teen-athlete grading.
// Grading algorithm based on high school strength coach standards and NFL Combine benchmarks.

export type OneRMResult = {
  epley: number;
  brzycki: number;
  lombardi: number;
  oconnor: number;
  average: number;
};

export const calc1RM = (weight: number, reps: number): OneRMResult => {
  if (weight <= 0 || reps <= 0) return { epley: 0, brzycki: 0, lombardi: 0, oconnor: 0, average: 0 };
  const epley = weight * (1 + reps / 30);
  const brzycki = reps >= 37 ? weight : weight * (36 / (37 - reps));
  const lombardi = weight * Math.pow(reps, 0.10);
  const oconnor = weight * (1 + reps / 40);
  const average = (epley + brzycki + lombardi + oconnor) / 4;
  return {
    epley: Math.round(epley * 10) / 10,
    brzycki: Math.round(brzycki * 10) / 10,
    lombardi: Math.round(lombardi * 10) / 10,
    oconnor: Math.round(oconnor * 10) / 10,
    average: Math.round(average * 10) / 10,
  };
};

export const lbsToKg = (lbs: number) => Math.round(lbs * 0.453592 * 10) / 10;
export const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;

export type IntensityRow = { pct: number; label: string; weight: number };

export const PERCENT_TABLE: { pct: number; label: string }[] = [
  { pct: 50, label: "Warmup / Technique" },
  { pct: 60, label: "Endurance sets" },
  { pct: 70, label: "Hypertrophy" },
  { pct: 75, label: "Strength-endurance" },
  { pct: 80, label: "Strength building" },
  { pct: 85, label: "Heavy strength" },
  { pct: 90, label: "Near-max training" },
  { pct: 95, label: "Peak strength" },
  { pct: 100, label: "True max attempt" },
];

export const buildPercentTable = (oneRm: number, unit: "lbs" | "kg"): IntensityRow[] => {
  return PERCENT_TABLE.map((row) => {
    const lbs = oneRm * (row.pct / 100);
    const w = unit === "kg" ? lbsToKg(lbs) : Math.round(lbs * 2) / 2;
    return { pct: row.pct, label: row.label, weight: w };
  });
};

// ─── New Teen Athlete Grading System ─────────────────────────────────────────
// Based on high school strength coach standards and NFL Combine benchmarks.
// Core principle: grade on adjusted ratio — younger athletes and female athletes
// get leniency multipliers so they are graded fairly for their development stage.

export type StrengthGrade = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";

export type GradingResult = {
  grade: StrengthGrade;
  level: string;       // e.g. "Varsity Level"
  percentile: number;  // 0–100
  ratio: number;       // lift / bodyweight (rounded to 2dp)
  adjustedRatio: number;
  position: number;    // 0–1 for spectrum bar
  note: string;
  nextGrade: StrengthGrade | null;
  nextGradeTarget: number | null; // lbs needed for next grade (unadjusted)
  exerciseType: "weighted" | "reps" | "speed";
};

// Map exercise name → canonical key
const canonicalExercise = (ex: string): string => {
  const k = ex.toLowerCase();
  if (k.includes("bench")) return "bench";
  if (k.includes("squat")) return "squat";
  if (k.includes("deadlift")) return "deadlift";
  if (k.includes("overhead") || k.includes("ohp") || k.includes("shoulder press") || k.includes("military")) return "overhead_press";
  if (k.includes("push") && k.includes("up")) return "pushups";
  if (k.includes("sit") && k.includes("up")) return "situps";
  if (k.includes("40")) return "40yd";
  if (k.includes("100m")) return "100m";
  if (k.includes("mile")) return "mile";
  if (k.includes("shuttle")) return "shuttle";
  return "bench"; // default to bench for unknown weighted lifts
};

// Age leniency multiplier — younger athletes get more credit
const ageLeniency = (age: number): number => {
  if (age <= 12) return 1.35;
  if (age === 13) return 1.25;
  if (age === 14) return 1.15;
  if (age === 15) return 1.08;
  if (age === 16) return 1.04;
  return 1.0; // 17+
};

// Gender multiplier — female athletes graded on female standards
const genderMultiplier = (gender: "male" | "female"): number =>
  gender === "female" ? 1.30 : 1.0;

type GradeEntry = { grade: StrengthGrade; level: string; percentile: number; threshold: number };

const BENCH_GRADES: GradeEntry[] = [
  { grade: "A+", level: "College Prospect",   percentile: 95, threshold: 1.50 },
  { grade: "A",  level: "Elite High School",  percentile: 85, threshold: 1.25 },
  { grade: "B+", level: "Varsity Level",       percentile: 70, threshold: 1.10 },
  { grade: "B",  level: "Solid Athlete",       percentile: 55, threshold: 0.90 },
  { grade: "C+", level: "Average",             percentile: 40, threshold: 0.75 },
  { grade: "C",  level: "Developing",          percentile: 28, threshold: 0.60 },
  { grade: "D",  level: "Beginner",            percentile: 15, threshold: 0.45 },
  { grade: "F",  level: "Just Starting",       percentile: 5,  threshold: 0 },
];

const SQUAT_GRADES: GradeEntry[] = [
  { grade: "A+", level: "College Prospect",   percentile: 95, threshold: 2.00 },
  { grade: "A",  level: "Elite High School",  percentile: 85, threshold: 1.75 },
  { grade: "B+", level: "Varsity Level",       percentile: 70, threshold: 1.50 },
  { grade: "B",  level: "Solid Athlete",       percentile: 55, threshold: 1.25 },
  { grade: "C+", level: "Average",             percentile: 40, threshold: 1.00 },
  { grade: "C",  level: "Developing",          percentile: 28, threshold: 0.80 },
  { grade: "D",  level: "Beginner",            percentile: 15, threshold: 0.60 },
  { grade: "F",  level: "Just Starting",       percentile: 5,  threshold: 0 },
];

const DEADLIFT_GRADES: GradeEntry[] = [
  { grade: "A+", level: "College Prospect",   percentile: 95, threshold: 2.25 },
  { grade: "A",  level: "Elite High School",  percentile: 85, threshold: 2.00 },
  { grade: "B+", level: "Varsity Level",       percentile: 70, threshold: 1.75 },
  { grade: "B",  level: "Solid Athlete",       percentile: 55, threshold: 1.50 },
  { grade: "C+", level: "Average",             percentile: 40, threshold: 1.25 },
  { grade: "C",  level: "Developing",          percentile: 28, threshold: 1.00 },
  { grade: "D",  level: "Beginner",            percentile: 15, threshold: 0.75 },
  { grade: "F",  level: "Just Starting",       percentile: 5,  threshold: 0 },
];

const OHP_GRADES: GradeEntry[] = [
  { grade: "A+", level: "College Prospect",   percentile: 95, threshold: 1.00 },
  { grade: "A",  level: "Elite High School",  percentile: 85, threshold: 0.85 },
  { grade: "B+", level: "Varsity Level",       percentile: 70, threshold: 0.75 },
  { grade: "B",  level: "Solid Athlete",       percentile: 55, threshold: 0.65 },
  { grade: "C+", level: "Average",             percentile: 40, threshold: 0.55 },
  { grade: "C",  level: "Developing",          percentile: 28, threshold: 0.45 },
  { grade: "D",  level: "Beginner",            percentile: 15, threshold: 0.35 },
  { grade: "F",  level: "Just Starting",       percentile: 5,  threshold: 0 },
];

const PUSHUP_GRADES: GradeEntry[] = [
  { grade: "A+", level: "Elite",          percentile: 95, threshold: 60 },
  { grade: "A",  level: "Excellent",      percentile: 85, threshold: 50 },
  { grade: "B+", level: "Above Average",  percentile: 70, threshold: 40 },
  { grade: "B",  level: "Average",        percentile: 55, threshold: 30 },
  { grade: "C+", level: "Below Average",  percentile: 40, threshold: 22 },
  { grade: "C",  level: "Developing",     percentile: 28, threshold: 15 },
  { grade: "D",  level: "Beginner",       percentile: 15, threshold: 8 },
  { grade: "F",  level: "Just Starting",  percentile: 5,  threshold: 0 },
];

// Speed grades — lower time is better, so threshold means "at or below this time"
const SPEED_40YD: GradeEntry[] = [
  { grade: "A+", level: "D1 Prospect",       percentile: 99, threshold: 4.3 },
  { grade: "A",  level: "Elite High School", percentile: 90, threshold: 4.5 },
  { grade: "B+", level: "Varsity Speed",     percentile: 75, threshold: 4.7 },
  { grade: "B",  level: "Good Athlete",      percentile: 60, threshold: 4.9 },
  { grade: "C+", level: "Average",           percentile: 45, threshold: 5.1 },
  { grade: "C",  level: "Below Average",     percentile: 30, threshold: 5.3 },
  { grade: "D",  level: "Developing",        percentile: 15, threshold: 5.6 },
  { grade: "F",  level: "Needs Work",        percentile: 5,  threshold: Infinity },
];

const SPEED_100M: GradeEntry[] = [
  { grade: "A+", level: "Elite Track",    percentile: 99, threshold: 10.8 },
  { grade: "A",  level: "Excellent",      percentile: 90, threshold: 11.3 },
  { grade: "B+", level: "Above Average",  percentile: 75, threshold: 11.8 },
  { grade: "B",  level: "Average",        percentile: 60, threshold: 12.3 },
  { grade: "C+", level: "Below Average",  percentile: 40, threshold: 13.0 },
  { grade: "C",  level: "Developing",     percentile: 25, threshold: 13.8 },
  { grade: "D",  level: "Beginner",       percentile: 12, threshold: 15.0 },
  { grade: "F",  level: "Needs Work",     percentile: 5,  threshold: Infinity },
];

const SPEED_MILE: GradeEntry[] = [
  { grade: "A+", level: "Elite Runner",   percentile: 99, threshold: 330 },
  { grade: "A",  level: "Excellent",      percentile: 88, threshold: 360 },
  { grade: "B+", level: "Above Average",  percentile: 73, threshold: 400 },
  { grade: "B",  level: "Average",        percentile: 57, threshold: 450 },
  { grade: "C+", level: "Below Average",  percentile: 40, threshold: 510 },
  { grade: "C",  level: "Developing",     percentile: 25, threshold: 570 },
  { grade: "D",  level: "Beginner",       percentile: 12, threshold: 660 },
  { grade: "F",  level: "Needs Work",     percentile: 5,  threshold: Infinity },
];

const SPEED_SHUTTLE: GradeEntry[] = [
  { grade: "A+", level: "Elite Agility",  percentile: 99, threshold: 3.8 },
  { grade: "A",  level: "Excellent",      percentile: 88, threshold: 4.0 },
  { grade: "B+", level: "Above Average",  percentile: 73, threshold: 4.2 },
  { grade: "B",  level: "Average",        percentile: 57, threshold: 4.5 },
  { grade: "C+", level: "Below Average",  percentile: 40, threshold: 4.8 },
  { grade: "C",  level: "Developing",     percentile: 25, threshold: 5.2 },
  { grade: "D",  level: "Beginner",       percentile: 12, threshold: 5.8 },
  { grade: "F",  level: "Needs Work",     percentile: 5,  threshold: Infinity },
];

const gradeFromTable = (table: GradeEntry[], value: number, higherIsBetter: boolean): GradeEntry => {
  if (higherIsBetter) {
    for (const entry of table) {
      if (value >= entry.threshold) return entry;
    }
  } else {
    // lower is better (speed)
    for (const entry of table) {
      if (value <= entry.threshold) return entry;
    }
  }
  return table[table.length - 1];
};

// Compute next grade target in raw lbs (unadjusted) for weighted lifts
const nextGradeTarget = (
  table: GradeEntry[],
  currentGrade: StrengthGrade,
  bodyweightLbs: number,
  ageMul: number,
  genderMul: number,
): { grade: StrengthGrade; lbs: number } | null => {
  const idx = table.findIndex((e) => e.grade === currentGrade);
  if (idx <= 0) return null; // already A+ or not found
  const next = table[idx - 1];
  // adjustedRatio >= next.threshold → ratio >= next.threshold / (ageMul * genderMul)
  const rawRatioNeeded = next.threshold / (ageMul * genderMul);
  const lbsNeeded = Math.ceil(rawRatioNeeded * bodyweightLbs);
  return { grade: next.grade, lbs: lbsNeeded };
};

// Grade color for display
export const gradeColor = (g: StrengthGrade): string => {
  if (g === "A+") return "hsl(45 90% 55%)";   // gold
  if (g === "A")  return "hsl(48 95% 50%)";   // gold
  if (g === "B+") return "hsl(142 70% 50%)";  // green
  if (g === "B")  return "hsl(145 65% 45%)";  // green
  if (g === "C+") return "hsl(200 80% 55%)";  // blue
  if (g === "C")  return "hsl(220 70% 60%)";  // blue
  if (g === "D")  return "hsl(30 90% 55%)";   // orange
  return "hsl(0 70% 55%)";                    // red (F)
};

// ─── Main grading function ────────────────────────────────────────────────────

export const gradeStrength = (
  exercise: string,
  value: number,         // 1RM in lbs for weighted; reps for pushups; seconds for speed
  bodyweightLbs: number,
  age: number,
  gender: "male" | "female",
): GradingResult => {
  const ex = canonicalExercise(exercise);
  const aLeniency = ageLeniency(age);
  const gMul = genderMultiplier(gender);

  // ── Weighted lifts ──────────────────────────────────────────────────────────
  if (["bench", "squat", "deadlift", "overhead_press"].includes(ex)) {
    if (!bodyweightLbs || bodyweightLbs <= 0) {
      return {
        grade: "F", level: "No bodyweight", percentile: 0, ratio: 0, adjustedRatio: 0,
        position: 0, note: "Add your bodyweight to your athletic profile to grade.",
        nextGrade: null, nextGradeTarget: null, exerciseType: "weighted",
      };
    }
    const ratio = value / bodyweightLbs;
    const adjustedRatio = ratio * aLeniency * gMul;

    const table = ex === "bench" ? BENCH_GRADES
      : ex === "squat" ? SQUAT_GRADES
      : ex === "deadlift" ? DEADLIFT_GRADES
      : OHP_GRADES;

    const entry = gradeFromTable(table, adjustedRatio, true);
    const position = Math.min(1, Math.max(0, adjustedRatio / (table[0].threshold * 1.1)));

    const next = nextGradeTarget(table, entry.grade, bodyweightLbs, aLeniency, gMul);

    const noteMap: Record<StrengthGrade, string> = {
      "A+": "World-class for your age group — college scouts take notice. 🔥",
      "A":  "Elite high school level. You're in the top tier for your age.",
      "B+": "Varsity-level strength. Keep pushing and A is within reach.",
      "B":  "Solid athlete. You're above average and building a real foundation.",
      "C+": "Average for your age group — consistent training will move you up.",
      "C":  "Developing strength. Every rep counts — stay the course.",
      "D":  "Beginner stage — the gains come fast when you're consistent.",
      "F":  "Just getting started — everyone begins here. Show up and improve.",
    };

    return {
      grade: entry.grade,
      level: entry.level,
      percentile: entry.percentile,
      ratio: Math.round(ratio * 100) / 100,
      adjustedRatio: Math.round(adjustedRatio * 100) / 100,
      position,
      note: noteMap[entry.grade],
      nextGrade: next?.grade ?? null,
      nextGradeTarget: next?.lbs ?? null,
      exerciseType: "weighted",
    };
  }

  // ── Push-ups / sit-ups (reps-based) ─────────────────────────────────────────
  if (ex === "pushups" || ex === "situps") {
    const ageBonus = age <= 12 ? 15 : age === 13 ? 10 : age === 14 ? 7 : age === 15 ? 4 : age === 16 ? 2 : 0;
    const gBonus = gender === "female" ? 12 : 0;
    const adjustedReps = value + ageBonus + gBonus;
    const entry = gradeFromTable(PUSHUP_GRADES, adjustedReps, true);
    const position = Math.min(1, Math.max(0, adjustedReps / (PUSHUP_GRADES[0].threshold * 1.1)));
    const idx = PUSHUP_GRADES.findIndex((e) => e.grade === entry.grade);
    const nextEntry = idx > 0 ? PUSHUP_GRADES[idx - 1] : null;
    const nextRepsNeeded = nextEntry ? Math.ceil(nextEntry.threshold - ageBonus - gBonus) : null;

    return {
      grade: entry.grade,
      level: entry.level,
      percentile: entry.percentile,
      ratio: value,
      adjustedRatio: adjustedReps,
      position,
      note: `${adjustedReps} adjusted reps (${value} actual + ${ageBonus + gBonus} age/gender bonus).`,
      nextGrade: nextEntry?.grade ?? null,
      nextGradeTarget: nextRepsNeeded,
      exerciseType: "reps",
    };
  }

  // ── Speed events (lower is better) ──────────────────────────────────────────
  if (["40yd", "100m", "mile", "shuttle"].includes(ex)) {
    const ageBonus = age <= 12 ? 0.5 : age === 13 ? 0.4 : age === 14 ? 0.3 : age === 15 ? 0.2 : age === 16 ? 0.1 : 0;
    const gBonus = gender === "female" ? 0.4 : 0;
    const adjustedTime = value - ageBonus - gBonus;

    const table = ex === "40yd" ? SPEED_40YD
      : ex === "100m" ? SPEED_100M
      : ex === "mile" ? SPEED_MILE
      : SPEED_SHUTTLE;

    const entry = gradeFromTable(table, adjustedTime, false);
    // For speed: position = how close to the best threshold (lower time = higher position)
    const bestThreshold = table[0].threshold;
    const worstThreshold = table[table.length - 2].threshold; // second to last (last is Infinity)
    const position = Math.min(1, Math.max(0, 1 - (adjustedTime - bestThreshold) / (worstThreshold - bestThreshold)));

    const idx = table.findIndex((e) => e.grade === entry.grade);
    const nextEntry = idx > 0 ? table[idx - 1] : null;
    const nextTimeNeeded = nextEntry && nextEntry.threshold !== Infinity
      ? Math.round((nextEntry.threshold + ageBonus + gBonus) * 100) / 100
      : null;

    const unit = ex === "mile" ? "s" : "s";
    const formatTime = (s: number) => ex === "mile"
      ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`
      : `${s.toFixed(2)}s`;

    return {
      grade: entry.grade,
      level: entry.level,
      percentile: entry.percentile,
      ratio: value,
      adjustedRatio: Math.round(adjustedTime * 100) / 100,
      position,
      note: `Adjusted time: ${formatTime(adjustedTime)} (${formatTime(value)} actual − ${(ageBonus + gBonus).toFixed(1)}s bonus).`,
      nextGrade: nextEntry?.grade ?? null,
      nextGradeTarget: nextTimeNeeded,
      exerciseType: "speed",
    };
  }

  // Fallback — treat as bench press
  return gradeStrength("bench press", value, bodyweightLbs, age, gender);
};

// Keep old StrengthGrade type alias for compatibility with any remaining references
// (MaxLifts.tsx uses StrengthGrade as the type for the spectrum labels)
export const STRENGTH_GRADES: StrengthGrade[] = ["A+", "A", "B+", "B", "C+", "C", "D", "F"];
