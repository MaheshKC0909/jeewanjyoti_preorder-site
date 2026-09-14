import { easeOut, motion as Motion, useSpring, useTransform } from "framer-motion";
import { Activity, Droplets, HeartPulse, Moon, Smartphone } from "lucide-react";
import { useLocalScroll, Visual } from "./shared";

const STAGES = [
  { at: 0.0, text: "IT STARTS", accent: "WITH YOU." },
  { at: 0.18, text: "CONTINUOUS", accent: "HEALTH MONITORING." },
  { at: 0.4, text: "EVERY SIGNAL,", accent: "IN REAL TIME." },
  { at: 0.62, text: "YOUR DATA,", accent: "ALWAYS MOVING." },
  { at: 0.84, text: "STRAIGHT TO", accent: "YOUR PHONE." },
];

const METRICS = [
  { label: "BPM", value: "72", Icon: HeartPulse, pos: "left-[18%] top-[28%]", delay: 0, float: "jj-float" },
  { label: "SPO₂", value: "98%", Icon: Droplets, pos: "right-[16%] top-[22%]", delay: 0.03, float: "jj-float-delay" },
  { label: "SLEEP", value: "87", Icon: Moon, pos: "left-[20%] bottom-[26%]", delay: 0.06, float: "jj-float-delay" },
  { label: "STEPS", value: "8,426", Icon: Activity, pos: "right-[18%] bottom-[30%]", delay: 0.09, float: "jj-float" },
];

function StageText({ progress }) {
  return (
    <div className="relative h-[100px] sm:h-[150px]">
      {STAGES.map((s, i) => {
        const next = STAGES[i + 1]?.at ?? 1;
        return <StageLine key={i} progress={progress} start={s.at} end={next} text={s.text} accent={s.accent} />;
      })}
    </div>
  );
}

function StageLine({ progress, start, end, text, accent }) {
  const fadeIn = start === 0 ? 0.001 : 0.09;
  const fadeOut = 0.09;
  const opacity = useTransform(
    progress,
    [start, start + fadeIn, end - fadeOut, end],
    [start === 0 ? 1 : 0, 1, 1, 0],
    { ease: easeOut }
  );
  const y = useTransform(
    progress,
    [start, start + fadeIn, end - fadeOut, end],
    [start === 0 ? 0 : 30, 0, 0, -30],
    { ease: easeOut }
  );
  const blur = useTransform(
    progress,
    [start, start + fadeIn, end - fadeOut, end],
    [start === 0 ? 0 : 6, 0, 0, 6]
  );
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  return (
    <Motion.h2 style={{ opacity, y, filter }} className="absolute inset-0 text-5xl font-semibold leading-[1] tracking-[-.05em] text-white sm:text-7xl">
      {text}<br /><span className="text-[#45c59b]">{accent}</span>
    </Motion.h2>
  );
}

function Metric({ m, progress }) {
  const s = 0.4 + m.delay;
  const opacity = useTransform(progress, [s, s + 0.1, 0.62, 0.74], [0, 1, 1, 0], { ease: easeOut });
  const scale = useTransform(progress, [s, s + 0.12], [0.6, 1], { ease: easeOut });
  const rotate = useTransform(progress, [s, s + 0.12], [m.pos.includes("right") ? 6 : -6, 0], { ease: easeOut });
  const driftX = useTransform(progress, [0.62, 0.78], [0, m.pos.includes("right") ? 200 : -60], { ease: easeOut });
  const driftY = useTransform(progress, [0.62, 0.78], [0, -160], { ease: easeOut });
  return (
    <Motion.div style={{ opacity, scale, rotate, x: driftX, y: driftY }} className={`absolute ${m.pos}`}>
      <div className={`rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-[0_8px_30px_rgba(0,0,0,.25)] backdrop-blur-xl ${m.float}`}>
        <m.Icon className="h-4 w-4 text-[#45c59b]" />
        <p className="mt-2 text-2xl font-semibold">{m.value}</p>
        <p className="jj-mono text-[9px] text-white/50">{m.label}</p>
      </div>
    </Motion.div>
  );
}

function Particle({ progress, seed }) {
  const start = 0.66 + seed.delay;
  const opacity = useTransform(progress, [start, start + 0.08, 0.94, 1], [0, 1, 1, 0]);
  const x = useTransform(progress, [start, 1], [seed.x0, seed.x1], { ease: easeOut });
  const y = useTransform(progress, [start, 1], [seed.y0, seed.y1], { ease: easeOut });
  const scale = useTransform(progress, [start, start + 0.1, 1], [0.3, 1, 0.6]);
  return <Motion.span style={{ opacity, x, y, scale }} className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-[#45c59b] shadow-[0_0_10px_2px_rgba(69,197,155,.7)]" />;
}

const PARTICLE_SEEDS = Array.from({ length: 16 }).map((_, i) => ({
  x0: (Math.random() - 0.5) * 160,
  y0: (Math.random() - 0.5) * 160,
  x1: 340 + Math.random() * 60,
  y1: -40 + Math.random() * 120,
  delay: Math.random() * 0.12,
}));

export default function WearableReveal() {
  const [ref, rawProgress] = useLocalScroll(["start start", "end end"]);
  const progress = useSpring(rawProgress, { stiffness: 130, damping: 26, mass: 0.35, restDelta: 0.0005 });

  const bandScale = useTransform(progress, [0, 0.4], [1, 1.9], { ease: easeOut });
  const bandOpacity = useTransform(progress, [0.68, 0.94], [1, 0], { ease: easeOut });
  const phoneOpacity = useTransform(progress, [0.8, 1], [0, 1], { ease: easeOut });
  const phoneScale = useTransform(progress, [0.8, 1], [0.6, 1], { ease: easeOut });
  const phoneY = useTransform(progress, [0.8, 1], [40, 0], { ease: easeOut });

  return (
    <section id="wearable" ref={ref} className="jj-dark relative h-[520vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <Motion.div style={{ scale: bandScale, opacity: bandOpacity, transformOrigin: "72% 40%" }} className="absolute inset-0">
          <Visual id="wearablePerson" tone="forest" label="wrist with health band" className="h-full w-full" overlay="left" />
        </Motion.div>
        <div className="jj-grid-lines pointer-events-none absolute inset-0 opacity-[.1]" />

        {METRICS.map((m) => <Metric key={m.label} m={m} progress={progress} />)}
        {PARTICLE_SEEDS.map((seed, i) => <Particle key={i} progress={progress} seed={seed} />)}

        <Motion.div style={{ opacity: phoneOpacity, scale: phoneScale, y: phoneY }} className="absolute right-[10%] top-1/2 flex h-56 w-32 -translate-y-1/2 flex-col items-center justify-center rounded-[1.6rem] border border-white/20 bg-white/10 backdrop-blur-2xl">
          <Smartphone className="h-6 w-6 text-[#45c59b]" />
          <p className="jj-mono mt-2 text-[8px] uppercase tracking-[.2em] text-white/50">Synced</p>
        </Motion.div>

        <div className="relative mx-auto flex h-full max-w-7xl items-center px-6 lg:px-10">
          <div className="max-w-xl">
            <p className="jj-mono mb-6 text-xs uppercase tracking-[.24em] text-[#45c59b]">01 · The wearable</p>
            <StageText progress={progress} />
          </div>
        </div>
      </div>
    </section>
  );
}
