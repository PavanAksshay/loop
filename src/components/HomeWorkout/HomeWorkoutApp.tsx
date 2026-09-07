import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Play,
  SkipForward,
  SkipBack,
  Bookmark,
  Share2,
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
  Edit3,
  Dumbbell,
  Check,
  Music,
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
import WorkoutOnboardingModal from "./WorkoutOnboardingModal";
import ExerciseFormVisual from "./ExerciseFormVisual";
import { workoutAudio } from "../../lib/workoutAudio";
import "../../styles/homeWorkout.css";

export default function HomeWorkoutApp() {
  const navigate = useNavigate();

  // User Profile & Onboarding State
  const [userProfile, setUserProfile] = useState<WorkoutUserProfile>(getStoredWorkoutProfile);
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);

  // Active Screen: 'home' | 'playlist' | 'tracking' | 'progress' | 'profile'
  const [currentScreen, setCurrentScreen] = useState<"home" | "playlist" | "tracking" | "progress" | "profile">("home");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<"All" | "Beginner" | "Intermediate" | "Advanced">("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [bookmarkedRoutineIds, setBookmarkedRoutineIds] = useState<string[]>(["l1-upper", "l2-push"]);

  // Selected Routine & Active Workout Player State (Rep & Set based, NO per-exercise countdown timer)
  const [selectedRoutine, setSelectedRoutine] = useState<WorkoutRoutine>(ALL_ROUTINES[0]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(0);
  const [currentSetIndex, setCurrentSetIndex] = useState<number>(1);
  const [completedSetsInExercise, setCompletedSetsInExercise] = useState<number[]>([]);

  // Music & Rest Timer State
  const [musicPlaying, setMusicPlaying] = useState<boolean>(false);
  const [showRestModal, setShowRestModal] = useState<boolean>(false);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number>(60);
  const [showCongratsModal, setShowCongratsModal] = useState<boolean>(false);
  const [completedWorkoutStats, setCompletedWorkoutStats] = useState<{ time: string; setsCount: number; score: number }>({
    time: "00:00",
    setsCount: 0,
    score: 100,
  });
  const [activeAnalyticsPeriod, setActiveAnalyticsPeriod] = useState<"Day" | "Week" | "Month" | "Year">("Week");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hydrate Profile from DB on mount
  useEffect(() => {
    syncWorkoutProfileFromDB().then((synced) => {
      setUserProfile(synced);
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

  // Toggle Energetic Background Workout Music
  const toggleMusic = () => {
    workoutAudio.unlockContext();
    const isNowPlaying = workoutAudio.toggleMusic();
    setMusicPlaying(isNowPlaying);
    showToast(isNowPlaying ? "⚡ Energetic Beat: ON 🎵" : "Workout Beat: OFF");
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
          if (prev <= 4) workoutAudio.playCueBeep(440, 0.1);
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (restInterval) clearInterval(restInterval);
    };
  }, [showRestModal]);

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
    setCurrentExerciseIndex(startIdx);
    setCurrentSetIndex(1);
    setCompletedSetsInExercise([]);
    setCurrentScreen("tracking");

    // Unlock audio & start energetic music
    workoutAudio.unlockContext();
    workoutAudio.startMusic();
    setMusicPlaying(true);
    workoutAudio.playCueBeep(520, 0.2);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeExercise: Exercise = selectedRoutine.exercises[currentExerciseIndex] || selectedRoutine.exercises[0];

  // Complete a Set -> Triggers Rest Timer
  const completeCurrentSet = () => {
    const nextCompleted = [...completedSetsInExercise, currentSetIndex];
    setCompletedSetsInExercise(nextCompleted);

    workoutAudio.playCueBeep(700, 0.2);

    if (currentSetIndex < activeExercise.sets) {
      setCurrentSetIndex((prev) => prev + 1);
      triggerRest(activeExercise.restSeconds || 60);
    } else {
      if (currentExerciseIndex < selectedRoutine.exercises.length - 1) {
        triggerRest(activeExercise.restSeconds || 60);
      } else {
        finishWorkout();
      }
    }
  };

  const nextExercise = () => {
    if (currentExerciseIndex < selectedRoutine.exercises.length - 1) {
      const nextIdx = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIdx);
      setCurrentSetIndex(1);
      setCompletedSetsInExercise([]);
      workoutAudio.playCueBeep(580, 0.15);
    } else {
      finishWorkout();
    }
  };

  const prevExercise = () => {
    if (currentExerciseIndex > 0) {
      const prevIdx = currentExerciseIndex - 1;
      setCurrentExerciseIndex(prevIdx);
      setCurrentSetIndex(1);
      setCompletedSetsInExercise([]);
      workoutAudio.playCueBeep(480, 0.15);
    }
  };

  const triggerRest = (secs = 60) => {
    setRestSecondsRemaining(secs);
    setShowRestModal(true);
  };

  const skipRest = () => {
    setShowRestModal(false);
    workoutAudio.unlockContext();
    workoutAudio.startMusic();
    setMusicPlaying(true);
    workoutAudio.playCueBeep(520, 0.2);

    if (completedSetsInExercise.length >= activeExercise.sets) {
      if (currentExerciseIndex < selectedRoutine.exercises.length - 1) {
        setCurrentExerciseIndex((prev) => prev + 1);
        setCurrentSetIndex(1);
        setCompletedSetsInExercise([]);
      } else {
        finishWorkout();
      }
    }
  };

  const addRestTime = (add = 15) => {
    setRestSecondsRemaining((prev) => prev + add);
    workoutAudio.playCueBeep(550, 0.1);
  };

  const finishWorkout = () => {
    workoutAudio.stopMusic();
    setMusicPlaying(false);
    setShowRestModal(false);
    workoutAudio.playCelebrationChime();

    const totalMin = Math.ceil(selectedRoutine.durationMin);
    const totalSets = selectedRoutine.exercises.reduce((acc, ex) => acc + ex.sets, 0);

    setCompletedWorkoutStats({
      time: `${totalMin}:00`,
      setsCount: totalSets,
      score: 100,
    });

    const updatedProfile: WorkoutUserProfile = {
      ...userProfile,
      total_completed_workouts: (userProfile.total_completed_workouts || 0) + 1,
    };
    saveWorkoutProfile(updatedProfile);
    setUserProfile(updatedProfile);

    setShowCongratsModal(true);
  };

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedRoutineIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    workoutAudio.playCueBeep(720, 0.1);
    showToast(bookmarkedRoutineIds.includes(id) ? "Removed from bookmarks" : "Added to bookmarked routines ⭐");
  };

  // Filtered Routines
  const filteredRoutines = ALL_ROUTINES.filter((r) => {
    const matchesLevel = selectedLevel === "All" || r.level === selectedLevel;
    const matchesCategory =
      selectedCategory === "All" ||
      r.focus.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      r.title.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.focus.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesCategory && matchesSearch;
  });

  return (
    <div className="hw-theme-root">
      {/* ================================================================
          TOP HEADER — CLEAN LOOP BRANDING (NO VIEW SWITCHERS)
          ================================================================ */}
      <header className="hw-showcase-nav">
        <div className="hw-brand-group">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#D7EBF7] text-xs font-bold text-[#0B2238] hover:bg-[#EAF3F9] transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Tracks</span>
          </button>
          <div className="flex items-center gap-2">
            <LoopLogo size={24} glow />
            <span className="font-logo text-2xl uppercase tracking-wider text-[#0B2238]">Loop</span>
          </div>
        </div>

        {/* Top Right Controls: Music Toggle & Profile */}
        <div className="flex items-center gap-2">
          <button
            className={`hw-icon-action-btn ${musicPlaying ? "active shadow-md shadow-[#87CEEB]" : ""}`}
            onClick={toggleMusic}
            title={musicPlaying ? "Pause Workout Beat" : "Play Energetic Workout Beat"}
          >
            <Music className="w-4 h-4" />
          </button>

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
          MAIN MOBILE-FIRST CONTENT CONTAINER (NO SIMULATOR FRAMES)
          ================================================================ */}
      <main className="hw-app-container">
        {/* ==============================================================
            SCREEN 1: HOME & DISCOVERY
            ============================================================== */}
        {currentScreen === "home" && (
          <section className="hw-screen">
            {/* User Greeting & Streak Header */}
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
                  className="hw-icon-round-btn"
                  onClick={() => showToast(`🔔 Today's plan: ${userProfile.fitness_level} Split`)}
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
                placeholder="Search exercises, splits, muscles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[#7A97B0] hover:text-[#0B2238] shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => {
                  const levels: ("All" | "Beginner" | "Intermediate" | "Advanced")[] = [
                    "All",
                    "Beginner",
                    "Intermediate",
                    "Advanced",
                  ];
                  const next = levels[(levels.indexOf(selectedLevel) + 1) % levels.length];
                  setSelectedLevel(next);
                  showToast(`Level: ${next}`);
                }}
                className="text-[#486581] hover:text-[#1B6E99] shrink-0"
                title="Cycle Level Filter"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Daily Routine Summary Card */}
            <div className="hw-activity-summary-card">
              <div>
                <div className="hw-card-tag">TODAY'S TARGET</div>
                <h3 className="hw-summary-title">Strength & Movement</h3>
                <p className="hw-summary-sub">Follow proper movement cues and tempo.</p>
                <div className="hw-metrics-row">
                  <div className="hw-metric-item">
                    <span className="hw-metric-val">{userProfile.target_days_per_week || 4} <small>Days/Wk</small></span>
                    <span className="hw-metric-label">Schedule</span>
                  </div>
                  <div className="hw-metric-divider"></div>
                  <div className="hw-metric-item">
                    <span className="hw-metric-val">{userProfile.fitness_level}</span>
                    <span className="hw-metric-label">Level</span>
                  </div>
                </div>
              </div>
              <div>
                <button
                  onClick={toggleMusic}
                  className={`p-3 rounded-2xl flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                    musicPlaying
                      ? "bg-[#87CEEB] text-[#0A2239] border-[#479DC7] shadow-lg shadow-[#87CEEB]/40 animate-pulse"
                      : "bg-white text-[#486581] border-[#D7EBF7] hover:bg-[#F4F9FD]"
                  }`}
                  title="Toggle Workout Beat"
                >
                  <Music className="w-5 h-5" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">
                    {musicPlaying ? "Beat ON" : "Music"}
                  </span>
                </button>
              </div>
            </div>

            {/* Program Level Pills */}
            <div className="hw-section-title-row">
              <h3 className="hw-section-title">Program Levels</h3>
              <button
                onClick={() => setSelectedLevel("All")}
                className="hw-see-all-link border-none bg-transparent"
              >
                Reset
              </button>
            </div>
            <div className="hw-categories-scroll">
              {(["All", "Beginner", "Intermediate", "Advanced"] as const).map((lvl) => (
                <button
                  key={lvl}
                  className={`hw-category-chip ${selectedLevel === lvl ? "active" : ""}`}
                  onClick={() => setSelectedLevel(lvl)}
                >
                  <span>
                    {lvl === "Beginner"
                      ? "🌱 Level 1 (Weeks 1-4)"
                      : lvl === "Intermediate"
                      ? "⚡ Level 2 (Weeks 5-8+)"
                      : lvl === "Advanced"
                      ? "🔥 Level 3 (Weeks 9+)"
                      : "✨ All Levels"}
                  </span>
                </button>
              ))}
            </div>

            {/* Muscle Category Scroll */}
            <div className="hw-categories-scroll">
              {["All", "Upper Body", "Lower Body", "Push", "Pull", "Legs", "Chest", "Back", "Shoulders", "Arms", "Core"].map(
                (cat) => (
                  <button
                    key={cat}
                    className={`hw-category-chip ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <span>{cat}</span>
                  </button>
                )
              )}
            </div>

            {/* Featured Hero Card */}
            <div
              className="hw-featured-hero-card"
              style={{ backgroundImage: `url(${ALL_ROUTINES[0].coverImage})` }}
              onClick={() => openRoutine(ALL_ROUTINES[0])}
            >
              <div className="hw-hero-bg-overlay"></div>
              <div className="hw-hero-badge-pill">🔥 FEATURED PROGRAM</div>
              <div className="hw-hero-content">
                <h3 className="hw-hero-title">{ALL_ROUTINES[0].title}</h3>
                <p className="hw-hero-sub">{ALL_ROUTINES[0].description}</p>
                <div className="hw-hero-meta">
                  <div className="hw-meta-tag">
                    <Clock className="w-3 h-3" />
                    <span>{ALL_ROUTINES[0].durationMin} Mins</span>
                  </div>
                  <div className="hw-meta-tag hw-level-tag">{ALL_ROUTINES[0].level}</div>
                </div>
                <div className="hw-hero-footer">
                  <div className="hw-trainer-info">
                    <img
                      src={ALL_ROUTINES[0].trainer.avatar}
                      alt={ALL_ROUTINES[0].trainer.name}
                      className="hw-trainer-avatar"
                    />
                    <span>{ALL_ROUTINES[0].trainer.name}</span>
                  </div>
                  <button
                    className="hw-btn-primary-blue"
                    onClick={(e) => {
                      e.stopPropagation();
                      startLiveWorkout(ALL_ROUTINES[0]);
                    }}
                  >
                    <span>Start</span>
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                </div>
              </div>
            </div>

            {/* Workout Routines List */}
            <div className="hw-section-title-row">
              <h3 className="hw-section-title">Home Workout Splits</h3>
              <span className="hw-step-count-text">{filteredRoutines.length} Routines</span>
            </div>

            <div className="hw-workout-cards-list">
              {filteredRoutines.map((routine) => {
                const isBookmarked = bookmarkedRoutineIds.includes(routine.id);
                return (
                  <div
                    key={routine.id}
                    className="hw-workout-card"
                    onClick={() => openRoutine(routine)}
                  >
                    <div className="hw-workout-card-thumb">
                      <img src={routine.coverImage} alt={routine.title} />
                      <span className="hw-card-duration-badge">{routine.durationMin}m</span>
                      <button
                        className={`hw-bookmark-btn ${isBookmarked ? "active" : ""}`}
                        onClick={(e) => toggleBookmark(routine.id, e)}
                      >
                        <Bookmark className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                    <div className="hw-workout-card-body">
                      <div
                        className={`hw-card-level-badge ${
                          routine.level === "Beginner"
                            ? "hw-level-beginner"
                            : routine.level === "Intermediate"
                            ? "hw-level-intermediate"
                            : "hw-level-advanced"
                        }`}
                      >
                        {routine.levelName} • {routine.scheduleDay}
                      </div>
                      <h4 className="hw-card-workout-title">{routine.title}</h4>
                      <div className="hw-card-workout-meta">
                        <span>
                          <Clock className="w-2.5 h-2.5" /> {routine.durationMin} Min
                        </span>
                        <span>
                          <Zap className="w-2.5 h-2.5 text-[#1B6E99]" /> {routine.exercises.length} Exercises
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ==============================================================
            SCREEN 2: PLAYLIST / ROUTINE DETAIL SCHEDULE
            ============================================================== */}
        {currentScreen === "playlist" && (
          <section className="hw-screen">
            <div className="hw-playlist-header">
              <img
                src={selectedRoutine.coverImage}
                alt={selectedRoutine.title}
                className="hw-playlist-cover-img"
              />
              <div className="hw-playlist-nav-bar">
                <button
                  className="hw-nav-icon-btn"
                  onClick={() => setCurrentScreen("home")}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="hw-header-right-btns">
                  <button
                    className="hw-nav-icon-btn"
                    onClick={(e) => toggleBookmark(selectedRoutine.id, e)}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${
                        bookmarkedRoutineIds.includes(selectedRoutine.id)
                          ? "text-[#87CEEB] fill-current"
                          : ""
                      }`}
                    />
                  </button>
                  <button
                    className="hw-nav-icon-btn"
                    onClick={() => showToast("Share link copied to clipboard!")}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="hw-playlist-hero-info">
                <div className="hw-level-pill-blue">
                  {selectedRoutine.level.toUpperCase()} • {selectedRoutine.scheduleDay}
                </div>
                <h2 className="hw-playlist-title">{selectedRoutine.title}</h2>
                <p className="hw-playlist-desc">{selectedRoutine.description}</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="hw-playlist-stats-grid">
              <div className="hw-stat-pill">
                <span className="hw-stat-icon-blue">
                  <Clock className="w-3.5 h-3.5" />
                </span>
                <div>
                  <div className="hw-stat-value">{selectedRoutine.durationMin} Min</div>
                  <div className="hw-stat-caption">Duration</div>
                </div>
              </div>
              <div className="hw-stat-pill">
                <span className="hw-stat-icon-blue">
                  <Zap className="w-3.5 h-3.5" />
                </span>
                <div>
                  <div className="hw-stat-value">{selectedRoutine.exercises.length} Steps</div>
                  <div className="hw-stat-caption">Exercises</div>
                </div>
              </div>
              <div className="hw-stat-pill">
                <span className="hw-stat-icon-blue">
                  <Flame className="w-3.5 h-3.5 text-[#FF7043]" />
                </span>
                <div>
                  <div className="hw-stat-value">{selectedRoutine.focus.split(" ")[0]}</div>
                  <div className="hw-stat-caption">Focus Area</div>
                </div>
              </div>
            </div>

            {/* Routine Schedule */}
            <div className="mb-4">
              <div className="hw-section-title-row">
                <h3 className="hw-section-title">Routine Schedule</h3>
                <span className="hw-step-count-text">
                  {selectedRoutine.exercises.length} Exercises (Target Flow)
                </span>
              </div>

              <div className="hw-exercise-list-items">
                {selectedRoutine.exercises.map((ex, idx) => (
                  <div
                    key={ex.id}
                    className={`hw-exercise-item ${idx === currentExerciseIndex ? "active" : ""}`}
                    onClick={() => startLiveWorkout(selectedRoutine, idx)}
                  >
                    <div className="hw-exercise-num">
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="hw-exercise-thumb">
                      <img src={ex.image} alt={ex.name} />
                      <span className="hw-play-indicator">▶</span>
                    </div>
                    <div className="hw-exercise-detail">
                      <h4 className="hw-exercise-name">{ex.name}</h4>
                      <span className="hw-exercise-meta-text">
                        {ex.sets} Sets • {ex.reps} • {ex.restSeconds}s Rest
                      </span>
                      <div className="hw-exercise-tempo-note">
                        📝 {ex.tempoNotes}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticky Start Button */}
            <div className="pt-2">
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
            SCREEN 3: TRACKING / ACTIVE WORKOUT PLAYER (Set & Rep Based + Music)
            ============================================================== */}
        {currentScreen === "tracking" && activeExercise && (
          <section className="hw-screen">
            {/* Top Bar */}
            <div className="hw-tracking-top-bar">
              <button
                className="hw-nav-icon-btn"
                onClick={() => {
                  workoutAudio.stopMusic();
                  setMusicPlaying(false);
                  setCurrentScreen("playlist");
                }}
              >
                <X className="w-4 h-4 text-[#0B2238]" />
              </button>
              <div className="hw-tracking-header-center">
                <span className="hw-active-badge-pill">● LIVE WORKOUT</span>
                <h3 className="text-xs font-extrabold text-[#0B2238] truncate max-w-[180px]">
                  {selectedRoutine.title}
                </h3>
              </div>
              <button
                className={`hw-nav-icon-btn ${musicPlaying ? "bg-[#87CEEB]/30 border-[#87CEEB]" : ""}`}
                onClick={toggleMusic}
                title={musicPlaying ? "Pause Workout Music" : "Play Energetic Workout Music"}
              >
                <Music className="w-3.5 h-3.5 text-[#0B2238]" />
              </button>
            </div>

            {/* Exercise Step Progress */}
            <div className="hw-workout-progress-segment-wrapper">
              <div className="hw-progress-bar-container">
                <div
                  className="hw-progress-bar-fill"
                  style={{
                    width: `${Math.max(
                      ((currentExerciseIndex + 1) / selectedRoutine.exercises.length) * 100,
                      12
                    )}%`,
                  }}
                ></div>
              </div>
              <div className="hw-progress-step-text">
                <span>
                  Exercise <b>{currentExerciseIndex + 1}</b> of {selectedRoutine.exercises.length}
                </span>
                <span className="truncate max-w-[150px] text-right">
                  {currentExerciseIndex < selectedRoutine.exercises.length - 1
                    ? `Next: ${selectedRoutine.exercises[currentExerciseIndex + 1].name}`
                    : "Next: Finish Routine!"}
                </span>
              </div>
            </div>

            {/* Main Interactive Exercise Form Visual Card */}
            <div className="hw-active-exercise-canvas-card">
              {/* AI Instructional Pose Visualizer */}
              <ExerciseFormVisual
                exerciseId={activeExercise.id}
                exerciseName={activeExercise.name}
                targetMuscles={activeExercise.targetMuscles}
                tempoNotes={activeExercise.tempoNotes}
                fallbackImage={activeExercise.image}
              />

              {/* Exercise Name & Tips */}
              <div className="hw-active-exercise-info mt-3">
                <h2 className="hw-active-title">{activeExercise.name}</h2>
                <p className="hw-active-sub">{activeExercise.tips}</p>
                <div className="hw-active-notes">
                  Tempo: {activeExercise.tempoNotes}
                </div>
              </div>

              {/* Set Tracker & Target Reps Card (Replaces the countdown timer!) */}
              <div className="w-full bg-[#F4F9FD] border border-[#D7EBF7] rounded-2xl p-3.5 my-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold text-[#7A97B0] uppercase tracking-wider">
                    TARGET REPS
                  </span>
                  <span className="text-xs font-bold text-[#1B6E99] bg-[#EAF3F9] px-2.5 py-0.5 rounded-full border border-[#87CEEB]">
                    {activeExercise.restSeconds}s Rest / Set
                  </span>
                </div>

                <div className="text-2xl font-black font-mono text-[#0B2238] tracking-tight mb-3">
                  {activeExercise.reps}
                </div>

                {/* Set Pills Tracker */}
                <div className="flex items-center justify-center gap-2 mb-1">
                  {Array.from({ length: activeExercise.sets }).map((_, idx) => {
                    const setNum = idx + 1;
                    const isCompleted = completedSetsInExercise.includes(setNum);
                    const isCurrent = currentSetIndex === setNum && !isCompleted;
                    return (
                      <div
                        key={setNum}
                        className={`flex-1 py-2 px-1 rounded-xl text-center border font-bold text-xs transition-all ${
                          isCompleted
                            ? "bg-[#059669] text-white border-[#059669]"
                            : isCurrent
                            ? "bg-[#87CEEB] text-[#0A2239] border-[#479DC7] shadow-sm shadow-[#87CEEB]"
                            : "bg-white text-[#7A97B0] border-[#D7EBF7]"
                        }`}
                      >
                        {isCompleted ? "✓ Set " + setNum : "Set " + setNum}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Complete Set Action Button */}
              <div className="w-full space-y-2 mt-2">
                <button
                  onClick={completeCurrentSet}
                  className="w-full py-3.5 rounded-full bg-[#87CEEB] hover:bg-[#72C2E7] active:scale-[0.98] text-[#0A2239] font-headline text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#87CEEB]/35 transition-all cursor-pointer"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>
                    {currentSetIndex >= activeExercise.sets
                      ? "Finish All Sets & Rest"
                      : `Complete Set ${currentSetIndex} → Rest (${activeExercise.restSeconds}s)`}
                  </span>
                </button>

                {/* Next / Previous Controls */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={prevExercise}
                    disabled={currentExerciseIndex === 0}
                    className="flex-1 py-2 rounded-xl bg-[#F4F9FD] border border-[#D7EBF7] text-[#0B2238] text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#EAF3F9] disabled:opacity-30 cursor-pointer"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <button
                    onClick={() => triggerRest(activeExercise.restSeconds || 60)}
                    className="py-2 px-3 rounded-xl bg-[#F4F9FD] border border-[#D7EBF7] text-[#1B6E99] text-xs font-bold hover:bg-[#EAF3F9] cursor-pointer"
                  >
                    ⏳ Rest Now
                  </button>

                  <button
                    onClick={nextExercise}
                    className="flex-1 py-2 rounded-xl bg-[#F4F9FD] border border-[#D7EBF7] text-[#0B2238] text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#EAF3F9] cursor-pointer"
                  >
                    <span>Next</span>
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                <h2 className="hw-user-name">Activity & Stats</h2>
              </div>
              <button
                className="hw-icon-round-btn"
                onClick={() => showToast("Weekly activity report generated 📄")}
              >
                <Activity className="w-4 h-4 text-[#1B6E99]" />
              </button>
            </div>

            {/* Time Filter Row */}
            <div className="hw-time-filter-row">
              {(["Day", "Week", "Month", "Year"] as const).map((period) => (
                <button
                  key={period}
                  className={`hw-time-pill ${activeAnalyticsPeriod === period ? "active" : ""}`}
                  onClick={() => {
                    setActiveAnalyticsPeriod(period);
                    showToast(`Filtered by ${period}`);
                  }}
                >
                  {period}
                </button>
              ))}
            </div>

            {/* Weekly Duration Bar Chart */}
            <div className="hw-analytics-card">
              <div className="hw-analytics-card-header">
                <div>
                  <div className="hw-card-tag">WEEKLY WORKOUT VOLUME</div>
                  <h3 className="hw-analytics-headline">
                    5h 42m <small className="hw-trend-up">↑ +18% vs last week</small>
                  </h3>
                </div>
                <div className="hw-stat-badge-blue">This Week</div>
              </div>

              <div className="hw-bar-chart-container">
                {[
                  { day: "Mon", height: "60%", mins: "45 min" },
                  { day: "Tue", height: "85%", mins: "65 min" },
                  { day: "Wed", height: "40%", mins: "30 min" },
                  { day: "Thu", height: "95%", mins: "75 min", active: true },
                  { day: "Fri", height: "50%", mins: "40 min" },
                  { day: "Sat", height: "70%", mins: "55 min" },
                  { day: "Sun", height: "30%", mins: "25 min" },
                ].map((b) => (
                  <div key={b.day} className="hw-bar-col">
                    <div className="hw-bar-track">
                      <div
                        className={`hw-bar-fill ${b.active ? "active-glow" : ""}`}
                        style={{ height: b.height }}
                        title={`${b.day}: ${b.mins}`}
                      >
                        {b.active && (
                          <div className="hw-bar-tooltip">75 min 🔥</div>
                        )}
                      </div>
                    </div>
                    <span className={`hw-bar-day-label ${b.active ? "active-label" : ""}`}>
                      {b.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2x2 Analytics Grid */}
            <div className="hw-analytics-2x2-grid">
              <div className="hw-metric-box">
                <div className="hw-box-icon-head">
                  <span className="text-sm">⚡</span>
                  <span className="text-[10px] font-bold text-[#1B6E99] bg-[#EAF3F9] px-1.5 py-0.5 rounded-full">
                    Completed
                  </span>
                </div>
                <div className="hw-m-number">{userProfile.total_completed_workouts || 14} Sessions</div>
                <div className="hw-m-label">Total Workouts Completed</div>
              </div>

              <div className="hw-metric-box">
                <div className="hw-box-icon-head">
                  <span className="text-sm">🌱</span>
                  <span className="text-[10px] font-bold text-[#1B6E99] bg-[#EAF3F9] px-1.5 py-0.5 rounded-full">
                    Level
                  </span>
                </div>
                <div className="hw-m-number">{userProfile.fitness_level}</div>
                <div className="hw-m-label">Program Mastery Split</div>
              </div>

              <div className="hw-metric-box">
                <div className="hw-box-icon-head">
                  <span className="text-sm">🎯</span>
                  <span className="text-[10px] font-bold text-[#1B6E99] bg-[#EAF3F9] px-1.5 py-0.5 rounded-full">
                    Target
                  </span>
                </div>
                <div className="hw-m-number">{userProfile.target_days_per_week} Days/Wk</div>
                <div className="hw-m-label">Weekly Training Consistency</div>
              </div>

              <div className="hw-metric-box">
                <div className="hw-box-icon-head">
                  <span className="text-sm">⚖️</span>
                  <span className="text-[10px] font-bold text-[#059669] bg-[#EAF3F9] px-1.5 py-0.5 rounded-full">
                    Tracked
                  </span>
                </div>
                <div className="hw-m-number">{userProfile.weight_kg || 68.5} <small>kg</small></div>
                <div className="hw-m-label">Current Body Weight</div>
              </div>
            </div>

            {/* Badges Shelf */}
            <div className="hw-section-title-row">
              <h3 className="hw-section-title">Badges & Streaks</h3>
              <span className="hw-step-count-text">8 Unlocked</span>
            </div>

            <div className="hw-badges-shelf">
              <div className="hw-badge-card unlocked">
                <div className="hw-badge-icon-wrap">🔥</div>
                <div className="hw-badge-name">5 Day Streak</div>
                <span className="hw-badge-level">Unlocked</span>
              </div>
              <div className="hw-badge-card unlocked">
                <div className="hw-badge-icon-wrap">🌱</div>
                <div className="hw-badge-name">Level 1 Base</div>
                <span className="hw-badge-level">Master</span>
              </div>
              <div className="hw-badge-card unlocked">
                <div className="hw-badge-icon-wrap">💪</div>
                <div className="hw-badge-name">Push Master</div>
                <span className="hw-badge-level">Gold</span>
              </div>
              <div className="hw-badge-card">
                <div className="hw-badge-icon-wrap opacity-50">👑</div>
                <div className="hw-badge-name">Level 3 Beast</div>
                <span className="hw-badge-level">Locked</span>
              </div>
            </div>
          </section>
        )}

        {/* ==============================================================
            SCREEN 5: WORKOUT USER PROFILE SECTION
            ============================================================== */}
        {currentScreen === "profile" && (
          <section className="hw-screen space-y-4">
            {/* User Profile Card */}
            <div className="bg-white border border-[#D7EBF7] rounded-3xl p-5 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#87CEEB]/30 to-transparent pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="relative w-20 h-20 rounded-full border-3 border-[#87CEEB] overflow-hidden shadow-lg mb-3">
                  <img src={userProfile.avatar_url} alt={userProfile.full_name} className="w-full h-full object-cover" />
                </div>
                <h2 className="font-headline text-lg font-black text-[#0B2238]">{userProfile.full_name}</h2>
                <p className="text-xs text-[#486581]">@{userProfile.username}</p>

                <div className="inline-flex items-center gap-1.5 mt-2 bg-[#EAF3F9] text-[#1B6E99] border border-[#87CEEB] px-3 py-1 rounded-full text-xs font-bold">
                  <span>Level: {userProfile.fitness_level}</span>
                </div>

                <button
                  onClick={() => setShowOnboardingModal(true)}
                  className="mt-3 text-xs font-bold text-[#1B6E99] hover:text-[#0B2238] flex items-center gap-1 bg-[#F4F9FD] border border-[#D7EBF7] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Workout Profile</span>
                </button>
              </div>
            </div>

            {/* Profile Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-[#D7EBF7] rounded-2xl p-3.5 shadow-sm">
                <span className="text-[10px] font-bold text-[#7A97B0] uppercase block mb-1">Body Weight</span>
                <span className="font-mono text-base font-extrabold text-[#0B2238]">{userProfile.weight_kg} kg</span>
              </div>

              <div className="bg-white border border-[#D7EBF7] rounded-2xl p-3.5 shadow-sm">
                <span className="text-[10px] font-bold text-[#7A97B0] uppercase block mb-1">Weekly Target</span>
                <span className="font-mono text-base font-extrabold text-[#0B2238]">{userProfile.target_days_per_week} Days/Wk</span>
              </div>

              <div className="bg-white border border-[#D7EBF7] rounded-2xl p-3.5 shadow-sm">
                <span className="text-[10px] font-bold text-[#7A97B0] uppercase block mb-1">Primary Goal</span>
                <span className="text-xs font-extrabold text-[#0B2238] line-clamp-1">{userProfile.primary_goal}</span>
              </div>

              <div className="bg-white border border-[#D7EBF7] rounded-2xl p-3.5 shadow-sm">
                <span className="text-[10px] font-bold text-[#7A97B0] uppercase block mb-1">Total Workouts</span>
                <span className="font-mono text-base font-extrabold text-[#1B6E99]">{userProfile.total_completed_workouts || 14}</span>
              </div>
            </div>

            {/* Equipment */}
            <div className="bg-white border border-[#D7EBF7] rounded-2xl p-4 shadow-sm">
              <h4 className="text-xs font-extrabold text-[#0B2238] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-[#1B6E99]" />
                <span>My Available Gear</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {userProfile.available_equipment?.map((eq, idx) => (
                  <span key={idx} className="text-[11px] bg-[#EAF3F9] border border-[#87CEEB] text-[#1B6E99] px-2.5 py-1 rounded-full font-bold">
                    ✓ {eq}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Actions & Navigation */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => navigate("/running")}
                className="w-full p-3.5 rounded-2xl bg-[#F4F9FD] border border-[#D7EBF7] hover:bg-[#EAF3F9] text-[#0B2238] font-bold text-xs flex items-center justify-between transition-all cursor-pointer"
              >
                <span>Switch to Running Track</span>
                <ChevronLeft className="w-4 h-4 rotate-180 text-[#7A97B0]" />
              </button>

              <button
                onClick={() => navigate("/")}
                className="w-full p-3.5 rounded-2xl bg-[#F4F9FD] border border-[#D7EBF7] hover:bg-[#EAF3F9] text-[#0B2238] font-bold text-xs flex items-center justify-between transition-all cursor-pointer"
              >
                <span>Back to Track Selection</span>
                <ChevronLeft className="w-4 h-4 rotate-180 text-[#7A97B0]" />
              </button>
            </div>
          </section>
        )}
      </main>

      {/* ================================================================
          FIXED FLOATING BOTTOM NAVIGATION DOCK (5 TABS)
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
            className="hw-dock-tab-center-action"
            onClick={() => startLiveWorkout()}
            title="Start Live Workout"
          >
            <div className="hw-center-action-btn">
              <Zap className="w-5 h-5 fill-current text-[#0A2239]" />
            </div>
          </button>

          {/* Tab 3: Progress Analytics */}
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

          {/* Tab 4: Profile */}
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
          WORKOUT ONBOARDING & PROFILE MODAL
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
          INTERACTIVE REST TIMER MODAL
          ================================================================ */}
      {showRestModal && (
        <div className="hw-modal-overlay">
          <div className="hw-modal-card">
            <div className="hw-rest-icon-header">⏳</div>
            <h3 className="hw-modal-title">Catch Your Breath!</h3>
            <p className="hw-modal-sub">
              Rest before starting Set {currentSetIndex} of {activeExercise.name}.
            </p>
            <div className="hw-rest-timer-display">
              00:{String(restSecondsRemaining).padStart(2, "0")}
            </div>
            <div className="hw-modal-actions-row">
              <button className="hw-btn-secondary-dark" onClick={() => addRestTime(15)}>
                +15s Rest
              </button>
              <button className="hw-btn-primary-blue" onClick={skipRest}>
                Start Set {currentSetIndex} →
              </button>
            </div>
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
              Crushed it! You completed all sets for <b>{selectedRoutine.title}</b> with clean form.
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
              className="hw-btn-primary-blue w-full mt-4 py-2.5"
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
