/**
 * Loop Fitness - Master Workout Plans & Program Specification
 * 24 Comprehensive Evidence-Based Training Plans with 10 Intelligently Structured Exercise Slots,
 * Dynamic Rest Periods, Block Sequencing, Antagonist Supersets, and Rotation Variants.
 */

import { EXERCISE_LIBRARY, ExerciseDefinition, EquipmentType } from "./exerciseLibrary";
import {
  WorkoutGoal,
  BlockType,
  ProgrammedExercise,
  WorkoutBlock,
  WorkoutVariant,
  IntelligentWorkoutRoutine,
  calculateDynamicDuration,
  calculateDynamicCalories,
} from "./workoutEngine";

// Backward Compatibility Interface
export interface Exercise {
  id: string;
  slotNumber?: number;
  name: string;
  category: string;
  sets: number;
  reps: string;
  repRange?: string;
  restSeconds: number;
  tempoNotes: string;
  targetMuscles: string;
  intensity: "Low Intensity" | "Moderate Intensity" | "High Intensity" | "Maximum Burn" | "Active Recovery";
  image: string;
  tips: string;
  rpeTarget?: string;
  rirTarget?: number;
  formCues?: string[];
  blockId?: string;
  supersetPairId?: string;
}

export interface WorkoutRoutine {
  id: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  levelName: string;
  title: string;
  subtitle: string;
  description: string;
  durationMin: number;
  estimatedCalories: number;
  focus: string;
  goal?: WorkoutGoal;
  category?: string;
  scheduleDay: string;
  coverImage: string;
  equipment?: EquipmentType[];
  trainer: {
    name: string;
    avatar: string;
  };
  blocks?: WorkoutBlock[];
  exercises: Exercise[];
  variants?: WorkoutVariant[];
}

export interface ProgramLevelInfo {
  level: "Beginner" | "Intermediate" | "Advanced";
  title: string;
  timeline: string;
  splitDescription: string;
  goal: string;
  weeklySchedule: { day: string; activity: string }[];
  progressionCue: string;
  routines: WorkoutRoutine[];
}

export interface ProgramOverview {
  title: string;
  subtitle: string;
  description: string;
  levelsSummary: { level: string; desc: string }[];
  equipment: {
    minimum: string[];
    optional: string[];
  };
  generalRules: string[];
  progressionToolkit: string[];
  levelUpChecklist: { level: string; criteria: string }[];
  safetyNotes: string[];
}

// Helper to construct a 10-slot routine with block architecture
function createRoutine(params: {
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
  trainer: { name: string; avatar: string };
  exerciseIds: [string, string, string, string, string, string, string, string, string, string];
  customSets?: number[];
  customReps?: string[];
  customRest?: number[];
}): WorkoutRoutine {
  const {
    id,
    level,
    levelName,
    title,
    subtitle,
    description,
    goal,
    category,
    focus,
    scheduleDay,
    coverImage,
    trainer,
    exerciseIds,
    customSets,
    customReps,
    customRest,
  } = params;

  const exercises: Exercise[] = exerciseIds.map((exId, idx) => {
    const def = EXERCISE_LIBRARY[exId] || {
      id: exId,
      name: exId.replace(/_/g, " "),
      category: "Movement",
      targetMuscles: "Full Body",
      defaultSets: 3,
      defaultReps: "10-12 Reps",
      repRange: "8-12 Reps",
      defaultRestSeconds: 60,
      tempo: "2-0-1-0",
      rpeTarget: "RPE 7-8",
      rirTarget: 2,
      tips: "Focus on strict control.",
      formCues: ["Keep core braced", "Control tempo"],
      image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
    };

    let blockId = "b1";
    let supersetPairId: string | undefined = undefined;

    if (idx === 0 || idx === 1) {
      blockId = "block-primary";
    } else if (idx === 2 || idx === 3) {
      blockId = "block-superset-1";
      supersetPairId = idx === 2 ? "A1" : "A2";
    } else if (idx === 4 || idx === 5) {
      blockId = "block-superset-2";
      supersetPairId = idx === 4 ? "B1" : "B2";
    } else if (idx === 6 || idx === 7) {
      blockId = "block-accessory";
    } else if (idx === 8) {
      blockId = "block-core";
    } else {
      blockId = "block-finisher";
    }

    const sets = customSets && customSets[idx] !== undefined ? customSets[idx] : def.defaultSets || 3;
    const reps = customReps && customReps[idx] !== undefined ? customReps[idx] : def.defaultReps || "10-12 Reps";
    const rest = customRest && customRest[idx] !== undefined ? customRest[idx] : def.defaultRestSeconds || 60;

    return {
      id: def.id,
      slotNumber: idx + 1,
      name: def.name,
      category: def.category,
      sets,
      reps,
      repRange: def.repRange || reps,
      restSeconds: rest,
      tempoNotes: def.tempo || "2-0-1-0",
      targetMuscles: def.targetMuscles || "Target Muscles",
      intensity:
        idx === 9
          ? "Maximum Burn"
          : idx < 2
          ? "High Intensity"
          : "Moderate Intensity",
      image: def.image,
      tips: def.tips,
      rpeTarget: def.rpeTarget,
      rirTarget: def.rirTarget,
      formCues: def.formCues,
      blockId,
      supersetPairId,
    };
  });

  // Calculate realistic dynamic duration & calories
  const programmedForDuration: ProgrammedExercise[] = exercises.map((e) => ({
    ...e,
    slotNumber: e.slotNumber || 1,
    movementPattern: "horizontal_push",
    exerciseType: "strength_compound",
    primaryMuscles: [],
    equipment: ["Bodyweight"],
    repRange: e.repRange || e.reps,
    tempo: e.tempoNotes,
    rpeTarget: e.rpeTarget || "RPE 7-8",
    rirTarget: e.rirTarget || 2,
    formCues: e.formCues || [],
    blockId: e.blockId || "b1",
  }));

  const dynamicDuration = calculateDynamicDuration(programmedForDuration);
  const dynamicCalories = calculateDynamicCalories(
    dynamicDuration,
    level === "Advanced" ? "high" : level === "Intermediate" ? "moderate" : "low",
    70
  );

  return {
    id,
    level,
    levelName,
    title,
    subtitle,
    description,
    durationMin: dynamicDuration,
    estimatedCalories: dynamicCalories,
    focus,
    goal,
    category,
    scheduleDay,
    coverImage,
    trainer,
    exercises,
  };
}

