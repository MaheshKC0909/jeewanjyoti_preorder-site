import { motion as Motion, useTransform } from "framer-motion";
import { useLocalScroll, Visual } from "./shared";

const SLEEP_BARS = [25, 32, 42, 38, 55, 70, 64, 83, 76, 88, 65, 40, 28, 20, 35, 52, 71, 60, 42, 30, 22, 18, 15, 18];

function SleepBar({ progress, i, height }) {
  const start = 0.04 + (i / SLEEP_BARS.length) * 0.24;
  const h = useTransform(progress, [start, start + 0.05], [0, height]);
  const deep = i > 9 && i < 15;
  return <Motion.span style={{ height: useTransform(h, (v) => `${v}%`) }} className={`flex-1 rounded-t ${deep ? "bg-[#45c59b]" : "bg-white/20"}`} />;
}

function Fade({ progress, range, className = "", style = {}, children }) {
  const opacity = useTransform(progress, range, [0, 1, 1, 0]);
  return <Motion.div style={{ opacity, ...style }} className={className}>{children}</Motion.div>;
}

function FadeIn({ progress, range, className = "", children }) {
  const opacity = useTransform(progress, range, [0, 1]);
  const y = useTransform(progress, range, [16, 0]);
  return <Motion.div style={{ opacity, y }} className={className}>{children}</Motion.div>;
}

export default function SleepAndHeart() {
  const [ref, progress] = useLocalScroll(["start start", "end end"]);
  const bgScale = useTransform(progress, [0, 1], [1, 1.08]);
  const sleepGroupOpacity = useTransform(progress, [0.28, 0.38], [1, 0]);
  const ecgGroupOpacity = useTransform(progress, [0.42, 0.5], [0, 1]);

  return (
    <section id="heart" ref={ref} className="jj-void relative h-[480vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <Motion.div style={{ scale: bgScale }} className="absolute inset-0">
          <Visual id="sleepingPerson" tone="midnight" label="person sleeping" className="h-full w-full" overlay="left" />
        </Motion.div>

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-6 lg:px-10">
          <div className="relative h-[150px] max-w-2xl sm:h-[220px]">
            <Fade progress={progress} range={[0, 0.02, 0.24, 0.32]} className="absolute inset-0 text-5xl font-semibold leading-[1] tracking-[-.05em] text-white sm:text-7xl">
              SLEEP.<br /><span className="text-[#45c59b]">Where recovery begins.</span>
            </Fade>
            <Fade progress={progress} range={[0.44, 0.5, 0.9, 1]} className="absolute inset-0 text-5xl font-semibold leading-[1] tracking-[-.05em] text-white sm:text-7xl">
              EVERY BEAT.<br /><span className="text-[#45c59b]">Every moment.</span>
            </Fade>
          </div>

          <Motion.div style={{ opacity: sleepGroupOpacity }} className="mt-10 max-w-3xl">
            <div className="flex h-28 items-end gap-1 border-b border-white/10">
              {SLEEP_BARS.map((h, i) => <SleepBar key={i} progress={progress} i={i} height={h} />)}
            </div>
            <div className="mt-5 flex flex-wrap gap-8">
              <FadeIn progress={progress} range={[0.08, 0.14]}><p className="text-3xl font-semibold text-white">7h 42m</p><p className="jj-mono text-[10px] uppercase tracking-[.18em] text-white/45">Total sleep</p></FadeIn>
              <FadeIn progress={progress} range={[0.14, 0.2]}><p className="text-3xl font-semibold text-white">1h 42m</p><p className="jj-mono text-[10px] uppercase tracking-[.18em] text-white/45">Deep sleep</p></FadeIn>
              <FadeIn progress={progress} range={[0.2, 0.26]}><p className="text-3xl font-semibold text-white">1h 58m</p><p className="jj-mono text-[10px] uppercase tracking-[.18em] text-white/45">REM</p></FadeIn>
            </div>
          </Motion.div>

          <Motion.div style={{ opacity: ecgGroupOpacity }} className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden">
            <div className="jj-marquee-track flex w-[200%]">
              <svg viewBox="0 0 720 120" className="h-40 w-1/2 shrink-0">
                <path d="M0 60 L110 60 L130 12 L150 108 L170 60 L260 60 L280 30 L300 90 L320 60 L410 60 L430 12 L450 108 L470 60 L560 60 L580 30 L600 90 L620 60 L720 60" fill="none" stroke="#45c59b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg viewBox="0 0 720 120" className="h-40 w-1/2 shrink-0">
                <path d="M0 60 L110 60 L130 12 L150 108 L170 60 L260 60 L280 30 L300 90 L320 60 L410 60 L430 12 L450 108 L470 60 L560 60 L580 30 L600 90 L620 60 L720 60" fill="none" stroke="#45c59b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Motion.div>

          <Motion.div style={{ opacity: ecgGroupOpacity }} className="mt-40 flex flex-wrap gap-6 sm:mt-48">
            <FadeIn progress={progress} range={[0.52, 0.58]}><p className="text-5xl font-semibold text-white">72 <small className="text-lg font-normal text-[#45c59b]">BPM</small></p></FadeIn>
            <FadeIn progress={progress} range={[0.6, 0.66]}><p className="jj-mono text-[10px] uppercase tracking-[.18em] text-white/45">Resting</p><p className="text-2xl font-semibold text-white">61 BPM</p></FadeIn>
            <FadeIn progress={progress} range={[0.68, 0.74]}><p className="jj-mono text-[10px] uppercase tracking-[.18em] text-white/45">Daily range</p><p className="text-2xl font-semibold text-white">58–124 BPM</p></FadeIn>
            <FadeIn progress={progress} range={[0.76, 0.82]}><p className="jj-mono text-[10px] uppercase tracking-[.18em] text-white/45">HRV</p><p className="text-2xl font-semibold text-white">64 ms</p></FadeIn>
          </Motion.div>
        </div>
      </div>
    </section>
  );
}
