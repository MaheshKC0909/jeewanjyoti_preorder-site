import { motion as Motion } from "framer-motion";
import { Activity, Droplets, Flame, Gauge, Heart, MapPin, Moon, Trophy, Waves } from "lucide-react";
import { EASE, Kicker, Reveal } from "./shared";

const DIRECTIONS = [
  { x: -160, y: -80 }, { x: 160, y: -80 }, { x: -220, y: 0 }, { x: 220, y: 0 },
  { x: -160, y: 100 }, { x: 160, y: 100 }, { x: 0, y: -160 }, { x: 0, y: 160 }, { x: -260, y: -160 },
];

const MODULES = [
  { label: "Health score", value: "87", Icon: Trophy, dark: true, span: "md:col-span-2" },
  { label: "Sleep", value: "7h 42m", Icon: Moon },
  { label: "Heart rate", value: "72 bpm", Icon: Heart },
  { label: "Steps", value: "8,426", Icon: Activity },
  { label: "Calories", value: "642", Icon: Flame },
  { label: "Distance", value: "6.8 km", Icon: MapPin },
  { label: "Blood oxygen", value: "98%", Icon: Droplets },
  { label: "HRV", value: "64 ms", Icon: Waves },
  { label: "Stress", value: "Low", Icon: Gauge },
];

export default function DashboardModules() {
  return (
    <section className="px-6 py-24 lg:px-10 lg:py-36">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <Kicker index={7}>Data, organized</Kicker>
          <h2 className="mt-5 text-4xl font-semibold sm:text-6xl">Data <span className="text-[#0d8b68]">→</span> Organized <span className="text-[#0d8b68]">→</span> Understood.</h2>
        </Reveal>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {MODULES.map((m, i) => (
            <Motion.div
              key={m.label}
              initial={{ opacity: 0, x: DIRECTIONS[i].x, y: DIRECTIONS[i].y, scale: 0.85 }}
              whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: EASE }}
              className={`rounded-[1.6rem] p-6 ${m.dark ? "bg-[#10211d] text-white" : "bg-white shadow-sm"} ${m.span || ""}`}
            >
              <m.Icon className={`h-5 w-5 ${m.dark ? "text-[#45c59b]" : "text-[#0d8b68]"}`} />
              <p className={`jj-mono mt-5 text-[10px] uppercase tracking-[.2em] ${m.dark ? "text-white/45" : "text-[#668078]"}`}>{m.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-.05em]">{m.value}</p>
            </Motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
