import { cubicBezier, motion as Motion, useSpring, useTransform } from "framer-motion";
import { Cloud, Heart, MapPin, Smartphone, Users } from "lucide-react";
import { useLocalScroll, Visual } from "./shared";

const EASE = cubicBezier(0.16, 1, 0.3, 1); // premium expo-out

function FlowNode({ Icon, label, progress, at }) {
  const opacity = useTransform(progress, [at, at + 0.1], [0, 1], { ease: EASE });
  const y = useTransform(progress, [at, at + 0.1], [14, 0], { ease: EASE });
  const iconScale = useTransform(progress, [at, at + 0.06, at + 0.12], [0.6, 1.15, 1]);

  return (
    <Motion.div style={{ opacity, y }} className="flex items-center gap-3">
      <Motion.div style={{ scale: iconScale }} className="rounded-full bg-white/10 p-2.5 ring-1 ring-white/10">
        <Icon className="h-4 w-4 text-[#45c59b]" />
      </Motion.div>
      <span className="jj-mono text-xs uppercase tracking-[.16em] text-white/70">{label}</span>
    </Motion.div>
  );
}

function FlowConnector({ progress, at }) {
  const scaleY = useTransform(progress, [at, at + 0.08], [0, 1], { ease: EASE });
  return (
    <div className="relative ml-4 h-5 w-px overflow-hidden bg-white/10">
      <Motion.div
        style={{ scaleY }}
        className="absolute inset-0 origin-top bg-gradient-to-b from-[#45c59b] to-[#45c59b]/20"
      />
    </div>
  );
}