// ============================================================================
// LEVEL 1: BEGINNER (Weeks 1–4 / Month 1) — 10 Intelligently Sequenced Slots
// ============================================================================
export const L1_UPPER_ROUTINE = createRoutine({
  id: "l1-upper",
  level: "Beginner",
  levelName: "Level 1 • Weeks 1-4",
  title: "Beginner Upper Body Day",
  subtitle: "Push, Pull, Posture & Core Foundations",
  description:
    "Master fundamental horizontal push/pull mechanics, shoulder stability, postural retraction, and core bracing in 10 evidence-based exercise slots.",
  goal: "General Fitness",
  category: "Upper Body",
  focus: "Upper Body (Chest, Back, Shoulders, Arms & Core)",
  scheduleDay: "Days 1 & 5",
  coverImage: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Marcus",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "incline_pushup",      // Slot 1: Primary Push Compound
    "chair_row",           // Slot 2: Primary Pull Compound
    "incline_pike_pushup", // Slot 3: Superset A1 (Vertical Push)
    "band_pull_apart",     // Slot 4: Superset A2 (Scapular Retraction)
    "db_bicep_curl",       // Slot 5: Superset B1 (Elbow Flexion)
    "overhead_triceps_ext_db", // Slot 6: Superset B2 (Elbow Extension)
    "lateral_raise_db",    // Slot 7: Shoulder Width Accessory
    "reverse_snow_angels", // Slot 8: Postural Restoration
    "dead_bug",            // Slot 9: Deep Core Anti-Extension
    "jumping_jacks",       // Slot 10: Aerobic Conditioning Finisher
  ],
  customSets: [3, 3, 3, 3, 2, 2, 2, 2, 2, 2],
  customReps: [
    "10-12 Reps", "10-12 Reps",
    "8-10 Reps", "15 Reps",
    "10-12 Reps", "12 Reps",
    "12-15 Reps", "12 Reps",
    "8 Reps / Side", "40 Secs",
  ],
  customRest: [75, 75, 60, 45, 60, 45, 45, 45, 45, 30],
});

export const L1_LOWER_ROUTINE = createRoutine({
  id: "l1-lower",
  level: "Beginner",
  levelName: "Level 1 • Weeks 1-4",
  title: "Beginner Lower Body Day",
  subtitle: "Squat, Hinge, Unilateral Balance & Core Base",
  description:
    "Build knee and hip flexion strength, glute activation, calf tendon stiffness, and multi-plane stability across 10 structured slots.",
  goal: "General Fitness",
  category: "Lower Body",
  focus: "Lower Body (Quads, Glutes, Hamstrings, Calves, Core)",
  scheduleDay: "Days 3 & 6",
  coverImage: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Elena",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "bodyweight_squat",    // Slot 1: Primary Squat
    "glute_bridge",        // Slot 2: Primary Hinge / Hip Extension
    "chair_reverse_lunge", // Slot 3: Superset A1 (Unilateral Lunge)
    "calf_raise",          // Slot 4: Superset A2 (Ankle Plantarflexion)
    "step_up",             // Slot 5: Superset B1 (Unilateral Drive)
    "supermans",           // Slot 6: Superset B2 (Posterior Chain)
    "wall_sit",            // Slot 7: Quad Isometric Accessory
    "bird_dog",            // Slot 8: Cross-Body Core Stability
    "plank_standard",      // Slot 9: Anti-Extension Core
    "skater_hops",         // Slot 10: Lateral Athletic Finisher
  ],
  customSets: [3, 3, 3, 3, 2, 2, 2, 2, 2, 2],
  customReps: [
    "12-15 Reps", "12-15 Reps",
    "10 Reps / Leg", "15-20 Reps",
    "10 Reps / Leg", "30 Secs",
    "30-45 Secs", "8 Reps / Side",
    "30-45 Secs", "30 Secs",
  ],
  customRest: [75, 60, 60, 45, 60, 45, 60, 30, 45, 30],
});

// ============================================================================
// LEVEL 2: INTERMEDIATE (Weeks 5–8+ / Month 2) — Push / Pull / Legs Split
// ============================================================================
export const L2_PUSH_ROUTINE = createRoutine({
  id: "l2-push",
  level: "Intermediate",
  levelName: "Level 2 • Weeks 5-8+",
  title: "Intermediate Push Day",
  subtitle: "Chest Hypertrophy, 3D Shoulders & Triceps Density",
  description:
    "Comprehensive pressing power cycling standard horizontal push-ups, pike presses, dumbbell shoulder presses, diamond push-ups, and core anti-rotation.",
  goal: "Muscle Gain",
  category: "Upper Body",
  focus: "Push (Pectorals, Anterior/Lateral Deltoids, Triceps)",
  scheduleDay: "Days 1 & 5",
  coverImage: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Marcus",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "standard_pushup",         // Slot 1: Primary Horizontal Compound
    "db_overhead_press",       // Slot 2: Primary Vertical Compound
    "floor_press_db",          // Slot 3: Superset A1 (Chest Mass)
    "lateral_raise_db",        // Slot 4: Superset A2 (Side Delts)
    "diamond_pushup",          // Slot 5: Superset B1 (Triceps Lockout)
    "squeeze_press_db",        // Slot 6: Superset B2 (Inner Chest)
    "overhead_triceps_ext_db", // Slot 7: Triceps Long Head
    "reverse_snow_angels",     // Slot 8: Scapular Balance
    "plank_shoulder_taps",     // Slot 9: Anti-Rotation Core
    "mountain_climbers",       // Slot 10: HIIT Conditioning Finisher
  ],
  customSets: [3, 3, 3, 3, 3, 2, 2, 2, 2, 2],
  customReps: [
    "12-15 Reps", "10-12 Reps",
    "10-12 Reps", "12-15 Reps",
    "8-10 Reps", "12 Reps",
    "12 Reps", "12 Reps",
    "10 Reps / Side", "30 Secs",
  ],
  customRest: [90, 90, 75, 45, 75, 60, 60, 45, 45, 30],
});

