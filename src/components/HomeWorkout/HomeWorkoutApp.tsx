import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Play,
  SkipForward,
  Bookmark,
  Flame,
  Zap,
  Activity,
  Award,
  Search,
  Bell,
  SlidersHorizontal,
  X,
  Clock,
  User,
  Pencil,
  Dumbbell,
  Check,
  RefreshCw,
  Mail,
  ShieldCheck,
  Calendar,
  Images,
  Upload,
  Footprints,
} from "lucide-react";
import LoopLogo from "../LoopLogo";
import {
  ALL_ROUTINES,
  WorkoutRoutine,
  Exercise,
} from "../../data/homeWorkoutData";
import {
  WorkoutUserProfile,
  getStoredWorkoutProfile,
  saveWorkoutProfile,
  syncWorkoutProfileFromDB,
} from "../../lib/workoutProfile";
import { DEFAULT_AVATARS } from "../../types";
import WorkoutOnboardingModal from "./WorkoutOnboardingModal";
import ExerciseFormVisual from "./ExerciseFormVisual";
import { workoutAudio } from "../../lib/workoutAudio";
import "../../styles/homeWorkout.css";

export default function HomeWorkoutApp() {
  const navigate = useNavigate();

  // User Profile & Onboarding State
  const [userProfile, setUserProfile] = useState<WorkoutUserProfile>(getStoredWorkoutProfile);
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<boolean>(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState<boolean>(false);
  const avatarUploadRef = useRef<HTMLInputElement>(null);

  // Active Screen: 'home' | 'playlist' | 'tracking' | 'progress' | 'profile'
  const [currentScreen, setCurrentScreen] = useState<"home" | "playlist" | "tracking" | "progress" | "profile">("home");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<"All" | "Beginner" | "Intermediate" | "Advanced">("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [bookmarkedRoutineIds, setBookmarkedRoutineIds] = useState<string[]>(["l1-upper", "l2-push"]);

  // Selected Routine & Circuit / Round-based Active Workout Player
  const [selectedRoutine, setSelectedRoutine] = useState<WorkoutRoutine>(ALL_ROUTINES[0]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalRounds, setTotalRounds] = useState<number>(3);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(0);
  const [completedRounds, setCompletedRounds] = useState<number[]>([]);

  // Full-Screen Rest Timer State
  const [showRestModal, setShowRestModal] = useState<boolean>(false);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number>(45);
  const [nextStepInfo, setNextStepInfo] = useState<{
    exerciseIdx: number;
    round: number;
    isFinish: boolean;
  }>({ exerciseIdx: 0, round: 1, isFinish: false });

  const [showCongratsModal, setShowCongratsModal] = useState<boolean>(false);
  const [completedWorkoutStats, setCompletedWorkoutStats] = useState<{ time: string; setsCount: number; score: number }>({
    time: "00:00",
    setsCount: 0,
    score: 100,
  });
  const [activeAnalyticsPeriod, setActiveAnalyticsPeriod] = useState<"Day" | "Week" | "Month" | "Year">("Week");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Profile Editing
  const [formName, setFormName] = useState(userProfile.full_name || "Alex Morgan");
  const [formAge, setFormAge] = useState(String(userProfile.age || 26));
  const [formGender, setFormGender] = useState(userProfile.gender || "Male");
  const [formWeight, setFormWeight] = useState(String(userProfile.weight_kg || 70));
  const [formHeight, setFormHeight] = useState(String(userProfile.height_cm || 175));
  const [formLevel, setFormLevel] = useState(userProfile.fitness_level || "Beginner");

  // Hydrate Profile from DB on mount
  useEffect(() => {
    syncWorkoutProfileFromDB().then((synced) => {
      setUserProfile(synced);
      setFormName(synced.full_name);
      setFormAge(String(synced.age || 26));
      setFormGender(synced.gender || "Male");
      setFormWeight(String(synced.weight_kg || 70));
      setFormHeight(String(synced.height_cm || 175));
      setFormLevel(synced.fitness_level || "Beginner");
      if (!synced.onboarding_completed) {
        setShowOnboardingModal(true);
      }
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Rest Timer Interval
  useEffect(() => {
    let restInterval: NodeJS.Timeout | null = null;
    if (showRestModal) {
      restInterval = setInterval(() => {
        setRestSecondsRemaining((prev) => {
          if (prev <= 1) {
            skipRest();
            return 0;
          }
          if (prev <= 4) workoutAudio.playCueBeep(480, 0.1);
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (restInterval) clearInterval(restInterval);
    };
  }, [showRestModal, nextStepInfo]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      workoutAudio.stopMusic();
    };
  }, []);

  // Navigation handlers
  const openRoutine = (routine: WorkoutRoutine) => {
    setSelectedRoutine(routine);
    setCurrentScreen("playlist");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startLiveWorkout = (routine?: WorkoutRoutine, startIdx = 0) => {
    const r = routine || selectedRoutine;
    setSelectedRoutine(r);
    setCurrentRound(1);
    setTotalRounds(r.exercises[0]?.sets || 3);
    setCurrentExerciseIndex(startIdx);
    setCompletedRounds([]);
    setCurrentScreen("tracking");

    // Unlock audio & cue beep
    workoutAudio.unlockContext();
    workoutAudio.playCueBeep(520, 0.2);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeExercise: Exercise = selectedRoutine.exercises[currentExerciseIndex] || selectedRoutine.exercises[0];

  // Circuit Step Completion: Moves to next exercise in round or next round
  const completeCurrentExerciseInCircuit = () => {
    workoutAudio.playCueBeep(700, 0.2);

    const isLastExInRound = currentExerciseIndex >= selectedRoutine.exercises.length - 1;
    const isFinalRound = currentRound >= totalRounds;

    if (isLastExInRound && isFinalRound) {
      // Finished all rounds!
      finishWorkout();
    } else {
      let nextExIdx = currentExerciseIndex + 1;
      let nextRnd = currentRound;
      if (isLastExInRound) {
        nextExIdx = 0;
        nextRnd = currentRound + 1;
        setCompletedRounds((prev) => [...prev, currentRound]);
      }

      setNextStepInfo({
        exerciseIdx: nextExIdx,
        round: nextRnd,
        isFinish: false,
      });

      triggerRest(activeExercise.restSeconds || 45);
    }
  };

  const triggerRest = (secs = 45) => {
    setRestSecondsRemaining(secs);
    setShowRestModal(true);
  };

  const skipRest = () => {
    setShowRestModal(false);
    workoutAudio.unlockContext();
    workoutAudio.playCueBeep(520, 0.2);

    if (nextStepInfo.isFinish) {
      finishWorkout();
    } else {
      setCurrentExerciseIndex(nextStepInfo.exerciseIdx);
      setCurrentRound(nextStepInfo.round);
    }
  };

  const addRestTime = (add = 15) => {
    setRestSecondsRemaining((prev) => prev + add);
    workoutAudio.playCueBeep(550, 0.1);
  };

  const finishWorkout = () => {
    workoutAudio.playCelebrationChime();
    setShowRestModal(false);

    const totalSetsCompleted = totalRounds * selectedRoutine.exercises.length;
    setCompletedWorkoutStats({
      time: `${selectedRoutine.durationMin}:00`,
      setsCount: totalSetsCompleted,
      score: 100,
    });

    const updatedProfile: WorkoutUserProfile = {
      ...userProfile,
      workouts_completed: (userProfile.workouts_completed || 0) + 1,
      total_workout_minutes: (userProfile.total_workout_minutes || 0) + selectedRoutine.durationMin,
      streak_days: (userProfile.streak_days || 0) + 1,
    };
    setUserProfile(updatedProfile);
    saveWorkoutProfile(updatedProfile);

    setShowCongratsModal(true);
  };

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedRoutineIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    showToast(bookmarkedRoutineIds.includes(id) ? "Removed from Saved" : "Saved to Bookmarks ⭐");
  };

  const handleSaveProfileChanges = () => {
    const updated: WorkoutUserProfile = {
      ...userProfile,
      full_name: formName,
      age: parseInt(formAge, 10) || userProfile.age,
      gender: formGender,
      weight_kg: parseFloat(formWeight) || userProfile.weight_kg,
      height_cm: parseFloat(formHeight) || userProfile.height_cm,
      fitness_level: formLevel as "Beginner" | "Intermediate" | "Advanced",
    };
    setUserProfile(updated);
    saveWorkoutProfile(updated);
    setEditingProfile(false);
    showToast("Profile saved successfully! ✓");
  };

  const handleAvatarSelect = (url: string) => {
    const updated = { ...userProfile, avatar_url: url };
    setUserProfile(updated);
    saveWorkoutProfile(updated);
    setShowAvatarPicker(false);
    showToast("Avatar updated! ✓");
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          handleAvatarSelect(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter routines by Level, Category, Search
  const filteredRoutines = ALL_ROUTINES.filter((r) => {
    const matchesLevel = selectedLevel === "All" || r.level === selectedLevel;
    const matchesCat = selectedCategory === "All" || r.focus.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.exercises.some((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesLevel && matchesCat && matchesSearch;
  });

  const nextUpExercise = selectedRoutine.exercises[nextStepInfo.exerciseIdx] || selectedRoutine.exercises[0];

  return (
    <div className="hw-theme-root">
      {/* ================================================================
          CLEAN APP HEADER
          ================================================================ */}
      <header className="hw-showcase-nav">
        {/* Left: Return to Tracks & Brand Title */}
        <div className="hw-brand-group">
          <button
            onClick={() => navigate("/")}
            title="Return to Track Selector"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#D7EBF7] text-xs font-bold text-[#0B2238] hover:bg-[#EAF3F9] transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Tracks</span>
          </button>
          <div className="flex items-center gap-2">
            <LoopLogo size={24} glow />
            <span className="font-logo text-2xl uppercase tracking-wider text-[#0B2238]" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>Loop</span>
          </div>
        </div>

        {/* Top Right Controls: Profile */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentScreen("profile")}
            className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#87CEEB] hover:scale-105 transition-transform cursor-pointer"
            title="Your Profile"
          >
            <img src={userProfile.avatar_url} alt={userProfile.full_name} className="w-full h-full object-cover" />
          </button>
        </div>
      </header>

      {/* ================================================================
          MAIN MOBILE-FIRST CONTENT CONTAINER
          ================================================================ */}
      <main className="hw-app-container">
        {/* ==============================================================
            SCREEN 1: HOME DASHBOARD (WORKOUT DISCOVERY)
            ============================================================== */}
        {currentScreen === "home" && (
          <section className="hw-screen">
            {/* Header with Avatar, Greeting & Streak */}
            <div className="hw-screen-header">
              <div className="hw-user-profile" onClick={() => setCurrentScreen("profile")}>
                <div className="hw-avatar-wrapper">
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.full_name}
                    className="hw-avatar-img"
                  />
                  <span className="hw-online-badge"></span>
                </div>
                <div>
                  <p className="hw-greeting-sub">Welcome back 👋</p>
                  <h2 className="hw-user-name">{userProfile.full_name}</h2>
                </div>
              </div>

              <div className="hw-header-actions">
                <div className="hw-streak-pill" title="5 Days Consecutive Streak">
                  <Flame className="w-3.5 h-3.5 text-[#FF7043] fill-current" />
                  <span>{userProfile.streak_days || 5} Days</span>
                </div>
                <button
                  className="hw-icon-round-btn cursor-pointer"
                  onClick={() => showToast("🔔 You have 2 workout reminders today!")}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span className="hw-notif-badge"></span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="hw-search-box">
              <Search className="w-4 h-4 text-[#7A97B0] shrink-0" />
              <input
                type="text"
                placeholder="Search exercises, routines, coaches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[#7A97B0] hover:text-[#0B2238] shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => showToast("Filters applied: Intensity & Equipment")}
                className="text-[#486581] hover:text-[#1B6E99] shrink-0 cursor-pointer"
                title="Filter Workouts"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Daily Activity Summary Card with Light Blue (#87CEEB) Progress Rings */}
            <div className="hw-activity-summary-card">
              <div className="hw-card-left">
                <div className="hw-card-tag">TODAY'S PROGRESS</div>
                <h3 className="hw-summary-title">Keep up the burn!</h3>
                <p className="hw-summary-sub">You're 72% toward your daily fitness goal.</p>
                <div className="hw-metrics-row">
                  <div className="hw-metric-item">
                    <span className="hw-metric-val">540 <small>kcal</small></span>
                    <span className="hw-metric-label">Burned</span>
                  </div>
                  <div className="hw-metric-divider"></div>
                  <div className="hw-metric-item">
                    <span className="hw-metric-val">42 <small>min</small></span>
                    <span className="hw-metric-label">Active</span>
                  </div>
                  <div className="hw-metric-divider"></div>
                  <div className="hw-metric-item">
                    <span className="hw-metric-val">3/4</span>
                    <span className="hw-metric-label">Sets</span>
                  </div>
                </div>
              </div>

              <div className="hw-card-right">
                {/* SVG Activity Circular Gauge in #87CEEB */}
                <div className="hw-rings-wrapper">
                  <svg className="hw-progress-ring-svg" viewBox="0 0 100 100">
                    <circle className="hw-ring-bg" cx="50" cy="50" r="42" strokeWidth="8"></circle>
                    <circle className="hw-ring-fg hw-ring-calories" cx="50" cy="50" r="42" strokeWidth="8" strokeDasharray="264" strokeDashoffset="65"></circle>
                    <circle className="hw-ring-bg" cx="50" cy="50" r="30" strokeWidth="8"></circle>
                    <circle className="hw-ring-fg hw-ring-time" cx="50" cy="50" r="30" strokeWidth="8" strokeDasharray="188" strokeDashoffset="40"></circle>
                    <circle className="hw-ring-bg" cx="50" cy="50" r="18" strokeWidth="8"></circle>
                    <circle className="hw-ring-fg hw-ring-workouts" cx="50" cy="50" r="18" strokeWidth="8" strokeDasharray="113" strokeDashoffset="28"></circle>
                  </svg>
                  <div className="hw-ring-center-icon">
                    <Zap className="w-5 h-5 fill-current text-[#1B6E99]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Categories Horizontal Tabs */}
            <div className="hw-section-title-row">
              <h3 className="hw-section-title">Category</h3>
              <button
                onClick={() => setSelectedCategory("All")}
                className="hw-see-all-link border-none bg-transparent cursor-pointer"
              >
                See all
              </button>
            </div>
            <div className="hw-categories-scroll">
              {[
                { label: "All Workouts", icon: "⚡", cat: "All" },
                { label: "Full Body", icon: "🏋️", cat: "Full Body" },
                { label: "HIIT Blast", icon: "🔥", cat: "HIIT" },
                { label: "Upper Body", icon: "💪", cat: "Upper Body" },
                { label: "Core & Abs", icon: "🎯", cat: "Core" },
                { label: "Mobility", icon: "🧘", cat: "Mobility" },
              ].map((item) => (
                <button
                  key={item.label}
                  className={`hw-category-chip ${selectedCategory === item.cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(item.cat)}
                >
                  <span className="hw-chip-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Featured Workout Hero Card */}
            <div
              className="hw-featured-hero-card"
              onClick={() => openRoutine(filteredRoutines[0] || ALL_ROUTINES[0])}
            >
              <div className="hw-hero-bg-overlay"></div>
              <div className="hw-hero-badge-pill">🔥 FEATURED TODAY</div>
              <div className="hw-hero-content">
                <h3 className="hw-hero-title">
                  {(filteredRoutines[0] || ALL_ROUTINES[0]).title}
                </h3>
                <p className="hw-hero-sub">
                  {(filteredRoutines[0] || ALL_ROUTINES[0]).subtitle}
                </p>
                <div className="hw-hero-meta">
                  <div className="hw-meta-tag">
                    <Clock className="w-3.5 h-3.5" />
                    {(filteredRoutines[0] || ALL_ROUTINES[0]).durationMin} Mins
                  </div>
                  <div className="hw-meta-tag">
                    <Flame className="w-3.5 h-3.5 text-[#FF7043]" />
                    {(filteredRoutines[0] || ALL_ROUTINES[0]).estimatedCalories || 380} Kcal
                  </div>
                  <div className="hw-meta-tag hw-level-tag">
                    {(filteredRoutines[0] || ALL_ROUTINES[0]).level}
                  </div>
                </div>
                <div className="hw-hero-footer">
                  <div className="hw-trainer-info">
                    <img
                      src={(filteredRoutines[0] || ALL_ROUTINES[0]).trainer.avatar}
                      alt={(filteredRoutines[0] || ALL_ROUTINES[0]).trainer.name}
                      className="hw-trainer-avatar"
                    />
                    <span>{(filteredRoutines[0] || ALL_ROUTINES[0]).trainer.name}</span>
                  </div>
                  <button
                    className="hw-btn-primary-blue cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      startLiveWorkout(filteredRoutines[0] || ALL_ROUTINES[0]);
                    }}
                  >
                    <span>Start Workout</span>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Popular Workouts Section */}
            <div className="flex items-center justify-between mt-6 mb-3.5">
              <h3 className="font-headline text-2xl font-black text-[#0B2238] tracking-tight">Popular Workouts</h3>
              <span className="text-sm font-semibold text-[#7A97B0]">{filteredRoutines.length} Available</span>
            </div>

            {/* Top Cards: Horizontal full-width cards */}
            <div className="space-y-3">
              {filteredRoutines.slice(0, 2).map((routine) => (
                <div
                  key={routine.id}
                  className="bg-white border border-[#E2E8F0] rounded-3xl p-3.5 shadow-sm flex items-center gap-3.5 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => openRoutine(routine)}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 bg-[#EAF3F9]">
                    <img
                      src={routine.coverImage}
                      alt={routine.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="font-extrabold text-base sm:text-lg text-[#0B2238] tracking-tight leading-tight truncate">
                      {routine.title}
                    </h4>
                    <p className="text-xs font-semibold text-[#7A97B0] mt-0.5">
                      {routine.levelName || `${routine.level} • Weeks 1-4`}
                    </p>
                    <div className="text-xs font-black uppercase tracking-wider text-[#0B2238] mt-1">
                      {routine.durationMin} MIN
                    </div>
                    <div className="flex items-center gap-3 text-xs font-semibold text-[#7A97B0] mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#7A97B0]" />
                        {routine.durationMin} Mins
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-[#FF7043]" />
                        {routine.estimatedCalories || 220} Kcal
                      </span>
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-3.5 h-3.5 text-[#7A97B0]" />
                        {routine.exercises.length} Exercises
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 2-Column Grid for Remaining Routines */}
            {filteredRoutines.length > 2 && (
              <div className="grid grid-cols-2 gap-3.5 items-start mt-3.5">
                {/* Left Column */}
                <div className="flex flex-col gap-3.5">
                  {filteredRoutines.slice(2).filter((_, i) => i % 2 === 0).map((routine) => (
                    <div
                      key={routine.id}
                      className="bg-white border border-[#E2E8F0] rounded-3xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col group"
                      onClick={() => openRoutine(routine)}
                    >
                      <div className="relative w-full rounded-2xl overflow-hidden bg-[#EAF3F9] aspect-[4/3]">
                        <img
                          src={routine.coverImage}
                          alt={routine.title}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2.5 right-2.5 bg-[#EAF3F9]/90 backdrop-blur-sm text-[#0B2238] text-[10px] font-black uppercase px-2 py-0.5 rounded-lg shadow-sm">
                          {routine.durationMin} MIN
                        </span>
                      </div>
                      <div className="pt-2.5 flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-[#7A97B0]">
                          {routine.levelName || `${routine.level} • Weeks 5-8+`}
                        </span>
                        <h4 className="font-extrabold text-sm text-[#0B2238] leading-tight line-clamp-2">
                          {routine.title}
                        </h4>
                        <div className="flex items-center gap-x-2 gap-y-1 text-[10px] font-semibold text-[#7A97B0] mt-1 flex-wrap">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-[#7A97B0]" />
                            {routine.durationMin} Mins
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Flame className="w-3 h-3 text-[#FF7043]" />
                            {routine.estimatedCalories || 300} Kcal
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Dumbbell className="w-3 h-3 text-[#7A97B0]" />
                            {routine.exercises.length} Exercises
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-3.5">
                  {filteredRoutines.slice(2).filter((_, i) => i % 2 === 1).map((routine, idx) => (
                    <div
                      key={routine.id}
                      className="bg-white border border-[#E2E8F0] rounded-3xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col group"
                      onClick={() => openRoutine(routine)}
                    >
                      <div className={`relative w-full rounded-2xl overflow-hidden bg-[#EAF3F9] ${idx === 0 ? "aspect-[4/3] sm:aspect-[1/1]" : "aspect-[4/3]"}`}>
                        <img
                          src={routine.coverImage}
                          alt={routine.title}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2.5 right-2.5 bg-[#EAF3F9]/90 backdrop-blur-sm text-[#0B2238] text-[10px] font-black uppercase px-2 py-0.5 rounded-lg shadow-sm">
                          {routine.durationMin} MIN
                        </span>
                      </div>
                      <div className="pt-2.5 flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-[#7A97B0]">
                          {routine.levelName || `${routine.level} • Weeks 5-8+`}
                        </span>
                        <h4 className="font-extrabold text-sm text-[#0B2238] leading-tight line-clamp-2">
                          {routine.title}
                        </h4>
                        {routine.subtitle && (
                          <p className="text-[10px] text-[#7A97B0] font-medium truncate">
                            {routine.subtitle}
                          </p>
                        )}
                        <div className="flex items-center gap-x-2 gap-y-1 text-[10px] font-semibold text-[#7A97B0] mt-1 flex-wrap">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-[#7A97B0]" />
                            {routine.durationMin} Mins
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Flame className="w-3 h-3 text-[#FF7043]" />
                            {routine.estimatedCalories || 300} Kcal
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Dumbbell className="w-3 h-3 text-[#7A97B0]" />
                            {routine.exercises.length} Exercises
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ==============================================================
            SCREEN 2: PLAYLIST / WORKOUT ROUTINE DETAILS
            ============================================================== */}
        {currentScreen === "playlist" && (
          <section className="hw-screen">
            {/* Top Navigation / Back bar */}
            <div className="flex items-center justify-between pb-2">
              <button
                onClick={() => setCurrentScreen("home")}
                className="flex items-center gap-1 text-xs font-bold text-[#486581] hover:text-[#0B2238] transition-colors p-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Workouts</span>
              </button>
            </div>

            {/* Title Area */}
            <div className="space-y-1 mb-4">
              <span className="text-xs font-bold text-[#486581] tracking-wide block">
                {selectedRoutine.levelName || `${selectedRoutine.level} • Weeks 1-4`}
              </span>
              <h1 className="font-headline text-2xl sm:text-3xl font-black text-[#0B2238] tracking-tight leading-tight">
                {selectedRoutine.title}
              </h1>
              {selectedRoutine.subtitle && (
                <p className="text-sm font-semibold text-[#486581]">
                  {selectedRoutine.subtitle}
                </p>
              )}
            </div>

            {/* Hero Container with 3 Stats Pill Cards overlaid on the physique visual */}
            <div className="relative w-full rounded-3xl overflow-hidden mb-5 shadow-sm border border-[#D7EBF7] bg-[#EAF3F9]">
              {/* Background Visual Banner */}
              <div className="relative w-full h-44 sm:h-52 overflow-hidden">
                <img
                  src={selectedRoutine.coverImage}
                  alt={selectedRoutine.title}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#EAF3F9]/30 to-[#EAF3F9]" />
              </div>

              {/* 3 Metric Pills on Top */}
              <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
                {/* Pill 1: Duration */}
                <div className="flex-1 bg-white/90 backdrop-blur-md border border-[#D7EBF7] rounded-2xl p-2 sm:p-2.5 flex items-center gap-2 shadow-sm min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EAF3F9] text-[#1B6E99] flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-[#0B2238] leading-tight truncate">
                      {selectedRoutine.durationMin} Min
                    </div>
                    <div className="text-[10px] text-[#7A97B0] font-medium leading-tight truncate">
                      Duration
                    </div>
                  </div>
                </div>

                {/* Pill 2: Circuit */}
                <div className="flex-1 bg-white/90 backdrop-blur-md border border-[#D7EBF7] rounded-2xl p-2 sm:p-2.5 flex items-center gap-2 shadow-sm min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EAF3F9] text-[#1B6E99] flex items-center justify-center shrink-0">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-[#0B2238] leading-tight truncate">
                      3 Rounds
                    </div>
                    <div className="text-[10px] text-[#7A97B0] font-medium leading-tight truncate">
                      Circuit
                    </div>
                  </div>
                </div>

                {/* Pill 3: Focus Area */}
                <div className="flex-1 bg-white/90 backdrop-blur-md border border-[#D7EBF7] rounded-2xl p-2 sm:p-2.5 flex items-center gap-2 shadow-sm min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FFF2E8] text-[#FF7043] flex items-center justify-center shrink-0">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-[#0B2238] leading-tight truncate">
                      {selectedRoutine.focus.split(" ")[0]}
                    </div>
                    <div className="text-[10px] text-[#7A97B0] font-medium leading-tight truncate">
                      Focus Area
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Exercise List Items - Clean Numbered Pill Cards */}
            <div className="space-y-3 mb-6">
              {selectedRoutine.exercises.map((ex, idx) => (
                <div
                  key={ex.id}
                  onClick={() => startLiveWorkout(selectedRoutine, idx)}
                  className="bg-[#EAF3F9] hover:bg-[#DDF0FC] border border-[#BCE1F5] rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm active:scale-[0.99] group"
                >
                  {/* Left: Big Number 01, 02, etc. */}
                  <div className="font-headline font-black text-3xl sm:text-4xl text-[#1B6E99] tracking-tighter w-14 sm:w-16 shrink-0 pr-3 border-r border-[#BCE1F5] flex items-center justify-center">
                    {String(idx + 1).padStart(2, "0")}
                  </div>

                  {/* Middle: Exercise Name + Minimal Target Muscle subtext */}
                  <div className="flex-1 min-w-0 pl-1">
                    <h4 className="font-bold text-sm sm:text-base text-[#0B2238] leading-snug truncate">
                      {ex.name}
                    </h4>
                    <p className="text-xs text-[#486581] font-medium mt-0.5 truncate">
                      {ex.targetMuscles || ex.category}
                    </p>
                  </div>

                  {/* Right: Reps */}
                  <div className="text-xs sm:text-sm font-bold text-[#0B2238] shrink-0 whitespace-nowrap pl-2">
                    {ex.reps}
                  </div>
                </div>
              ))}
            </div>

            {/* Start Full Workout Button */}
            <div className="sticky bottom-20 z-10 pt-2 pb-1">
              <button
                className="hw-btn-start-full"
                onClick={() => startLiveWorkout(selectedRoutine, 0)}
              >
                <span>Begin Complete Workout</span>
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>
          </section>
        )}

        {/* ==============================================================
            SCREEN 3: TRACKING / ACTIVE WORKOUT PLAYER (SUPER CLEAN & FOCUSED)
            ============================================================== */}
        {currentScreen === "tracking" && activeExercise && (
          <section className="hw-screen">
            {/* Top Bar */}
            <div className="hw-tracking-top-bar">
              <button
                className="hw-nav-icon-btn cursor-pointer"
                onClick={() => {
                  setCurrentScreen("playlist");
                }}
              >
                <X className="w-4 h-4 text-[#0B2238]" />
              </button>
              <div className="hw-tracking-header-center">
                <span className="hw-active-badge-pill">● LIVE CIRCUIT</span>
                <h3 className="text-xs font-extrabold text-[#0B2238] truncate max-w-[180px]">
                  {selectedRoutine.title}
                </h3>
              </div>
              <div className="w-8" />
            </div>

            {/* Round & Step Progress */}
            <div className="hw-workout-progress-segment-wrapper">
              <div className="hw-progress-bar-container">
                <div
                  className="hw-progress-bar-fill"
                  style={{
                    width: `${Math.max(
                      (((currentRound - 1) * selectedRoutine.exercises.length + currentExerciseIndex + 1) /
                        (totalRounds * selectedRoutine.exercises.length)) *
                        100,
                      10
                    )}%`,
                  }}
                ></div>
              </div>
              <div className="hw-progress-step-text">
                <span>
                  <b>ROUND {currentRound} OF {totalRounds}</b> • Movement {currentExerciseIndex + 1} of {selectedRoutine.exercises.length}
                </span>
                <span className="truncate max-w-[150px] text-right">
                  {currentExerciseIndex < selectedRoutine.exercises.length - 1
                    ? `Next: ${selectedRoutine.exercises[currentExerciseIndex + 1].name}`
                    : currentRound < totalRounds
                    ? `Next: Round ${currentRound + 1}`
                    : "Next: Complete Circuit!"}
                </span>
              </div>
            </div>

            {/* Main Interactive Animated Exercise Form Visual Card */}
            <div className="hw-active-exercise-canvas-card">
              {/* Pure animated kinematic movement visual with NO clutter text */}
              <ExerciseFormVisual
                exerciseId={activeExercise.id}
                exerciseName={activeExercise.name}
              />

              {/* Clean Exercise Title */}
              <div className="hw-active-exercise-info mt-3 text-center">
                <h2 className="hw-active-title text-xl font-black">{activeExercise.name}</h2>
              </div>

              {/* Target Reps & Round Pills */}
              <div className="w-full bg-[#F4F9FD] border border-[#D7EBF7] rounded-2xl p-3.5 my-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold text-[#7A97B0] uppercase tracking-wider">
                    TARGET REPS
                  </span>
                </div>

                <div className="text-3xl font-black font-mono text-[#0B2238] tracking-tight mb-3 text-center">
                  {activeExercise.reps}
                </div>

                {/* Circuit Rounds Tracker */}
                <div className="flex items-center justify-center gap-2 mb-1">
                  {Array.from({ length: totalRounds }).map((_, idx) => {
                    const roundNum = idx + 1;
                    const isCompleted = completedRounds.includes(roundNum);
                    const isCurrent = currentRound === roundNum && !isCompleted;
                    return (
                      <div
                        key={roundNum}
                        className={`flex-1 py-2 px-1 rounded-xl text-center border font-bold text-xs transition-all ${
                          isCompleted
                            ? "bg-[#059669] text-white border-[#059669]"
                            : isCurrent
                            ? "bg-[#87CEEB] text-[#0A2239] border-[#479DC7] shadow-sm shadow-[#87CEEB]"
                            : "bg-white text-[#7A97B0] border-[#D7EBF7]"
                        }`}
                      >
                        {isCompleted ? "✓ Round " + roundNum : "Round " + roundNum}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Single Primary Action Button */}
              <div className="w-full mt-3">
                <button
                  onClick={completeCurrentExerciseInCircuit}
                  className="w-full py-4 rounded-full bg-[#87CEEB] hover:bg-[#72C2E7] active:scale-[0.98] text-[#0A2239] font-headline text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#87CEEB]/35 transition-all cursor-pointer"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>
                    Complete {activeExercise.reps} (Round {currentRound}) → Rest ({activeExercise.restSeconds}s)
                  </span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ==============================================================
            SCREEN 4: PROGRESS & ANALYTICS DASHBOARD
            ============================================================== */}
        {currentScreen === "progress" && (
          <section className="hw-screen">
            <div className="hw-screen-header">
              <div>
                <span className="text-[10px] font-extrabold text-[#1B6E99] tracking-wider uppercase">
                  PERFORMANCE
                </span>
                <h2 className="hw-screen-title">Workout Activity</h2>
              </div>
              <div className="flex items-center gap-1 bg-[#EAF3F9] p-1 rounded-full border border-[#D7EBF7]">
                {(["Week", "Month", "Year"] as const).map((p) => (
                  <button
                    key={p}
                    className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                      activeAnalyticsPeriod === p
                        ? "bg-white text-[#0B2238] shadow-sm"
                        : "text-[#7A97B0] hover:text-[#0B2238]"
                    }`}
                    onClick={() => setActiveAnalyticsPeriod(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Overview Metric Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white border border-[#D7EBF7] rounded-2xl p-3.5 shadow-sm">
                <span className="text-[10px] font-bold text-[#7A97B0] uppercase">Sessions Done</span>
                <div className="text-2xl font-black text-[#0B2238] mt-1 font-mono">
                  {userProfile.workouts_completed || 8} <small className="text-xs font-bold text-[#1B6E99]">Workouts</small>
                </div>
              </div>
              <div className="bg-white border border-[#D7EBF7] rounded-2xl p-3.5 shadow-sm">
                <span className="text-[10px] font-bold text-[#7A97B0] uppercase">Time Trained</span>
                <div className="text-2xl font-black text-[#0B2238] mt-1 font-mono">
                  {userProfile.total_workout_minutes || 215} <small className="text-xs font-bold text-[#1B6E99]">Mins</small>
                </div>
              </div>
            </div>

            {/* Weekly Consistency Bars */}
            <div className="bg-white border border-[#D7EBF7] rounded-2xl p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-extrabold text-sm text-[#0B2238]">Weekly Workout Adherence</h4>
                <span className="text-xs font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
                  85% on Track
                </span>
              </div>
              <div className="flex items-end justify-between gap-2 h-32 pt-4 px-2">
                {[
                  { day: "Mon", height: "80%", done: true },
                  { day: "Tue", height: "40%", done: false },
                  { day: "Wed", height: "90%", done: true },
                  { day: "Thu", height: "0%", done: false },
                  { day: "Fri", height: "100%", done: true },
                  { day: "Sat", height: "70%", done: true },
                  { day: "Sun", height: "0%", done: false },
                ].map((bar, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="w-full bg-[#EAF3F9] rounded-t-lg relative overflow-hidden flex items-end h-full">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          bar.done ? "bg-[#87CEEB]" : "bg-[#D7EBF7]"
                        }`}
                        style={{ height: bar.height }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-[#7A97B0]">{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>

          </section>
        )}

        {/* ==============================================================
            SCREEN 5: USER PROFILE (MIRRORED FROM RUNNING SECTION LAYOUT)
            ============================================================== */}
        {currentScreen === "profile" && (
          <section className="hw-screen space-y-5">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-[#D7EBF7] pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#0B2238]" />
                <h3 className="font-headline text-base font-extrabold uppercase tracking-wider text-[#0B2238]">
                  User Profile
                </h3>
              </div>
            </div>

            {/* Current Selected Avatar Preview Header */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-[#D7EBF7] shadow-sm">
              <div className="relative shrink-0 w-16 h-16 rounded-full overflow-hidden bg-[#EAF3F9] border-2 border-[#87CEEB] flex items-center justify-center">
                {userProfile.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-[#0B2238]" />
                )}
              </div>
              <div className="overflow-hidden flex-1">
                <h4 className="font-headline text-lg font-black text-[#0B2238] truncate">
                  {userProfile.full_name || "Loop Athlete"}
                </h4>
                <p className="text-xs text-[#7A97B0] truncate flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3 text-[#1B6E99]" />
                  <span>{userProfile.email || "athlete@loopfitness.io"}</span>
                </p>
                <span className="inline-block mt-1 bg-[#EAF3F9] border border-[#87CEEB] text-[#1B6E99] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  {userProfile.gender || "Male"} • {userProfile.age || 26} yrs
                </span>
              </div>
            </div>

            {/* Avatar Actions */}
            <div className="space-y-2.5">
              <input
                ref={avatarUploadRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileUpload}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker((v) => !v)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                    showAvatarPicker
                      ? "bg-[#87CEEB] text-[#0A2239] border-[#479DC7]"
                      : "bg-white text-[#0B2238] border-[#D7EBF7] hover:bg-[#F4F9FD]"
                  }`}
                >
                  <Images className="w-4 h-4" />
                  <span>{showAvatarPicker ? "Hide Avatars" : "Choose Avatar"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => avatarUploadRef.current?.click()}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border bg-white text-[#0B2238] border-[#D7EBF7] hover:bg-[#F4F9FD] transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Photo</span>
                </button>
              </div>

              {/* 20 Avatar Picker Grid */}
              {showAvatarPicker && (
                <div className="space-y-2 animate-fadeIn bg-white p-3.5 rounded-2xl border border-[#D7EBF7]">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] text-[#7A97B0] uppercase font-black tracking-wider flex items-center gap-1.5">
                      <User className="w-4 h-4 text-[#1B6E99]" />
                      <span>Select Avatar</span>
                    </label>
                    <span className="text-[10px] text-[#7A97B0] font-bold">Nature Avatars</span>
                  </div>

                  <div className="grid grid-cols-5 gap-2.5 max-h-52 overflow-y-auto custom-scrollbar p-1">
                    {DEFAULT_AVATARS.map((avatar) => {
                      const isSelected = userProfile.avatar_url === avatar.url;
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => handleAvatarSelect(avatar.url)}
                          title={avatar.label}
                          className={`relative rounded-full aspect-square overflow-hidden transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "ring-2 ring-[#87CEEB] ring-offset-2 ring-offset-white scale-105 shadow-md"
                              : "hover:scale-105 opacity-80 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={avatar.url}
                            alt={avatar.label}
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Personal Details Section */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center">
                <h4 className="text-[11px] text-[#7A97B0] uppercase font-black tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#1B6E99]" />
                  <span>Personal Details</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingProfile((v) => !v)}
                  className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                    editingProfile
                      ? "bg-[#EAF3F9] text-[#0B2238] border-[#D7EBF7]"
                      : "bg-[#87CEEB] text-[#0A2239] border-[#479DC7] hover:bg-[#72C2E7]"
                  }`}
                >
                  <Pencil className="w-3 h-3" />
                  <span>{editingProfile ? "Cancel" : "Edit Profile"}</span>
                </button>
              </div>

              {!editingProfile ? (
                /* ---- Read-only View (Matching Running App) ---- */
                <div className="space-y-2">
                  {[
                    { icon: <User className="w-3.5 h-3.5 text-[#1B6E99]" />, label: "Full Name", value: userProfile.full_name || "—" },
                    { icon: <Calendar className="w-3.5 h-3.5 text-[#1B6E99]" />, label: "Age", value: `${userProfile.age || 26} yrs` },
                    { icon: <ShieldCheck className="w-3.5 h-3.5 text-[#1B6E99]" />, label: "Gender", value: userProfile.gender || "—" },
                    { icon: <Mail className="w-3.5 h-3.5 text-[#1B6E99]" />, label: "Email", value: userProfile.email || "athlete@loopfitness.io" },
                    { icon: <Flame className="w-3.5 h-3.5 text-[#1B6E99]" />, label: "Weight", value: `${userProfile.weight_kg || 70} kg` },
                    { icon: <Dumbbell className="w-3.5 h-3.5 text-[#1B6E99]" />, label: "Height", value: `${userProfile.height_cm || 175} cm` },
                    { icon: <Award className="w-3.5 h-3.5 text-[#1B6E99]" />, label: "Program Level", value: userProfile.fitness_level },
                    { icon: <RefreshCw className="w-3.5 h-3.5 text-[#1B6E99]" />, label: "Weekly Schedule", value: `${userProfile.target_days_per_week || 4} Days / Week` },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-3 bg-white border border-[#D7EBF7] rounded-xl px-3.5 py-2.5 shadow-sm"
                    >
                      <span className="flex items-center gap-2 text-[10px] uppercase font-black tracking-wider text-[#7A97B0]">
                        {row.icon}
                        {row.label}
                      </span>
                      <span className="text-xs font-bold text-[#0B2238] truncate text-right max-w-[55%]">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                /* ---- Edit Form ---- */
                <div className="space-y-3.5 bg-white p-4 rounded-2xl border border-[#D7EBF7] shadow-sm animate-fadeIn">
                  <div>
                    <label className="block text-[10px] text-[#7A97B0] uppercase font-black mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl px-3 py-2 text-xs font-bold text-[#0B2238]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-[#7A97B0] uppercase font-black mb-1">Age</label>
                      <input
                        type="number"
                        value={formAge}
                        onChange={(e) => setFormAge(e.target.value)}
                        className="w-full bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl px-3 py-2 text-xs font-bold text-[#0B2238]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#7A97B0] uppercase font-black mb-1">Gender</label>
                      <select
                        value={formGender}
                        onChange={(e) => setFormGender(e.target.value)}
                        className="w-full bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl px-3 py-2 text-xs font-bold text-[#0B2238]"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-[#7A97B0] uppercase font-black mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        value={formWeight}
                        onChange={(e) => setFormWeight(e.target.value)}
                        className="w-full bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl px-3 py-2 text-xs font-bold text-[#0B2238]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#7A97B0] uppercase font-black mb-1">Height (cm)</label>
                      <input
                        type="number"
                        value={formHeight}
                        onChange={(e) => setFormHeight(e.target.value)}
                        className="w-full bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl px-3 py-2 text-xs font-bold text-[#0B2238]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#7A97B0] uppercase font-black mb-1">Program Level</label>
                    <select
                      value={formLevel}
                      onChange={(e) => setFormLevel(e.target.value)}
                      className="w-full bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl px-3 py-2 text-xs font-bold text-[#0B2238]"
                    >
                      <option value="Beginner">Beginner (Level 1)</option>
                      <option value="Intermediate">Intermediate (Level 2)</option>
                      <option value="Advanced">Advanced (Level 3)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveProfileChanges}
                    className="w-full py-3 rounded-full bg-[#87CEEB] hover:bg-[#72C2E7] text-[#0A2239] text-xs font-black uppercase tracking-wider transition-all cursor-pointer mt-2"
                  >
                    Save Changes ✓
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ================================================================
          BOTTOM FLOATING DOCK NAVIGATION
          ================================================================ */}
      <nav className="hw-bottom-dock-nav">
        <div className="hw-dock-container">
          {/* Tab 1: Home */}
          <button
            className={`hw-dock-tab ${currentScreen === "home" ? "active" : ""}`}
            onClick={() => {
              setCurrentScreen("home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <div className="hw-dock-icon">
              <Flame className="w-4 h-4" />
            </div>
            <span className="hw-dock-label">Home</span>
          </button>

          {/* Tab 2: Workouts Schedule */}
          <button
            className={`hw-dock-tab ${currentScreen === "playlist" ? "active" : ""}`}
            onClick={() => {
              setCurrentScreen("playlist");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <div className="hw-dock-icon">
              <Play className="w-4 h-4" />
            </div>
            <span className="hw-dock-label">Workouts</span>
          </button>

          {/* Center Action: Start Live Workout */}
          <button
            className="hw-dock-center-action"
            onClick={() => startLiveWorkout()}
            title="Start Workout"
          >
            <div className="hw-center-fab">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </button>

          {/* Tab 4: Progress */}
          <button
            className={`hw-dock-tab ${currentScreen === "progress" ? "active" : ""}`}
            onClick={() => {
              setCurrentScreen("progress");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <div className="hw-dock-icon">
              <Activity className="w-4 h-4" />
            </div>
            <span className="hw-dock-label">Progress</span>
          </button>

          {/* Tab 5: Profile */}
          <button
            className={`hw-dock-tab ${currentScreen === "profile" ? "active" : ""}`}
            onClick={() => {
              setCurrentScreen("profile");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <div className="hw-dock-icon">
              <User className="w-4 h-4" />
            </div>
            <span className="hw-dock-label">Profile</span>
          </button>
        </div>
      </nav>

      {/* ================================================================
          USER ONBOARDING MODAL
          ================================================================ */}
      {showOnboardingModal && (
        <WorkoutOnboardingModal
          initialProfile={userProfile}
          onComplete={(updated) => {
            setUserProfile(updated);
            setShowOnboardingModal(false);
            showToast("Workout profile updated! 🏋️");
          }}
          onSkip={() => setShowOnboardingModal(false)}
        />
      )}

      {/* ================================================================
          FULL-SCREEN IMMERSIVE REST TIMER VIEW (CLEAN & MINIMAL)
          ================================================================ */}
      {showRestModal && (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#07192A] via-[#0B253D] to-[#051423] text-white flex flex-col justify-between p-6 sm:p-8 animate-fadeIn select-none overflow-y-auto">
          {/* Top Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LoopLogo size={24} glow />
              <span className="font-logo text-2xl uppercase tracking-wider text-[#87CEEB]" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>Loop Rest</span>
            </div>
            <button
              onClick={skipRest}
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-[#87CEEB] border border-[#87CEEB]/40 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>Skip Rest</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center: Big Animated Circular Rest Clock */}
          <div className="flex flex-col items-center justify-center my-auto py-6">
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center mb-4">
              <div className="absolute inset-0 rounded-full bg-[#87CEEB]/10 animate-ping opacity-25" />
              <div className="absolute inset-2 rounded-full border-4 border-[#87CEEB]/30" />
              <div
                className="absolute inset-0 rounded-full border-4 border-[#38BDF8] border-t-transparent animate-spin"
                style={{ animationDuration: "8s" }}
              />

              <div className="flex flex-col items-center justify-center z-10">
                <span className="text-6xl sm:text-7xl font-black font-mono text-[#87CEEB] tracking-tight drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">
                  {restSecondsRemaining}
                </span>
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#94A3B8] mt-1">Seconds</span>
              </div>
            </div>

            <p className="text-sm font-bold text-[#E2E8F0] tracking-wide mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
              Breathe deeply & hydrate. Next exercise up!
            </p>

            <button
              onClick={() => addRestTime(15)}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-[#87CEEB]/20 border border-[#87CEEB]/50 text-xs font-bold text-[#87CEEB] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>+15s Rest Time</span>
            </button>
          </div>

          {/* Up Next Preview Card with Kinematic SVG Animation */}
          {nextUpExercise && (
            <div className="w-full max-w-md mx-auto bg-[#0F2942]/90 border border-[#87CEEB]/40 rounded-2xl p-4 shadow-xl mb-4 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#38BDF8]">
                  UP NEXT
                </span>
                <span className="text-xs font-bold text-[#87CEEB] bg-[#87CEEB]/15 px-2.5 py-0.5 rounded-full border border-[#87CEEB]/40">
                  Round {nextStepInfo.round} of {totalRounds}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#081B2C] border border-[#87CEEB]/30 shrink-0 flex items-center justify-center p-1">
                  <ExerciseFormVisual
                    exerciseId={nextUpExercise.id}
                    exerciseName={nextUpExercise.name}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-sm text-white truncate">{nextUpExercise.name}</h4>
                  <p className="text-xs font-black text-[#38BDF8] font-mono mt-0.5">Target: {nextUpExercise.reps}</p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Start Action Button */}
          <div className="w-full max-w-md mx-auto">
            <button
              onClick={skipRest}
              className="w-full py-4 rounded-full bg-[#87CEEB] hover:bg-[#72C2E7] active:scale-[0.98] text-[#081827] font-headline text-base font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(135,206,235,0.4)] transition-all cursor-pointer"
            >
              <span>Start Next Movement Now</span>
              <Play className="w-5 h-5 fill-current" />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          SESSION COMPLETE CELEBRATION MODAL
          ================================================================ */}
      {showCongratsModal && (
        <div className="hw-modal-overlay">
          <div className="hw-modal-card">
            <div className="hw-congrats-trophy">🏆</div>
            <h3 className="hw-modal-title">Workout Completed!</h3>
            <p className="hw-modal-sub">
              Crushed it! You completed all <b>{totalRounds} Rounds</b> for <b>{selectedRoutine.title}</b> with clean form.
            </p>
            <div className="hw-congrats-stats-row">
              <div>
                <span className="hw-c-stat-val">{completedWorkoutStats.setsCount}</span>
                <span className="hw-c-stat-lbl">Sets Hit</span>
              </div>
              <div>
                <span className="hw-c-stat-val">{completedWorkoutStats.time}</span>
                <span className="hw-c-stat-lbl">Duration</span>
              </div>
              <div>
                <span className="hw-c-stat-val">{completedWorkoutStats.score}%</span>
                <span className="hw-c-stat-lbl">Score</span>
              </div>
            </div>
            <button
              className="hw-btn-primary-blue w-full mt-4 py-2.5 cursor-pointer"
              onClick={() => {
                setShowCongratsModal(false);
                setCurrentScreen("progress");
                showToast("Workout saved to your progress! 🔥");
              }}
            >
              <Award className="w-4 h-4" />
              <span>Save & View Progress</span>
            </button>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="hw-toast-container">
          <div className="hw-toast-item">{toastMessage}</div>
        </div>
      )}
    </div>
  );
}