export default function FamilyMonitoring() {
  const [ref, rawProgress] = useLocalScroll(["start start", "end end"]);
  // Spring-smooth the raw scroll progress so every transform below glides
  // instead of ticking with the scroll event — this is what makes it feel "cooler".
  const progress = useSpring(rawProgress, { stiffness: 260, damping: 38, mass: 0.4 });

  const photoScale = useTransform(progress, [0, 0.5], [1, 1.5], { ease: EASE });
  const photoOpacity = useTransform(progress, [0.55, 0.8], [1, 0.25], { ease: EASE });
  const photoBlur = useTransform(progress, [0.55, 0.8], [0, 6]);
  const photoFilter = useTransform(photoBlur, (v) => `blur(${v}px)`);

  const glowOpacity = useTransform(progress, [0, 0.3, 0.6], [0.5, 0.9, 0.3]);
  const glowScale = useTransform(progress, [0, 0.6], [0.8, 1.3], { ease: EASE });

  const chipsOpacity = useTransform(progress, [0.2, 0.32], [0, 1], { ease: EASE });
  const chipsY = useTransform(progress, [0.2, 0.32], [12, 0], { ease: EASE });

  const flowOpacity = useTransform(progress, [0.34, 0.44, 0.85, 0.95], [0, 1, 1, 0]);

  const cardOpacity = useTransform(progress, [0.63, 0.78], [0, 1], { ease: EASE });
  const cardX = useTransform(progress, [0.63, 0.85], [50, 0], { ease: EASE });
  const cardScale = useTransform(progress, [0.63, 0.85], [0.92, 1], { ease: EASE });

  const headlineAOpacity = useTransform(progress, [0, 0.05, 0.38, 0.48], [1, 1, 1, 0]);
  const headlineAY = useTransform(progress, [0.38, 0.48], [0, -10], { ease: EASE });
  const headlineBOpacity = useTransform(progress, [0.53, 0.64], [0, 1], { ease: EASE });
  const headlineBY = useTransform(progress, [0.53, 0.64], [10, 0], { ease: EASE });

  return (
    <section id="family" ref={ref} className="jj-dark relative h-[460vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* ambient breathing glow behind the photo, purely decorative */}
        <Motion.div
          style={{ opacity: glowOpacity, scale: glowScale }}
          className="pointer-events-none absolute -right-[10%] top-[10%] h-[60vh] w-[60vh] rounded-full bg-[#45c59b]/25 blur-[110px]"
        />

        <Motion.div
          style={{ scale: photoScale, opacity: photoOpacity, filter: photoFilter, transformOrigin: "70% 45%" }}
          className="absolute inset-0"
        >
          <Visual id="familyParent" tone="ember" label="parent in Nepal wearing the band" className="h-full w-full" overlay="left" />
        </Motion.div>

        <Motion.div style={{ opacity: chipsOpacity, y: chipsY }} className="pointer-events-none absolute right-[14%] top-[30%] flex flex-col gap-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-xl">
            <p className="jj-mono text-[9px] text-white/50">HEART RATE</p>
            <p className="mt-1 flex items-baseline gap-1 text-2xl font-semibold">
              74
              <Motion.span
                className="text-xs font-normal text-[#45c59b]"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              >
                BPM
              </Motion.span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-xl">
            <p className="jj-mono text-[9px] text-white/50">SLEEP</p>
            <p className="mt-1 text-2xl font-semibold">7h 12m</p>
          </div>
        </Motion.div>

        <div className="relative mx-auto flex h-full max-w-7xl items-center px-6 lg:px-10">
          <div className="grid w-full items-center gap-10 lg:grid-cols-2">
            <div className="relative h-[100px] max-w-xl sm:h-[130px]">
              <Motion.h2
                style={{ opacity: headlineAOpacity, y: headlineAY }}
                className="absolute inset-0 text-5xl font-semibold leading-[1] tracking-[-.05em] text-white sm:text-6xl"
              >
                Care doesn't stop<br /><span className="text-[#45c59b]">at distance.</span>
              </Motion.h2>
              <Motion.h2
                style={{ opacity: headlineBOpacity, y: headlineBY }}
                className="absolute inset-0 text-5xl font-semibold leading-[1] tracking-[-.05em] text-white sm:text-6xl"
              >
                Be there.<br /><span className="text-[#45c59b]">Even when you can't.</span>
              </Motion.h2>
            </div>

            <div className="flex flex-col items-start gap-5">
              <Motion.div style={{ opacity: flowOpacity }} className="flex flex-col gap-4 rounded-[1.6rem] border border-white/10 bg-white/[.04] p-6 backdrop-blur-sm">
                <FlowNode Icon={MapPin} label="Nepal" progress={progress} at={0.34} />
                <FlowConnector progress={progress} at={0.4} />
                <FlowNode Icon={Cloud} label="Jeewan Jyoti Cloud" progress={progress} at={0.44} />
                <FlowConnector progress={progress} at={0.5} />
                <FlowNode Icon={Smartphone} label="Mobile phone" progress={progress} at={0.54} />
                <FlowConnector progress={progress} at={0.6} />
                <FlowNode Icon={Users} label="Family abroad" progress={progress} at={0.64} />
              </Motion.div>

              <Motion.div
                style={{ opacity: cardOpacity, x: cardX, scale: cardScale }}
                className="w-full max-w-xs rounded-[1.6rem] bg-white p-6 text-[#10211d] shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <p className="jj-mono flex items-center gap-1.5 text-[9px] uppercase tracking-[.18em] text-[#71837d]">
                    <Motion.span
                      className="inline-block h-1.5 w-1.5 rounded-full bg-[#0d8b68]"
                      animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    />
                    Mom · Live
                  </p>
                  <Motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Heart className="h-4 w-4 text-[#0d8b68]" />
                  </Motion.div>
                </div>
                <p className="mt-4 text-3xl font-semibold">74 <small className="text-sm font-normal text-[#71837d]">BPM</small></p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-[#71837d]">Sleep</p><p className="font-semibold">7h 12m</p></div>
                  <div><p className="text-[#71837d]">Activity</p><p className="font-semibold text-[#0d8b68]">Good</p></div>
                </div>
                <p className="mt-4 text-xs text-[#71837d]">Last sync · 2 min ago</p>
              </Motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}