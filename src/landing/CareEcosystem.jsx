import { motion as Motion } from "framer-motion";
import { Activity, Brain, Heart, MapPin, Smartphone, Users, Watch, Wifi } from "lucide-react";
import { EASE, Kicker, Reveal } from "./shared";

const NODES = [
  { label: "Wearable", Icon: Watch },
  { label: "Mobile app", Icon: Smartphone },
  { label: "AI", Icon: Brain },
  { label: "Health data", Icon: Activity },
  { label: "Family", Icon: Users },
  { label: "Fitness", Icon: Heart },
  { label: "Community", Icon: Wifi },
  { label: "Remote monitoring", Icon: MapPin },
];

const R = 42;

export default function CareEcosystem() {
  const n = NODES.length;
  return (
    <section id="ecosystem" className="relative overflow-hidden bg-[#eef7f1] px-6 py-28 lg:px-10 lg:py-40">
      <div className="mx-auto max-w-5xl text-center">
        <Reveal>
          <Kicker index={11}>The connected system</Kicker>
          <h2 className="mt-5 text-5xl font-semibold leading-[.98] sm:text-7xl">One platform.<br /><span className="text-[#0d8b68]">Connected care.</span></h2>
        </Reveal>

        <div className="relative mx-auto mt-20 aspect-square w-full max-w-[560px]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            {NODES.map((_, i) => {
              const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
              const x = 50 + R * Math.cos(angle);
              const y = 50 + R * Math.sin(angle);
              return (
                <Motion.line
                  key={i}
                  x1="50" y1="50" x2={x} y2={y}
                  stroke="#0d8b68" strokeWidth="0.6" strokeDasharray="3 2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.55 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, delay: i * 0.12, ease: EASE }}
                />
              );
            })}
          </svg>

          <Reveal delay={0.1} className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-[#10211d] text-white shadow-xl">
            <span className="jj-mono text-[9px] uppercase tracking-[.14em] text-[#45c59b]">Platform</span>
            <span className="mt-1 text-sm font-semibold leading-tight">Digital<br />Care</span>
          </Reveal>

          {NODES.map((node, i) => {
            const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + R * Math.cos(angle);
            const y = 50 + R * Math.sin(angle);
            return (
              <Motion.div
                key={node.label}
                initial={{ opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: i * 0.12 + 0.15, ease: EASE }}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
              >
                <div className="rounded-full bg-white p-3 shadow-md"><node.Icon className="h-5 w-5 text-[#0d8b68]" /></div>
                <span className="jj-mono max-w-[80px] text-center text-[9px] uppercase leading-tight tracking-[.12em] text-[#63736f]">{node.label}</span>
              </Motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
