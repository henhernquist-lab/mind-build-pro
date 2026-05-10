// Athlete profile + athletic grading + smart XP formulas.

export type Gender = "male" | "female";

export type AthleteProfile = {
  age: number;
  heightFt: number;
  heightIn: number;
  weightLbs: number;
  gender: Gender;
};

export type Grade = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";

export type GradedResult = {
  grade: Grade;
  level: string;
  percentile: number;
  xp: number;
  note: string;
  breakdown: string;
  ratio?: number;
  target?: string;
};

export type Unit = "lbs" | "reps" | "seconds" | "minutes" | "yards";
export type WeightUnit = "lbs" | "kg";

export const KG_TO_LBS = 2.205;
export const toLbs = (value: number, unit: WeightUnit) =>
  unit === "kg" ? value * KG_TO_LBS : value;
export const fromLbs = (valueLbs: number, unit: WeightUnit) =>
  unit === "kg" ? valueLbs / KG_TO_LBS : valueLbs;

const GRADE_COLORS: Record<Grade, string> = {
  "A+": "#FFD700", // Gold
  "A":  "#22C55E", // Green
  "B+": "#14B8A6", // Teal
  "B":  "#14B8A6", // Teal
  "C+": "#EAB308", // Yellow
  "C":  "#EAB308", // Yellow
  "D":  "#F97316", // Orange
  "F":  "#EF4444", // Red
};
export const gradeColor = (g: Grade) => GRADE_COLORS[g];

// ---------- Grading Formulas ----------

