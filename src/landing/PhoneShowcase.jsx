import { motion as Motion, useTransform } from "framer-motion";
import { Moon, Sparkles } from "lucide-react";
import { Kicker, Reveal, useLocalScroll } from "./shared";

function PhoneFrame({ children }) {
  return (
    <div className="h-[440px] w-[220px] rounded-[2.4rem] border-[6px] border-[#0d1b17] bg-[#10211d] p-2 shadow-2xl sm:h-[520px] sm:w-[260px]">
      <div className="h-full w-full overflow-hidden rounded-[1.9rem] bg-[#f2f7f3] p-5 text-[#10211d]">{children}</div>
    </div>
  );
}

function TodayScreen() {
  return (
    <div>
      <p className="text-xs text-[#6b8077]">Good morning</p>
      <h3 className="mt-1 text-xl font-semibold">Today's health</h3>
      <div className="mt-6 rounded-2xl bg-[#0d8b68] p-5 text-white">
        <p className="text-xs text-white/65">Health score</p>
        <p className="mt-2 text-5xl font-semibold tracking-[-.06em]">87</p>
        <div className="mt-4 h-1.5 rounded-full bg-white/20"><div className="h-full w-[87%] rounded-full bg-[#a5f4ce]" /></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[["Steps", "8,426"], ["Heart", "72 bpm"]].map(([l, v]) => (
          <div key={l} className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-[11px] text-[#71837d]">{l}</p><p className="mt-2 text-lg font-semibold">{v}</p></div>
        ))}
      </div>
    </div>
  );
}

function SleepScreen() {
  const bars = [30, 55, 40, 70, 48, 82, 60, 35, 58, 44, 66, 50];
  return (
    <div>
      <Moon className="h-5 w-5 text-[#0d8b68]" />
      <h3 className="mt-4 text-xl font-semibold">Sleep</h3>
      <p className="mt-1 text-4xl font-semibold tracking-[-.05em]">7h 42m</p>
      <div className="mt-6 flex h-24 items-end gap-1.5">
        {bars.map((h, i) => <div key={i} className={`flex-1 rounded-t ${i > 3 && i < 8 ? "bg-[#0d8b68]" : "bg-[#0d8b68]/25"}`} style={{ height: `${h}%` }} />)}
      </div>
      <p className="mt-4 text-xs text-[#71837d]">Deep sleep 1h 42m · REM 1h 58m</p>
    </div>
  );
}

function AIScreen() {
  return (
    <div>
      <Sparkles className="h-5 w-5 text-[#0d8b68]" />
      <h3 className="mt-4 text-xl font-semibold">AI insights</h3>
      <div className="mt-5 rounded-2xl bg-[#dff4e9] p-4 text-sm leading-relaxed text-[#10211d]">
        Your activity was higher than your weekly average today.
      </div>
      <div className="mt-3 rounded-2xl bg-white p-4 text-sm leading-relaxed shadow-sm">
        Your sleep duration improved compared with your recent average.
      </div>
    </div>
  );
}

const PHONES = [
  { label: "Today's health", Screen: TodayScreen },
  { label: "Sleep", Screen: SleepScreen },
  { label: "AI insights", Screen: AIScreen },
];

function Phone({ index, progress, Screen }) {
  const n = PHONES.length;
  const step = 1 / n;
  const center = index * step + step / 2;
  const x = useTransform(progress, [center - step, center, center + step], [index === 0 ? -40 : 260, 0, -260]);
  const scale = useTransform(progress, [center - step, center, center + step], [0.85, 1, 0.85]);
  const rotateY = useTransform(progress, [center - step, center, center + step], [18, 0, -18]);
  const opacity = useTransform(progress, [center - step * 0.9, center - step * 0.5, center + step * 0.5, center + step * 0.9], [0, 1, 1, 0]);
  const z = useTransform(progress, [center - step, center, center + step], [0, 30, 0]);

  return (
    <Motion.div style={{ x, scale, rotateY, opacity, zIndex: z }} className="absolute" >
      <PhoneFrame><Screen /></PhoneFrame>
    </Motion.div>
  );
}

export default function PhoneShowcase() {
  const [ref, progress] = useLocalScroll(["start start", "end end"]);

  return (
    <section ref={ref} className="jj-dark relative h-[400vh]">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6" style={{ perspective: 1400 }}>
        <Reveal className="mb-10 text-center">
          <Kicker index={6} tone="dark">The mobile app</Kicker>
          <h2 className="mt-4 text-4xl font-semibold text-white sm:text-6xl">One app.<br /><span className="text-[#45c59b]">Everything connected.</span></h2>
        </Reveal>
        <div className="relative flex h-[560px] w-full items-center justify-center">
          {PHONES.map((p, i) => <Phone key={p.label} index={i} progress={progress} Screen={p.Screen} />)}
        </div>
      </div>
    </section>
  );
}
//hello//