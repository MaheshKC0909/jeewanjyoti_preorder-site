import { useEffect, useRef, useState } from "react";
import { motion as Motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import MEDIA from "./media";

export const EASE = [0.22, 1, 0.36, 1];
export const EASE_OUT = [0.16, 1, 0.3, 1];

export const INK = "#eaf5f0";
export const MINT = "#45c59b";
export const DEEP = "#0d8b68";
export const DARK = "#10211d";
export const VOID = "#081310";

export const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@500;600;700;800&display=swap');

.jj-story { font-family: 'DM Sans', sans-serif; background: #f5f8f5; color: #10211d; }
.jj-story h1, .jj-story h2, .jj-story h3 { font-family: 'IBM Plex Sans', sans-serif; letter-spacing: -.045em; }
.jj-story .jj-mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
.jj-story .jj-dark { background: #10211d; color: #f4f8f5; }
.jj-story .jj-void { background: #081310; color: #f4f8f5; }

.jj-grain { position: absolute; inset: 0; pointer-events: none; opacity: .5; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E"); }
.jj-grid-lines { background-image: linear-gradient(rgba(69,197,155,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(69,197,155,.08) 1px, transparent 1px); background-size: 48px 48px; }

.jj-float { animation: jj-float 6.5s ease-in-out infinite; }
.jj-float-delay { animation: jj-float 6.5s 1.4s ease-in-out infinite; }
@keyframes jj-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }

.jj-marquee-track { animation: jj-marquee 9s linear infinite; }
@keyframes jj-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

.jj-draw { stroke-dasharray: var(--len, 420); stroke-dashoffset: var(--len, 420); animation: jj-draw 1.8s ease forwards; }
@keyframes jj-draw { to { stroke-dashoffset: 0 } }

.jj-scrollbar-none { scrollbar-width: none; }
.jj-scrollbar-none::-webkit-scrollbar { display: none; }

@media (prefers-reduced-motion: reduce) {
  .jj-float, .jj-float-delay, .jj-marquee-track, .jj-draw { animation: none !important; }
}
`;

const TONES = {
  dawn: "radial-gradient(140% 120% at 75% 10%, #ffb37b 0%, #e8734a 26%, #3a1c14 58%, #10211d 100%)",
  forest: "radial-gradient(130% 120% at 20% 0%, #7ee6bd 0%, #2fa87f 28%, #0f3a2d 58%, #081310 100%)",
  midnight: "radial-gradient(120% 130% at 70% 15%, #2c4a55 0%, #142e33 30%, #0a1a1c 55%, #030a09 100%)",
  ember: "radial-gradient(130% 120% at 25% 15%, #f2c48a 0%, #cf7f3d 30%, #47230f 58%, #1a0d06 100%)",
  steel: "radial-gradient(130% 120% at 70% 0%, #6fdcb6 0%, #1f8e6b 22%, #123028 50%, #061210 100%)",
  electric: "radial-gradient(120% 130% at 30% 10%, #7ee6bd 0%, #45c59b 20%, #245e8a 46%, #0c1a24 72%, #05100d 100%)",
  ocean: "radial-gradient(130% 120% at 65% 10%, #7fd9d9 0%, #2c8a8a 26%, #113b45 55%, #061313 100%)",
  slate: "radial-gradient(130% 120% at 30% 0%, #9fe3c8 0%, #3f8f74 26%, #16332c 55%, #081310 100%)",
};

export function Visual({ id, label, tone = "forest", Icon, className = "", focus = "50% 50%", overlay = "bottom", grid = false, fit = "cover" }) {
  const src = MEDIA[id];
  const overlayClass =
    overlay === "bottom" ? "bg-gradient-to-t from-black/65 via-black/10 to-transparent" :
    overlay === "top" ? "bg-gradient-to-b from-black/55 via-transparent to-transparent" :
    overlay === "left" ? "bg-gradient-to-r from-black/60 via-black/5 to-transparent" :
    overlay === "full" ? "bg-black/35" :
    overlay === "dramatic" ? "bg-gradient-to-t from-black/80 via-black/45 to-black/20" : "";

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* cutout (white-bg) photos float over the tone gradient instead of stretching to fill */}
      {(!src || fit === "contain") && (
        <div className="absolute inset-0" style={{ background: TONES[tone] || TONES.forest }}>
          {grid && <div className="jj-grid-lines absolute inset-0 opacity-40" />}
          {Icon && !src && <Icon className="absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 text-white/[.07]" strokeWidth={0.55} />}
          {!src && <div className="jj-grain" />}
          {!src && <span className="jj-mono absolute bottom-5 left-5 text-[10px] uppercase tracking-[.22em] text-white/40">Photo — {label}</span>}
        </div>
      )}
      {src && (
        fit === "contain"
          ? <img src={src} alt="" className="absolute inset-x-0 bottom-0 h-[92%] w-full object-contain object-bottom" />
          : <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: focus }} />
      )}
      {overlay !== "none" && <div className={`pointer-events-none absolute inset-0 ${overlayClass}`} />}
    </div>
  );
}

export function useLocalScroll(offset = ["start start", "end end"]) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset });
  return [ref, scrollYProgress];
}

export function Kicker({ index, children, tone = "light" }) {
  return (
    <p className={`jj-mono text-xs uppercase tracking-[.24em] ${tone === "dark" ? "text-[#45c59b]" : "text-[#0d8b68]"}`}>
      {index != null ? `${String(index).padStart(2, "0")} · ` : ""}{children}
    </p>
  );
}

export function MaskLine({ children, delay = 0, className = "" }) {
  return (
    <span className="block overflow-hidden pb-[.1em]">
      <Motion.span
        className={`block ${className}`}
        initial={{ y: "110%" }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, margin: "-70px" }}
        transition={{ duration: 0.85, delay, ease: EASE_OUT }}
      >
        {children}
      </Motion.span>
    </span>
  );
}

export function Reveal({ children, className = "", delay = 0, y = 24 }) {
  return (
    <Motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </Motion.div>
  );
}

export function CountUp({ to, duration = 1.4, decimals = 0, prefix = "", suffix = "", className = "" }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? to : 0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started || reduce) return;
    let raf, t0;
    const tick = (t) => {
      if (!t0) t0 = t;
      const p = Math.min((t - t0) / (duration * 1000), 1);
      setN(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, to, duration, reduce]);

  return (
    <Motion.span className={className} onViewportEnter={() => setStarted(true)} viewport={{ once: true, margin: "-40px" }}>
      {prefix}{n.toFixed(decimals)}{suffix}
    </Motion.span>
  );
}

export function Metric({ label, value, detail, dark = false, delay = 0 }) {
  return (
    <Reveal delay={delay} className={`rounded-[1.4rem] p-6 ${dark ? "bg-white/10 text-white" : "bg-white shadow-sm"}`}>
      <p className={`jj-mono text-[10px] uppercase tracking-[.2em] ${dark ? "text-[#91cdb7]" : "text-[#668078]"}`}>{label}</p>
      <p className="mt-5 text-4xl font-semibold tracking-[-.06em]">{value}</p>
      {detail && <p className={`mt-2 text-sm ${dark ? "text-white/55" : "text-[#71837d]"}`}>{detail}</p>}
    </Reveal>
  );
}

function Dot({ progress, i, count }) {
  const active = useTransform(progress, [(i - 0.4) / count, i / count, (i + 0.4) / count], [0.25, 1, 0.25]);
  return <Motion.span style={{ opacity: active }} className="h-1.5 w-1.5 rounded-full bg-white" />;
}

export function ScrollDots({ progress, count }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }).map((_, i) => <Dot key={i} progress={progress} i={i} count={count} />)}
    </div>
  );
}

export function clamp01(v) { return Math.min(1, Math.max(0, v)); }