export const L2_PULL_ROUTINE = createRoutine({
  id: "l2-pull",
  level: "Intermediate",
  levelName: "Level 2 • Weeks 5-8+",
  title: "Intermediate Pull Day",
  subtitle: "Back Width, Mid-Back Density, Biceps & Posterior Core",
  description:
    "Build a wide V-taper, upright postural endurance, and sleeve-filling arms with vertical pulldowns, heavy rows, curls, and core rotation.",
  goal: "Muscle Gain",
  category: "Upper Body",
  focus: "Pull (Lats, Rhomboids, Traps, Biceps, Spinal Erectors)",
  scheduleDay: "Day 2",
  coverImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Marcus",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "pullup_wide",          // Slot 1: Primary Vertical Pull
    "db_bent_over_row",     // Slot 2: Primary Horizontal Row
    "single_arm_db_row",    // Slot 3: Superset A1 (Unilateral Lats)
    "band_pull_apart",      // Slot 4: Superset A2 (Upper Back Posture)
    "db_bicep_curl",        // Slot 5: Superset B1 (Biceps Supination)
    "hammer_curl_db",       // Slot 6: Superset B2 (Brachialis Thickness)
    "rear_delt_fly_db",     // Slot 7: Rear Deltoid Isolation
    "supermans",            // Slot 8: Erector Spinae Hypertrophy
    "bicycle_crunches",     // Slot 9: Obliques & Deep Core
    "high_knees",           // Slot 10: Aerobic Sprint Finisher
  ],
  customSets: [3, 3, 3, 3, 3, 2, 2, 2, 2, 2],
  customReps: [
    "6-8 Reps", "10-12 Reps",
    "10 Reps / Side", "15-20 Reps",
    "10-12 Reps", "10-12 Reps",
    "12-15 Reps", "30 Secs",
    "12-15 Reps / Side", "30 Secs",
  ],
  customRest: [120, 90, 75, 45, 60, 60, 45, 45, 45, 30],
});

export const L2_LEGS_ROUTINE = createRoutine({
  id: "l2-legs",
  level: "Intermediate",
  levelName: "Level 2 • Weeks 5-8+",
  title: "Intermediate Legs Day",
  subtitle: "Quad Hypertrophy, Hamstring Hinge & Unilateral Power",
  description:
    "High-output lower body compound pairing loaded goblet squats, Bulgarian split squats, Romanian deadlifts, step-ups, and rotational core.",
  goal: "Muscle Gain",
  category: "Lower Body",
  focus: "Legs (Quadriceps, Hamstrings, Glutes, Calves & Core)",
  scheduleDay: "Days 3 & 6",
  coverImage: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Elena",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "goblet_squat",          // Slot 1: Primary Knee-Dominant Compound
    "romanian_deadlift_db",  // Slot 2: Primary Hip-Dominant Hinge
    "bulgarian_split_squat", // Slot 3: Superset A1 (Unilateral Quad/Glute)
    "calf_raise",            // Slot 4: Superset A2 (Calves & Achilles)
    "walking_lunge",         // Slot 5: Superset B1 (Dynamic Lunges)
    "glute_bridge",          // Slot 6: Superset B2 (Glute Max Squeeze)
    "step_up",               // Slot 7: Lead Leg Power Drive
    "wall_sit",              // Slot 8: Isometric Quad Burnout
    "russian_twists",        // Slot 9: Rotational Core
    "jump_squats",           // Slot 10: Plyometric Power Finisher
  ],
  customSets: [3, 3, 3, 3, 2, 2, 2, 2, 2, 2],
  customReps: [
    "10-12 Reps", "10-12 Reps",
    "10 Reps / Leg", "15-20 Reps",
    "12 Reps / Leg", "12-15 Reps",
    "10 Reps / Leg", "30-45 Secs",
    "12 Reps / Side", "8-10 Jumps",
  ],
  customRest: [90, 90, 90, 45, 75, 45, 60, 60, 45, 60],
});

// ============================================================================
// LEVEL 3: ADVANCED (Weeks 9+ / Month 3+) — Single-Muscle Dedicated Split
// ============================================================================
export const L3_CHEST_ROUTINE = createRoutine({
  id: "l3-chest",
  level: "Advanced",
  levelName: "Level 3 • Dedicated Split",
  title: "Advanced Chest Day",
  subtitle: "Pectoral Hypertrophy, Upper Clavicular & Inner Density",
  description:
    "Multi-angle pectoral destruction featuring weighted push-ups, decline upper-chest work, dumbbell floor press, flys, and explosive metabolic finishers.",
  goal: "Muscle Gain",
  category: "Chest",
  focus: "Chest (Upper, Mid, Lower Pectorals & Triceps)",
  scheduleDay: "Day 1",
  coverImage: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Marcus",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "weighted_pushup",       // Slot 1: Primary Heavy Push
    "decline_pushup",        // Slot 2: Upper Clavicular Angle
    "floor_press_db",        // Slot 3: Superset A1 (Chest Mass)
    "band_fly",              // Slot 4: Superset A2 (Pec Stretch & Squeeze)
    "squeeze_press_db",      // Slot 5: Superset B1 (Inner Pec Density)
    "diamond_pushup",        // Slot 6: Superset B2 (Triceps Lockout)
    "close_grip_floor_press",// Slot 7: Sternal Mass Accessory
    "reverse_snow_angels",   // Slot 8: Scapular Retraction Antagonist
    "weighted_plank",        // Slot 9: Advanced Core Anti-Extension
    "burpees",               // Slot 10: Full Body Power Finisher
  ],
  customSets: [3, 3, 3, 3, 3, 2, 2, 2, 2, 2],
  customReps: [
    "8-10 Reps", "10-12 Reps",
    "10-12 Reps", "15 Reps",
    "12-15 Reps", "8-10 Reps",
    "10-12 Reps", "12 Reps",
    "30-45 Secs", "30 Secs",
  ],
  customRest: [120, 90, 75, 45, 60, 60, 60, 45, 60, 45],
});

export const L3_BACK_ROUTINE = createRoutine({
  id: "l3-back",
  level: "Advanced",
  levelName: "Level 3 • Dedicated Split",
  title: "Advanced Back Day",
  subtitle: "V-Taper Lats, Rhomboid Density & Posterior Chain",
  description:
    "Complete back hypertrophy specialization pairing wide-grip pull-ups, heavy single-arm rows, band pulldowns, rear delt flys, and spinal erector strength.",
  goal: "Muscle Gain",
  category: "Back",
  focus: "Back (Lats, Rhomboids, Traps, Rear Delts, Lower Back)",
  scheduleDay: "Day 2",
  coverImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Marcus",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "pullup_wide",          // Slot 1: Primary Vertical Width
    "single_arm_db_row",    // Slot 2: Primary Unilateral Row
    "chinup_close",         // Slot 3: Superset A1 (Underhand Lats/Arms)
    "band_pull_apart",      // Slot 4: Superset A2 (Postural Retraction)
    "db_bent_over_row",     // Slot 5: Superset B1 (Mid-Back Thickness)
    "rear_delt_fly_db",     // Slot 6: Superset B2 (Rear Delts)
    "band_pulldown",        // Slot 7: Lat Burnout Isolation
    "supermans",            // Slot 8: Spinal Erector Hold
    "leg_raises",           // Slot 9: Lower Ab Core Flexion
    "mountain_climbers",    // Slot 10: Aerobic Conditioning Finisher
  ],
  customSets: [3, 3, 3, 3, 3, 2, 2, 2, 2, 2],
  customReps: [
    "6-8 Reps", "10 Reps / Side",
    "8 Reps", "15-20 Reps",
    "10-12 Reps", "12-15 Reps",
    "12-15 Reps", "30 Secs",
    "10-12 Reps", "30 Secs",
  ],
  customRest: [120, 90, 90, 45, 75, 45, 60, 45, 45, 30],
});

