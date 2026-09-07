import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthGate from "./AuthGate.tsx";
import LandingSelect from "./components/LandingSelect";
import HomeWorkoutApp from "./components/HomeWorkout/HomeWorkoutApp";
import "./index.css";

// Root layout:
//   /          → LandingSelect (public, no auth)
//   /running   → AuthGate (auth → onboarding → WalkBuddy dashboard)
//   /fitness   → HomeWorkoutApp (Paperpillar #87CEEB UI + 3-Level PDF Program)
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingSelect />} />
        <Route path="/running" element={<AuthGate />} />
        <Route path="/fitness" element={<HomeWorkoutApp />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