export function gradeWeightedLift(exercise: string, weightLbs: number, bodyweightLbs: number, age: number, gender: Gender) {
  const ratio = weightLbs / bodyweightLbs;

  // Age leniency — younger athletes get adjusted standards
  let ageFactor = 1.0;
  if (age <= 12) ageFactor = 1.40;
  else if (age === 13) ageFactor = 1.28;
  else if (age === 14) ageFactor = 1.16;
  else if (age === 15) ageFactor = 1.08;
  else if (age === 16) ageFactor = 1.03;

  const genderFactor = gender === 'female' ? 1.32 : 1.0;
  const adjustedRatio = ratio * ageFactor * genderFactor;

  // Internal helper to simplify grade returns
  const getResult = (grade: Grade, level: string, percentile: number, targetRatio: number | null) => ({
    grade, level, percentile, ratio,
    target: targetRatio ? `Add ${Math.ceil((targetRatio / (ageFactor * genderFactor) - ratio) * bodyweightLbs)} lbs to reach ${grade === 'A+' ? 'Elite' : 'next grade'}` : undefined
  });

  // BENCH PRESS
  if (['bench_press', 'incline_bench', 'decline_bench', 'dumbbell_press'].some(e => exercise.toLowerCase().includes(e))) {
    if (adjustedRatio >= 1.50) return { grade: 'A+', level: 'College Prospect', percentile: 97 };
    if (adjustedRatio >= 1.25) return { grade: 'A',  level: 'Elite High School', percentile: 88, targetRatio: 1.50 };
    if (adjustedRatio >= 1.08) return { grade: 'B+', level: 'Varsity Level', percentile: 73, targetRatio: 1.25 };
    if (adjustedRatio >= 0.90) return { grade: 'B',  level: 'Solid Athlete', percentile: 57, targetRatio: 1.08 };
    if (adjustedRatio >= 0.75) return { grade: 'C+', level: 'Average', percentile: 42, targetRatio: 0.90 };
    if (adjustedRatio >= 0.60) return { grade: 'C',  level: 'Developing', percentile: 28, targetRatio: 0.75 };
    if (adjustedRatio >= 0.45) return { grade: 'D',  level: 'Beginner', percentile: 14, targetRatio: 0.60 };
    return { grade: 'F', level: 'Just Starting', percentile: 4, targetRatio: 0.45 };
  }

  // SQUAT
  if (['squat', 'front_squat', 'sumo_deadlift', 'leg_press'].some(e => exercise.toLowerCase().includes(e))) {
    if (adjustedRatio >= 2.00) return { grade: 'A+', level: 'College Prospect', percentile: 97 };
    if (adjustedRatio >= 1.75) return { grade: 'A',  level: 'Elite High School', percentile: 88, targetRatio: 2.00 };
    if (adjustedRatio >= 1.50) return { grade: 'B+', level: 'Varsity Level', percentile: 72, targetRatio: 1.75 };
    if (adjustedRatio >= 1.25) return { grade: 'B',  level: 'Solid Athlete', percentile: 56, targetRatio: 1.50 };
    if (adjustedRatio >= 1.00) return { grade: 'C+', level: 'Average', percentile: 40, targetRatio: 1.25 };
    if (adjustedRatio >= 0.80) return { grade: 'C',  level: 'Developing', percentile: 26, targetRatio: 1.00 };
    if (adjustedRatio >= 0.60) return { grade: 'D',  level: 'Beginner', percentile: 13, targetRatio: 0.80 };
    return { grade: 'F', level: 'Just Starting', percentile: 4, targetRatio: 0.60 };
  }

  // DEADLIFT
  if (['deadlift', 'romanian_deadlift'].some(e => exercise.toLowerCase().includes(e))) {
    if (adjustedRatio >= 2.25) return { grade: 'A+', level: 'College Prospect', percentile: 97 };
    if (adjustedRatio >= 2.00) return { grade: 'A',  level: 'Elite High School', percentile: 87, targetRatio: 2.25 };
    if (adjustedRatio >= 1.75) return { grade: 'B+', level: 'Varsity Level', percentile: 72, targetRatio: 2.00 };
    if (adjustedRatio >= 1.50) return { grade: 'B',  level: 'Solid Athlete', percentile: 56, targetRatio: 1.75 };
    if (adjustedRatio >= 1.25) return { grade: 'C+', level: 'Average', percentile: 40, targetRatio: 1.50 };
    if (adjustedRatio >= 1.00) return { grade: 'C',  level: 'Developing', percentile: 26, targetRatio: 1.25 };
    if (adjustedRatio >= 0.75) return { grade: 'D',  level: 'Beginner', percentile: 13, targetRatio: 1.00 };
    return { grade: 'F', level: 'Just Starting', percentile: 4, targetRatio: 0.75 };
  }

  // OVERHEAD PRESS
  if (['overhead_press', 'arnold_press', 'shoulder_press'].some(e => exercise.toLowerCase().includes(e))) {
    if (adjustedRatio >= 1.00) return { grade: 'A+', level: 'College Prospect', percentile: 97 };
    if (adjustedRatio >= 0.85) return { grade: 'A',  level: 'Elite', percentile: 87, targetRatio: 1.00 };
    if (adjustedRatio >= 0.72) return { grade: 'B+', level: 'Above Average', percentile: 72, targetRatio: 0.85 };
    if (adjustedRatio >= 0.60) return { grade: 'B',  level: 'Average', percentile: 56, targetRatio: 0.72 };
    if (adjustedRatio >= 0.50) return { grade: 'C+', level: 'Below Average', percentile: 40, targetRatio: 0.60 };
    if (adjustedRatio >= 0.40) return { grade: 'C',  level: 'Developing', percentile: 26, targetRatio: 0.50 };
    if (adjustedRatio >= 0.30) return { grade: 'D',  level: 'Beginner', percentile: 13, targetRatio: 0.40 };
    return { grade: 'F', level: 'Just Starting', percentile: 4, targetRatio: 0.30 };
  }

  // DEFAULT for other weighted exercises
  if (adjustedRatio >= 1.25) return { grade: 'A+', level: 'Elite', percentile: 95 };
  if (adjustedRatio >= 1.00) return { grade: 'A',  level: 'Excellent', percentile: 85 };
  if (adjustedRatio >= 0.85) return { grade: 'B+', level: 'Above Average', percentile: 70 };
  if (adjustedRatio >= 0.70) return { grade: 'B',  level: 'Average', percentile: 55 };
  if (adjustedRatio >= 0.55) return { grade: 'C+', level: 'Below Average', percentile: 40 };
  if (adjustedRatio >= 0.40) return { grade: 'C',  level: 'Developing', percentile: 26 };
  if (adjustedRatio >= 0.25) return { grade: 'D',  level: 'Beginner', percentile: 12 };
  return { grade: 'F', level: 'Just Starting', percentile: 4 };
}

