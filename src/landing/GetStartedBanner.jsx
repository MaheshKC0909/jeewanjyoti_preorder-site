import { useNavigate } from "react-router-dom";
import { ArrowRight, QrCode } from "lucide-react";
import { Kicker, Reveal, Visual } from "./shared";

export default function GetStartedBanner() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="relative overflow-hidden bg-white px-6 py-28 lg:px-10 lg:py-36">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <Kicker index={10}>Get started</Kicker>
          <h2 className="mt-5 text-5xl font-semibold leading-[.98] sm:text-6xl">
            Ready to bring<br /><span className="text-[#0d8b68]">Digital Care home?</span>
          </h2>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#5c7169]">
            Find out how to purchase the device, download the app for Android or iOS,
            and get answers to common questions — all on one page.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/get-started")}
              className="inline-flex items-center gap-2 rounded-full bg-[#0d8b68] px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </button>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 px-5 py-3.5 text-sm font-medium text-[#5c7169]">
              <QrCode className="h-4 w-4 text-[#0d8b68]" /> App QR codes inside
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="overflow-hidden rounded-[1.75rem] border border-black/10">
          <Visual id="deviceFront" label="Digital Care device" className="h-72 w-full sm:h-96" focus="40% 50%" overlay="bottom" />
        </Reveal>
      </div>
    </section>
  );
}
