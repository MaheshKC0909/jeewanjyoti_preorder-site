import { useReducedMotion } from "framer-motion";
import jjlogo from "./assets/jjlogo.png";
import { GLOBAL_STYLES } from "./landing/shared";
import AppHeader from "./components/AppHeader";
import CinematicHero from "./landing/CinematicHero";
import WearableReveal from "./landing/WearableReveal";
import HealthModulesGrid from "./landing/HealthModulesGrid";
import HorizontalStory from "./landing/HorizontalStory";
import ImageToDashboard from "./landing/ImageToDashboard";
import HealthScoreRing from "./landing/HealthScoreRing";
import SleepAndHeart from "./landing/SleepAndHeart";
import AIInsight from "./landing/AIInsight";
import FamilyMonitoring from "./landing/FamilyMonitoring";
import PhoneShowcase from "./landing/PhoneShowcase";
import DashboardModules from "./landing/DashboardModules";
import CommunitySection from "./landing/CommunitySection";
import DeviceShowcase from "./landing/DeviceShowcase";
import GetStartedBanner from "./landing/GetStartedBanner";
import CareEcosystem from "./landing/CareEcosystem";
import FinalCTA from "./landing/FinalCTA";

const FITNESS_PANELS = [
  { label: "Running", media: "running", tone: "forest", overlay: "dramatic", focus: "45% 35%", live: "148 bpm · 5:52/km", stats: [["Distance", "2.5 km"], ["Time", "16 min"], ["Calories", "210"]] },
  { label: "Walking", media: "walking", tone: "dawn", live: "Cadence 112 spm", route: true, stats: [["Steps", "8,426"], ["Distance", "6.8 km"]] },
  { label: "Cycling", media: "cycling", tone: "ocean", live: "142 bpm · SpO2 97%", stats: [["Distance", "18.4 km"], ["Time", "48 min"], ["Calories", "380"]] },
  { label: "Workout", media: "workout", tone: "electric", overlay: "dramatic", focus: "30% 45%", live: "162 bpm · high intensity", stats: [["Time", "58 min"], ["Calories", "642"]] },
  { label: "Recovery", media: "recoveryFitness", tone: "slate", overlay: "dramatic", focus: "50% 40%", live: "58 bpm · SpO2 98%", stats: [["Heart", "68 bpm"], ["Stress", "Low"]] },
];

export default function DigitalCareLanding() {
  const reduce = useReducedMotion();
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  const start = () => window.location.assign("/register");

  return (
    <div className="jj-story min-h-screen overflow-x-clip">
      <style>{GLOBAL_STYLES}</style>
      <AppHeader />

      <main id="top">
        <CinematicHero onNavigate={go} onStart={start} />
        <WearableReveal />
        <HealthModulesGrid />
        <ImageToDashboard />
        <HealthScoreRing />
        <SleepAndHeart />
        <HorizontalStory id="fitness" kicker="04 · Movement" heading={["Move your way.", "Track every mile."]} panels={FITNESS_PANELS} />
        <AIInsight />
        <FamilyMonitoring />
        <PhoneShowcase />
        <DashboardModules />
        <CommunitySection />
        <DeviceShowcase />
        <GetStartedBanner />
        <CareEcosystem />
        <FinalCTA onStart={start} onNavigate={go} />
      </main>

      <footer id="contact" className="jj-dark border-t border-white/10 px-6 py-14 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-10 md:flex-row">
          <div>
            <div className="flex items-center gap-3">
              <img src={jjlogo} alt="Digital Care" className="h-9 w-9 rounded-xl" />
              <span className="font-semibold tracking-[.14em]">DIGITAL CARE</span>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/45">Your health, always connected. Digital care for the people and patterns that matter.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm text-white/55">
            <button onClick={() => go("data")} className="text-left hover:text-[#45c59b]">Health monitoring</button>
            <button onClick={() => go("fitness")} className="text-left hover:text-[#45c59b]">Fitness</button>
            <button onClick={() => go("family")} className="text-left hover:text-[#45c59b]">Family care</button>
            <button onClick={() => go("ai")} className="text-left hover:text-[#45c59b]">AI insights</button>
            <button onClick={() => go("community")} className="text-left hover:text-[#45c59b]">Community</button>
            <a href="/blogs" className="hover:text-[#45c59b]">Stories</a>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-5 text-xs text-white/35">
          © {new Date().getFullYear()} Digital Care · Built in Nepal
        </div>
      </footer>
    </div>
  );
}
