/**
 * Loop Fitness - Intelligent Workout Programming Engine
 * Built on evidence-based resistance training & ACSM 2026 guidelines.
 */

import { EXERCISE_LIBRARY, ExerciseDefinition, EquipmentType, MovementPattern } from "./exerciseLibrary";

export type WorkoutGoal =
  | "General Fitness"
  | "Muscle Gain"
  | "Strength"
  | "Fat Loss"
  | "Endurance"
  | "Athletic Performance"
  | "Mobility"
  | "Core Strength"
  | "Conditioning"
  | "Hybrid Fitness";

export type BlockType =
  | "warmup"
  | "primary_strength"
  | "hypertrophy"
  | "superset"
  | "circuit"
  | "accessory"
  | "core"
  | "finisher"
  | "cooldown";

export interface ProgrammedExercise {
  id: string;
  slotNumber: number; // 1 to 10
  name: string;
  category: string;
  movementPattern: MovementPattern;
  exerciseType: string;
  targetMuscles: string;
  primaryMuscles: string[];
  equipment: EquipmentType[];
  sets: number;
  reps: string;
  repRange: string;
  restSeconds: number;
  tempo: string;
  rpeTarget: string;
  rirTarget: number;
  tips: string;
  formCues: string[];
  image: string;
  blockId: string;
  supersetPairId?: string; // e.g. "A1", "A2", "B1", "B2"
  isSupersetChild?: boolean;
}

export interface WorkoutBlock {
  id: string;
  blockNumber: number;
  title: string;
  type: BlockType;
  description: string;
  exercises: ProgrammedExercise[];
  rounds: number;
  restBetweenExercisesSecs: number; // 0-15s for superset transition
  restAfterRoundSecs: number; // 60-120s after round/pair
}

export interface WorkoutVariant {
  id: "A" | "B" | "C";
  name: string;
  description: string;
  exercises: ProgrammedExercise[];
}

export interface IntelligentWorkoutRoutine {
  id: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  levelName: string;
  title: string;
  subtitle: string;
  description: string;
  goal: WorkoutGoal;
  category: string;
  focus: string;
  scheduleDay: string;
  coverImage: string;
  trainer: {
    name: string;
    avatar: string;
  };
  durationMin: number;
  estimatedCalories: number;
  equipment: EquipmentType[];
  blocks: WorkoutBlock[];
  exercises: ProgrammedExercise[]; // Full 10-exercise slots array
  variants: WorkoutVariant[]; // Variant A, B, C for rotation
  volumeSummary: {
    totalSets: number;
    primaryMuscleSets: Record<string, number>;
  };
}

/**
 * Dynamically calculates workout duration in minutes based on:
 * - Warmup (5 mins) + Cooldown (3 mins)
 * - (sets * avg rep duration + rest between sets + transitions)
 */
export function calculateDynamicDuration(exercises: ProgrammedExercise[], blocks?: WorkoutBlock[]): number {
  let totalSeconds = 5 * 60; // 5 min warmup

  if (blocks && blocks.length > 0) {
    for (const block of blocks) {
      if (block.type === "superset") {
        // Paired superset: each exercise set + fast 15s transition, then block rest after pair
        const setsPerEx = block.exercises[0]?.sets || 3;
        for (let r = 0; r < setsPerEx; r++) {
          for (let i = 0; i < block.exercises.length; i++) {
            totalSeconds += 35; // ~35s per set
            if (i < block.exercises.length - 1) {
              totalSeconds += block.restBetweenExercisesSecs || 15;
            }
          }
          totalSeconds += block.restAfterRoundSecs || 75;
        }
      } else {
        for (const ex of block.exercises) {
          totalSeconds += ex.sets * 35; // work duration
          totalSeconds += (ex.sets - 1) * (ex.restSeconds || 60);
          totalSeconds += 45; // transition between exercises
        }
      }
    }
  } else {
    for (const ex of exercises) {
      totalSeconds += ex.sets * 35;
      totalSeconds += (ex.sets - 1) * (ex.restSeconds || 60);
      totalSeconds += 30; // transition
    }
  }

  totalSeconds += 3 * 60; // 3 min cooldown
  return Math.round(totalSeconds / 60);
}

/**
 * Calculates evidence-based calorie expenditure using MET values:
 * Energy (kcal) = MET × 3.5 × weight_kg / 200 × duration_minutes
 */
export function calculateDynamicCalories(
  durationMin: number,
  intensity: "low" | "moderate" | "high" | "intense" = "moderate",
  userWeightKg: number = 70
): number {
  const metMap: Record<string, number> = {
    low: 4.5,
    moderate: 6.0,
    high: 7.5,
    intense: 9.0,
  };
  const met = metMap[intensity] || 6.0;
  const calories = (met * 3.5 * userWeightKg) / 200 * durationMin;
  return Math.round(calories);
}

