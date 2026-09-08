import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * Landing Page — Initial Track Selector.
 * Uses the clean "CHOOSE YOUR TRACK" poster artwork as the full-screen canvas
 * with seamless interactive split touch zones:
 * Left Half  → Running Track (/running)
 * Right Half → Workout Track (/fitness)
 */
export default function LandingSelect() {
  const navigate = useNavigate();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#101415] flex items-center justify-center select-none">
      {/* Background Poster Container */}
      <div className="relative h-full w-full max-w-[540px] max-h-[960px] mx-auto overflow-hidden shadow-2xl flex">
        {/* Clean Poster Artwork (No ENTER buttons, no sparkle, no bottom text, no faded boxes) */}
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
          className="relative z-10 w-1/2 h-full cursor-pointer outline-none bg-transparent active:opacity-90 transition-opacity"
          title="Enter Running Track"
          aria-label="Running Track"
        />

        {/* ==============================================================
            RIGHT HALF HITBOX: WORKOUT TRACK
            ============================================================== */}
        <button
          onClick={() => navigate("/fitness")}
          className="relative z-10 w-1/2 h-full cursor-pointer outline-none bg-transparent active:opacity-90 transition-opacity"
          title="Enter Workout Track"
          aria-label="Workout Track"
        />
      </div>
    </div>
  );
}
