import { useEffect, useState } from "react";
import { motion as Motion, useScroll, useSpring } from "framer-motion";
import { ArrowRight } from "lucide-react";
import jjlogo from "../assets/jjlogo.png";

const LINKS = [
  ["Health", "data"],
  ["Fitness", "fitness"],
  ["Family", "family"],
  ["AI", "ai"],
  ["Community", "community"],
  ["Technology", "technology"],
];

export default function Nav({ onNavigate, onStart }) {
  const { scrollYProgress, scrollY } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    return scrollY.on("change", (y) => setCompact(y > 60));
  }, [scrollY]);

  return (
    <>
      <Motion.div className="fixed left-0 top-0 z-[80] h-[3px] w-full origin-left bg-[#45c59b]" style={{ scaleX: progress }} />
      <header className="fixed top-0 z-[70] w-full text-white">
        <nav
          className={`mx-auto flex max-w-7xl items-center justify-between bg-transparent px-6 transition-[padding] duration-300 lg:px-10 ${compact ? "py-2.5" : "py-4"}`}
        >
          <button onClick={() => onNavigate("top")} className="flex items-center gap-3">
            <img src={jjlogo} alt="Digital Care" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-sm font-semibold tracking-[.14em]">DIGITAL CARE</span>
          </button>
          <div className="hidden items-center gap-8 text-sm text-white/60 lg:flex">
            {LINKS.map(([label, id]) => (
              <button key={id} onClick={() => onNavigate(id)} className="group relative py-1">
                {label}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[#45c59b] transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
          </div>
          <button onClick={onStart} className="rounded-full bg-[#45c59b] px-4 py-2 text-sm font-semibold text-[#10211d] transition-transform hover:scale-105">
            Get started <ArrowRight className="ml-1 inline h-4 w-4" />
          </button>
        </nav>
      </header>
    </>
  );
}