/**
 * Intelligent Exercise Substitution Engine:
 * Replaces an exercise with a biomechanically equivalent variation matching available equipment.
 */
export function substituteExerciseForEquipment(
  currentExerciseId: string,
  availableEquipment: string[]
): string {
  const def = EXERCISE_LIBRARY[currentExerciseId];
  if (!def) return currentExerciseId;

  // Check if current exercise equipment is fully satisfied
  const hasRequiredEquipment = def.equipment.every(
    (eq) => eq === "Bodyweight" || availableEquipment.includes(eq)
  );
  if (hasRequiredEquipment) return currentExerciseId;

  // Search through substitutions
  if (def.substitutions && def.substitutions.length > 0) {
    for (const subId of def.substitutions) {
      const subDef = EXERCISE_LIBRARY[subId];
      if (subDef) {
        const canUseSub = subDef.equipment.every(
          (eq) => eq === "Bodyweight" || availableEquipment.includes(eq)
        );
        if (canUseSub) return subId;
      }
    }
  }

  // Fallback to bodyweight alternative
  if (def.beginnerAlternative && EXERCISE_LIBRARY[def.beginnerAlternative]) {
    return def.beginnerAlternative;
  }

  return currentExerciseId;
}

/**
 * Scales a 10-exercise workout to shorter duration modes (Express 20-min or 15-min)
 * while preserving all 10 distinct movement slots.
 */
export function scaleWorkoutToDurationMode(
  routine: IntelligentWorkoutRoutine,
  targetDurationMinutes: number
): IntelligentWorkoutRoutine {
  if (targetDurationMinutes >= 40) return routine; // Full mode

  const is20Min = targetDurationMinutes <= 25 && targetDurationMinutes > 16;
  const is15Min = targetDurationMinutes <= 16;

  const scaledExercises = routine.exercises.map((ex) => {
    let scaledSets = ex.sets;
    let scaledRest = ex.restSeconds;

    if (is15Min) {
      scaledSets = 1; // 1 crisp set per movement slot for dense 15-min circuit
      scaledRest = Math.min(30, Math.round(ex.restSeconds * 0.4));
    } else if (is20Min) {
      scaledSets = ex.slotNumber <= 4 ? 2 : 1; // 2 sets for compounds, 1 set for accessories
      scaledRest = Math.min(45, Math.round(ex.restSeconds * 0.6));
    }

    return {
      ...ex,
      sets: scaledSets,
      restSeconds: scaledRest,
    };
  });

  const scaledBlocks = routine.blocks.map((b) => ({
    ...b,
    rounds: is15Min ? 1 : is20Min ? Math.min(2, b.rounds) : b.rounds,
    restAfterRoundSecs: Math.round(b.restAfterRoundSecs * 0.6),
  }));

  const newDuration = calculateDynamicDuration(scaledExercises, scaledBlocks);
  const newCalories = calculateDynamicCalories(newDuration, "high", 70);

  return {
    ...routine,
    durationMin: newDuration,
    estimatedCalories: newCalories,
    exercises: scaledExercises,
    blocks: scaledBlocks,
  };
}

/**
 * Calculates weekly muscle group distribution across all scheduled routines
 */
export function calculateWeeklyMuscleDistribution(
  routines: IntelligentWorkoutRoutine[]
): Record<string, number> {
  const distribution: Record<string, number> = {
    Chest: 0,
    Back: 0,
    Shoulders: 0,
    Quadriceps: 0,
    Hamstrings: 0,
    Glutes: 0,
    Biceps: 0,
    Triceps: 0,
    Core: 0,
  };

  for (const r of routines) {
    for (const ex of r.exercises) {
      const def = EXERCISE_LIBRARY[ex.id];
      if (def) {
        for (const m of def.primaryMuscles) {
          if (m.includes("Pectoral")) distribution.Chest += ex.sets;
          else if (m.includes("Lat") || m.includes("Rhomboid") || m.includes("Trapez")) distribution.Back += ex.sets;
          else if (m.includes("Deltoid")) distribution.Shoulders += ex.sets;
          else if (m.includes("Quad")) distribution.Quadriceps += ex.sets;
          else if (m.includes("Hamstring")) distribution.Hamstrings += ex.sets;
          else if (m.includes("Glute")) distribution.Glutes += ex.sets;
          else if (m.includes("Bicep") || m.includes("Brachial")) distribution.Biceps += ex.sets;
          else if (m.includes("Tricep")) distribution.Triceps += ex.sets;
          else if (m.includes("Abdom") || m.includes("Core") || m.includes("Oblique")) distribution.Core += ex.sets;
        }
      }
    }
  }

  return distribution;
}
