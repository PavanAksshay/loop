import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * Landing Page — Initial Track Selector.
 * Uses the exact "CHOOSE YOUR TRACK" poster artwork as the full-screen canvas
 * with clean interactive clickable split zones:
 * Left Half  → Running Track (/running)
 * Right Half → Workout Track (/fitness)
 */
export default function LandingSelect() {
  const navigate = useNavigate();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#101415] flex items-center justify-center select-none">
      {/* Background Poster Container */}
      <div className="relative h-full w-full max-w-[540px] max-h-[960px] mx-auto overflow-hidden shadow-2xl flex">
        {/* Background Image */}
        <img
          src="/choose-track-bg.jpg"
          alt="Choose Your Track - Loop Fitness"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />

        {/* ==============================================================
            LEFT HALF HITBOX: RUNNING TRACK
            ============================================================== */}
        <button
          onClick={() => navigate("/running")}
          className="relative z-10 w-1/2 h-full cursor-pointer group transition-all duration-200 outline-none"
          title="Enter Running Track"
          aria-label="Running Track"
        >
          {/* Subtle Hover Glow */}
          <div className="absolute inset-0 bg-[#d97706]/0 group-hover:bg-[#d97706]/10 group-active:bg-[#d97706]/20 transition-colors pointer-events-none" />
        </button>

        {/* ==============================================================
            RIGHT HALF HITBOX: WORKOUT TRACK
            ============================================================== */}
        <button
          onClick={() => navigate("/fitness")}
          className="relative z-10 w-1/2 h-full cursor-pointer group transition-all duration-200 outline-none"
          title="Enter Workout Track"
          aria-label="Workout Track"
        >
          {/* Subtle Hover Glow */}
          <div className="absolute inset-0 bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/10 group-active:bg-[#38bdf8]/20 transition-colors pointer-events-none" />
        </button>
      </div>
    </div>
  );
}
