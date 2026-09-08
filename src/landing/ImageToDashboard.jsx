import { motion as Motion, useTransform } from "framer-motion";
import { CountUp, useLocalScroll, Visual } from "./shared";

const MODULES = [
  ["SLEEP", 87],
  ["ACTIVITY", 91],
  ["RECOVERY", 82],
  ["HEART", 89],
];

export default function ImageToDashboard() {
  const [ref, progress] = useLocalScroll(["start start", "end end"]);

  const photoX = useTransform(progress, [0.15, 0.7], ["0%", "-28%"]);
  const photoScale = useTransform(progress, [0.15, 0.7], [1, 0.5]);
  const photoRadius = useTransform(progress, [0.15, 0.7], [0, 28]);
  const dashOpacity = useTransform(progress, [0.35, 0.65], [0, 1]);
  const dashX = useTransform(progress, [0.35, 0.75], ["8%", "0%"]);
  const kickerOpacity = useTransform(progress, [0, 0.2, 0.8, 1], [1, 1, 1, 0]);

  return (
    <section ref={ref} className="jj-void relative h-[380vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <Motion.div style={{ x: photoX, scale: photoScale, borderRadius: photoRadius }} className="absolute inset-0 overflow-hidden">
          <Visual id="exercisePhoto" tone="ocean" label="person exercising" className="h-full w-full" overlay="left" />
        </Motion.div>

        <Motion.div style={{ opacity: kickerOpacity }} className="pointer-events-none absolute left-8 top-10 z-10 sm:left-12">
          <p className="jj-mono text-xs uppercase tracking-[.24em] text-[#45c59b]">Real world → digital health</p>
        </Motion.div>

        <Motion.div style={{ opacity: dashOpacity, x: dashX }} className="absolute inset-y-0 right-0 flex w-full items-center justify-center px-6 sm:w-[62%] sm:px-0">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#10211d]/90 p-8 text-white shadow-2xl backdrop-blur-xl">
            <p className="jj-mono text-xs uppercase tracking-[.2em] text-white/45">Health score</p>
            <p className="mt-3 text-7xl font-semibold tracking-[-.06em] text-[#45c59b]"><CountUp to={87} /></p>
            <div className="mt-4 h-1.5 rounded-full bg-white/10"><div className="h-full w-[87%] rounded-full bg-[#45c59b]" /></div>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {MODULES.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white/5 p-4">
                  <p className="jj-mono text-[10px] uppercase tracking-[.18em] text-white/40">{label}</p>
                  <p className="mt-2 text-2xl font-semibold"><CountUp to={value} /></p>
                </div>
              ))}
            </div>
          </div>
        </Motion.div>
      </div>
    </section>
  );
}