export const L3_LEGS_ROUTINE = createRoutine({
  id: "l3-legs",
  level: "Advanced",
  levelName: "Level 3 • Dedicated Split",
  title: "Advanced Legs Day",
  subtitle: "High-Volume Quad, Hamstring & Unilateral Hypertrophy",
  description:
    "High-intensity lower body blast cycling heavy squats, Bulgarian split squats, Romanian deadlifts, Nordic curl negatives, wall sits, and plyometric bounds.",
  goal: "Muscle Gain",
  category: "Legs",
  focus: "Legs (Quads, Glutes, Hamstrings, Calves)",
  scheduleDay: "Day 3",
  coverImage: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Elena",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "weighted_squat_heavy",  // Slot 1: Primary Heavy Compound
    "romanian_deadlift_db",  // Slot 2: Primary Posterior Hinge
    "bulgarian_split_squat", // Slot 3: Superset A1 (Unilateral Quads)
    "calf_raise",            // Slot 4: Superset A2 (Calves)
    "walking_lunge",         // Slot 5: Superset B1 (Dynamic Lunges)
    "single_leg_rdl",        // Slot 6: Superset B2 (Unilateral Hamstrings)
    "nordic_curl_negative",  // Slot 7: Eccentric Hamstring Power
    "wall_sit",              // Slot 8: Quad Isometric Endurance
    "russian_twists",        // Slot 9: Rotational Core Bracing
    "jump_squats",           // Slot 10: Plyometric Power Finisher
  ],
  customSets: [3, 3, 3, 3, 2, 2, 2, 2, 2, 2],
  customReps: [
    "8-10 Reps", "10-12 Reps",
    "10 Reps / Leg", "15-20 Reps",
    "12 Reps / Leg", "10 Reps / Leg",
    "6-8 Reps", "30-45 Secs",
    "15 Reps / Side", "10 Jumps",
  ],
  customRest: [120, 90, 90, 45, 75, 60, 120, 60, 45, 60],
});

export const L3_SHOULDERS_ROUTINE = createRoutine({
  id: "l3-shoulders",
  level: "Advanced",
  levelName: "Level 3 • Dedicated Split",
  title: "Advanced Shoulders Day",
  subtitle: "3D Delts (Anterior, Lateral & Posterior Hypertrophy)",
  description:
    "Comprehensive 3D shoulder sculpting cycling elevated pike push-ups, Arnold dumbbell presses, strict lateral raises, rear delt flys, and rotator cuff work.",
  goal: "Muscle Gain",
  category: "Shoulders",
  focus: "Shoulders (Anterior, Lateral & Posterior Deltoids, Traps)",
  scheduleDay: "Day 4",
  coverImage: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Marcus",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "elevated_pike_pushup",  // Slot 1: Primary Heavy Vertical Press
    "db_overhead_press",     // Slot 2: Overhead DB Power
    "arnold_press_db",       // Slot 3: Superset A1 (3D Rotational Press)
    "lateral_raise_db",      // Slot 4: Superset A2 (Lateral Delts)
    "rear_delt_fly_db",      // Slot 5: Superset B1 (Rear Delts)
    "band_pull_apart",       // Slot 6: Superset B2 (Upper Traps / Infraspinatus)
    "incline_pike_pushup",   // Slot 7: High Rep Deltoid Finisher
    "reverse_snow_angels",   // Slot 8: Scapular Mobility
    "plank_shoulder_taps",   // Slot 9: Anti-Rotation Core
    "high_knees",            // Slot 10: Aerobic Sprint Finisher
  ],
  customSets: [3, 3, 3, 3, 3, 2, 2, 2, 2, 2],
  customReps: [
    "8-10 Reps", "10-12 Reps",
    "10-12 Reps", "12-15 Reps",
    "12-15 Reps", "15 Reps",
    "10 Reps", "12 Reps",
    "10 Reps / Side", "30 Secs",
  ],
  customRest: [120, 90, 75, 45, 60, 45, 60, 45, 45, 30],
});

export const L3_ARMS_ROUTINE = createRoutine({
  id: "l3-arms",
  level: "Advanced",
  levelName: "Level 3 • Dedicated Split",
  title: "Advanced Arms Day",
  subtitle: "Biceps, Triceps Long Head, Brachialis & Grip",
  description:
    "High-density antagonist arm pairs alternating bicep curls, hammer curls, close chin-ups with diamond push-ups, close-grip press, and overhead extensions.",
  goal: "Muscle Gain",
  category: "Arms",
  focus: "Arms (Biceps, Triceps, Brachialis, Forearms)",
  scheduleDay: "Day 5",
  coverImage: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Marcus",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "chinup_close",            // Slot 1: Primary Compound Arm Pull
    "close_grip_floor_press",  // Slot 2: Primary Compound Arm Push
    "db_bicep_curl",           // Slot 3: Antagonist Superset A1 (Biceps)
    "diamond_pushup",          // Slot 4: Antagonist Superset A2 (Triceps)
    "hammer_curl_db",          // Slot 5: Antagonist Superset B1 (Brachialis)
    "overhead_triceps_ext_db", // Slot 6: Antagonist Superset B2 (Triceps Long Head)
    "squeeze_press_db",        // Slot 7: Sternal & Arm Lockout
    "reverse_snow_angels",     // Slot 8: Scapular Recovery
    "bicycle_crunches",        // Slot 9: Obliques Core
    "skater_hops",             // Slot 10: Athletic Agility Finisher
  ],
  customSets: [3, 3, 3, 3, 3, 3, 2, 2, 2, 2],
  customReps: [
    "8 Reps", "10-12 Reps",
    "10-12 Reps", "8-10 Reps",
    "10-12 Reps", "12-15 Reps",
    "12 Reps", "12 Reps",
    "12-15 Reps / Side", "30 Secs",
  ],
  customRest: [120, 90, 60, 60, 60, 60, 60, 45, 45, 30],
});

