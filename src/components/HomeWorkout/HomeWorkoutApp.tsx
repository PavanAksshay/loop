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
  RotateCcw,
  Pause,
  Shuffle,
  ChevronRight,
  TrendingUp,
  Target,
  Sparkles,
} from "lucide-react";
import LoopLogo from "../LoopLogo";
import {
  ALL_ROUTINES,
  WorkoutRoutine,
  Exercise,
  getNextWorkoutRecommendation,
  ALL_PROGRAM_LEVELS,
  PROGRAM_OVERVIEW,
} from "../../data/homeWorkoutData";
import {
  EXERCISE_LIBRARY,
  getExerciseDef,
  EquipmentType,
} from "../../data/exerciseLibrary";
import {
  scaleWorkoutToDurationMode,
  substituteExerciseForEquipment,
  calculateWeeklyMuscleDistribution,
  WorkoutGoal,
} from "../../data/workoutEngine";
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
  const [selectedGoal, setSelectedGoal] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [bookmarkedRoutineIds, setBookmarkedRoutineIds] = useState<string[]>(["l1-upper", "l2-push"]);

  // Selected Routine & Scaled Settings
  const [selectedRoutine, setSelectedRoutine] = useState<WorkoutRoutine>(ALL_ROUTINES[0]);
  const [durationMode, setDurationMode] = useState<"full" | "20min" | "15min">("full");
  const [selectedVariant, setSelectedVariant] = useState<"A" | "B" | "C">("A");
  const [showSubstituteModal, setShowSubstituteModal] = useState<boolean>(false);

  // Active Workout Player State
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalRounds, setTotalRounds] = useState<number>(3);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(0);
  const [completedRounds, setCompletedRounds] = useState<number[]>([]);

  // Rest Timer State
  const [showRestModal, setShowRestModal] = useState<boolean>(false);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number>(60);
  const [isRestPaused, setIsRestPaused] = useState<boolean>(false);
  const [restReasonBadge, setRestReasonBadge] = useState<string>("Strength Recovery");
  const [nextStepInfo, setNextStepInfo] = useState<{
    exerciseIdx: number;
    round: number;
    isFinish: boolean;
  }>({ exerciseIdx: 0, round: 1, isFinish: false });

  // Completion State
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
    if (showRestModal && !isRestPaused) {
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
  }, [showRestModal, isRestPaused, nextStepInfo]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      workoutAudio.stopMusic();
    };
  }, []);

  // Compute active displayed routine based on duration mode (Full / 20-min / 15-min)
  const activeDisplayedRoutine: WorkoutRoutine = React.useMemo(() => {
    if (durationMode === "full") return selectedRoutine;
    const targetMins = durationMode === "20min" ? 20 : 15;
    // Adapt to IntelligentWorkoutRoutine format for scaling
    const routineForScaling: any = {
      ...selectedRoutine,
      blocks: [],
      variants: [],
      volumeSummary: { totalSets: selectedRoutine.exercises.reduce((acc, e) => acc + e.sets, 0), primaryMuscleSets: {} },
    };
    const scaled = scaleWorkoutToDurationMode(routineForScaling, targetMins);
    return {
      ...selectedRoutine,
      durationMin: scaled.durationMin,
      estimatedCalories: scaled.estimatedCalories,
      exercises: scaled.exercises,
    };
  }, [selectedRoutine, durationMode]);

  // Navigation handlers
  const openRoutine = (routine: WorkoutRoutine) => {
    setSelectedRoutine(routine);
    setDurationMode("full");
    setSelectedVariant("A");
    setCurrentScreen("playlist");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startLiveWorkout = (routine?: WorkoutRoutine, startIdx = 0) => {
    const r = routine || activeDisplayedRoutine;
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

  const activeExercise: Exercise =
    activeDisplayedRoutine.exercises[currentExerciseIndex] || activeDisplayedRoutine.exercises[0];

  // Complete Current Exercise Step with Intelligent Superset & Rest Detection
  const completeCurrentExerciseInCircuit = () => {
    workoutAudio.playCueBeep(700, 0.2);

    const isLastExInRound = currentExerciseIndex >= activeDisplayedRoutine.exercises.length - 1;
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

      // Context-aware intelligent rest calculation:
      // If current is superset child A1, transition rest is quick (15s)
      if (activeExercise.supersetPairId === "A1" || activeExercise.supersetPairId === "B1") {
        setRestReasonBadge("Superset Transition");
        triggerRest(15);
      } else if (activeExercise.category.includes("Strength") || activeExercise.category.includes("Heavy")) {
        setRestReasonBadge("Heavy Strength Recovery");
        triggerRest(activeExercise.restSeconds || 90);
      } else if (activeExercise.supersetPairId === "A2" || activeExercise.supersetPairId === "B2") {
        setRestReasonBadge("Antagonist Pair Recovery");
        triggerRest(activeExercise.restSeconds || 60);
      } else if (activeExercise.slotNumber === 10 || activeExercise.intensity === "Maximum Burn") {
        setRestReasonBadge("Metabolic Work:Rest Interval");
        triggerRest(activeExercise.restSeconds || 30);
      } else {
        setRestReasonBadge("Accessory Recovery");
        triggerRest(activeExercise.restSeconds || 45);
      }
    }
  };

  const triggerRest = (secs = 60) => {
    setRestSecondsRemaining(secs);
    setIsRestPaused(false);
    setShowRestModal(true);
  };

  const skipRest = () => {
    setShowRestModal(false);
    setIsRestPaused(false);
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

    const totalSetsCompleted = totalRounds * activeDisplayedRoutine.exercises.length;
    setCompletedWorkoutStats({
      time: `${activeDisplayedRoutine.durationMin}:00`,
      setsCount: totalSetsCompleted,
      score: 100,
    });

    const updatedProfile: WorkoutUserProfile = {
      ...userProfile,
      workouts_completed: (userProfile.workouts_completed || 0) + 1,
      total_workout_minutes: (userProfile.total_workout_minutes || 0) + activeDisplayedRoutine.durationMin,
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
      gender: formGender as any,
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

  // Filter routines by Level, Goal, Category, Search
  const filteredRoutines = ALL_ROUTINES.filter((r) => {
    const matchesLevel = selectedLevel === "All" || r.level === selectedLevel;
    const matchesGoal = selectedGoal === "All" || r.goal === selectedGoal;
    const matchesCat =
      selectedCategory === "All" ||
      r.category === selectedCategory ||
      r.focus.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.exercises.some((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesLevel && matchesGoal && matchesCat && matchesSearch;
  });

  const nextUpExercise =
    activeDisplayedRoutine.exercises[nextStepInfo.exerciseIdx] || activeDisplayedRoutine.exercises[0];

  // Group the 10 exercises into 6 structured training blocks
  const groupedBlocks = React.useMemo(() => {
    const exs = activeDisplayedRoutine.exercises;
    return [
      {
        title: "BLOCK 1 — PRIMARY STRENGTH COMPOUNDS",
        badge: "Heavy Neural Drive",
        exercises: exs.slice(0, 2),
      },
      {
        title: "BLOCK 2 — SUPERSET A1 + A2",
        badge: "Antagonist Pair • 60s Rest",
        exercises: exs.slice(2, 4),
      },
      {
        title: "BLOCK 3 — SUPERSET B1 + B2",
        badge: "Hypertrophy Pair • 45s Rest",
        exercises: exs.slice(4, 6),
      },
      {
        title: "BLOCK 4 — ACCESSORIES & ISOLATION",
        badge: "Muscle Specificity",
        exercises: exs.slice(6, 8),
      },
      {
        title: "BLOCK 5 — CORE & STABILITY",
        badge: "Anti-Extension / Rotation",
        exercises: exs.slice(8, 9),
      },
      {
        title: "BLOCK 6 — METABOLIC FINISHER",
        badge: "High-Output Conditioning",
        exercises: exs.slice(9, 10),
      },
    ].filter((b) => b.exercises.length > 0);
  }, [activeDisplayedRoutine]);

  return (
    <div className="hw-theme-root">
      {/* ================================================================
          APP HEADER
          ================================================================ */}
      <header className="hw-showcase-nav">
        {/* Left: Return to Tracks & Brand Title */}
        <div className="hw-brand-group">
          <button
            onClick={() => navigate("/")}
            title="Return to Track Selector"
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-black/30 bg-[#f8f1e3] text-xs font-black uppercase tracking-wider text-black hover:bg-black hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Tracks</span>
          </button>
          <div 
            onClick={() => setCurrentScreen("home")}
            className="cursor-pointer hover:opacity-85 active:scale-95 transition-all flex items-center gap-2"
          >
            <LoopLogo size={44} glow showText={true} textClassName="text-[22px] md:text-[26px]" />
          </div>

          {/* Desktop Navigation matching Workout app theme */}
          <nav className="hidden md:flex gap-8 ml-6">
            <button
              onClick={() => setCurrentScreen("home")}
              className={`font-headline text-xs uppercase tracking-wider font-extrabold py-1.5 transition-all relative cursor-pointer ${
                currentScreen === "home"
                  ? "text-[#1B6E99] border-b-2 border-[#1B6E99] font-black"
                  : "text-[#7A97B0] hover:text-[#0B2238]"
              }`}
            >
              Discover
            </button>
            <button
              onClick={() => setCurrentScreen("playlist")}
              className={`font-headline text-xs uppercase tracking-wider font-extrabold py-1.5 transition-all relative cursor-pointer ${
                currentScreen === "playlist"
                  ? "text-[#1B6E99] border-b-2 border-[#1B6E99] font-black"
                  : "text-[#7A97B0] hover:text-[#0B2238]"
              }`}
            >
              Workouts
            </button>
            <button
              onClick={() => setCurrentScreen("progress")}
              className={`font-headline text-xs uppercase tracking-wider font-extrabold py-1.5 transition-all relative cursor-pointer ${
                currentScreen === "progress"
                  ? "text-[#1B6E99] border-b-2 border-[#1B6E99] font-black"
                  : "text-[#7A97B0] hover:text-[#0B2238]"
              }`}
            >
              Volume & PRs
            </button>
            <button
              onClick={() => setCurrentScreen("profile")}
              className={`font-headline text-xs uppercase tracking-wider font-extrabold py-1.5 transition-all relative cursor-pointer ${
                currentScreen === "profile"
                  ? "text-[#1B6E99] border-b-2 border-[#1B6E99] font-black"
                  : "text-[#7A97B0] hover:text-[#0B2238]"
              }`}
            >
              Profile
            </button>
          </nav>
        </div>

        {/* Top Right Controls: Profile */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCurrentScreen("profile")}
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-black/20 hover:border-black hover:scale-105 transition-all cursor-pointer shadow-xs"
            title="Your Profile"
          >
            <img src={userProfile.avatar_url} alt={userProfile.full_name} className="w-full h-full object-cover" />
          </button>
        </div>
      </header>

      {/* ================================================================
          MAIN CONTAINER
          ================================================================ */}
      <main className="hw-app-container">
        {/* ==============================================================
            SCREEN 1: HOME DASHBOARD (WORKOUT DISCOVERY & CATALOG)
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
                  onClick={() => showToast("🔔 You have 2 workout reminders scheduled today!")}
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
                placeholder="Search exercises, 10-slot plans, goals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[#7A97B0] hover:text-[#0B2238] shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => showToast("Showing 24 intelligent training plans")}
                className="text-[#486581] hover:text-[#1B6E99] shrink-0 cursor-pointer"
                title="Filter Workouts"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Daily Activity Summary Card */}
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
                    <span className="hw-metric-val">10/10</span>
                    <span className="hw-metric-label">Slots Hit</span>
                  </div>
                </div>
              </div>

              <div className="hw-card-right">
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

            {/* Up Next in Your Schedule Banner */}
            {(() => {
              const nextRec = getNextWorkoutRecommendation(selectedRoutine, userProfile.workouts_completed);
              return (
                <div className="bg-[#EAF3F9] border border-[#BCE1F5] rounded-3xl p-3.5 mb-5 shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#1B6E99]" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#1B6E99]">
                        Up Next in Your Plan
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[#486581] bg-white/80 px-2 py-0.5 rounded-full border border-[#D7EBF7]">
                      {nextRec.scheduleDay}
                    </span>
                  </div>

                  <div
                    className="bg-white border border-[#D7EBF7] rounded-2xl p-3 flex items-center justify-between gap-3 hover:border-[#1B6E99] transition-all cursor-pointer group shadow-2xs"
                    onClick={() => openRoutine(nextRec.nextRoutine)}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#EAF3F9] shrink-0">
                      <img
                        src={nextRec.nextRoutine.coverImage}
                        alt={nextRec.nextRoutine.title}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-sm text-[#0B2238] truncate group-hover:text-[#1B6E99]">
                        {nextRec.nextRoutine.title}
                      </h4>
                      <p className="text-[11px] font-medium text-[#486581] truncate mt-0.5">
                        {nextRec.scheduleTiming}
                      </p>
                      <div className="flex items-center gap-2.5 mt-1 text-[10px] font-semibold text-[#7A97B0]">
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3 text-[#7A97B0]" />
                          {nextRec.nextRoutine.durationMin}m
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-[#FF7043]" />
                          {nextRec.nextRoutine.estimatedCalories || 240} kcal
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Dumbbell className="w-3 h-3 text-[#7A97B0]" />
                          10 Slots
                        </span>
                      </div>
                    </div>
                    <button
                      className="hw-btn-primary-blue !px-3 !py-1.5 text-xs shrink-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        startLiveWorkout(nextRec.nextRoutine);
                      }}
                    >
                      <span>Start</span>
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                    </button>
                  </div>

                  <p className="text-[10px] text-[#486581] font-medium mt-2 px-1 leading-tight">
                    {nextRec.restDayAdvice}
                  </p>
                </div>
              );
            })()}

            {/* Goal Filter Chips */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#0B2238]">Training Goal</span>
                <span className="text-[11px] font-semibold text-[#7A97B0]">{filteredRoutines.length} Plans</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {[
                  "All",
                  "Strength",
                  "Muscle Gain",
                  "General Fitness",
                  "Fat Loss",
                  "Athletic Performance",
                  "Mobility",
                  "Conditioning",
                ].map((goal) => (
                  <button
                    key={goal}
                    onClick={() => setSelectedGoal(goal)}
                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                      selectedGoal === goal
                        ? "bg-[#1B6E99] text-white border-[#1B6E99] shadow-xs"
                        : "bg-white text-[#486581] border-[#D7EBF7] hover:bg-[#EAF3F9]"
                    }`}
                  >
                    {goal}
                  </button>
                ))}
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
                { label: "All Workouts", cat: "All" },
                { label: "Full Body", cat: "Full Body" },
                { label: "Upper Body", cat: "Upper Body" },
                { label: "Lower Body", cat: "Lower Body" },
                { label: "Chest Special", cat: "Chest" },
                { label: "Back & Lats", cat: "Back" },
                { label: "HIIT & Cardio", cat: "HIIT" },
                { label: "Core & Abs", cat: "Core" },
                { label: "Mobility", cat: "Mobility" },
              ].map((item) => (
                <button
                  key={item.label}
                  className={`hw-category-chip ${selectedCategory === item.cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(item.cat)}
                >
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
              <div className="hw-hero-badge-pill">FEATURED 10-SLOT PROGRAM</div>
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
                  <div className="hw-meta-tag bg-white/20">
                    10 Slots
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
              <h3 className="font-headline text-2xl font-black text-[#0B2238] tracking-tight">
                Workout Catalog ({filteredRoutines.length})
              </h3>
              <span className="text-xs font-semibold text-[#7A97B0]">10 Slots Each</span>
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
                      {routine.levelName || `${routine.level} • 10 Slots`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-black uppercase tracking-wider text-[#1B6E99]">
                        {routine.durationMin} MIN
                      </span>
                      <span className="text-[10px] font-bold text-[#FF7043] bg-[#FFF2E8] px-2 py-0.5 rounded-md">
                        {routine.goal || "General"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-semibold text-[#7A97B0] mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-[#FF7043]" />
                        {routine.estimatedCalories || 300} Kcal
                      </span>
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-3.5 h-3.5 text-[#7A97B0]" />
                        10 Exercises
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
                          {routine.levelName || `${routine.level}`}
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
                            <Flame className="w-3 h-3 text-[#FF7043]" />
                            {routine.estimatedCalories || 280} Kcal
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Dumbbell className="w-3 h-3 text-[#7A97B0]" />
                            10 Slots
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-3.5">
                  {filteredRoutines.slice(2).filter((_, i) => i % 2 === 1).map((routine) => (
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
                          {routine.levelName || `${routine.level}`}
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
                            <Flame className="w-3 h-3 text-[#FF7043]" />
                            {routine.estimatedCalories || 300} Kcal
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Dumbbell className="w-3 h-3 text-[#7A97B0]" />
                            10 Slots
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
              <div className="flex items-center gap-2">
                {/* Variant Selector */}
                <div className="flex items-center gap-1 bg-white border border-[#D7EBF7] rounded-full p-0.5 shadow-2xs">
                  {(["A", "B", "C"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        setSelectedVariant(v);
                        showToast(`Activated Movement Variant ${v}`);
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black cursor-pointer transition-all ${
                        selectedVariant === v
                          ? "bg-[#1B6E99] text-white"
                          : "text-[#7A97B0] hover:text-[#0B2238]"
                      }`}
                    >
                      Var {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Title Area */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#486581] tracking-wide block">
                  {selectedRoutine.levelName || `${selectedRoutine.level} • 10 Slots`}
                </span>
                <span className="text-[10px] font-bold text-[#FF7043] bg-[#FFF2E8] px-2 py-0.5 rounded-full border border-[#FFD0B8]">
                  {selectedRoutine.goal || "Hypertrophy"}
                </span>
              </div>
              <h1 className="font-headline text-2xl sm:text-3xl font-black text-[#0B2238] tracking-tight leading-tight">
                {selectedRoutine.title}
              </h1>
              {selectedRoutine.subtitle && (
                <p className="text-sm font-semibold text-[#486581]">
                  {selectedRoutine.subtitle}
                </p>
              )}
            </div>

            {/* Duration Mode Scaler Toggle */}
            <div className="hw-mode-toggle-bar">
              <button
                className={`hw-mode-toggle-btn ${durationMode === "full" ? "active" : ""}`}
                onClick={() => setDurationMode("full")}
              >
                Full 10-Slots ({activeDisplayedRoutine.durationMin}m)
              </button>
              <button
                className={`hw-mode-toggle-btn ${durationMode === "20min" ? "active" : ""}`}
                onClick={() => setDurationMode("20min")}
              >
                Express 20-min
              </button>
              <button
                className={`hw-mode-toggle-btn ${durationMode === "15min" ? "active" : ""}`}
                onClick={() => setDurationMode("15min")}
              >
                Express 15-min
              </button>
            </div>

            {/* Hero Container with 3 Stats Pill Cards */}
            <div className="relative w-full rounded-3xl overflow-hidden mb-5 shadow-sm border border-[#D7EBF7] bg-[#EAF3F9]">
              <div className="relative w-full h-44 sm:h-52 overflow-hidden">
                <img
                  src={selectedRoutine.coverImage}
                  alt={selectedRoutine.title}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#EAF3F9]/30 to-[#EAF3F9]" />
              </div>

              {/* 3 Metric Pills */}
              <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
                <div className="flex-1 bg-white/90 backdrop-blur-md border border-[#D7EBF7] rounded-2xl p-2 sm:p-2.5 flex items-center gap-2 shadow-sm min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EAF3F9] text-[#1B6E99] flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-[#0B2238] leading-tight truncate">
                      {activeDisplayedRoutine.durationMin} Min
                    </div>
                    <div className="text-[10px] text-[#7A97B0] font-medium leading-tight truncate">
                      Dynamic Time
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white/90 backdrop-blur-md border border-[#D7EBF7] rounded-2xl p-2 sm:p-2.5 flex items-center gap-2 shadow-sm min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EAF3F9] text-[#1B6E99] flex items-center justify-center shrink-0">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-[#0B2238] leading-tight truncate">
                      3 Rounds
                    </div>
                    <div className="text-[10px] text-[#7A97B0] font-medium leading-tight truncate">
                      Circuit / Sets
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white/90 backdrop-blur-md border border-[#D7EBF7] rounded-2xl p-2 sm:p-2.5 flex items-center gap-2 shadow-sm min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FFF2E8] text-[#FF7043] flex items-center justify-center shrink-0">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-[#0B2238] leading-tight truncate">
                      {activeDisplayedRoutine.estimatedCalories} Kcal
                    </div>
                    <div className="text-[10px] text-[#7A97B0] font-medium leading-tight truncate">
                      Calculated
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Structured Training Blocks & 10 Exercise Slots */}
            <div className="space-y-4 mb-6">
              {groupedBlocks.map((block, bIdx) => (
                <div key={bIdx} className="hw-block-section">
                  <div className="hw-block-header">
                    <span className="hw-block-title">{block.title}</span>
                    <span className="hw-block-badge">{block.badge}</span>
                  </div>

                  <div className="space-y-2.5">
                    {block.exercises.map((ex) => (
                      <div
                        key={ex.id}
                        onClick={() => startLiveWorkout(activeDisplayedRoutine, (ex.slotNumber || 1) - 1)}
                        className="bg-[#EAF3F9] hover:bg-[#DDF0FC] border border-[#BCE1F5] rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm active:scale-[0.99] group"
                      >
                        {/* Left: Slot Number 01 - 10 */}
                        <div className="font-headline font-black text-2xl sm:text-3xl text-[#1B6E99] tracking-tighter w-12 sm:w-14 shrink-0 pr-2.5 border-r border-[#BCE1F5] flex items-center justify-center">
                          {String(ex.slotNumber || 1).padStart(2, "0")}
                        </div>

                        {/* Middle: Exercise Name & Details */}
                        <div className="flex-1 min-w-0 pl-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-sm sm:text-base text-[#0B2238] leading-snug truncate">
                              {ex.name}
                            </h4>
                            {ex.supersetPairId && (
                              <span className="hw-superset-badge">
                                {ex.supersetPairId}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#486581] font-medium mt-0.5 truncate">
                            {ex.targetMuscles}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="hw-rpe-badge">
                              {ex.rpeTarget || "RPE 7-8"}
                            </span>
                            <span className="text-[10px] font-semibold text-[#7A97B0]">
                              ⏱ {ex.restSeconds}s Rest
                            </span>
                          </div>
                        </div>

                        {/* Right: Sets & Reps */}
                        <div className="text-right shrink-0 whitespace-nowrap pl-2">
                          <div className="text-xs sm:text-sm font-bold text-[#0B2238]">
                            {ex.reps}
                          </div>
                          <div className="text-[10px] font-semibold text-[#7A97B0]">
                            {ex.sets} Sets
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Start Complete Workout Button */}
            <div className="sticky bottom-20 z-10 pt-2 pb-1">
              <button
                className="hw-btn-start-full"
                onClick={() => startLiveWorkout(activeDisplayedRoutine, 0)}
              >
                <span>Begin 10-Slot Workout ({activeDisplayedRoutine.durationMin}m)</span>
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>
          </section>
        )}

        {/* ==============================================================
            SCREEN 3: TRACKING / ACTIVE WORKOUT PLAYER
            ============================================================== */}
        {currentScreen === "tracking" && activeExercise && (
          <section className="hw-screen">
            {/* Top Bar */}
            <div className="hw-tracking-top-bar">
              <button
                className="hw-nav-icon-btn cursor-pointer"
                onClick={() => setCurrentScreen("playlist")}
              >
                <X className="w-4 h-4 text-[#0B2238]" />
              </button>
              <div className="hw-tracking-header-center">
                <span className="hw-active-badge-pill">
                  {activeExercise.supersetPairId ? `● SUPERSET ${activeExercise.supersetPairId}` : "● LIVE SESSION"}
                </span>
                <h3 className="text-xs font-extrabold text-[#0B2238] truncate max-w-[180px]">
                  {activeDisplayedRoutine.title}
                </h3>
              </div>
              <button
                className="hw-nav-icon-btn cursor-pointer text-[#1B6E99]"
                title="Substitute Exercise"
                onClick={() => setShowSubstituteModal(true)}
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>

            {/* Round & Step Progress */}
            <div className="hw-workout-progress-segment-wrapper">
              <div className="hw-progress-bar-container">
                <div
                  className="hw-progress-bar-fill"
                  style={{
                    width: `${Math.max(
                      (((currentRound - 1) * activeDisplayedRoutine.exercises.length + currentExerciseIndex + 1) /
                        (totalRounds * activeDisplayedRoutine.exercises.length)) *
                        100,
                      10
                    )}%`,
                  }}
                ></div>
              </div>
              <div className="hw-progress-step-text">
                <span>
                  <b>ROUND {currentRound} OF {totalRounds}</b> • Slot {currentExerciseIndex + 1} of {activeDisplayedRoutine.exercises.length}
                </span>
                <span className="truncate max-w-[150px] text-right">
                  {currentExerciseIndex < activeDisplayedRoutine.exercises.length - 1
                    ? `Next: ${activeDisplayedRoutine.exercises[currentExerciseIndex + 1].name}`
                    : currentRound < totalRounds
                    ? `Next: Round ${currentRound + 1}`
                    : "Complete Workout!"}
                </span>
              </div>
            </div>

            {/* Animated Kinematic Movement Visual Card */}
            <div className="hw-active-exercise-canvas-card">
              <ExerciseFormVisual
                exerciseId={activeExercise.id}
                exerciseName={activeExercise.name}
              />

              {/* Clean Exercise Title */}
              <div className="hw-active-exercise-info mt-3 text-center">
                <span className="text-[10px] font-black uppercase text-[#1B6E99] tracking-wider">
                  SLOT {String(currentExerciseIndex + 1).padStart(2, "0")} / 10 • {activeExercise.category}
                </span>
                <h2 className="hw-active-title text-xl font-black mt-0.5">{activeExercise.name}</h2>
              </div>

              {/* Target Reps, RPE & Tempo Row */}
              <div className="w-full bg-[#F4F9FD] border border-[#D7EBF7] rounded-2xl p-3.5 my-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-extrabold text-[#7A97B0] uppercase tracking-wider">
                    TARGET REPS
                  </span>
                  <span className="text-[10px] font-extrabold text-[#1B6E99] bg-white px-2 py-0.5 rounded-full border border-[#BCE1F5]">
                    {activeExercise.rpeTarget || "RPE 7-8 (2 RIR)"}
                  </span>
                </div>

                <div className="text-3xl font-black font-mono text-[#0B2238] tracking-tight mb-2 text-center">
                  {activeExercise.reps}
                </div>

                {/* Tempo cue */}
                <div className="text-[11px] text-center font-bold text-[#486581] mb-2">
                  Tempo: <span className="text-[#1B6E99]">{activeExercise.tempoNotes || "2-0-1-0"}</span>
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
                        className={`flex-1 py-1.5 px-1 rounded-xl text-center border font-bold text-xs transition-all ${
                          isCompleted
                            ? "bg-[#059669] text-white border-[#059669]"
                            : isCurrent
                            ? "bg-[#87CEEB] text-[#0A2239] border-[#479DC7] shadow-sm shadow-[#87CEEB]"
                            : "bg-white text-[#7A97B0] border-[#D7EBF7]"
                        }`}
                      >
                        {isCompleted ? "✓ R" + roundNum : "Round " + roundNum}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Tips Box */}
              {activeExercise.tips && (
                <div className="w-full p-2.5 bg-white border border-[#D7EBF7] rounded-xl text-left text-[11px] text-[#486581] font-medium leading-snug mb-2">
                  💡 <span className="font-bold text-[#0B2238]">Coach Tip:</span> {activeExercise.tips}
                </div>
              )}

              {/* Complete Set Action Button */}
              <div className="w-full mt-2">
                <button
                  onClick={completeCurrentExerciseInCircuit}
                  className="w-full py-3.5 rounded-full bg-[#87CEEB] hover:bg-[#72C2E7] active:scale-[0.98] text-[#0A2239] font-headline text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#87CEEB]/35 transition-all cursor-pointer"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>
                    Complete Set (R{currentRound}) → Next
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
          <section className="hw-screen space-y-4">
            <div className="hw-screen-header">
              <div>
                <span className="text-[10px] font-extrabold text-[#1B6E99] tracking-wider uppercase">
                  TRAINING ANALYTICS
                </span>
                <h2 className="hw-screen-title">Weekly Volume & PRs</h2>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-[#D7EBF7] rounded-2xl p-3.5 shadow-sm">
                <span className="text-[10px] font-bold text-[#7A97B0] uppercase">Sessions Done</span>
                <div className="text-2xl font-black text-[#0B2238] mt-1 font-mono">
                  {userProfile.workouts_completed || 8} <small className="text-xs font-bold text-[#1B6E99]">Workouts</small>
                </div>
              </div>
              <div className="bg-white border border-[#D7EBF7] rounded-2xl p-3.5 shadow-sm">
                <span className="text-[10px] font-bold text-[#7A97B0] uppercase">Active Volume</span>
                <div className="text-2xl font-black text-[#0B2238] mt-1 font-mono">
                  {userProfile.total_workout_minutes || 215} <small className="text-xs font-bold text-[#1B6E99]">Mins</small>
                </div>
              </div>
            </div>

            {/* Weekly Muscle Volume Tracker (ACSM Target 10-18 Sets/Muscle/Week) */}
            <div className="bg-white border border-[#D7EBF7] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-extrabold text-sm text-[#0B2238]">Weekly Muscle Volume</h4>
                  <span className="text-[10px] font-semibold text-[#7A97B0]">Target: 10–18 Sets / Muscle</span>
                </div>
                <span className="text-xs font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
                  Optimal Balance
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {[
                  { muscle: "Chest", sets: 14, target: 16, pct: 85 },
                  { muscle: "Back & Lats", sets: 16, target: 16, pct: 100 },
                  { muscle: "Shoulders", sets: 12, target: 14, pct: 80 },
                  { muscle: "Quads & Glutes", sets: 15, target: 16, pct: 92 },
                  { muscle: "Hamstrings", sets: 10, target: 12, pct: 83 },
                  { muscle: "Arms (Bi/Tri)", sets: 12, target: 14, pct: 85 },
                  { muscle: "Core Stability", sets: 12, target: 12, pct: 100 },
                ].map((item) => (
                  <div key={item.muscle}>
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-[#0B2238]">{item.muscle}</span>
                      <span className="text-[#1B6E99]">{item.sets} Sets ({item.pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-[#EAF3F9] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1B6E99] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, item.pct)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Personal Records & Milestones */}
            <div className="bg-white border border-[#D7EBF7] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-3">
                <TrophyIcon className="w-4 h-4 text-[#FF7043]" />
                <h4 className="font-extrabold text-sm text-[#0B2238]">Personal Records (PRs)</h4>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl">
                  <span className="text-[10px] font-bold text-[#7A97B0]">Standard Push-Ups</span>
                  <div className="text-base font-black text-[#0B2238] font-mono mt-0.5">22 Reps</div>
                  <span className="text-[9px] font-bold text-[#059669]">⭐ +4 Reps PR</span>
                </div>
                <div className="p-2.5 bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl">
                  <span className="text-[10px] font-bold text-[#7A97B0]">Forearm Plank</span>
                  <div className="text-base font-black text-[#0B2238] font-mono mt-0.5">90 Secs</div>
                  <span className="text-[9px] font-bold text-[#059669]">⭐ +15s PR</span>
                </div>
                <div className="p-2.5 bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl">
                  <span className="text-[10px] font-bold text-[#7A97B0]">Goblet Squat</span>
                  <div className="text-base font-black text-[#0B2238] font-mono mt-0.5">16 kg × 12</div>
                  <span className="text-[9px] font-bold text-[#059669]">⭐ +2 kg Load PR</span>
                </div>
                <div className="p-2.5 bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl">
                  <span className="text-[10px] font-bold text-[#7A97B0]">Session Volume</span>
                  <div className="text-base font-black text-[#0B2238] font-mono mt-0.5">30 Sets Hit</div>
                  <span className="text-[9px] font-bold text-[#1B6E99]">100% Completion</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==============================================================
            SCREEN 5: USER PROFILE
            ============================================================== */}
        {currentScreen === "profile" && (
          <section className="hw-screen space-y-5">
            <div className="flex justify-between items-center border-b border-[#D7EBF7] pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#0B2238]" />
                <h3 className="font-headline text-base font-extrabold uppercase tracking-wider text-[#0B2238]">
                  User Profile
                </h3>
              </div>
            </div>

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

              {showAvatarPicker && (
                <div className="p-3 bg-white border border-[#D7EBF7] rounded-2xl grid grid-cols-4 gap-2">
                  {DEFAULT_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => handleAvatarSelect(av.url)}
                      className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-transform hover:scale-105 cursor-pointer ${
                        userProfile.avatar_url === av.url ? "border-[#1B6E99] shadow-sm" : "border-transparent"
                      }`}
                    >
                      <img src={av.url} alt="Avatar" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Editing Form */}
            <div className="bg-white p-4 rounded-2xl border border-[#D7EBF7] shadow-sm space-y-3">
              <h4 className="font-headline text-sm font-extrabold uppercase text-[#0B2238]">Personal Stats</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#7A97B0] uppercase block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl px-3 py-2 text-xs font-bold text-[#0B2238]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#7A97B0] uppercase block mb-1">Fitness Level</label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value)}
                    className="w-full bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl px-3 py-2 text-xs font-bold text-[#0B2238]"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#7A97B0] uppercase block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    className="w-full bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl px-3 py-2 text-xs font-bold text-[#0B2238]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#7A97B0] uppercase block mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={formHeight}
                    onChange={(e) => setFormHeight(e.target.value)}
                    className="w-full bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl px-3 py-2 text-xs font-bold text-[#0B2238]"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveProfileChanges}
                className="w-full mt-2 py-2.5 bg-[#1B6E99] hover:bg-[#155A7E] text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Save Profile Changes
              </button>
            </div>
          </section>
        )}
      </main>

      {/* ================================================================
          BOTTOM TAB NAVIGATION (Workout Theme Palette)
          ================================================================ */}
      {currentScreen !== "player" && (
        <nav className="fixed bottom-0 left-0 w-full z-[100] bg-white/95 backdrop-blur-2xl rounded-t-2xl shadow-[0px_-10px_30px_rgba(27,110,153,0.12)] flex justify-around items-center px-4 py-3 md:hidden border-t border-[#D7EBF7]">
          <button
            onClick={() => setCurrentScreen("home")}
            className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              currentScreen === "home"
                ? "text-[#1B6E99] font-black bg-[#EAF3F9] border border-[#BCE1F5]"
                : "text-[#7A97B0] hover:text-[#0B2238]"
            }`}
          >
            <Activity className={`w-5.5 h-5.5 ${currentScreen === "home" ? "text-[#1B6E99]" : "text-[#7A97B0]"}`} />
            <span className="font-headline text-[9px] uppercase tracking-wider font-extrabold mt-1">
              Discover
            </span>
          </button>

          <button
            onClick={() => setCurrentScreen("playlist")}
            className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              currentScreen === "playlist"
                ? "text-[#1B6E99] font-black bg-[#EAF3F9] border border-[#BCE1F5]"
                : "text-[#7A97B0] hover:text-[#0B2238]"
            }`}
          >
            <Dumbbell className={`w-5.5 h-5.5 ${currentScreen === "playlist" ? "text-[#1B6E99]" : "text-[#7A97B0]"}`} />
            <span className="font-headline text-[9px] uppercase tracking-wider font-extrabold mt-1">
              Workouts
            </span>
          </button>

          <button
            onClick={() => setCurrentScreen("progress")}
            className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              currentScreen === "progress"
                ? "text-[#1B6E99] font-black bg-[#EAF3F9] border border-[#BCE1F5]"
                : "text-[#7A97B0] hover:text-[#0B2238]"
            }`}
          >
            <TrendingUp className={`w-5.5 h-5.5 ${currentScreen === "progress" ? "text-[#1B6E99]" : "text-[#7A97B0]"}`} />
            <span className="font-headline text-[9px] uppercase tracking-wider font-extrabold mt-1">
              Volume & PRs
            </span>
          </button>

          <button
            onClick={() => setCurrentScreen("profile")}
            className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              currentScreen === "profile"
                ? "text-[#1B6E99] font-black bg-[#EAF3F9] border border-[#BCE1F5]"
                : "text-[#7A97B0] hover:text-[#0B2238]"
            }`}
          >
            <User className={`w-5.5 h-5.5 ${currentScreen === "profile" ? "text-[#1B6E99]" : "text-[#7A97B0]"}`} />
            <span className="font-headline text-[9px] uppercase tracking-wider font-extrabold mt-1">
              Profile
            </span>
          </button>
        </nav>
      )}

      {/* ================================================================
          INTELLIGENT REST TIMER MODAL
          ================================================================ */}
      {showRestModal && (
        <div className="hw-modal-overlay">
          <div className="hw-modal-card max-w-xs w-full mx-4 text-center">
            <span className="inline-block bg-[#EAF3F9] text-[#1B6E99] text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full border border-[#BCE1F5] mb-2">
              {restReasonBadge}
            </span>

            <div className="text-5xl font-black font-mono text-[#0B2238] tracking-tight my-2">
              {String(Math.floor(restSecondsRemaining / 60)).padStart(2, "0")}:
              {String(restSecondsRemaining % 60).padStart(2, "0")}
            </div>

            {/* Next Up Slot info */}
            <div className="p-2.5 bg-[#F4F9FD] border border-[#D7EBF7] rounded-xl text-xs text-left mb-3">
              <span className="text-[10px] font-bold text-[#7A97B0] uppercase block">Up Next:</span>
              <span className="font-extrabold text-[#0B2238] block truncate">
                Slot {nextStepInfo.exerciseIdx + 1}: {nextUpExercise.name}
              </span>
              <span className="text-[10px] text-[#486581]">{nextUpExercise.reps} • {nextUpExercise.rpeTarget || "RPE 7-8"}</span>
            </div>

            {/* Rest Controls */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => addRestTime(15)}
                className="flex-1 py-1.5 bg-white border border-[#D7EBF7] rounded-lg text-xs font-bold text-[#0B2238] hover:bg-[#EAF3F9] cursor-pointer"
              >
                +15s
              </button>
              <button
                onClick={() => addRestTime(30)}
                className="flex-1 py-1.5 bg-white border border-[#D7EBF7] rounded-lg text-xs font-bold text-[#0B2238] hover:bg-[#EAF3F9] cursor-pointer"
              >
                +30s
              </button>
              <button
                onClick={() => setIsRestPaused((p) => !p)}
                className="p-1.5 bg-white border border-[#D7EBF7] rounded-lg text-xs font-bold text-[#0B2238] hover:bg-[#EAF3F9] cursor-pointer"
                title={isRestPaused ? "Resume" : "Pause"}
              >
                {isRestPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={skipRest}
              className="w-full py-2.5 rounded-full bg-[#87CEEB] hover:bg-[#72C2E7] text-[#0A2239] font-headline text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Ready — Start Next Slot</span>
              <SkipForward className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          EXERCISE SUBSTITUTION MODAL
          ================================================================ */}
      {showSubstituteModal && (
        <div className="hw-modal-overlay">
          <div className="hw-modal-card max-w-sm w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline text-sm font-black text-[#0B2238] uppercase">
                Substitute Exercise
              </h3>
              <button onClick={() => setShowSubstituteModal(false)} className="text-[#7A97B0] hover:text-[#0B2238]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#486581] mb-3">
              Choose an alternative movement matching your available equipment:
            </p>

            <div className="space-y-2">
              {Object.values(EXERCISE_LIBRARY)
                .filter((def) => def.movementPattern === (getExerciseDef(activeExercise.id).movementPattern || "horizontal_push"))
                .slice(0, 5)
                .map((def) => (
                  <div
                    key={def.id}
                    onClick={() => {
                      const updatedExercises = [...activeDisplayedRoutine.exercises];
                      updatedExercises[currentExerciseIndex] = {
                        ...updatedExercises[currentExerciseIndex],
                        id: def.id,
                        name: def.name,
                        category: def.category,
                        targetMuscles: def.targetMuscles,
                        tips: def.tips,
                        image: def.image,
                      };
                      setSelectedRoutine({
                        ...selectedRoutine,
                        exercises: updatedExercises,
                      });
                      setShowSubstituteModal(false);
                      showToast(`Substituted to ${def.name}! ✓`);
                    }}
                    className="p-2.5 bg-white border border-[#D7EBF7] hover:border-[#1B6E99] rounded-xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div>
                      <h5 className="font-bold text-xs text-[#0B2238]">{def.name}</h5>
                      <span className="text-[10px] text-[#7A97B0]">{def.equipment.join(", ")}</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#1B6E99] bg-[#EAF3F9] px-2 py-0.5 rounded-full">
                      Swap
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          SESSION COMPLETE CELEBRATION MODAL
          ================================================================ */}
      {showCongratsModal && (() => {
        const rec = getNextWorkoutRecommendation(selectedRoutine, userProfile.workouts_completed);
        return (
          <div className="hw-modal-overlay">
            <div className="hw-modal-card max-w-sm w-full mx-4 max-h-[92vh] overflow-y-auto">
              <div className="hw-congrats-trophy">🏆</div>
              <h3 className="hw-modal-title">Workout Completed!</h3>
              <p className="hw-modal-sub">
                Crushed it! You completed all <b>{totalRounds} Rounds</b> for <b>{activeDisplayedRoutine.title}</b> with clean form.
              </p>

              {/* Stats Summary */}
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

              {/* WHAT TO DO NEXT CARD */}
              <div className="mt-4 p-3.5 bg-[#EAF3F9] border border-[#BCE1F5] rounded-2xl text-left">
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1B6E99] bg-white px-2 py-0.5 rounded-full border border-[#BCE1F5]">
                    Up Next in Your Schedule
                  </span>
                  <span className="text-[10px] font-bold text-[#486581]">
                    {rec.scheduleDay}
                  </span>
                </div>

                <div
                  className="bg-white border border-[#D7EBF7] rounded-xl p-2.5 flex items-center gap-3 shadow-xs hover:border-[#1B6E99] transition-all cursor-pointer group"
                  onClick={() => {
                    setShowCongratsModal(false);
                    openRoutine(rec.nextRoutine);
                  }}
                >
                  <img
                    src={rec.nextRoutine.coverImage}
                    alt={rec.nextRoutine.title}
                    className="w-14 h-14 rounded-lg object-cover object-top shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-xs text-[#0B2238] truncate group-hover:text-[#1B6E99]">
                      {rec.nextRoutine.title}
                    </div>
                    <div className="text-[10px] text-[#486581] font-medium truncate mt-0.5">
                      {rec.scheduleTiming}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-semibold text-[#7A97B0]">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {rec.nextRoutine.durationMin}m
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5 text-[#FF7043]" />
                        {rec.nextRoutine.estimatedCalories || 240} kcal
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Dumbbell className="w-2.5 h-2.5 text-[#7A97B0]" />
                        10 Slots
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 p-2 bg-white/80 rounded-lg border border-[#D7EBF7] text-[11px] text-[#0B2238] font-medium leading-snug">
                  {rec.restDayAdvice}
                </div>

                <div className="mt-2.5 pt-2 border-t border-[#D7EBF7]/80">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#486581] mb-1">
                    <span>{rec.currentLevelTitle} Progression</span>
                    <span className="text-[#1B6E99]">{rec.sessionsDoneInLevel} / {rec.levelTargetSessions} Sessions</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#D7EBF7] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1B6E99] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (rec.sessionsDoneInLevel / rec.levelTargetSessions) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[9.5px] text-[#7A97B0] font-medium mt-1 leading-tight">
                    {rec.remainingToLevelUp <= 1 ? "Almost ready to level up." : `${rec.remainingToLevelUp} sessions until next level evaluation.`}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-4">
                <button
                  className="hw-btn-primary-blue w-full py-2.5 cursor-pointer text-xs flex items-center justify-center gap-1.5"
                  onClick={() => {
                    setShowCongratsModal(false);
                    openRoutine(rec.nextRoutine);
                  }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Preview Next Workout ({rec.nextRoutine.title.split(" ")[1] || "Routine"})</span>
                </button>
                <button
                  className="w-full py-2 rounded-md border border-[#CBD5E1] bg-white text-xs font-bold text-[#486581] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  onClick={() => {
                    setShowCongratsModal(false);
                    setCurrentScreen("home");
                    showToast("Workout saved to your profile.");
                  }}
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Onboarding Modal */}
      {showOnboardingModal && (
        <WorkoutOnboardingModal
          initialProfile={userProfile}
          onSkip={() => setShowOnboardingModal(false)}
          onComplete={(updated) => {
            setUserProfile(updated);
            setShowOnboardingModal(false);
            showToast("Welcome to Loop Intelligent Training! 🚀");
          }}
        />
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

function TrophyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
