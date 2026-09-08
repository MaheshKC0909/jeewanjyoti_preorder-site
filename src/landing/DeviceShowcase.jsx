import { motion as Motion, useTransform } from "framer-motion";
import { Battery, Bluetooth, Droplets, ShieldCheck, Watch } from "lucide-react";
import { Kicker, useLocalScroll, Visual } from "./shared";

const VIEWS = ["deviceFront", "deviceSide", "deviceSensor", "deviceWrist"];
const LABELS = ["Front view", "Side view", "Sensor view", "Wrist view"];

const SPECS = [
  [Watch, "Continuous monitoring"],
  [ShieldCheck, "Comfortable design"],
  [Bluetooth, "Bluetooth connectivity"],
  [Battery, "Long battery life"],
  [Droplets, "Water resistance"],
];

function View({ id, label, index, progress }) {
  const n = VIEWS.length;
  const step = 1 / n;
  const start = index * step;
  const end = start + step;
  const opacity = useTransform(progress, [start, start + 0.05, end - 0.05, end], [index === 0 ? 1 : 0, 1, 1, index === n - 1 ? 1 : 0]);
  const rotateY = useTransform(progress, [start, end], [-10, 10]);

  return (
    <Motion.div style={{ opacity, rotateY }} className="absolute inset-0 flex items-center justify-center">
      <Visual id={id} tone="steel" label={label} className="h-[420px] w-[300px] rounded-[2.5rem] sm:h-[500px] sm:w-[340px]" overlay="bottom" grid />
    </Motion.div>
  );
}

export default function DeviceShowcase() {
  const [ref, progress] = useLocalScroll(["start start", "end end"]);
  const specsOpacity = useTransform(progress, [0.82, 0.95], [0, 1]);

  return (
    <section id="technology" ref={ref} className="jj-dark relative h-[420vh]">
      <div className="sticky top-0 h-screen overflow-hidden" style={{ perspective: 1200 }}>
        <div className="mx-auto flex h-full max-w-7xl items-center px-6 lg:px-10">
          <div className="grid w-full items-center gap-10 lg:grid-cols-2">
            <div>
              <Kicker index={9}>The device</Kicker>
              <h2 className="mt-5 text-5xl font-semibold leading-[.98] text-white sm:text-7xl">Built to<br /><span className="text-[#45c59b]">stay with you.</span></h2>
              <Motion.div style={{ opacity: specsOpacity }} className="mt-10 flex flex-col gap-4">
                {SPECS.map(([Icon, label]) => (
                  <div key={label} className="flex items-center gap-3 text-white/80">
                    <div className="rounded-full bg-white/10 p-2"><Icon className="h-4 w-4 text-[#45c59b]" /></div>
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </Motion.div>
            </div>
            <div className="relative h-[520px]">
              {VIEWS.map((id, i) => <View key={id} id={id} label={LABELS[i]} index={i} progress={progress} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
