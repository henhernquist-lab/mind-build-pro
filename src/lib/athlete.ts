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
  color?: string;
  estimated1RM?: number;
};

export type Unit = "lbs" | "reps" | "seconds" | "minutes" | "yards";
export type WeightUnit = "lbs" | "kg";

export const KG_TO_LBS = 2.205;
export const toLbs = (value: number, unit: WeightUnit) =>
  unit === "kg" ? value * KG_TO_LBS : value;
export const fromLbs = (valueLbs: number, unit: WeightUnit) =>
  unit === "kg" ? valueLbs / KG_TO_LBS : valueLbs;

const GRADE_COLORS: Record<Grade, string> = {
  "A+": "#FBBF24", // Gold
  "A":  "#22C55E", // Green
  "B+": "#00E5FF", // Cyan
  "B":  "#3B82F6", // Blue
  "C+": "#EAB308", // Yellow
  "C":  "#F97316", // Orange
  "D":  "#EF4444", // Red
  "F":  "#DC2626", // Dark Red
};
export const gradeColor = (g: Grade) => GRADE_COLORS[g];

// ---------- Grading Formulas ----------

export function gradeSet(exercise: string, weightLbs: number, reps: number, bodyweight: number, age: number, gender: Gender, setType: string) {
  // Warm up sets never get graded
  if (setType === 'warmup') return { grade: null, label: 'WARM UP', color: '#64748B' };

  // Age leniency — younger athletes get adjusted standards
  let ageFactor = 1.0;
  if (age <= 12) ageFactor = 1.40;
  else if (age === 13) ageFactor = 1.28;
  else if (age === 14) ageFactor = 1.16;
  else if (age === 15) ageFactor = 1.08;
  else if (age === 16) ageFactor = 1.03;

  const genderFactor = (gender === 'female' || gender === 'f') ? 1.32 : 1.0;

  // Epley formula: 1RM = weight × (1 + reps/30)
  const estimated1RM = reps === 1 ? weightLbs : weightLbs * (1 + reps / 30);
  const ratio = estimated1RM / bodyweight;
  const adjustedRatio = ratio * ageFactor * genderFactor;

  const GRADES = [
    { min: 1.50, grade: 'A+', level: 'College Prospect',  percentile: 97, color: '#FBBF24' },
    { min: 1.25, grade: 'A',  level: 'Elite High School', percentile: 88, color: '#22C55E' },
    { min: 1.08, grade: 'B+', level: 'Varsity Level',     percentile: 73, color: '#00E5FF' },
    { min: 0.90, grade: 'B',  level: 'Solid Athlete',     percentile: 57, color: '#3B82F6' },
    { min: 0.75, grade: 'C+', level: 'Average',           percentile: 42, color: '#EAB308' },
    { min: 0.60, grade: 'C',  level: 'Developing',        percentile: 28, color: '#F97316' },
    { min: 0.45, grade: 'D',  level: 'Beginner',          percentile: 14, color: '#EF4444' },
  ] as any[];

  const ex = exercise.toLowerCase().replace(/\s+/g, '_');

  // Bench Press specific thresholds
  if (['bench_press','incline_bench_press','decline_bench_press','dumbbell_press'].includes(ex)) {
    for (const g of GRADES) if (adjustedRatio >= g.min) return { ...g, ratio, estimated1RM };
    return { grade: 'F', level: 'Just Starting', percentile: 4, color: '#DC2626', ratio, estimated1RM };
  }

  // Squat specific thresholds
  if (['squat','front_squat','hack_squat','leg_press'].includes(ex)) {
    const sqGrades = [
      { min: 2.00, grade: 'A+', level: 'College Prospect',  percentile: 97, color: '#FBBF24' },
      { min: 1.75, grade: 'A',  level: 'Elite High School', percentile: 88, color: '#22C55E' },
      { min: 1.50, grade: 'B+', level: 'Varsity Level',     percentile: 72, color: '#00E5FF' },
      { min: 1.25, grade: 'B',  level: 'Solid Athlete',     percentile: 56, color: '#3B82F6' },
      { min: 1.00, grade: 'C+', level: 'Average',           percentile: 40, color: '#EAB308' },
      { min: 0.80, grade: 'C',  level: 'Developing',        percentile: 26, color: '#F97316' },
      { min: 0.60, grade: 'D',  level: 'Beginner',          percentile: 13, color: '#EF4444' },
    ];
    for (const g of sqGrades) if (adjustedRatio >= g.min) return { ...g, ratio, estimated1RM };
    return { grade: 'F', level: 'Just Starting', percentile: 4, color: '#DC2626', ratio, estimated1RM };
  }

  // Deadlift specific thresholds
  if (['deadlift','romanian_deadlift','sumo_deadlift','rack_pull'].includes(ex)) {
    const dlGrades = [
      { min: 2.25, grade: 'A+', level: 'College Prospect',  percentile: 97, color: '#FBBF24' },
      { min: 2.00, grade: 'A',  level: 'Elite High School', percentile: 87, color: '#22C55E' },
      { min: 1.75, grade: 'B+', level: 'Varsity Level',     percentile: 72, color: '#00E5FF' },
      { min: 1.50, grade: 'B',  level: 'Solid Athlete',     percentile: 56, color: '#3B82F6' },
      { min: 1.25, grade: 'C+', level: 'Average',           percentile: 40, color: '#EAB308' },
      { min: 1.00, grade: 'C',  level: 'Developing',        percentile: 26, color: '#F97316' },
      { min: 0.75, grade: 'D',  level: 'Beginner',          percentile: 13, color: '#EF4444' },
    ];
    for (const g of dlGrades) if (adjustedRatio >= g.min) return { ...g, ratio, estimated1RM };
    return { grade: 'F', level: 'Just Starting', percentile: 4, color: '#DC2626', ratio, estimated1RM };
  }

  // Overhead Press
  if (['overhead_press','seated_dumbbell_press','arnold_press'].includes(ex)) {
    const ohpGrades = [
      { min: 1.00, grade: 'A+', level: 'Elite',         percentile: 97, color: '#FBBF24' },
      { min: 0.85, grade: 'A',  level: 'Excellent',     percentile: 87, color: '#22C55E' },
      { min: 0.72, grade: 'B+', level: 'Above Average', percentile: 72, color: '#00E5FF' },
      { min: 0.60, grade: 'B',  level: 'Average',       percentile: 56, color: '#3B82F6' },
      { min: 0.50, grade: 'C+', level: 'Below Average', percentile: 40, color: '#EAB308' },
      { min: 0.40, grade: 'C',  level: 'Developing',    percentile: 26, color: '#F97316' },
      { min: 0.30, grade: 'D',  level: 'Beginner',      percentile: 13, color: '#EF4444' },
    ];
    for (const g of ohpGrades) if (adjustedRatio >= g.min) return { ...g, ratio, estimated1RM };
    return { grade: 'F', level: 'Just Starting', percentile: 4, color: '#DC2626', ratio, estimated1RM };
  }

  // Bodyweight exercises
  if (['push_ups','pull_ups','chin_ups','dips','tricep_dips','diamond_push_ups'].includes(ex)) {
    let ageBonus = 0;
    if (age <= 12) ageBonus = 18;
    else if (age === 13) ageBonus = 13;
    else if (age === 14) ageBonus = 8;
    else if (age === 15) ageBonus = 5;
    else if (age === 16) ageBonus = 2;
    const genderBonus = genderFactor > 1 ? 14 : 0;
    const adjustedReps = reps + ageBonus + genderBonus;

    const repThresholds = (ex === 'pull_ups' || ex === 'chin_ups')
      ? [22, 17, 13, 9, 6, 3, 1]
      : [65, 52, 42, 32, 22, 14, 7];
    const grades = ['A+','A','B+','B','C+','C','D'];
    const levels = ['Elite','Excellent','Above Average','Average','Below Average','Developing','Beginner'];
    const colors = ['#FBBF24','#22C55E','#00E5FF','#3B82F6','#EAB308','#F97316','#EF4444'];

    for (let i = 0; i < repThresholds.length; i++) {
      if (adjustedReps >= repThresholds[i]) {
        return { grade: grades[i], level: levels[i], percentile: 97 - i*13, color: colors[i], ratio: 0, estimated1RM: 0 };
      }
    }
    return { grade: 'F', level: 'Just Starting', percentile: 4, color: '#DC2626', ratio: 0, estimated1RM: 0 };
  }

  // Speed events (weightLbs used as seconds)
  if (['40_yard_dash','100m_sprint','200m_run','400m_run','shuttle_run'].includes(ex)) {
    let ageBonus = 0;
    if (age <= 12) ageBonus = 0.60;
    else if (age === 13) ageBonus = 0.45;
    else if (age === 14) ageBonus = 0.32;
    else if (age === 15) ageBonus = 0.20;
    else if (age === 16) ageBonus = 0.10;
    const genderBonus = genderFactor > 1 ? 0.45 : 0;
    const adjustedTime = weightLbs - ageBonus - genderBonus;

    const thresholds = {
      '40_yard_dash': [4.24, 4.45, 4.60, 4.80, 5.00, 5.25, 5.60],
      '100m_sprint':  [10.70, 11.20, 11.70, 12.20, 13.00, 13.80, 15.00],
      '200m_run':     [21.5, 23.0, 24.5, 26.5, 29.0, 32.0, 36.0],
      '400m_run':     [48, 52, 56, 62, 70, 80, 95],
      'shuttle_run':  [3.70, 3.90, 4.10, 4.40, 4.70, 5.10, 5.60],
    } as any;
    const grades = ['A+','A','B+','B','C+','C','D'];
    const levels = ['D1 Elite','Elite Recruit','Varsity Speed','Good Athlete','Average','Below Average','Developing'];
    const colors = ['#FBBF24','#22C55E','#00E5FF','#3B82F6','#EAB308','#F97316','#EF4444'];
    const t = thresholds[ex] || thresholds['40_yard_dash'];

    for (let i = 0; i < t.length; i++) {
      if (adjustedTime <= t[i]) {
        return { grade: grades[i], level: levels[i], percentile: 97 - i*13, color: colors[i], ratio: 0, estimated1RM: 0 };
      }
    }
    return { grade: 'F', level: 'Needs Work', percentile: 4, color: '#DC2626', ratio: 0, estimated1RM: 0 };
  }

  // Default for everything else — use the ratio grades
  for (const g of GRADES) if (adjustedRatio >= g.min) return { ...g, ratio, estimated1RM };
  return { grade: 'F', level: 'Just Starting', percentile: 4, color: '#DC2626', ratio, estimated1RM };
}

export const gradePoints = { 'A+': 4.3, 'A': 4.0, 'B+': 3.3, 'B': 3.0, 'C+': 2.3, 'C': 2.0, 'D': 1.0, 'F': 0 } as Record<string, number>;

export const averageGrade = (grades: string[]): string => {
  if (grades.length === 0) return '—';
  const sum = grades.reduce((acc, g) => acc + (gradePoints[g] || 0), 0);
  const avg = sum / grades.length;
  if (avg >= 4.0) return 'A';
  if (avg >= 3.3) return 'B+';
  if (avg >= 3.0) return 'B';
  if (avg >= 2.3) return 'C+';
  if (avg >= 2.0) return 'C';
  if (avg >= 1.0) return 'D';
  return 'F';
};
