// Athlete profile + athletic grading + smart XP formulas.

export type Gender = "male" | "female";

export type AthleteProfile = {
  age: number;
  heightFt: number;
  heightIn: number;
  weightLbs: number;
  gender: Gender;
};

export type Grade = "A+" | "A" | "B" | "C" | "D" | "F";

export type GradedResult = {
  grade: Grade;
  xp: number;
  note: string;
  breakdown: string;
};

export type Unit = "lbs" | "reps" | "seconds" | "minutes" | "yards";
export type WeightUnit = "lbs" | "kg";

export const KG_TO_LBS = 2.205;
export const toLbs = (value: number, unit: WeightUnit) =>
  unit === "kg" ? value * KG_TO_LBS : value;
export const fromLbs = (valueLbs: number, unit: WeightUnit) =>
  unit === "kg" ? valueLbs / KG_TO_LBS : valueLbs;

const GRADE_COLORS: Record<Grade, string> = {
  "A+": "hsl(142 71% 45%)",
  "A":  "hsl(142 71% 45%)",
  "B":  "hsl(var(--school))",
  "C":  "hsl(45 90% 55%)",
  "D":  "hsl(21 90% 54%)",
  "F":  "hsl(0 75% 55%)",
};
export const gradeColor = (g: Grade) => GRADE_COLORS[g];

// ---------- Smart XP ----------
export const calcXp = (
  exercise: string,
  value: number,
  unit: Unit,
  addedWeight: number,
  profile: AthleteProfile | null
): { xp: number; breakdown: string } => {
  const bw = profile?.weightLbs ?? 140;
  const exLower = exercise.toLowerCase();
  const isLift = unit === "lbs" || /bench|squat|deadlift|press|curl|row/.test(exLower);
  const isTimed = unit === "seconds" || unit === "minutes";

  if (isTimed) {
    const secs = unit === "minutes" ? value * 60 : value;
    if (secs <= 0) return { xp: 0, breakdown: "Invalid time" };
    const xp = Math.round((100 / secs) * 10);
    return { xp, breakdown: `100 / ${secs}s × 10 = ${xp} XP` };
  }

  if (isLift && unit === "lbs") {
    const xp = Math.round((value / bw) * 20);
    return { xp, breakdown: `${value}lb / ${bw}lb bw × 20 = ${xp} XP` };
  }

  // Reps-based (push-ups, sit-ups, etc.)
  const baseXp = value;
  const mult = 1 + addedWeight / bw;
  const xp = Math.round(baseXp * mult);
  const multStr = addedWeight > 0
    ? ` × (1 + ${addedWeight}/${bw}) = ${xp} XP`
    : ` = ${xp} XP`;
  return { xp, breakdown: `${value} reps${multStr}` };
};

// ---------- Grading standards ----------
// Simplified age- and gender-adjusted standards for 8th-grade range (~13-14yo).
// Returns grade and a one-line note.

const gradeFromPercentile = (pct: number): Grade => {
  if (pct >= 95) return "A+";
  if (pct >= 85) return "A";
  if (pct >= 65) return "B";
  if (pct >= 45) return "C";
  if (pct >= 25) return "D";
  return "F";
};

const noteFor = (grade: Grade): string => {
  switch (grade) {
    case "A+": return "Elite — top 5% for your age group";
    case "A":  return "Excellent — top 15%";
    case "B":  return "Above average for your age group";
    case "C":  return "Average — solid foundation";
    case "D":  return "Below average — room to grow";
    case "F":  return "Keep training — you'll get there";
  }
};

// Reps-based standards (rough percentile thresholds, 13-14yo)
// [F max, D max, C max, B max, A max] — anything above last threshold = A+
const REPS_STANDARDS: Record<string, Record<Gender, number[]>> = {
  pushup:    { male: [10, 18, 28, 40, 55], female: [6, 12, 20, 30, 42] },
  situp:     { male: [20, 30, 42, 55, 70], female: [16, 26, 36, 48, 62] },
  pullup:    { male: [1,  3,  6,  10, 15], female: [0, 1, 3, 6, 10] },
  default:   { male: [10, 20, 32, 45, 60], female: [8, 16, 26, 38, 50] },
};

const sprintKey = (ex: string): string | null => {
  const e = ex.toLowerCase();
  if (/40\s*y|40yd|40-yd|40 ?yard/.test(e)) return "40yd";
  if (/shuttle|pro\s*agility/.test(e)) return "shuttle";
  if (/100\s*m/.test(e)) return "100m";
  if (/mile/.test(e)) return "mile";
  return null;
};

