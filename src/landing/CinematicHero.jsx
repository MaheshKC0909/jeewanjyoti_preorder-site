import { motion as Motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ChevronDown, HeartPulse } from "lucide-react";
import { EASE_OUT, MaskLine, useLocalScroll, Visual } from "./shared";

export default function CinematicHero({ onNavigate, onStart }) {
  const reduce = useReducedMotion();
  const [ref, progress] = useLocalScroll(["start start", "end start"]);

  const scale = useTransform(progress, [0, 1], [1, 1.18]);
  const headlineY = useTransform(progress, [0, 1], [0, reduce ? 0 : -130]);
  const headlineOpacity = useTransform(progress, [0, 0.6], [1, 0.15]);
  const indicatorOpacity = useTransform(progress, [0, 0.15], [1, 0]);
  const chipsOpacity = useTransform(progress, [0.35, 0.65], [0, 1]);
  const chipsY = useTransform(progress, [0.35, 0.65], [24, 0]);

  return (
    <section ref={ref} className="jj-dark relative h-[160vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <Motion.div style={{ scale }} className="absolute inset-0">
          <Visual id="hero" tone="dawn" label="person wearing the band" className="h-full w-full" focus="70% 35%" overlay="left" />
        </Motion.div>
        <div className="jj-grid-lines pointer-events-none absolute inset-0 opacity-[.12]" />

        <Motion.div style={{ y: headlineY, opacity: headlineOpacity }} className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-6 lg:px-10">
          <p className="jj-mono text-xs uppercase tracking-[.24em] text-[#45c59b]">Connected digital care · Nepal</p>
          <h1 className="mt-6 max-w-3xl text-6xl font-semibold leading-[.94] tracking-[-.06em] sm:text-8xl lg:text-[7.2rem]">
            <MaskLine delay={0.1}>Your health.</MaskLine>
            <MaskLine delay={0.22} className="text-[#45c59b]">Always connected.</MaskLine>
          </h1>
          <Motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: EASE_OUT }}
            className="mt-8 max-w-xl text-lg leading-relaxed text-white/60 sm:text-xl"
          >
            One intelligent digital-care platform connecting your health, fitness, family and everyday wellbeing.
          </Motion.p>
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.8, ease: EASE_OUT }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <button onClick={() => onNavigate("data")} className="rounded-full bg-[#45c59b] px-6 py-3.5 font-semibold text-[#10211d] transition-transform hover:scale-[1.03]">
              Explore digital care <ArrowRight className="ml-2 inline h-4 w-4" />
            </button>
            <button onClick={() => onNavigate("technology")} className="rounded-full border border-white/20 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/10">
              Discover the technology
            </button>
          </Motion.div>
        </Motion.div>

        <Motion.div style={{ opacity: chipsOpacity, y: chipsY }} className="pointer-events-none absolute bottom-28 right-8 flex flex-col gap-3 sm:right-16">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-xl">
            <p className="jj-mono text-[9px] text-white/50">HEART RATE</p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-semibold"><HeartPulse className="h-4 w-4 text-[#45c59b]" />72 <small className="text-xs font-normal text-[#45c59b]">BPM</small></p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-xl">
            <p className="jj-mono text-[9px] text-white/50">SPO₂</p>
            <p className="mt-2 text-2xl font-semibold">98<small className="text-xs font-normal text-[#45c59b]">%</small></p>
          </div>
        </Motion.div>

        <Motion.button
          style={{ opacity: indicatorOpacity }}
          onClick={() => onNavigate("wearable")}
          className="jj-mono absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[11px] uppercase tracking-[.22em] text-white/60"
        >
          Scroll to explore
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </Motion.button>
      </div>
    </section>
  );
}
