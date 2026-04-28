// Strength training utilities — 1RM formulas + percentage table + grading.

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

// ---- Strength standards (lift-to-bodyweight ratio thresholds, male baseline) ----
// Approximate values based on ExRx-style standards for adult intermediate athletes.
// Female multiplier ~0.65 of male thresholds.
// Youth (<18) multiplier scales down with age.

type StdMap = Record<string, [number, number, number, number, number]>;
// [Beginner, Novice, Intermediate, Advanced, Elite] thresholds as ratio of bodyweight
const MALE_STD: StdMap = {
  "bench press":   [0.6, 1.0, 1.4, 1.8, 2.2],
  "squat":         [0.9, 1.3, 1.8, 2.4, 3.0],
  "deadlift":      [1.0, 1.5, 2.1, 2.7, 3.3],
  "overhead press":[0.4, 0.7, 1.0, 1.3, 1.6],
  "default":       [0.6, 1.0, 1.4, 1.8, 2.2],
};

const GRADES = ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"] as const;
export type StrengthGrade = typeof GRADES[number];

export type GradingResult = {
  grade: StrengthGrade;
  ratio: number;
  position: number; // 0-1 across the spectrum
  note: string;
};

const findStd = (exercise: string): [number, number, number, number, number] => {
  const k = exercise.toLowerCase();
  for (const [name, vals] of Object.entries(MALE_STD)) {
    if (k.includes(name)) return vals;
  }
  return MALE_STD.default;
};

export const gradeStrength = (
  exercise: string,
  oneRmLbs: number,
  bodyweightLbs: number,
  age: number,
  gender: "male" | "female",
): GradingResult => {
  if (!bodyweightLbs || bodyweightLbs <= 0) {
    return { grade: "Beginner", ratio: 0, position: 0, note: "Add bodyweight to your athletic profile to grade." };
  }
  const ratio = oneRmLbs / bodyweightLbs;
  let std = findStd(exercise);
  // Female adjustment
  const genderMul = gender === "female" ? 0.65 : 1;
  // Youth adjustment: scale down ratio thresholds for under-18 athletes
  const ageMul = age >= 18 ? 1 : Math.max(0.55, 0.55 + (age - 12) * 0.075); // 12y=0.55, 18y=1.0
  const adjusted = std.map((v) => v * genderMul * ageMul) as [number, number, number, number, number];

  let gradeIdx = 0;
  for (let i = 0; i < adjusted.length; i++) {
    if (ratio >= adjusted[i]) gradeIdx = i;
  }
  const grade = GRADES[gradeIdx];
  // Position: where they fall between min and max threshold (0..1)
  const minT = adjusted[0];
  const maxT = adjusted[4];
  const position = Math.min(1, Math.max(0, (ratio - minT) / (maxT - minT || 1)));

  const noteMap: Record<StrengthGrade, string> = {
    Beginner: "Solid starting point — keep showing up.",
    Novice: "You're building real momentum.",
    Intermediate: "Above-average for your age and weight.",
    Advanced: "Top tier — pushing into elite territory.",
    Elite: "World-class for your age group. 🔥",
  };

  return { grade, ratio: Math.round(ratio * 100) / 100, position, note: noteMap[grade] };
};

export const gradeColor = (g: StrengthGrade): string =>
  g === "Elite" ? "hsl(280 80% 60%)"
  : g === "Advanced" ? "hsl(45 90% 55%)"
  : g === "Intermediate" ? "hsl(142 70% 50%)"
  : g === "Novice" ? "hsl(200 80% 55%)"
  : "hsl(215 15% 60%)";