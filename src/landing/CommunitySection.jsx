import { Heart, MessageCircle, Share2, Trophy } from "lucide-react";
import { Kicker, Reveal } from "./shared";

const LEADERBOARD = [
  ["Aarav", "92,410"],
  ["Maya", "88,204"],
  ["You", "84,260"],
  ["Sita", "79,110"],
];

export default function CommunitySection() {
  return (
    <section id="community" className="jj-dark px-6 py-24 lg:px-10 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <Reveal className="max-w-2xl">
          <Kicker index={8} tone="dark">Better together</Kicker>
          <h2 className="mt-5 text-5xl font-semibold leading-[.98] text-white sm:text-7xl">Health is better<br /><span className="text-[#45c59b]">together.</span></h2>
        </Reveal>

        <Reveal delay={0.1} className="mt-14 max-w-xl rounded-[1.8rem] border border-white/10 bg-white/[.05] p-7">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#45c59b]/20" />
            <div><p className="text-sm font-semibold text-white">Raj Thapa</p><p className="text-xs text-white/45">2 hours ago</p></div>
          </div>
          <p className="mt-5 text-xl font-medium leading-relaxed text-white">Completed my 10K step challenge. 🎉</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[["10,284", "steps"], ["12.4", "km"], ["1,024", "kcal"]].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-white/5 p-3 text-center"><p className="text-lg font-semibold text-white">{v}</p><p className="jj-mono text-[9px] uppercase tracking-[.16em] text-white/40">{l}</p></div>
            ))}
          </div>
          <div className="mt-5 flex gap-6 border-t border-white/10 pt-4 text-sm text-white/55">
            <span className="flex items-center gap-2"><Heart className="h-4 w-4" /> 214</span>
            <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> 38</span>
            <span className="flex items-center gap-2"><Share2 className="h-4 w-4" /> Share</span>
          </div>
        </Reveal>

        <div className="jj-scrollbar-none mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
          <Reveal delay={0.05} className="w-[85%] shrink-0 snap-start rounded-[1.8rem] bg-[#0d8b68] p-7 text-white sm:w-[380px]">
            <p className="jj-mono text-[10px] uppercase tracking-[.18em] text-white/65">30-day walking challenge</p>
            <p className="mt-5 text-3xl font-semibold">1,284 participants</p>
            <div className="mt-8 h-2 rounded-full bg-white/20"><div className="h-full w-[72%] rounded-full bg-[#a5f4ce]" /></div>
            <p className="mt-3 text-sm text-white/70">72% complete</p>
          </Reveal>

          <Reveal delay={0.1} className="w-[85%] shrink-0 snap-start rounded-[1.8rem] border border-white/10 bg-white/[.05] p-7 sm:w-[380px]">
            <p className="jj-mono flex items-center gap-2 text-[10px] uppercase tracking-[.18em] text-[#45c59b]"><Trophy className="h-4 w-4" /> Leaderboard</p>
            <div className="mt-5 space-y-4">
              {LEADERBOARD.map(([name, steps], i) => (
                <div key={name} className="flex items-center justify-between border-b border-white/10 pb-3 text-sm text-white">
                  <span><b className="mr-3 text-[#45c59b]">{String(i + 1).padStart(2, "0")}</b>{name}</span>
                  <span className="text-white/45">{steps}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15} className="w-[85%] shrink-0 snap-start rounded-[1.8rem] border border-white/10 bg-white/[.05] p-7 sm:w-[380px]">
            <p className="jj-mono text-[10px] uppercase tracking-[.18em] text-[#45c59b]">This week</p>
            <p className="mt-5 text-3xl font-semibold text-white">3 friends</p>
            <p className="mt-2 text-sm text-white/55">passed their weekly step goal alongside you.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