export const L3_CORE_ROUTINE = createRoutine({
  id: "l3-core",
  level: "Advanced",
  levelName: "Level 3 • Dedicated Split",
  title: "Core & Conditioning Day",
  subtitle: "360 Core Bracing, Rotational Power & Aerobic Burn",
  description:
    "High-density core circuit targeting lower abs, obliques, transverse stability, dynamic anti-rotation, and high-intensity metabolic conditioning.",
  goal: "Conditioning",
  category: "Core",
  focus: "Core (Rectus Abdominis, Obliques, Transverse Abs) & Conditioning",
  scheduleDay: "Day 6 (Optional)",
  coverImage: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Elena",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "leg_raises",           // Slot 1: Lower Abs
    "weighted_plank",       // Slot 2: Anti-Extension Bracing
    "bicycle_crunches",     // Slot 3: Superset A1 (Obliques)
    "russian_twists",       // Slot 4: Superset A2 (Rotational Core)
    "plank_shoulder_taps",  // Slot 5: Superset B1 (Anti-Rotation)
    "dead_bug",             // Slot 6: Superset B2 (Deep Pelvic Bracing)
    "bird_dog",             // Slot 7: Cross-Body Core
    "supermans",            // Slot 8: Posterior Chain
    "mountain_climbers",    // Slot 9: HIIT Cardio Finisher 1
    "burpees",              // Slot 10: Max Output Finisher 2
  ],
  customSets: [3, 3, 3, 3, 2, 2, 2, 2, 2, 2],
  customReps: [
    "12 Reps", "30-45 Secs",
    "15 Reps / Side", "15 Reps / Side",
    "10 Reps / Side", "8 Reps / Side",
    "8 Reps / Side", "30 Secs",
    "30 Secs", "30 Secs",
  ],
  customRest: [60, 60, 45, 45, 45, 30, 30, 45, 30, 45],
});

// ============================================================================
// 13 NEW SPECIALIZED WORKOUT PLANS (Plans 12 to 24)
// ============================================================================

export const PLAN_FULLBODY_FOUNDATION = createRoutine({
  id: "plan-fullbody-foundations",
  level: "Beginner",
  levelName: "Foundation Series",
  title: "Full Body Foundation",
  subtitle: "Movement Competency & Balanced Full-Body Tone",
  description:
    "An ideal introductory workout hitting all 5 primary movement patterns: squat, push, pull, lunge, and core stability in 10 functional slots.",
  goal: "General Fitness",
  category: "Full Body",
  focus: "Full Body (Quads, Chest, Back, Glutes & Core)",
  scheduleDay: "3 Days / Week (Mon/Wed/Fri)",
  coverImage: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Elena",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "bodyweight_squat",
    "incline_pushup",
    "chair_row",
    "glute_bridge",
    "chair_reverse_lunge",
    "incline_pike_pushup",
    "lateral_raise_db",
    "calf_raise",
    "dead_bug",
    "jumping_jacks",
  ],
});

export const PLAN_FULLBODY_STRENGTH = createRoutine({
  id: "plan-fullbody-strength",
  level: "Intermediate",
  levelName: "Strength Series",
  title: "Full Body Strength",
  subtitle: "Heavy Compound Loading & High-Output Mechanical Work",
  description:
    "Focus on heavier compound lifts: weighted squats, dumbbell presses, bent-over rows, Romanian deadlifts, and loaded core carries.",
  goal: "Strength",
  category: "Full Body",
  focus: "Full Body Compound Strength (Heavy Loading)",
  scheduleDay: "3 Days / Week",
  coverImage: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Marcus",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "goblet_squat",
    "standard_pushup",
    "db_bent_over_row",
    "romanian_deadlift_db",
    "db_overhead_press",
    "single_arm_db_row",
    "bulgarian_split_squat",
    "floor_press_db",
    "plank_standard",
    "skater_hops",
  ],
});

export const PLAN_FULLBODY_HYPERTROPHY = createRoutine({
  id: "plan-fullbody-hypertrophy",
  level: "Intermediate",
  levelName: "Hypertrophy Series",
  title: "Full Body Hypertrophy",
  subtitle: "Target Volume, Squeeze Presses & Muscle Density",
  description:
    "High-density volume distribution across pectorals, lats, quads, hamstrings, deltoids, and arms with strict tempo controls.",
  goal: "Muscle Gain",
  category: "Full Body",
  focus: "Full Body Muscle Hypertrophy & Time Under Tension",
  scheduleDay: "3-4 Days / Week",
  coverImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Marcus",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "floor_press_db",
    "goblet_squat",
    "single_arm_db_row",
    "bulgarian_split_squat",
    "arnold_press_db",
    "db_bicep_curl",
    "diamond_pushup",
    "glute_bridge",
    "bicycle_crunches",
    "mountain_climbers",
  ],
});

export const PLAN_UPPER_LOWER_HYBRID = createRoutine({
  id: "plan-upper-lower-hybrid",
  level: "Intermediate",
  levelName: "Hybrid Series",
  title: "Upper / Lower Hybrid Power",
  subtitle: "Cross-Functional Upper Push/Pull & Lower Explosiveness",
  description:
    "Combines heavy upper body pressing and pulling with explosive lower body plyometrics and rotational core agility.",
  goal: "Hybrid Fitness",
  category: "Full Body",
  focus: "Upper Push/Pull + Lower Plyometrics",
  scheduleDay: "4 Days / Week",
  coverImage: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Elena",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "standard_pushup",
    "goblet_squat",
    "db_bent_over_row",
    "romanian_deadlift_db",
    "lateral_raise_db",
    "step_up",
    "hammer_curl_db",
    "overhead_triceps_ext_db",
    "russian_twists",
    "jump_squats",
  ],
});

export const PLAN_ATHLETIC_PERFORMANCE = createRoutine({
  id: "plan-athletic-performance",
  level: "Advanced",
  levelName: "Performance Series",
  title: "Athletic Performance",
  subtitle: "Speed, Deceleration, Lateral Bounds & Explosive Power",
  description:
    "Engineered for field and court athletes: plyometric jump squats, skater hops, unilateral split squats, pull-ups, and rotational power.",
  goal: "Athletic Performance",
  category: "HIIT",
  focus: "Athletic Explosiveness, Agility & Core Power",
  scheduleDay: "3-4 Days / Week",
  coverImage: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Marcus",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "jump_squats",
    "pullup_wide",
    "skater_hops",
    "standard_pushup",
    "bulgarian_split_squat",
    "single_arm_db_row",
    "single_leg_rdl",
    "plank_shoulder_taps",
    "russian_twists",
    "burpees",
  ],
});

