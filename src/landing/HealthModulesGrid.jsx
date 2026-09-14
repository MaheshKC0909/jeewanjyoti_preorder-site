import { motion as Motion } from "framer-motion";
import { Activity, Droplets, Gauge, HeartPulse, Moon, Waves } from "lucide-react";
import { EASE, Kicker, Reveal } from "./shared";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

function cardVariant(from = {}) {
  return {
    hidden: { opacity: 0, ...from },
    show: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE } },
  };
}

const hoverLift = {
  whileHover: { y: -6, scale: 1.015, transition: { type: "spring", stiffness: 300, damping: 20 } },
};

function Waveform() {
  return (
    <svg viewBox="0 0 360 90" className="mt-6 h-20 w-full overflow-visible">
      <Motion.path
        d="M0 60 C20 60 26 30 44 46 S70 74 90 42 S116 20 138 48 S168 70 192 38 S220 18 244 46 S276 68 300 34 S330 24 360 44"
        fill="none" stroke="#0d8b68" strokeWidth="3" strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ pathLength: { duration: 1.4, ease: EASE, delay: 0.15 }, opacity: { duration: 0.3 } }}
      />
    </svg>
  );
}

function StepBars() {
  const heights = [30, 55, 40, 70, 48, 82, 60];
  return (
    <div className="mt-6 flex h-16 items-end gap-2">
      {heights.map((h, i) => (
        <Motion.span
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: i * 0.06, type: "spring", stiffness: 210, damping: 18 }}
          className="flex-1 rounded-t bg-[#45c59b]/70"
        />
      ))}
    </div>
  );
}

export default function HealthModulesGrid() {
  return (
    <section id="data" className="px-6 py-24 lg:px-10 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <Kicker index={2}>The signals</Kicker>
          <h2 className="mt-5 max-w-2xl text-5xl font-semibold leading-[.98] sm:text-7xl">
            Every metric,<br /><span className="text-[#0d8b68]">in one place.</span>
          </h2>
        </Reveal>

        <Motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={container}
          className="mt-16 grid auto-rows-[minmax(160px,auto)] gap-4 md:grid-cols-6"
        >
          <Motion.div {...hoverLift} variants={cardVariant({ x: -30 })} className="rounded-[1.6rem] bg-[#10211d] p-8 text-white md:col-span-4 md:row-span-2">
            <HeartPulse className="h-5 w-5 text-[#45c59b]" />
            <p className="jj-mono mt-6 text-xs uppercase tracking-[.2em] text-white/45">Heart rate</p>
            <p className="mt-3 text-6xl font-semibold tracking-[-.05em]">72 <small className="text-lg font-normal text-white/45">BPM</small></p>
            <Waveform />
          </Motion.div>

          <Motion.div {...hoverLift} variants={cardVariant({ scale: 0.85 })} className="rounded-[1.6rem] bg-white p-6 shadow-sm md:col-span-2">
            <Droplets className="h-5 w-5 text-[#0d8b68]" />
            <p className="jj-mono mt-5 text-xs uppercase tracking-[.2em] text-[#668078]">SpO₂</p>
            <p className="mt-3 text-5xl font-semibold tracking-[-.05em]">98%</p>
          </Motion.div>

          <Motion.div {...hoverLift} variants={cardVariant({ y: 24 })} className="rounded-[1.6rem] bg-[#dff4e9] p-6 md:col-span-2">
            <Moon className="h-5 w-5 text-[#0d8b68]" />
            <p className="jj-mono mt-5 text-xs uppercase tracking-[.2em] text-[#0d8b68]/70">Sleep</p>
            <p className="mt-3 text-4xl font-semibold tracking-[-.05em]">7h 42m</p>
            <div className="mt-4 h-1.5 rounded-full bg-[#0d8b68]/15">
              <Motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "87%" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
                className="h-full rounded-full bg-[#0d8b68]"
              />
            </div>
          </Motion.div>

          <Motion.div {...hoverLift} variants={cardVariant({ x: 30 })} className="rounded-[1.6rem] bg-white p-8 shadow-sm md:col-span-3">
            <Activity className="h-5 w-5 text-[#0d8b68]" />
            <p className="jj-mono mt-6 text-xs uppercase tracking-[.2em] text-[#668078]">Activity</p>
            <p className="mt-3 text-5xl font-semibold tracking-[-.05em]">8,426 <small className="text-base font-normal text-[#71837d]">steps</small></p>
            <StepBars />
          </Motion.div>

          <Motion.div {...hoverLift} variants={cardVariant()} className="rounded-[1.6rem] bg-[#10211d] p-6 text-white md:col-span-1">
            <Waves className="h-5 w-5 text-[#45c59b]" />
            <p className="jj-mono mt-5 text-xs uppercase tracking-[.2em] text-white/45">HRV</p>
            <p className="mt-3 text-3xl font-semibold">64 <small className="text-sm font-normal text-white/45">ms</small></p>
          </Motion.div>

          <Motion.div {...hoverLift} variants={cardVariant({ scale: 0.9 })} className="flex flex-col justify-between rounded-[1.6rem] bg-white p-6 shadow-sm md:col-span-2">
            <Gauge className="h-5 w-5 text-[#0d8b68]" />
            <div>
              <p className="jj-mono mt-5 text-xs uppercase tracking-[.2em] text-[#668078]">Stress</p>
              <p className="mt-3 inline-block rounded-full bg-[#dff4e9] px-4 py-1.5 text-lg font-semibold text-[#0d8b68]">Low</p>
            </div>
          </Motion.div>
        </Motion.div>
      </div>
    </section>
  );
}