// Timed standards (seconds, lower is better)
// [F min, D min, C min, B min, A min] — below last = A+
const TIMED_STANDARDS: Record<string, Record<Gender, number[]>> = {
  "40yd":   { male: [6.4, 6.0, 5.5, 5.1, 4.8], female: [7.0, 6.5, 6.0, 5.6, 5.2] },
  "shuttle":{ male: [6.0, 5.5, 5.0, 4.7, 4.4], female: [6.4, 5.9, 5.4, 5.0, 4.7] },
  "100m":   { male: [16, 15, 14, 13, 12.2],    female: [17, 16, 15, 14, 13.2] },
  "mile":   { male: [600, 540, 480, 420, 360], female: [660, 600, 540, 480, 420] },
};

const liftKey = (ex: string): string | null => {
  const e = ex.toLowerCase();
  if (/bench/.test(e)) return "bench";
  if (/squat/.test(e)) return "squat";
  if (/deadlift/.test(e)) return "deadlift";
  return null;
};

// Bodyweight ratio standards [F, D, C, B, A] — above last = A+
const LIFT_STANDARDS: Record<string, Record<Gender, number[]>> = {
  bench:    { male: [0.4, 0.6, 0.8, 1.0, 1.3], female: [0.25, 0.4, 0.55, 0.7, 0.9] },
  squat:    { male: [0.6, 0.85,1.1, 1.4, 1.8], female: [0.4, 0.6, 0.8, 1.0, 1.3] },
  deadlift: { male: [0.7, 1.0, 1.3, 1.65,2.0], female: [0.5, 0.7, 0.95,1.2, 1.5] },
};

const repsKey = (ex: string): string => {
  const e = ex.toLowerCase();
  if (/push/.test(e)) return "pushup";
  if (/sit\s*up|crunch/.test(e)) return "situp";
  if (/pull\s*up|chin\s*up/.test(e)) return "pullup";
  return "default";
};

const gradeFromThresholds = (val: number, thresholds: number[], lowerBetter: boolean): Grade => {
  if (lowerBetter) {
    if (val < thresholds[4]) return "A+";
    if (val < thresholds[3]) return "A";
    if (val < thresholds[2]) return "B";
    if (val < thresholds[1]) return "C";
    if (val < thresholds[0]) return "D";
    return "F";
  } else {
    if (val >= thresholds[4]) return "A+";
    if (val >= thresholds[3]) return "A";
    if (val >= thresholds[2]) return "B";
    if (val >= thresholds[1]) return "C";
    if (val >= thresholds[0]) return "D";
    return "F";
  }
};

export const gradeWorkout = (
  exercise: string,
  value: number,
  unit: Unit,
  addedWeight: number,
  profile: AthleteProfile | null
): GradedResult | null => {
  if (!profile) return null;
  const { xp, breakdown } = calcXp(exercise, value, unit, addedWeight, profile);
  const g = profile.gender;

  // Timed
  if (unit === "seconds" || unit === "minutes") {
    const secs = unit === "minutes" ? value * 60 : value;
    const sk = sprintKey(exercise);
    if (sk && TIMED_STANDARDS[sk]) {
      const grade = gradeFromThresholds(secs, TIMED_STANDARDS[sk][g], true);
      return { grade, xp, note: noteFor(grade), breakdown };
    }
  }

  // Lifts
  if (unit === "lbs") {
    const lk = liftKey(exercise);
    const ratio = value / profile.weightLbs;
    if (lk && LIFT_STANDARDS[lk]) {
      const grade = gradeFromThresholds(ratio, LIFT_STANDARDS[lk][g], false);
      return { grade, xp, note: `${ratio.toFixed(2)}× bodyweight — ${noteFor(grade).toLowerCase()}`, breakdown };
    }
    // Generic lift — grade by ratio
    const grade = gradeFromThresholds(ratio, [0.4, 0.6, 0.85, 1.1, 1.5], false);
    return { grade, xp, note: `${ratio.toFixed(2)}× bodyweight`, breakdown };
  }

  // Reps
  if (unit === "reps") {
    const rk = repsKey(exercise);
    const std = REPS_STANDARDS[rk] ?? REPS_STANDARDS.default;
    // If weighted, scale value up to "effective reps" for grading
    const effective = value * (1 + addedWeight / profile.weightLbs);
    const grade = gradeFromThresholds(effective, std[g], false);
    return { grade, xp, note: noteFor(grade), breakdown };
  }

  // Yards or other — just return XP without a real grade
  return { grade: "C", xp, note: "Logged", breakdown };
};

const GRADE_POINTS: Record<Grade, number> = {
  "A+": 4.3, "A": 4.0, "B": 3.0, "C": 2.0, "D": 1.0, "F": 0,
};
const POINTS_TO_GRADE = (p: number): Grade => {
  if (p >= 4.15) return "A+";
  if (p >= 3.5) return "A";
  if (p >= 2.5) return "B";
  if (p >= 1.5) return "C";
  if (p >= 0.5) return "D";
  return "F";
};

export const averageGrade = (grades: Grade[]): Grade | null => {
  if (grades.length === 0) return null;
  const avg = grades.reduce((s, g) => s + GRADE_POINTS[g], 0) / grades.length;
  return POINTS_TO_GRADE(avg);
};