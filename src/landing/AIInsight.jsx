import { useEffect, useState } from "react";
import { motion as Motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { EASE, EASE_OUT, Kicker, Reveal } from "./shared";

const INSIGHTS = [
  { tag: "Today's insight", text: "Your activity was higher than your weekly average today." },
  { tag: "Sleep insight", text: "Your sleep duration improved compared with your recent average." },
  { tag: "Activity insight", text: "You maintained consistent movement throughout the day." },
];

function Typewriter({ text, active }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? text.length : 0);

  useEffect(() => {
    if (!active || reduce) return;
    setN(0);
    const id = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(id), v) : v + 1)), 16);
    return () => clearInterval(id);
  }, [active, text, reduce]);

  return <span>{text.slice(0, n)}</span>;
}

function InsightCard({ item, index, active }) {
  const offset = active - index;
  return (
    <Motion.div
      animate={{
        y: offset === 0 ? 0 : offset > 0 ? -offset * 14 : 40,
        scale: offset === 0 ? 1 : 1 - Math.min(offset, 3) * 0.04,
        opacity: offset < 0 ? 0 : 1,
        zIndex: 10 - offset,
        pointerEvents: offset < 0 ? "none" : "auto",
      }}
      transition={{ duration: 0.6, ease: EASE }}
      className="absolute inset-0 rounded-[1.6rem] border border-white/10 bg-[#10211d] p-8 shadow-2xl"
    >
      <p className="jj-mono text-[10px] uppercase tracking-[.2em] text-[#45c59b]">{item.tag}</p>
      <p className="mt-5 text-xl font-medium leading-relaxed text-white">
        {offset === 0 ? <Typewriter text={item.text} active={offset === 0} /> : item.text}
      </p>
    </Motion.div>
  );
}

export default function AIInsight() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setActive((a) => (a + 1) % INSIGHTS.length), 3200);
    return () => clearInterval(id);
  }, [playing]);

  return (
    <section id="ai" className="jj-dark relative px-6 py-24 lg:px-10 lg:py-36">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <Kicker index={5} tone="dark">The intelligence layer</Kicker>
          <h2 className="mt-5 max-w-2xl text-5xl font-semibold leading-[.98] text-white sm:text-7xl">
            Data is only the beginning.<br /><span className="text-[#45c59b]">Turn it into understanding.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <Reveal delay={0.1} className="flex justify-center">
            <div className="relative flex h-52 w-52 items-center justify-center">
              <Motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute h-40 w-40 rounded-full bg-[#45c59b]/20 blur-2xl" />
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-[#45c59b]/40 bg-[#10211d]">
                <Sparkles className="h-9 w-9 text-[#45c59b]" />
              </div>
              {Array.from({ length: 10 }).map((_, i) => {
                const angle = (i / 10) * Math.PI * 2;
                return (
                  <Motion.span
                    key={i}
                    initial={{ x: Math.cos(angle) * 120, y: Math.sin(angle) * 120, opacity: 0 }}
                    whileInView={{ x: Math.cos(angle) * 70, y: Math.sin(angle) * 70, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: i * 0.05, ease: EASE_OUT }}
                    className="absolute h-1.5 w-1.5 rounded-full bg-[#45c59b]"
                  />
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <Motion.div
              className="relative h-56"
              viewport={{ once: false, amount: 0.6 }}
              onViewportEnter={() => setPlaying(true)}
              onViewportLeave={() => setPlaying(false)}
            >
              {INSIGHTS.map((item, i) => <InsightCard key={item.tag} item={item} index={i} active={active} />)}
            </Motion.div>
            <div className="mt-8 flex gap-2">
              {INSIGHTS.map((_, i) => (
                <button key={i} onClick={() => setActive(i)} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= active ? "bg-[#45c59b]" : "bg-white/15"}`} />
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
