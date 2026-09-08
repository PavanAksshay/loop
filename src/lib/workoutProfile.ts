import { supabase, isSupabaseConfigured } from "./supabase";
import { fetchProfile, saveProfile, ProfileRow } from "./db";
import { DEFAULT_AVATARS } from "../types";

export interface WorkoutUserProfile {
  id: string;
  full_name: string;
  username: string;
  age: number;
  gender: "male" | "female" | "other";
  avatar_url: string;
  weight_kg: number;
  fitness_level: "Beginner" | "Intermediate" | "Advanced";
  primary_goal: string;
  target_days_per_week: number;
  available_equipment: string[];
  daily_calorie_goal: number;
  streak_days: number;
  total_completed_workouts: number;
  total_calories_burned: number;
  onboarding_completed: boolean;
  sound_enabled: boolean;
  height_cm?: number;
  email?: string;
  workouts_completed?: number;
  total_workout_minutes?: number;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = "loop_workout_profile";

export const DEFAULT_WORKOUT_PROFILE: WorkoutUserProfile = {
  id: "usr_guest_workout",
  full_name: "Alex Morgan",
  username: "alex_fit",
  age: 26,
  gender: "other",
  avatar_url: DEFAULT_AVATARS[0].url,
  weight_kg: 68.5,
  fitness_level: "Beginner",
  primary_goal: "Build Muscle & Tone",
  target_days_per_week: 4,
  available_equipment: ["Bodyweight", "Chair/Elevated Surface"],
  daily_calorie_goal: 450,
  streak_days: 5,
  total_completed_workouts: 14,
  total_calories_burned: 3840,
  onboarding_completed: false,
  sound_enabled: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Retrieves the stored workout profile from localStorage or default.
 */
export function getStoredWorkoutProfile(): WorkoutUserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("[Loop Workout] Failed to read cached profile:", e);
  }
  return DEFAULT_WORKOUT_PROFILE;
}

/**
 * Saves the workout profile to localStorage and syncs with Supabase database if connected.
 */
export async function saveWorkoutProfile(
  profile: WorkoutUserProfile
): Promise<WorkoutUserProfile> {
  const updated: WorkoutUserProfile = {
    ...profile,
    updated_at: new Date().toISOString(),
  };

  // 1. Save locally for instant offline/fast hydration
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("[Loop Workout] Failed to save profile locally:", e);
  }

  // 2. Sync to Supabase if session exists
  if (isSupabaseConfigured) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await saveProfile(session.user.id, {
          full_name: updated.full_name,
          username: updated.username,
          age: updated.age,
          gender: updated.gender,
          avatar_url: updated.avatar_url,
          weight_kg: updated.weight_kg,
          onboarding_completed: true,
        });
      }
    } catch (err) {
      console.warn("[Loop Workout] DB sync notice (persisted locally):", err);
    }
  }

  return updated;
}

/**
 * Tries to hydrate workout profile from active Supabase profile if available.
 */
export async function syncWorkoutProfileFromDB(): Promise<WorkoutUserProfile> {
  const current = getStoredWorkoutProfile();

  if (!isSupabaseConfigured) return current;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const dbRow: ProfileRow | null = await fetchProfile(session.user.id);
      if (dbRow) {
        const merged: WorkoutUserProfile = {
          ...current,
          id: dbRow.id,
          full_name: dbRow.full_name || current.full_name,
          username: dbRow.username || current.username,
          age: dbRow.age || current.age,
          gender: (dbRow.gender as any) || current.gender,
          avatar_url: dbRow.avatar_url || current.avatar_url,
          weight_kg: dbRow.weight_kg || current.weight_kg,
          onboarding_completed: true,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (e) {
    console.warn("[Loop Workout] Failed to sync from DB:", e);
  }

  return current;
}