export const PLAN_FUNCTIONAL_FITNESS = createRoutine({
  id: "plan-functional-fitness",
  level: "Intermediate",
  levelName: "Functional Series",
  title: "Functional Fitness",
  subtitle: "Everyday Movement Strength, Joint Durability & Balance",
  description:
    "Real-world functional movements: lunges, overhead carries, step-ups, floor presses, rows, and multi-planar core stability.",
  goal: "General Fitness",
  category: "Full Body",
  focus: "Functional Strength & Movement Longevity",
  scheduleDay: "3-4 Days / Week",
  coverImage: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Elena",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "goblet_squat",
    "db_overhead_press",
    "chair_row",
    "walking_lunge",
    "floor_press_db",
    "step_up",
    "band_pull_apart",
    "bird_dog",
    "dead_bug",
    "mountain_climbers",
  ],
});

export const PLAN_CALISTHENICS_MASTERY = createRoutine({
  id: "plan-calisthenics-mastery",
  level: "Advanced",
  levelName: "Calisthenics Series",
  title: "Calisthenics Mastery",
  subtitle: "Zero Equipment Bodyweight Levers, Dips & Push-Up Power",
  description:
    "Pure bodyweight mastery: elevated pike push-ups, wide pull-ups, diamond push-ups, Nordic curl walkouts, and isometric core holds.",
  goal: "Strength",
  category: "Upper Body",
  focus: "Strict Calisthenic Power & Relative Strength",
  scheduleDay: "4 Days / Week",
  coverImage: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Marcus",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "pullup_wide",
    "elevated_pike_pushup",
    "decline_pushup",
    "chinup_close",
    "diamond_pushup",
    "bulgarian_split_squat",
    "nordic_curl_negative",
    "reverse_snow_angels",
    "leg_raises",
    "burpees",
  ],
});

export const PLAN_DUMBBELL_STRENGTH = createRoutine({
  id: "plan-dumbbell-strength",
  level: "Intermediate",
  levelName: "Dumbbell Series",
  title: "Home Dumbbell Strength",
  subtitle: "Pure Dumbbell Hypertrophy & Overload Split",
  description:
    "Tailored exclusively for home dumbbell owners: floor press, single-arm rows, goblet squats, Romanian deadlifts, curls, and overhead presses.",
  goal: "Strength",
  category: "Full Body",
  focus: "Dumbbell Loading & Hypertrophy",
  scheduleDay: "3-4 Days / Week",
  coverImage: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Marcus",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "floor_press_db",
    "single_arm_db_row",
    "goblet_squat",
    "romanian_deadlift_db",
    "arnold_press_db",
    "db_bicep_curl",
    "close_grip_floor_press",
    "lateral_raise_db",
    "russian_twists",
    "mountain_climbers",
  ],
});

export const PLAN_FATLOSS_CONDITIONING = createRoutine({
  id: "plan-fatloss-conditioning",
  level: "Intermediate",
  levelName: "Conditioning Series",
  title: "Fat-Loss Conditioning",
  subtitle: "High-Density Metabolic Circuit & EPOC Calorie Burn",
  description:
    "Targeted high work-to-rest ratio circuits maximizing excess post-exercise oxygen consumption (EPOC) with explosive bodyweight intervals.",
  goal: "Fat Loss",
  category: "HIIT",
  focus: "High-Density Metabolic Burn & Conditioning",
  scheduleDay: "3-5 Days / Week",
  coverImage: "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Elena",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "bodyweight_squat",
    "standard_pushup",
    "mountain_climbers",
    "walking_lunge",
    "plank_shoulder_taps",
    "skater_hops",
    "bicycle_crunches",
    "jumping_jacks",
    "high_knees",
    "burpees",
  ],
});

export const PLAN_MOBILITY_CORE = createRoutine({
  id: "plan-mobility-core",
  level: "Beginner",
  levelName: "Restoration Series",
  title: "Mobility + Core Restoration",
  subtitle: "Joint Decompression, Hip Openers & Deep Core Bracing",
  description:
    "Active recovery and structural longevity: World's greatest stretch, 90/90 hip rotation flows, dead bugs, bird dogs, and thoracic spine health.",
  goal: "Mobility",
  category: "Mobility",
  focus: "Joint Mobility, Decompression & Deep Core Stability",
  scheduleDay: "2-3 Days / Week or Active Recovery",
  coverImage: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Elena",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "worlds_greatest_stretch",
    "90_90_hip_stretch",
    "reverse_snow_angels",
    "dead_bug",
    "bird_dog",
    "glute_bridge",
    "supermans",
    "plank_standard",
    "plank_shoulder_taps",
    "jumping_jacks",
  ],
});

export const PLAN_MINIMAL_EQUIPMENT = createRoutine({
  id: "plan-minimal-equipment",
  level: "Beginner",
  levelName: "Minimalist Series",
  title: "Minimal Equipment Express",
  subtitle: "Floor & Chair Only Full-Body Express Session",
  description:
    "Zero equipment required beyond a sturdy chair and floor space. Perfect for travel or compact home spaces with 10 high-efficiency slots.",
  goal: "General Fitness",
  category: "Full Body",
  focus: "Zero Equipment Bodyweight & Chair Conditioning",
  scheduleDay: "3 Days / Week",
  coverImage: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Elena",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "incline_pushup",
    "bodyweight_squat",
    "chair_row",
    "chair_reverse_lunge",
    "incline_pike_pushup",
    "glute_bridge",
    "wall_sit",
    "calf_raise",
    "plank_standard",
    "mountain_climbers",
  ],
});

export const PLAN_BAND_POWER = createRoutine({
  id: "plan-band-power",
  level: "Intermediate",
  levelName: "Resistance Series",
  title: "Resistance Band Hypertrophy",
  subtitle: "Variable Resistance Loading, Tone & Pump",
  description:
    "Full-body hypertrophy utilizing elastic resistance bands for accommodating resistance, peaked contractions, and minimal joint stress.",
  goal: "Muscle Gain",
  category: "Full Body",
  focus: "Variable Elastic Resistance & Joint-Friendly Hypertrophy",
  scheduleDay: "3-4 Days / Week",
  coverImage: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Marcus",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "band_chest_press",
    "band_pulldown",
    "band_fly",
    "band_pull_apart",
    "db_bicep_curl",
    "overhead_triceps_ext_db",
    "lateral_raise_db",
    "goblet_squat",
    "dead_bug",
    "skater_hops",
  ],
});