export function gradeReps(exercise: string, reps: number, age: number, gender: Gender) {
  let ageBonus = 0;
  if (age <= 12) ageBonus = 18;
  else if (age === 13) ageBonus = 13;
  else if (age === 14) ageBonus = 8;
  else if (age === 15) ageBonus = 5;
  else if (age === 16) ageBonus = 2;

  const genderBonus = gender === 'female' ? 14 : 0;
  const adjusted = reps + ageBonus + genderBonus;

  const ex = exercise.toLowerCase();
  if (ex.includes('push_up') || ex.includes('push-up')) {
    if (adjusted >= 65) return { grade: 'A+', level: 'Elite', percentile: 97 };
    if (adjusted >= 52) return { grade: 'A',  level: 'Excellent', percentile: 87 };
    if (adjusted >= 42) return { grade: 'B+', level: 'Above Average', percentile: 72 };
    if (adjusted >= 32) return { grade: 'B',  level: 'Average', percentile: 56 };
    if (adjusted >= 22) return { grade: 'C+', level: 'Below Average', percentile: 40 };
    if (adjusted >= 14) return { grade: 'C',  level: 'Developing', percentile: 26 };
    if (adjusted >= 7)  return { grade: 'D',  level: 'Beginner', percentile: 12 };
    return { grade: 'F', level: 'Just Starting', percentile: 3 };
  }

  if (ex.includes('pull_up') || ex.includes('chin_up')) {
    if (adjusted >= 22) return { grade: 'A+', level: 'Elite', percentile: 97 };
    if (adjusted >= 17) return { grade: 'A',  level: 'Excellent', percentile: 87 };
    if (adjusted >= 13) return { grade: 'B+', level: 'Above Average', percentile: 72 };
    if (adjusted >= 9)  return { grade: 'B',  level: 'Average', percentile: 56 };
    if (adjusted >= 6)  return { grade: 'C+', level: 'Below Average', percentile: 40 };
    if (adjusted >= 3)  return { grade: 'C',  level: 'Developing', percentile: 26 };
    if (adjusted >= 1)  return { grade: 'D',  level: 'Beginner', percentile: 12 };
    return { grade: 'F', level: 'Just Starting', percentile: 3 };
  }

  if (ex.includes('sit_up') || ex.includes('crunch')) {
    if (adjusted >= 75) return { grade: 'A+', level: 'Elite', percentile: 97 };
    if (adjusted >= 62) return { grade: 'A',  level: 'Excellent', percentile: 87 };
    if (adjusted >= 50) return { grade: 'B+', level: 'Above Average', percentile: 72 };
    if (adjusted >= 38) return { grade: 'B',  level: 'Average', percentile: 56 };
    if (adjusted >= 28) return { grade: 'C+', level: 'Below Average', percentile: 40 };
    if (adjusted >= 18) return { grade: 'C',  level: 'Developing', percentile: 26 };
    if (adjusted >= 10) return { grade: 'D',  level: 'Beginner', percentile: 12 };
    return { grade: 'F', level: 'Just Starting', percentile: 3 };
  }

  if (adjusted >= 50) return { grade: 'A+', level: 'Elite', percentile: 95 };
  if (adjusted >= 40) return { grade: 'A',  level: 'Excellent', percentile: 85 };
  if (adjusted >= 30) return { grade: 'B+', level: 'Above Average', percentile: 70 };
  if (adjusted >= 22) return { grade: 'B',  level: 'Average', percentile: 54 };
  if (adjusted >= 15) return { grade: 'C+', level: 'Below Average', percentile: 38 };
  if (adjusted >= 10) return { grade: 'C',  level: 'Developing', percentile: 24 };
  if (adjusted >= 5)  return { grade: 'D',  level: 'Beginner', percentile: 11 };
  return { grade: 'F', level: 'Just Starting', percentile: 3 };
}

