import { motion as Motion, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { MaskLine, useLocalScroll, Visual } from "./shared";

const IMAGES = [
  { id: "finalParent", label: "parent", tone: "ember" },
  { id: "finalYoungAdult", label: "young adult", tone: "electric" },
  { id: "finalAthlete", label: "athlete", tone: "ocean" },
  { id: "finalFamily", label: "family", tone: "forest" },
];

const LINES = [
  "It's understanding your body.",
  "It's staying active.",
  "It's caring for family.",
  "It's knowing more about your everyday health.",
];

function CrossfadeImage({ img, index, progress }) {
  const n = IMAGES.length;
  const step = 1 / n;
  const start = index * step;
  const end = start + step;
  const opacity = useTransform(progress, [start, start + 0.03, end - 0.03, end], [0, 1, 1, 0]);
  return (
    <Motion.div style={{ opacity }} className="absolute inset-0">
      <Visual id={img.id} tone={img.tone} label={img.label} className="h-full w-full" overlay="full" />
    </Motion.div>
  );
}

export default function FinalCTA({ onStart, onNavigate }) {
  const [ref, progress] = useLocalScroll(["start start", "end end"]);

  return (
    <section ref={ref} className="relative h-[280vh]">
      <div className="sticky top-0 h-screen overflow-hidden text-center text-white">
        {IMAGES.map((img, i) => <CrossfadeImage key={img.id} img={img} index={i} progress={progress} />)}
        <div className="absolute inset-0 bg-black/45" />

        <div className="relative z-10 mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-6">
          <h2 className="text-5xl font-semibold leading-[.95] sm:text-7xl">
            <MaskLine>Health is more</MaskLine>
            <MaskLine delay={0.1} className="text-[#45c59b]">than numbers.</MaskLine>
          </h2>

          <div className="mt-8 space-y-1.5 text-lg text-white/75 sm:text-xl">
            {LINES.map((line, i) => <MaskLine key={line} delay={0.2 + i * 0.08}>{line}</MaskLine>)}
          </div>

          <h3 className="mt-14 text-4xl font-semibold leading-[.95] sm:text-6xl">
            <MaskLine delay={0.55}>Your health.</MaskLine>
            <MaskLine delay={0.65} className="text-[#45c59b]">Always connected.</MaskLine>
          </h3>

          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.85, duration: 0.7 }}
            className="mt-10 flex flex-wrap justify-center gap-3"
          >
            <button onClick={onStart} className="rounded-full bg-[#45c59b] px-7 py-4 font-semibold text-[#10211d] transition-transform hover:scale-[1.03]">
              Get started <ArrowRight className="ml-2 inline h-4 w-4" />
            </button>
            <button onClick={() => onNavigate("top")} className="rounded-full border border-white/30 px-7 py-4 font-semibold text-white transition-colors hover:bg-white/10">
              Explore Digital Care
            </button>
          </Motion.div>
        </div>
      </div>
    </section>
  );
}
