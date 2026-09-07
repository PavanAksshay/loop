import React from "react";

interface ExerciseFormVisualProps {
  exerciseId: string;
  exerciseName: string;
  targetMuscles: string;
  tempoNotes: string;
  fallbackImage: string;
}

/**
 * Renders an AI instructional exercise form visual with pose geometry,
 * motion indicators, and anatomical cues to guide proper technique.
 */
export default function ExerciseFormVisual({
  exerciseId,
  exerciseName,
  targetMuscles,
  tempoNotes,
  fallbackImage,
}: ExerciseFormVisualProps) {
  // Determine exercise category archetype for custom instructional graphic
  const nameLower = exerciseName.toLowerCase();

  const getExerciseDiagramType = () => {
    if (nameLower.includes("push-up") || nameLower.includes("press")) return "push";
    if (nameLower.includes("squat") || nameLower.includes("lunge") || nameLower.includes("split")) return "squat";
    if (nameLower.includes("pull-up") || nameLower.includes("row") || nameLower.includes("chin-up")) return "pull";
    if (nameLower.includes("plank") || nameLower.includes("dead bug") || nameLower.includes("crunch") || nameLower.includes("twist")) return "core";
    if (nameLower.includes("raise") || nameLower.includes("fly")) return "shoulders";
    if (nameLower.includes("curl") || nameLower.includes("extension")) return "arms";
    if (nameLower.includes("bridge") || nameLower.includes("deadlift") || nameLower.includes("nordic") || nameLower.includes("superman")) return "posterior";
    return "general";
  };

  const diagramType = getExerciseDiagramType();

  return (
    <div className="relative w-full h-[210px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#0F2942] to-[#081827] border border-[#87CEEB]/40 flex flex-col justify-between p-3.5 shadow-inner">
      {/* Background Subtle Silhouette / Illustrated Pose */}
      <div className="absolute inset-0 opacity-25 flex items-center justify-center pointer-events-none">
        <img
          src={fallbackImage}
          alt={exerciseName}
          className="w-full h-full object-cover mix-blend-luminosity filter blur-[1px]"
        />
      </div>

      {/* SVG Instructional Overlay based on exercise mechanic */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {diagramType === "push" && (
          <svg viewBox="0 0 300 130" className="w-full h-full max-w-[280px]">
            {/* Ground Line */}
            <line x1="20" y1="110" x2="280" y2="110" stroke="#87CEEB" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
            {/* Body Line Plank */}
            <line x1="60" y1="95" x2="220" y2="55" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            {/* Head */}
            <circle cx="235" cy="50" r="14" fill="#87CEEB" />
            {/* Arms at 45-degree angle */}
            <polyline points="200,60 215,85 200,110" fill="none" stroke="#87CEEB" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Feet */}
            <circle cx="60" cy="102" r="6" fill="#87CEEB" />
            {/* Motion Arrow Down & Up */}
            <path d="M 215 30 Q 225 15 235 30" fill="none" stroke="#FF7043" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="235,30 228,24 238,24" fill="#FF7043" />
            <text x="150" y="25" fill="#87CEEB" fontSize="11" fontWeight="bold" textAnchor="middle">
              45° Elbow Angle • Core Braced
            </text>
            <text x="150" y="124" fill="#E2E8F0" fontSize="9" textAnchor="middle">
              Full Range of Motion
            </text>
          </svg>
        )}

        {diagramType === "squat" && (
          <svg viewBox="0 0 300 130" className="w-full h-full max-w-[280px]">
            {/* Ground */}
            <line x1="40" y1="115" x2="260" y2="115" stroke="#87CEEB" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
            {/* Head */}
            <circle cx="150" cy="30" r="13" fill="#87CEEB" />
            {/* Torso Upright */}
            <line x1="150" y1="43" x2="140" y2="80" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            {/* Thigh Parallel */}
            <line x1="140" y1="80" x2="185" y2="82" stroke="#87CEEB" strokeWidth="5" strokeLinecap="round" />
            {/* Shin */}
            <line x1="185" y1="82" x2="175" y2="115" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            {/* Knees tracking arrow */}
            <path d="M 120 40 L 120 75" fill="none" stroke="#FF7043" strokeWidth="2" strokeDasharray="3 3" />
            <text x="150" y="18" fill="#87CEEB" fontSize="11" fontWeight="bold" textAnchor="middle">
              Parallel Depth • Chest Up
            </text>
            <text x="150" y="126" fill="#E2E8F0" fontSize="9" textAnchor="middle">
              Drive Through Whole Foot
            </text>
          </svg>
        )}

        {diagramType === "pull" && (
          <svg viewBox="0 0 300 130" className="w-full h-full max-w-[280px]">
            {/* Bar / Anchor */}
            <line x1="80" y1="20" x2="220" y2="20" stroke="#87CEEB" strokeWidth="4" strokeLinecap="round" />
            {/* Arms gripping */}
            <line x1="120" y1="20" x2="135" y2="45" stroke="#87CEEB" strokeWidth="4" strokeLinecap="round" />
            <line x1="180" y1="20" x2="165" y2="45" stroke="#87CEEB" strokeWidth="4" strokeLinecap="round" />
            {/* Head */}
            <circle cx="150" cy="40" r="12" fill="#FFFFFF" />
            {/* Torso */}
            <line x1="150" y1="52" x2="150" y2="90" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            {/* Legs */}
            <line x1="150" y1="90" x2="145" y2="120" stroke="#87CEEB" strokeWidth="4" />
            <line x1="150" y1="90" x2="155" y2="120" stroke="#87CEEB" strokeWidth="4" />
            <text x="150" y="15" fill="#87CEEB" fontSize="11" fontWeight="bold" textAnchor="middle">
              Lead with Chest • Squeeze Lats
            </text>
          </svg>
        )}

        {diagramType === "core" && (
          <svg viewBox="0 0 300 130" className="w-full h-full max-w-[280px]">
            {/* Mat */}
            <line x1="30" y1="110" x2="270" y2="110" stroke="#87CEEB" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
            {/* Flat Torso / Plank Line */}
            <line x1="80" y1="75" x2="220" y2="75" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            <circle cx="232" cy="72" r="12" fill="#87CEEB" />
            {/* Forearm support */}
            <polyline points="205,75 210,105 190,105" fill="none" stroke="#87CEEB" strokeWidth="4" strokeLinecap="round" />
            {/* Feet */}
            <circle cx="80" cy="100" r="5" fill="#87CEEB" />
            <line x1="80" y1="75" x2="80" y2="100" stroke="#87CEEB" strokeWidth="4" />
            <text x="150" y="30" fill="#87CEEB" fontSize="11" fontWeight="bold" textAnchor="middle">
              Neutral Spine • Zero Sagging
            </text>
            <text x="150" y="124" fill="#E2E8F0" fontSize="9" textAnchor="middle">
              Tuck Ribs & Squeeze Glutes
            </text>
          </svg>
        )}

        {diagramType === "shoulders" && (
          <svg viewBox="0 0 300 130" className="w-full h-full max-w-[280px]">
            {/* Head */}
            <circle cx="150" cy="40" r="13" fill="#FFFFFF" />
            <line x1="150" y1="53" x2="150" y2="105" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            {/* Lateral Arms */}
            <line x1="150" y1="62" x2="85" y2="65" stroke="#87CEEB" strokeWidth="4" strokeLinecap="round" />
            <line x1="150" y1="62" x2="215" y2="65" stroke="#87CEEB" strokeWidth="4" strokeLinecap="round" />
            {/* Dumbbells */}
            <circle cx="85" cy="65" r="7" fill="#FF7043" />
            <circle cx="215" cy="65" r="7" fill="#FF7043" />
            <text x="150" y="20" fill="#87CEEB" fontSize="11" fontWeight="bold" textAnchor="middle">
              Lead With Elbows • No Momentum
            </text>
          </svg>
        )}

        {diagramType === "arms" && (
          <svg viewBox="0 0 300 130" className="w-full h-full max-w-[280px]">
            <circle cx="150" cy="35" r="13" fill="#FFFFFF" />
            <line x1="150" y1="48" x2="150" y2="105" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            {/* Pinned Upper Arm & Forearm Curl */}
            <line x1="150" y1="58" x2="160" y2="85" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
            <line x1="160" y1="85" x2="145" y2="60" stroke="#87CEEB" strokeWidth="4" strokeLinecap="round" />
            <circle cx="145" cy="60" r="7" fill="#FF7043" />
            <text x="150" y="18" fill="#87CEEB" fontSize="11" fontWeight="bold" textAnchor="middle">
              Pin Elbows to Ribs • Full Squeeze
            </text>
          </svg>
        )}

        {diagramType === "posterior" && (
          <svg viewBox="0 0 300 130" className="w-full h-full max-w-[280px]">
            <line x1="30" y1="115" x2="270" y2="115" stroke="#87CEEB" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
            <polyline points="70,115 110,65 170,110 220,110" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="232" cy="108" r="11" fill="#87CEEB" />
            <text x="150" y="25" fill="#87CEEB" fontSize="11" fontWeight="bold" textAnchor="middle">
              Hinge at Hips • Squeeze Glutes at Top
            </text>
          </svg>
        )}

        {diagramType === "general" && (
          <div className="flex flex-col items-center gap-1.5 text-center px-4">
            <span className="text-xs font-bold text-[#87CEEB] tracking-wide uppercase">
              Technique Guide: {exerciseName}
            </span>
            <p className="text-[11px] text-[#E2E8F0] max-w-[250px] leading-snug">
              Maintain steady control on the lowering phase and strict form.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Form Overlay Bar */}
      <div className="relative z-10 flex items-center justify-between bg-[#0A2239]/80 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10">
        <span className="text-[10px] font-bold text-[#87CEEB] truncate max-w-[170px]">
          Target: {targetMuscles.split(",")[0]}
        </span>
        <span className="text-[10px] font-extrabold text-[#FF7043] uppercase tracking-wider">
          {tempoNotes.includes("Slow") ? "Controlled Tempo" : "Strict Form"}
        </span>
      </div>
    </div>
  );
}