export function gradeSpeed(exercise: string, timeSeconds: number, age: number, gender: Gender) {
  let ageBonus = 0;
  if (age <= 12) ageBonus = 0.60;
  else if (age === 13) ageBonus = 0.45;
  else if (age === 14) ageBonus = 0.32;
  else if (age === 15) ageBonus = 0.20;
  else if (age === 16) ageBonus = 0.10;

  const genderBonus = gender === 'female' ? 0.45 : 0;
  const adjusted = timeSeconds - ageBonus - genderBonus;

  const ex = exercise.toLowerCase();
  if (ex.includes('40_yard_dash') || ex.includes('40 yard dash')) {
    if (adjusted <= 4.24) return { grade: 'A+', level: 'D1 Elite Speed', percentile: 99 };
    if (adjusted <= 4.45) return { grade: 'A',  level: 'Elite Recruit', percentile: 92 };
    if (adjusted <= 4.60) return { grade: 'B+', level: 'Varsity Speed', percentile: 78 };
    if (adjusted <= 4.80) return { grade: 'B',  level: 'Good Athlete', percentile: 62 };
    if (adjusted <= 5.00) return { grade: 'C+', level: 'Average', percentile: 46 };
    if (adjusted <= 5.25) return { grade: 'C',  level: 'Below Average', percentile: 30 };
    if (adjusted <= 5.60) return { grade: 'D',  level: 'Developing', percentile: 15 };
    return { grade: 'F', level: 'Needs Work', percentile: 4 };
  }

  if (ex.includes('100m_sprint') || ex.includes('100m sprint')) {
    if (adjusted <= 10.70) return { grade: 'A+', level: 'Elite Track', percentile: 99 };
    if (adjusted <= 11.20) return { grade: 'A',  level: 'Excellent', percentile: 91 };
    if (adjusted <= 11.70) return { grade: 'B+', level: 'Above Average', percentile: 76 };
    if (adjusted <= 12.20) return { grade: 'B',  level: 'Average', percentile: 59 };
    if (adjusted <= 13.00) return { grade: 'C+', level: 'Below Average', percentile: 43 };
    if (adjusted <= 13.80) return { grade: 'C',  level: 'Developing', percentile: 27 };
    if (adjusted <= 15.00) return { grade: 'D',  level: 'Beginner', percentile: 13 };
    return { grade: 'F', level: 'Needs Work', percentile: 3 };
  }

  if (ex.includes('400m_run') || ex.includes('400m run')) {
    if (adjusted <= 48.0)  return { grade: 'A+', level: 'Elite Track', percentile: 99 };
    if (adjusted <= 52.0)  return { grade: 'A',  level: 'Excellent', percentile: 91 };
    if (adjusted <= 56.0)  return { grade: 'B+', level: 'Above Average', percentile: 76 };
    if (adjusted <= 62.0)  return { grade: 'B',  level: 'Average', percentile: 58 };
    if (adjusted <= 70.0)  return { grade: 'C+', level: 'Below Average', percentile: 42 };
    if (adjusted <= 80.0)  return { grade: 'C',  level: 'Developing', percentile: 27 };
    if (adjusted <= 95.0)  return { grade: 'D',  level: 'Beginner', percentile: 13 };
    return { grade: 'F', level: 'Needs Work', percentile: 3 };
  }

  if (ex.includes('mile_run') || ex.includes('mile run')) {
    if (adjusted <= 300)  return { grade: 'A+', level: 'Elite Runner', percentile: 99 };
    if (adjusted <= 330)  return { grade: 'A',  level: 'Excellent', percentile: 90 };
    if (adjusted <= 370)  return { grade: 'B+', level: 'Above Average', percentile: 75 };
    if (adjusted <= 420)  return { grade: 'B',  level: 'Average', percentile: 58 };
    if (adjusted <= 480)  return { grade: 'C+', level: 'Below Average', percentile: 42 };
    if (adjusted <= 550)  return { grade: 'C',  level: 'Developing', percentile: 26 };
    if (adjusted <= 660)  return { grade: 'D',  level: 'Beginner', percentile: 12 };
    return { grade: 'F', level: 'Needs Work', percentile: 3 };
  }

  if (ex.includes('shuttle_run') || ex.includes('shuttle run')) {
    if (adjusted <= 3.70) return { grade: 'A+', level: 'Elite Agility', percentile: 99 };
    if (adjusted <= 3.90) return { grade: 'A',  level: 'Excellent', percentile: 90 };
    if (adjusted <= 4.10) return { grade: 'B+', level: 'Above Average', percentile: 75 };
    if (adjusted <= 4.40) return { grade: 'B',  level: 'Average', percentile: 58 };
    if (adjusted <= 4.70) return { grade: 'C+', level: 'Below Average', percentile: 42 };
    if (adjusted <= 5.10) return { grade: 'C',  level: 'Developing', percentile: 26 };
    if (adjusted <= 5.60) return { grade: 'D',  level: 'Beginner', percentile: 12 };
    return { grade: 'F', level: 'Needs Work', percentile: 3 };
  }

  return { grade: 'C', level: 'Logged', percentile: 50 };
}

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

export const gradeWorkout = (
  exercise: string,
  value: number,
  unit: Unit,
  addedWeight: number,
  profile: AthleteProfile | null
): GradedResult | null => {
  if (!profile) return null;
  const { xp, breakdown } = calcXp(exercise, value, unit, addedWeight, profile);
  const { age, gender, weightLbs } = profile;

  let result: { grade: any; level: string; percentile: number; ratio?: number; target?: string };

  if (unit === "seconds" || unit === "minutes") {
    const secs = unit === "minutes" ? value * 60 : value;
    result = gradeSpeed(exercise, secs, age, gender);
  } else if (unit === "lbs") {
    result = gradeWeightedLift(exercise, value, weightLbs, age, gender);
  } else {
    // Reps-based
    result = gradeReps(exercise, value, age, gender);
  }

  return {
    ...result,
    grade: result.grade as Grade,
    xp,
    breakdown,
    note: "", // Will be filled by AI scout if needed, or default to level
  };
};

const GRADE_POINTS: Record<Grade, number> = {
  "A+": 4.3, "A": 4.0, "B+": 3.5, "B": 3.0, "C+": 2.5, "C": 2.0, "D": 1.0, "F": 0,
};
const POINTS_TO_GRADE = (p: number): Grade => {
  if (p >= 4.15) return "A+";
  if (p >= 3.5) return "A";
  if (p >= 3.25) return "B+";
  if (p >= 2.5) return "B";
  if (p >= 2.25) return "C+";
  if (p >= 1.5) return "C";
  if (p >= 0.5) return "D";
  return "F";
};

export const averageGrade = (grades: Grade[]): Grade | null => {
  if (grades.length === 0) return null;
  const avg = grades.reduce((s, g) => s + GRADE_POINTS[g], 0) / grades.length;
  return POINTS_TO_GRADE(avg);
};
