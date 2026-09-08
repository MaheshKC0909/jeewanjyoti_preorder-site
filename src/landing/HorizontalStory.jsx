import { motion as Motion, useTransform } from "framer-motion";
import { ScrollDots, useLocalScroll, Visual } from "./shared";

function Panel({ panel, index, count, progress }) {
  const center = index / (count - 1 || 1);
  const scale = useTransform(progress, [center - 0.5 / count, center, center + 0.5 / count], [0.92, 1, 0.92]);
  const opacity = useTransform(progress, [center - 0.6 / count, center, center + 0.6 / count], [0.55, 1, 0.55]);

  return (
    <Motion.div style={{ scale, opacity }} className="relative h-full w-screen shrink-0 overflow-hidden">
      <Visual id={panel.media} tone={panel.tone} label={panel.label} className="absolute inset-0 h-full w-full" overlay={panel.overlay || "bottom"} focus={panel.focus} fit={panel.fit} />
      <div className="absolute inset-0 flex flex-col justify-end p-8 text-white sm:p-16">
        <p className="jj-mono text-xs uppercase tracking-[.24em] text-[#45c59b]">{String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</p>
        <h3 className="mt-4 text-6xl font-semibold tracking-[-.05em] sm:text-8xl">{panel.label}</h3>
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
