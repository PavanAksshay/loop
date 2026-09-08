import React from "react";

interface ExerciseFormVisualProps {
  exerciseId: string;
  exerciseName: string;
  targetMuscles?: string;
  tempoNotes?: string;
  fallbackImage?: string;
}

/**
 * Animated SVG Kinematic Form Visualizer.
 * Clean, distraction-free 60fps biomechanical movement animation matching each exercise mechanics.
 */
export default function ExerciseFormVisual({
  exerciseId,
  exerciseName,
}: ExerciseFormVisualProps) {
  const nameLower = exerciseName.toLowerCase();

  const getExerciseDiagramType = () => {
    if (nameLower.includes("pike") || nameLower.includes("overhead press")) return "pike";
    if (nameLower.includes("diamond") || nameLower.includes("dip") || nameLower.includes("extension")) return "dips";
    if (nameLower.includes("push-up") || nameLower.includes("press") || nameLower.includes("floor press")) return "push";
    if (nameLower.includes("lunge") || nameLower.includes("step-up") || nameLower.includes("split")) return "lunges";
    if (nameLower.includes("squat") || nameLower.includes("wall sit")) return "squat";
    if (nameLower.includes("pull-up") || nameLower.includes("row") || nameLower.includes("chin-up") || nameLower.includes("pull-apart")) return "pull";
    if (nameLower.includes("bridge") || nameLower.includes("deadlift") || nameLower.includes("nordic") || nameLower.includes("superman") || nameLower.includes("snow angel")) return "posterior";
    if (nameLower.includes("lateral raise") || nameLower.includes("front raise") || nameLower.includes("shoulder")) return "shoulders";
    if (nameLower.includes("curl") || nameLower.includes("arm")) return "arms";
    if (nameLower.includes("plank") || nameLower.includes("dead bug") || nameLower.includes("crunch") || nameLower.includes("twist") || nameLower.includes("climber") || nameLower.includes("leg raise") || nameLower.includes("core")) return "core";
    return "push";
  };

  const type = getExerciseDiagramType();

  return (
    <div className="relative w-full h-[200px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#081B2C] via-[#0E2841] to-[#061422] border border-[#87CEEB]/40 flex items-center justify-center p-3 shadow-xl select-none">
      <style>{`
        @keyframes animPushUp {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(22px); }
        }
        @keyframes animPushArms {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.45); }
        }
        @keyframes animSquat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(26px); }
        }
        @keyframes animPullUp {
          0%, 100% { transform: translateY(24px); }
          50% { transform: translateY(0px); }
        }
        @keyframes animPike {
          0%, 100% { transform: translate(0px, 0px); }
          50% { transform: translate(-10px, 18px); }
        }
        @keyframes animLunge {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }
        @keyframes animCurl {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-85deg); }
        }
        @keyframes animShoulderRaise {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-75deg); }
        }
        @keyframes animBridge {
          0%, 100% { transform: translateY(18px); }
          50% { transform: translateY(0px); }
        }
        @keyframes animDeadBugArm {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-45deg); }
        }
        @keyframes animDeadBugLeg {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(40deg); }
        }
        @keyframes animPulseGlow {
          0%, 100% { opacity: 0.4; filter: drop-shadow(0 0 2px #87CEEB); }
          50% { opacity: 1; filter: drop-shadow(0 0 8px #38BDF8); }
        }
        @keyframes animArrowLoop {
          0% { opacity: 0.3; transform: translateY(-3px); }
          50% { opacity: 1; transform: translateY(3px); }
          100% { opacity: 0.3; transform: translateY(-3px); }
        }
      `}</style>

      {/* Main Animated Biomechanical Figure */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {/* 1. PUSH-UPS & PRESSES */}
        {type === "push" && (
          <svg viewBox="0 0 320 150" className="w-full h-full max-w-[280px]">
            <line x1="20" y1="130" x2="300" y2="130" stroke="#87CEEB" strokeWidth="2" strokeDasharray="5 5" opacity="0.4" />
            <g style={{ animation: "animPushUp 2.8s ease-in-out infinite" }}>
              <line x1="70" y1="115" x2="230" y2="70" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
              <line x1="70" y1="115" x2="230" y2="70" stroke="#87CEEB" strokeWidth="2" strokeDasharray="3 3" opacity="0.8" />
              <circle cx="248" cy="62" r="14" fill="#87CEEB" />
              <circle cx="150" cy="92" r="6" fill="#38BDF8" style={{ animation: "animPulseGlow 2.8s infinite" }} />
              <g style={{ transformOrigin: "210px 75px", animation: "animPushArms 2.8s ease-in-out infinite" }}>
                <polyline points="210,75 225,102 210,130" fill="none" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <circle cx="70" cy="120" r="7" fill="#87CEEB" />
            </g>
            <g style={{ animation: "animArrowLoop 2.8s infinite" }}>
              <path d="M 280 65 L 280 95" fill="none" stroke="#FF7043" strokeWidth="2.5" strokeLinecap="round" />
              <polygon points="280,98 276,90 284,90" fill="#FF7043" />
            </g>
          </svg>
        )}

        {/* 2. SQUATS & SPLIT SQUATS */}
        {type === "squat" && (
          <svg viewBox="0 0 320 150" className="w-full h-full max-w-[280px]">
            <line x1="40" y1="135" x2="280" y2="135" stroke="#87CEEB" strokeWidth="2" strokeDasharray="5 5" opacity="0.4" />
            <g style={{ animation: "animSquat 3s ease-in-out infinite" }}>
              <circle cx="160" cy="30" r="14" fill="#87CEEB" />
              <line x1="160" y1="44" x2="148" y2="85" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
              <line x1="148" y1="85" x2="195" y2="88" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round" />
              <line x1="195" y1="88" x2="182" y2="135" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
              <circle cx="170" cy="86" r="6" fill="#FF7043" style={{ animation: "animPulseGlow 3s infinite" }} />
              <circle cx="148" cy="85" r="7" fill="#38BDF8" />
              <circle cx="182" cy="135" r="7" fill="#87CEEB" />
            </g>
            <line x1="110" y1="88" x2="230" y2="88" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
          </svg>
        )}

        {/* 3. PULL-UPS & ROWS */}
        {type === "pull" && (
          <svg viewBox="0 0 320 150" className="w-full h-full max-w-[280px]">
            <line x1="60" y1="22" x2="260" y2="22" stroke="#87CEEB" strokeWidth="5" strokeLinecap="round" />
            <g style={{ animation: "animPullUp 3s ease-in-out infinite" }}>
              <circle cx="120" cy="22" r="6" fill="#87CEEB" />
              <circle cx="200" cy="22" r="6" fill="#87CEEB" />
              <polyline points="120,22 135,52 150,60" fill="none" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="200,22 185,52 170,60" fill="none" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="160" cy="46" r="13" fill="#87CEEB" />
              <line x1="160" y1="60" x2="160" y2="105" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
              <circle cx="145" cy="72" r="5" fill="#38BDF8" style={{ animation: "animPulseGlow 3s infinite" }} />
              <circle cx="175" cy="72" r="5" fill="#38BDF8" style={{ animation: "animPulseGlow 3s infinite" }} />
              <line x1="160" y1="105" x2="155" y2="140" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            </g>
          </svg>
        )}

        {/* 4. PIKE PUSH-UPS & OVERHEAD */}
        {type === "pike" && (
          <svg viewBox="0 0 320 150" className="w-full h-full max-w-[280px]">
            <line x1="30" y1="130" x2="290" y2="130" stroke="#87CEEB" strokeWidth="2" strokeDasharray="5 5" opacity="0.4" />
            <g style={{ animation: "animPike 2.8s ease-in-out infinite" }}>
              <line x1="100" y1="130" x2="160" y2="50" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
              <line x1="160" y1="50" x2="215" y2="90" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
              <circle cx="225" cy="100" r="13" fill="#87CEEB" />
              <polyline points="205,82 220,105 210,130" fill="none" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="205" cy="82" r="6" fill="#FF7043" style={{ animation: "animPulseGlow 2.8s infinite" }} />
            </g>
          </svg>
        )}

        {/* 5. DIPS & TRICEPS */}
        {type === "dips" && (
          <svg viewBox="0 0 320 150" className="w-full h-full max-w-[280px]">
            <rect x="70" y="80" width="50" height="50" fill="none" stroke="#87CEEB" strokeWidth="2" strokeDasharray="3 3" />
            <g style={{ animation: "animPushUp 2.6s ease-in-out infinite" }}>
              <circle cx="145" cy="40" r="13" fill="#87CEEB" />
              <line x1="145" y1="53" x2="145" y2="95" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
              <polyline points="110,80 125,75 142,65" fill="none" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="125" cy="75" r="6" fill="#FF7043" style={{ animation: "animPulseGlow 2.6s infinite" }} />
              <polyline points="145,95 190,105 220,130" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            </g>
          </svg>
        )}

        {/* 6. LUNGES & STEP-UPS */}
        {type === "lunges" && (
          <svg viewBox="0 0 320 150" className="w-full h-full max-w-[280px]">
            <line x1="30" y1="135" x2="290" y2="135" stroke="#87CEEB" strokeWidth="2" strokeDasharray="5 5" opacity="0.4" />
            <g style={{ animation: "animLunge 2.8s ease-in-out infinite" }}>
              <circle cx="160" cy="32" r="13" fill="#87CEEB" />
              <line x1="160" y1="45" x2="160" y2="85" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
              <polyline points="160,85 200,90 195,135" fill="none" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="160,85 125,105 110,135" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="160" cy="85" r="6" fill="#FF7043" style={{ animation: "animPulseGlow 2.8s infinite" }} />
            </g>
          </svg>
        )}

        {/* 7. POSTERIOR (GLUTE BRIDGES & SUPERMANS) */}
        {type === "posterior" && (
          <svg viewBox="0 0 320 150" className="w-full h-full max-w-[280px]">
            <line x1="30" y1="125" x2="290" y2="125" stroke="#87CEEB" strokeWidth="2" strokeDasharray="5 5" opacity="0.4" />
            <circle cx="80" cy="115" r="13" fill="#87CEEB" />
            <g style={{ animation: "animBridge 2.6s ease-in-out infinite" }}>
              <line x1="80" y1="115" x2="165" y2="70" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
              <line x1="165" y1="70" x2="230" y2="125" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round" />
              <circle cx="165" cy="70" r="7" fill="#FF7043" style={{ animation: "animPulseGlow 2.6s infinite" }} />
            </g>
            <circle cx="230" cy="125" r="7" fill="#87CEEB" />
          </svg>
        )}

        {/* 8. SHOULDERS (LATERAL & FRONT RAISES) */}
        {type === "shoulders" && (
          <svg viewBox="0 0 320 150" className="w-full h-full max-w-[280px]">
            <line x1="60" y1="135" x2="260" y2="135" stroke="#87CEEB" strokeWidth="2" strokeDasharray="5 5" opacity="0.4" />
            <circle cx="160" cy="30" r="13" fill="#87CEEB" />
            <line x1="160" y1="43" x2="160" y2="105" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
            <line x1="160" y1="105" x2="145" y2="135" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            <line x1="160" y1="105" x2="175" y2="135" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            <g style={{ transformOrigin: "160px 50px", animation: "animShoulderRaise 2.6s ease-in-out infinite" }}>
              <line x1="160" y1="50" x2="220" y2="90" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" />
              <circle cx="220" cy="90" r="6" fill="#87CEEB" />
            </g>
            <g style={{ transformOrigin: "160px 50px", animation: "animShoulderRaise 2.6s ease-in-out infinite reverse" }}>
              <line x1="160" y1="50" x2="100" y2="90" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" />
              <circle cx="100" cy="90" r="6" fill="#87CEEB" />
            </g>
          </svg>
        )}

        {/* 9. ARMS (BICEP & HAMMER CURLS) */}
        {type === "arms" && (
          <svg viewBox="0 0 320 150" className="w-full h-full max-w-[280px]">
            <circle cx="160" cy="30" r="13" fill="#87CEEB" />
            <line x1="160" y1="43" x2="160" y2="105" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
            <line x1="160" y1="105" x2="150" y2="135" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            <line x1="160" y1="105" x2="170" y2="135" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            <line x1="160" y1="50" x2="175" y2="85" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            <g style={{ transformOrigin: "175px 85px", animation: "animCurl 2.4s ease-in-out infinite" }}>
              <line x1="175" y1="85" x2="185" y2="120" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" />
              <circle cx="185" cy="120" r="7" fill="#87CEEB" />
            </g>
            <circle cx="170" cy="70" r="6" fill="#FF7043" style={{ animation: "animPulseGlow 2.4s infinite" }} />
          </svg>
        )}

        {/* 10. CORE & CONDITIONING (DEADBUGS, PLANKS, CRUNCHES) */}
        {type === "core" && (
          <svg viewBox="0 0 320 150" className="w-full h-full max-w-[280px]">
            <line x1="30" y1="125" x2="290" y2="125" stroke="#87CEEB" strokeWidth="2" strokeDasharray="5 5" opacity="0.4" />
            <line x1="100" y1="120" x2="200" y2="120" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
            <circle cx="85" cy="115" r="13" fill="#87CEEB" />
            <circle cx="150" cy="115" r="8" fill="#FF7043" style={{ animation: "animPulseGlow 2.2s infinite" }} />
            <g style={{ transformOrigin: "115px 115px", animation: "animDeadBugArm 2.6s ease-in-out infinite" }}>
              <line x1="115" y1="115" x2="115" y2="70" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" />
              <circle cx="115" cy="70" r="5" fill="#87CEEB" />
            </g>
            <g style={{ transformOrigin: "185px 115px", animation: "animDeadBugLeg 2.6s ease-in-out infinite" }}>
              <polyline points="185,115 185,75 220,75" fill="none" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="220" cy="75" r="5" fill="#87CEEB" />
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}
