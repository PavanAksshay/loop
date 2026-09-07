import React, { useState } from "react";
import {
  User,
  Flame,
  ArrowRight,
  ArrowLeft,
  Check,
  Dumbbell,
  Target,
  Calendar,
  Sparkles,
  Zap,
} from "lucide-react";
import LoopLogo from "../LoopLogo";
import { DEFAULT_AVATARS } from "../../types";
import { WorkoutUserProfile, saveWorkoutProfile } from "../../lib/workoutProfile";

interface WorkoutOnboardingModalProps {
  initialProfile: WorkoutUserProfile;
  onComplete: (updated: WorkoutUserProfile) => void;
  onSkip?: () => void;
}

export default function WorkoutOnboardingModal({
  initialProfile,
  onComplete,
  onSkip,
}: WorkoutOnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState(initialProfile.full_name || "");
  const [username, setUsername] = useState(initialProfile.username || "");
  const [age, setAge] = useState(initialProfile.age || 25);
  const [gender, setGender] = useState<"male" | "female" | "other">(initialProfile.gender || "other");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url || DEFAULT_AVATARS[0].url);
  const [weightKg, setWeightKg] = useState(initialProfile.weight_kg || 70);
  const [fitnessLevel, setFitnessLevel] = useState<"Beginner" | "Intermediate" | "Advanced">(
    initialProfile.fitness_level || "Beginner"
  );
  const [primaryGoal, setPrimaryGoal] = useState(initialProfile.primary_goal || "Build Muscle & Tone");
  const [targetDays, setTargetDays] = useState(initialProfile.target_days_per_week || 4);
  const [equipment, setEquipment] = useState<string[]>(
    initialProfile.available_equipment.length ? initialProfile.available_equipment : ["Bodyweight"]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleEquipment = (eq: string) => {
    setEquipment((prev) =>
      prev.includes(eq) ? (prev.length > 1 ? prev.filter((item) => item !== eq) : prev) : [...prev, eq]
    );
  };

  const handleFinish = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    const updated: WorkoutUserProfile = {
      ...initialProfile,
      full_name: fullName.trim() || "Loop Athlete",
      username: username.trim() || "athlete",
      age: Number(age) || 25,
      gender,
      avatar_url: avatarUrl,
      weight_kg: Number(weightKg) || 70,
      fitness_level: fitnessLevel,
      primary_goal: primaryGoal,
      target_days_per_week: targetDays,
      available_equipment: equipment,
      onboarding_completed: true,
    };

    const saved = await saveWorkoutProfile(updated);
    setIsSubmitting(false);
    onComplete(saved);
  };

  return (
    <div className="fixed inset-0 z-[2500] bg-[#0A2239]/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border-2 border-[#87CEEB] rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative my-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#D7EBF7]">
          <div className="flex items-center gap-2.5">
            <LoopLogo size={32} glow />
            <div>
              <h2 className="font-headline text-lg font-black text-[#0B2238] uppercase tracking-tight">
                Workout Profile
              </h2>
              <p className="text-[11px] text-[#486581]">
                Step {step} of 3 • Personalize your plan
              </p>
            </div>
          </div>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-xs font-bold text-[#7A97B0] hover:text-[#0B2238] transition-colors"
            >
              Skip
            </button>
          )}
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? "bg-[#87CEEB] shadow-sm shadow-[#87CEEB]" : "bg-[#D7EBF7]"
              }`}
            />
          ))}
        </div>

        {/* STEP 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#0B2238] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D7EBF7] bg-[#F4F9FD] text-[#0B2238] text-sm font-semibold focus:border-[#87CEEB] focus:outline-none focus:ring-2 focus:ring-[#87CEEB]/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#0B2238] uppercase tracking-wider mb-1.5">
                  Age
                </label>
                <input
                  type="number"
                  min="14"
                  max="99"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D7EBF7] bg-[#F4F9FD] text-[#0B2238] text-sm font-semibold focus:border-[#87CEEB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0B2238] uppercase tracking-wider mb-1.5">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D7EBF7] bg-[#F4F9FD] text-[#0B2238] text-sm font-semibold focus:border-[#87CEEB] focus:outline-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Avatar Picker */}
            <div>
              <label className="block text-xs font-bold text-[#0B2238] uppercase tracking-wider mb-2">
                Choose Profile Avatar
              </label>
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {DEFAULT_AVATARS.slice(0, 8).map((av) => (
                  <button
                    type="button"
                    key={av.id}
                    onClick={() => setAvatarUrl(av.url)}
                    className={`relative w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 transition-transform ${
                      avatarUrl === av.url
                        ? "border-[#87CEEB] scale-105 shadow-md shadow-[#87CEEB]/40"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                    {avatarUrl === av.url && (
                      <div className="absolute inset-0 bg-[#87CEEB]/40 flex items-center justify-center">
                        <Check className="w-4 h-4 text-[#0B2238] stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full mt-4 py-3 rounded-full bg-[#87CEEB] text-[#0A2239] font-headline text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#72C2E7] transition-all shadow-md shadow-[#87CEEB]/30 cursor-pointer"
            >
              <span>Next: Fitness Level</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Physical & Program Level */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#0B2238] uppercase tracking-wider mb-1.5">
                Body Weight (kg)
              </label>
              <input
                type="number"
                step="0.5"
                min="35"
                max="250"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                placeholder="e.g. 70"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D7EBF7] bg-[#F4F9FD] text-[#0B2238] text-sm font-semibold focus:border-[#87CEEB] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B2238] uppercase tracking-wider mb-2">
                Starting Level from PDF Program
              </label>
              <div className="space-y-2">
                {[
                  {
                    id: "Beginner",
                    title: "Level 1 — Beginner (Weeks 1–4)",
                    desc: "Upper & Lower body foundations, 3 days/week.",
                  },
                  {
                    id: "Intermediate",
                    title: "Level 2 — Intermediate (Weeks 5–8+)",
                    desc: "Push / Pull / Legs functional growth, 4–5 days/week.",
                  },
                  {
                    id: "Advanced",
                    title: "Level 3 — Advanced (Weeks 9+)",
                    desc: "Single-muscle specialization split, 5–6 days/week.",
                  },
                ].map((lvl) => (
                  <button
                    type="button"
                    key={lvl.id}
                    onClick={() => setFitnessLevel(lvl.id as any)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                      fitnessLevel === lvl.id
                        ? "border-[#87CEEB] bg-[#EAF3F9] shadow-sm"
                        : "border-[#D7EBF7] bg-white hover:bg-[#F4F9FD]"
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-extrabold text-[#0B2238]">{lvl.title}</h4>
                      <p className="text-[11px] text-[#486581] mt-0.5">{lvl.desc}</p>
                    </div>
                    {fitnessLevel === lvl.id && (
                      <div className="w-5 h-5 rounded-full bg-[#87CEEB] flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-[#0A2239] stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 rounded-full bg-[#F4F9FD] border border-[#D7EBF7] text-[#0B2238] font-headline text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#EAF3F9] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-2/3 py-3 rounded-full bg-[#87CEEB] text-[#0A2239] font-headline text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#72C2E7] transition-all shadow-md shadow-[#87CEEB]/30 cursor-pointer"
              >
                <span>Next: Goals</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Goals & Equipment */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#0B2238] uppercase tracking-wider mb-2">
                Primary Goal
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Build Muscle & Tone",
                  "Fat Loss & Conditioning",
                  "Pure Strength",
                  "Core & Posture",
                ].map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => setPrimaryGoal(g)}
                    className={`p-2.5 rounded-xl border text-center transition-all text-xs font-bold cursor-pointer ${
                      primaryGoal === g
                        ? "border-[#87CEEB] bg-[#87CEEB] text-[#0A2239] shadow-sm"
                        : "border-[#D7EBF7] bg-[#F4F9FD] text-[#486581] hover:bg-[#EAF3F9]"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B2238] uppercase tracking-wider mb-2">
                Available Equipment
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Bodyweight",
                  "Chair / Step",
                  "Dumbbells",
                  "Resistance Bands",
                  "Pull-Up Bar",
                  "Weighted Backpack",
                ].map((eq) => (
                  <button
                    type="button"
                    key={eq}
                    onClick={() => toggleEquipment(eq)}
                    className={`px-3 py-1.5 rounded-full border text-[11px] font-bold cursor-pointer transition-all ${
                      equipment.includes(eq)
                        ? "border-[#87CEEB] bg-[#EAF3F9] text-[#1B6E99]"
                        : "border-[#D7EBF7] bg-white text-[#7A97B0]"
                    }`}
                  >
                    {equipment.includes(eq) ? "✓ " : "+ "}
                    {eq}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B2238] uppercase tracking-wider mb-1.5">
                Target Days / Week
              </label>
              <div className="flex gap-2">
                {[3, 4, 5, 6].map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setTargetDays(d)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      targetDays === d
                        ? "border-[#87CEEB] bg-[#87CEEB] text-[#0A2239]"
                        : "border-[#D7EBF7] bg-[#F4F9FD] text-[#486581]"
                    }`}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 py-3 rounded-full bg-[#F4F9FD] border border-[#D7EBF7] text-[#0B2238] font-headline text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#EAF3F9] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSubmitting}
                className="w-2/3 py-3 rounded-full bg-[#87CEEB] text-[#0A2239] font-headline text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#72C2E7] transition-all shadow-md shadow-[#87CEEB]/30 cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? "Saving..." : "Start Loop Workouts"}</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
