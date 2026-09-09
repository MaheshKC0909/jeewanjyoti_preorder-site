import { cubicBezier, motion as Motion, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { Watch } from "lucide-react";
import { ScrollDots, useLocalScroll, Visual } from "./shared";

const EASE = cubicBezier(0.16, 1, 0.3, 1);

// A hand-drawn-feeling loop trail — rounded, irregular (not a circle), closes back onto its own start point.
const ROUTE_LOOP = "M96 22 C138 16 178 40 182 82 C186 118 168 138 150 156 C170 176 158 196 128 190 C96 184 88 158 100 138 C64 146 26 132 20 96 C15 62 44 30 84 24 C88 23 92 22 96 22 Z";

// Subscribes to a MotionValue and renders its live, rounded numeric value as text.
function Counter({ value, format = (n) => n }) {
  const [display, setDisplay] = useState(() => format(Math.round(value.get())));
  useEffect(() => {
    const unsub = value.on("change", (v) => setDisplay(format(Math.round(v))));
    return unsub;
  }, [value, format]);
  return <>{display}</>;
}

// Thin progress ring — fills smoothly, no pulse, no glow-bomb.
function RadialGauge({ value, size = 72, strokeWidth = 4 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = useTransform(value, (v) => circumference * (1 - v));
  return (
    <svg width={size} height={size} className="-rotate-90" style={{ overflow: "visible" }}>
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth={strokeWidth} fill="none" />
      <Motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#45c59b"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        style={{ strokeDasharray: circumference, strokeDashoffset: dashOffset }}
      />
    </svg>
  );
}

// Compact live-metric card: ring + counting number. Replaces the old pulsing circular badge.
function StatReadout({ pop, label }) {
  if (!label) return null;
  const match = label.match(/^(-?\d+(\.\d+)?)/);
  const numeric = match ? parseFloat(match[1]) : null;
  const suffix = match ? label.slice(match[0].length).trim() : null;
  const countValue = useTransform(pop, [0.35, 1], [0, numeric ?? 0], { clamp: true });

  return (
    <Motion.div
      style={{ opacity: pop }}
      className="pointer-events-none absolute right-6 top-10 z-10 sm:right-10 sm:top-14"
    >
      <div className="flex items-center gap-5 rounded-3xl border border-white/10 bg-white/[.05] px-6 py-5 backdrop-blur-xl">
        <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center">
          <RadialGauge value={pop} size={72} strokeWidth={4} />
          <Watch className="absolute h-5 w-5 text-white/50" />
        </div>
        <div>
          <p className="jj-mono text-[9px] uppercase tracking-[.28em] text-white/40">Live from your watch</p>
          <p className="mt-1 text-4xl font-semibold tracking-[-.03em] text-white sm:text-5xl">
            {numeric !== null ? <Counter value={countValue} /> : label}
            {suffix && <span className="ml-1 text-base font-normal text-white/50">{suffix}</span>}
          </p>
        </div>
      </div>
    </Motion.div>
  );
}

function RouteTrace({ pop, draw, distance, live }) {
  const match = distance ? distance.match(/^(-?\d+(\.\d+)?)/) : null;
  const numeric = match ? parseFloat(match[1]) : null;
  const suffix = match ? distance.slice(match[0].length).trim() : null;
  const countValue = useTransform(pop, [0.35, 1], [0, numeric ?? 0], { clamp: true });

  return (
    <Motion.div
      style={{ opacity: pop }}
      className="pointer-events-none absolute left-6 top-10 z-10 flex items-center gap-6 rounded-3xl border border-white/10 bg-white/[.05] px-6 py-5 backdrop-blur-xl sm:left-10 sm:top-14"
    >
      <div className="relative h-[76px] w-[76px] shrink-0">
        <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
          <path d={ROUTE_LOOP} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <Motion.path
            d={ROUTE_LOOP}
            fill="none"
            stroke="#45c59b"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pathLength: draw }}
          />
        </svg>
      </div>
      <div>
        <p className="jj-mono text-[9px] uppercase tracking-[.28em] text-white/40">Route</p>
        <p className="mt-1 text-4xl font-semibold tracking-[-.03em] text-white sm:text-5xl">
          {numeric !== null ? <Counter value={countValue} format={(n) => n} /> : distance || "—"}
          {suffix && <span className="ml-1 text-base font-normal text-white/50">{suffix}</span>}
        </p>
        {live && <p className="mt-0.5 text-sm text-white/50">{live}</p>}
      </div>
    </Motion.div>
  );
}

function Panel({ panel, index, count, progress }) {
  const center = index / (count - 1 || 1);
  const scale = useTransform(progress, [center - 0.5 / count, center, center + 0.5 / count], [0.94, 1, 0.94], { ease: EASE });
  const opacity = useTransform(progress, [center - 0.6 / count, center, center + 0.6 / count], [0.55, 1, 0.55], { ease: EASE });
  const pop = useTransform(progress, [center - 0.5 / count, center], [0, 1], { clamp: true, ease: EASE });
  const routeDraw = useTransform(progress, [center - 0.6 / count, center], [0, 1], { clamp: true, ease: EASE });
  const distance = panel.stats.find(([label]) => label === "Distance")?.[1];

  return (
    <Motion.div style={{ scale, opacity }} className="relative h-full w-screen shrink-0 overflow-hidden">
      <Visual id={panel.media} tone={panel.tone} label={panel.label} className="absolute inset-0 h-full w-full" overlay={panel.overlay || "bottom"} focus={panel.focus} fit={panel.fit} />
      {panel.route ? <RouteTrace pop={pop} draw={routeDraw} distance={distance} live={panel.live} /> : <StatReadout pop={pop} label={panel.live} />}
      <div className="absolute inset-0 flex flex-col justify-end p-8 text-white sm:p-16">
        <h3 className="text-6xl font-semibold tracking-[-.05em] sm:text-8xl">{panel.label}</h3>
        <div className="mt-8 flex flex-wrap gap-4">
          {panel.stats.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-xl">
              <p className="jj-mono text-[10px] uppercase tracking-[.18em] text-white/50">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </Motion.div>
  );
}

export default function HorizontalStory({ id, kicker, heading, panels }) {
  const n = panels.length;
  const [ref, progress] = useLocalScroll(["start start", "end end"]);
  const x = useTransform(progress, [0, 1], ["0vw", `-${(n - 1) * 100}vw`]);
  const introOpacity = useTransform(progress, [0, 0.08], [1, 0]);

  return (
    <section id={id} ref={ref} className="jj-void relative" style={{ height: `${(n + 1.1) * 100}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <Motion.div style={{ opacity: introOpacity }} className="pointer-events-none absolute left-6 top-10 z-10 max-w-lg sm:left-10">
          <p className="jj-mono text-xs uppercase tracking-[.24em] text-[#45c59b]">{kicker}</p>
          <h2 className="mt-4 text-4xl font-semibold leading-[.98] text-white sm:text-6xl">{heading[0]}<br />{heading[1]}</h2>
        </Motion.div>

        <Motion.div style={{ x }} className="flex h-full">
          {panels.map((p, i) => <Panel key={p.label} panel={p} index={i} count={n} progress={progress} />)}
        </Motion.div>

        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
          <ScrollDots progress={progress} count={n} />
        </div>
      </div>
    </section>
  );
}