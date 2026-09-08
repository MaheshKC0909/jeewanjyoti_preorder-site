import { motion as Motion, useTransform } from "framer-motion";
import { Activity, Heart, Moon, Waves } from "lucide-react";
import { CountUp, Reveal, useLocalScroll } from "./shared";

const R = 130;
const C = 2 * Math.PI * R;

const POINTS = [
  { label: "Sleep", Icon: Moon, pos: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" },
  { label: "Activity", Icon: Activity, pos: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2" },
  { label: "Recovery", Icon: Waves, pos: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2" },
  { label: "Heart", Icon: Heart, pos: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2" },
];

export default function HealthScoreRing() {
  const [ref, progress] = useLocalScroll(["start 0.75", "end 0.4"]);
  const dashoffset = useTransform(progress, [0, 1], [C, C * (1 - 0.87)]);

  return (
    <section id="score" ref={ref} className="relative overflow-hidden bg-[#eef7f1] px-6 py-28 lg:px-10 lg:py-40">
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <p className="jj-mono text-xs uppercase tracking-[.24em] text-[#0d8b68]">03 · The overview</p>
          <h2 className="mt-5 text-5xl font-semibold leading-[.98] sm:text-7xl">Your daily<br /><span className="text-[#0d8b68]">wellness overview.</span></h2>
        </Reveal>

        <div className="relative mx-auto mt-20 h-[320px] w-[320px] sm:h-[380px] sm:w-[380px]">
          {POINTS.map((p) => (
            <div key={p.label} className={`absolute ${p.pos} flex flex-col items-center gap-1.5`}>
              <div className="rounded-full bg-white p-2.5 shadow-sm"><p.Icon className="h-4 w-4 text-[#0d8b68]" /></div>
              <span className="jj-mono text-[10px] uppercase tracking-[.14em] text-[#63736f]">{p.label}</span>
            </div>
          ))}
          <svg viewBox="0 0 300 300" className="h-full w-full -rotate-90">
            <circle cx="150" cy="150" r={R} fill="none" stroke="#d7e8dd" strokeWidth="14" />
            <Motion.circle cx="150" cy="150" r={R} fill="none" stroke="#0d8b68" strokeWidth="14" strokeLinecap="round" strokeDasharray={C} style={{ strokeDashoffset: dashoffset }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-7xl font-semibold tracking-[-.06em] text-[#10211d]"><CountUp to={87} duration={1.8} /></p>
            <p className="jj-mono mt-2 text-xs uppercase tracking-[.2em] text-[#0d8b68]">Health score</p>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-sm text-sm text-[#63736f]">A simple daily overview of your wellness — not a medical diagnosis.</p>
      </div>
    </section>
  );
}