export const PLAN_HYBRID_ATHLETE = createRoutine({
  id: "plan-hybrid-athlete",
  level: "Advanced",
  levelName: "Hybrid Series",
  title: "Hybrid Athlete",
  subtitle: "Aerobic Capacity, Structural Strength & Unilateral Stamina",
  description:
    "For multi-discipline athletes: heavy compound strength paired immediately with aerobic pacing and high-output unilateral resilience.",
  goal: "Hybrid Fitness",
  category: "HIIT",
  focus: "Compound Strength + Cardiovascular Threshold",
  scheduleDay: "4-5 Days / Week",
  coverImage: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80",
  trainer: {
    name: "Coach Marcus",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
  exerciseIds: [
    "weighted_squat_heavy",
    "pullup_wide",
    "walking_lunge",
    "standard_pushup",
    "single_arm_db_row",
    "bulgarian_split_squat",
    "plank_shoulder_taps",
    "russian_twists",
    "high_knees",
    "burpees",
  ],
});

// Master Array of All 24 Workout Plans
export const ALL_ROUTINES: WorkoutRoutine[] = [
  // 11 Upgraded Core Progression Routines
  L1_UPPER_ROUTINE,
  L1_LOWER_ROUTINE,
  L2_PUSH_ROUTINE,
  L2_PULL_ROUTINE,
  L2_LEGS_ROUTINE,
  L3_CHEST_ROUTINE,
  L3_BACK_ROUTINE,
  L3_LEGS_ROUTINE,
  L3_SHOULDERS_ROUTINE,
  L3_ARMS_ROUTINE,
  L3_CORE_ROUTINE,
  // 13 Specialized New Plans
  PLAN_FULLBODY_FOUNDATION,
  PLAN_FULLBODY_STRENGTH,
  PLAN_FULLBODY_HYPERTROPHY,
  PLAN_UPPER_LOWER_HYBRID,
  PLAN_ATHLETIC_PERFORMANCE,
  PLAN_FUNCTIONAL_FITNESS,
  PLAN_CALISTHENICS_MASTERY,
  PLAN_DUMBBELL_STRENGTH,
  PLAN_FATLOSS_CONDITIONING,
  PLAN_MOBILITY_CORE,
  PLAN_MINIMAL_EQUIPMENT,
  PLAN_BAND_POWER,
  PLAN_HYBRID_ATHLETE,
];

// Level-grouped programs for structured progression
export const LEVEL_1_BEGINNER: ProgramLevelInfo = {
  level: "Beginner",
  title: "Level 1 — Beginner",
  timeline: "Weeks 1–4",
  splitDescription: "Upper / Lower Body Foundations",
  goal: "Master foundational movement patterns (push, pull, squat, hinge, brace) in 10-slot structured circuits.",
  weeklySchedule: [
    { day: "Day 1", activity: "Beginner Upper Body Day" },
    { day: "Day 2", activity: "Rest / Light Walk" },
    { day: "Day 3", activity: "Beginner Lower Body Day" },
    { day: "Day 4", activity: "Rest" },
    { day: "Day 5", activity: "Beginner Upper Body Day" },
    { day: "Day 6", activity: "Beginner Lower Body Day" },
    { day: "Day 7", activity: "Rest" },
  ],
  progressionCue:
    "Complete all 10 exercises with clean form and controlled tempo across 2 straight sessions to qualify for Level 2.",
  routines: [L1_UPPER_ROUTINE, L1_LOWER_ROUTINE, PLAN_FULLBODY_FOUNDATION, PLAN_MOBILITY_CORE, PLAN_MINIMAL_EQUIPMENT],
};

export const LEVEL_2_INTERMEDIATE: ProgramLevelInfo = {
  level: "Intermediate",
  title: "Level 2 — Intermediate",
  timeline: "Weeks 5–8+",
  splitDescription: "Push / Pull / Legs Functional Growth",
  goal: "Increase volume, apply external load, integrate antagonist supersets, and develop functional hypertrophy.",
  weeklySchedule: [
    { day: "Day 1", activity: "Intermediate Push Day" },
    { day: "Day 2", activity: "Intermediate Pull Day" },
    { day: "Day 3", activity: "Intermediate Legs Day" },
    { day: "Day 4", activity: "Rest / Active Recovery" },
    { day: "Day 5", activity: "Push or Hybrid Day" },
    { day: "Day 6", activity: "Legs or Full Body" },
    { day: "Day 7", activity: "Rest" },
  ],
  progressionCue:
    "Apply progressive overload using external resistance (backpack, dumbbells, or bands) before advancing to single-muscle splits.",
  routines: [
    L2_PUSH_ROUTINE,
    L2_PULL_ROUTINE,
    L2_LEGS_ROUTINE,
    PLAN_FULLBODY_STRENGTH,
    PLAN_FULLBODY_HYPERTROPHY,
    PLAN_UPPER_LOWER_HYBRID,
    PLAN_DUMBBELL_STRENGTH,
    PLAN_FATLOSS_CONDITIONING,
    PLAN_BAND_POWER,
  ],
};

export const LEVEL_3_ADVANCED: ProgramLevelInfo = {
  level: "Advanced",
  title: "Level 3 — Advanced",
  timeline: "Weeks 9+",
  splitDescription: "Single-Muscle Dedicated Split & Athletic Power",
  goal: "Maximize targeted volume per muscle group with high mechanical tension, unilateral overload, and metabolic density.",
  weeklySchedule: [
    { day: "Day 1", activity: "Advanced Chest Day" },
    { day: "Day 2", activity: "Advanced Back Day" },
    { day: "Day 3", activity: "Advanced Legs Day" },
    { day: "Day 4", activity: "Advanced Shoulders Day" },
    { day: "Day 5", activity: "Advanced Arms Day" },
    { day: "Day 6", activity: "Core & Conditioning Day" },
    { day: "Day 7", activity: "Full Rest" },
  ],
  progressionCue:
    "Apply progressive overload via load, tempo manipulation, density progression, and strict RPE targets.",
  routines: [
    L3_CHEST_ROUTINE,
    L3_BACK_ROUTINE,
    L3_LEGS_ROUTINE,
    L3_SHOULDERS_ROUTINE,
    L3_ARMS_ROUTINE,
    L3_CORE_ROUTINE,
    PLAN_ATHLETIC_PERFORMANCE,
    PLAN_CALISTHENICS_MASTERY,
    PLAN_HYBRID_ATHLETE,
  ],
};

export const ALL_PROGRAM_LEVELS: ProgramLevelInfo[] = [
  LEVEL_1_BEGINNER,
  LEVEL_2_INTERMEDIATE,
  LEVEL_3_ADVANCED,
];

export const PROGRAM_OVERVIEW: ProgramOverview = {
  title: "LOOP INTELLIGENT HOME WORKOUT PROGRAM",
  subtitle: "Evidence-Based Periodization: Beginner → Intermediate → Advanced",
  description:
    "An evidence-informed, adaptive training system featuring 10-slot structured workouts, intelligent exercise-specific rest intervals, antagonist supersets, and dynamic duration scaling.",
  levelsSummary: [
    {
      level: "Level 1 — Beginner",
      desc: "Upper / Lower split (10 movement slots, establish movement competency, anatomical adaptation)",
    },
    {
      level: "Level 2 — Intermediate",
      desc: "Push / Pull / Legs (10 movement slots, antagonist supersets, progressive overload with dumbbells/bands)",
    },
    {
      level: "Level 3 — Advanced",
      desc: "Single-Muscle & Athletic Split (10 movement slots, heavy compound strength, high-volume isolation & finishers)",
    },
  ],
  equipment: {
    minimum: [
      "Bodyweight & floor space",
      "A sturdy chair or elevated surface",
      "A towel / doorway for pulling movements",
    ],
    optional: [
      "A pair of dumbbells",
      "Resistance bands (loop & handle)",
      "A doorway pull-up bar",
      "A loaded backpack for progressive resistance",
    ],
  },
  generalRules: [
    "Warm up 5–8 minutes with dynamic mobility before each workout",
    "Cool down 3–5 minutes with static stretching",
    "Rest intelligently according to the exercise category (90-180s for strength, 60s for supersets, 30s for accessories)",
    "Progress when target reps are hit cleanly at designated RPE (do not train to failure on every set)",
  ],
  progressionToolkit: [
    "Rep progression: reach upper limit of rep range before adding weight",
    "Load progression: add dumbbells, thicker resistance bands, or loaded backpack",
    "Tempo progression: extend eccentric descent to 3–4 seconds for increased time under tension",
    "Density progression: decrease rest between superset rounds as conditioning improves",
  ],
  levelUpChecklist: [
    {
      level: "Beginner → Intermediate",
      criteria: "90%+ workout adherence and clean execution of all 10 slots for 2 consecutive cycles (~4 weeks)",
    },
    {
      level: "Intermediate → Advanced",
      criteria: "Consistently handling external loading across Push/Pull/Legs splits with appropriate RPE control",
    },
  ],
  safetyNotes: [
    "Stop any exercise immediately if joint pain occurs (distinct from normal muscle burn)",
    "Prioritize form fidelity and controlled deceleration over speed",
    "Take an active recovery/deload week every 6–8 weeks of continuous training",
  ],
};

export interface NextWorkoutRecommendation {
  nextRoutine: WorkoutRoutine;
  scheduleDay: string;
  scheduleTiming: string;
  restDayAdvice: string;
  currentLevelTitle: string;
  timeline: string;
  sessionsDoneInLevel: number;
  levelTargetSessions: number;
  remainingToLevelUp: number;
  levelUpCriteria: string;
}

export function getNextWorkoutRecommendation(
  currentRoutine: WorkoutRoutine,
  completedWorkoutsCount: number = 0
): NextWorkoutRecommendation {
  const currentLevel = currentRoutine.level;
  const levelInfo =
    ALL_PROGRAM_LEVELS.find((l) => l.level === currentLevel) || LEVEL_1_BEGINNER;
  const routinesInLevel = levelInfo.routines;
  const currentIndex = routinesInLevel.findIndex((r) => r.id === currentRoutine.id);

  let nextRoutine: WorkoutRoutine;
  let scheduleDay = "";
  let scheduleTiming = "";
  let restDayAdvice = "";

  if (currentLevel === "Beginner") {
    if (currentRoutine.id === "l1-upper") {
      nextRoutine = routinesInLevel.find((r) => r.id === "l1-lower") || routinesInLevel[1];
      scheduleDay = "Day 3";
      scheduleTiming = "Beginner Lower Body Day (10 Exercise Slots)";
      restDayAdvice = "Tomorrow (Day 2) is an Active Recovery / Light Walk day. Hit your Lower Body session on Day 3!";
    } else {
      nextRoutine = routinesInLevel.find((r) => r.id === "l1-upper") || routinesInLevel[0];
      scheduleDay = "Day 5";
      scheduleTiming = "Beginner Upper Body Day (10 Exercise Slots)";
      restDayAdvice = "Tomorrow (Day 4) is a Rest day. Re-energize for Upper Body Day on Day 5!";
    }
  } else if (currentLevel === "Intermediate") {
    const nextIdx = (currentIndex + 1) % routinesInLevel.length;
    nextRoutine = routinesInLevel[nextIdx];
    if (currentRoutine.id === "l2-push") {
      scheduleDay = "Day 2";
      scheduleTiming = "Intermediate Pull Day (Back, Lats & Biceps)";
      restDayAdvice = "Target back width, vertical pulling, and posture in tomorrow's session.";
    } else if (currentRoutine.id === "l2-pull") {
      scheduleDay = "Day 3";
      scheduleTiming = "Intermediate Legs Day (Quads & Posterior Chain)";
      restDayAdvice = "Power up your lower body compounds in your next session.";
    } else {
      scheduleDay = "Day 5";
      scheduleTiming = "Push or Hybrid Day (10 Slots)";
      restDayAdvice = "Day 4 is Active Recovery. Repeat the Push circuit on Day 5.";
    }
  } else {
    // Advanced 6-day split
    const nextIdx = (currentIndex + 1) % routinesInLevel.length;
    nextRoutine = routinesInLevel[nextIdx];
    scheduleDay = nextRoutine.scheduleDay || "Next Scheduled Day";
    scheduleTiming = `${nextRoutine.title} • ${nextRoutine.subtitle}`;
    restDayAdvice = `Focus for next session: ${nextRoutine.focus} (${nextRoutine.durationMin} mins).`;
  }

  const levelTargetSessions = currentLevel === "Beginner" ? 8 : currentLevel === "Intermediate" ? 12 : 16;
  const sessionsDoneInLevel = ((completedWorkoutsCount || 0) % levelTargetSessions) + 1;
  const remainingToLevelUp = Math.max(1, levelTargetSessions - sessionsDoneInLevel);

  return {
    nextRoutine,
    scheduleDay,
    scheduleTiming,
    restDayAdvice,
    currentLevelTitle: levelInfo.title,
    timeline: levelInfo.timeline,
    sessionsDoneInLevel,
    levelTargetSessions,
    remainingToLevelUp,
    levelUpCriteria: levelInfo.progressionCue,
  };
}
