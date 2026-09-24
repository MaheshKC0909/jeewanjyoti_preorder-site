import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import {
  ArrowRight, ChevronDown, Mail, MessageCircle, Phone,
  QrCode, ShieldCheck, Smartphone, Truck, UserPlus,
} from "lucide-react";
import AppHeader from "../components/AppHeader";
import { GLOBAL_STYLES, Reveal } from "../landing/shared";

// Placeholder copy — swap in the real purchase flow, contact details and FAQ.
const PURCHASE_STEPS = [
  { Icon: MessageCircle, title: "Reach out to our team", body: "Contact us by phone, email or WhatsApp to check device availability in your area." },
  { Icon: ShieldCheck, title: "Confirm your order", body: "We'll confirm pricing, delivery timeline and answer any questions before you commit." },
  { Icon: Truck, title: "Receive your device", body: "Your Digital Care wearable arrives at your doorstep, ready to pair out of the box." },
  { Icon: UserPlus, title: "Activate & start tracking", body: "Create your account in the app, pair the device, and your dashboard goes live instantly." },
];

const FAQ = [
  { q: "Is Digital Care available outside Nepal?", a: "We currently ship within Nepal. Reach out to our team and we'll let you know as soon as we expand elsewhere." },
  { q: "What payment methods do you accept?", a: "We accept Khalti along with major bank transfers. Our team will share the exact options when confirming your order." },
  { q: "Can I return or exchange the device?", a: "Yes — devices can be exchanged within 7 days of delivery if there's a manufacturing issue. Contact support to start a return." },
  { q: "Is my health data kept private?", a: "Your health data is encrypted and only shared with the family members or care contacts you explicitly add." },
];

function FaqItem({ item, isOpen, onToggle }) {
  return (
    <div className="border-b border-black/8 py-5">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-4 text-left">
        <span className="text-[15px] font-semibold text-[#10211d]">{item.q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#0d8b68] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5c7169]">{item.a}</p>}
    </div>
  );
}

function AppQrCard({ platform, note }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-[1.5rem] border border-black/10 bg-white p-8 text-center">
      <Smartphone className="h-6 w-6 text-[#0d8b68]" />
      <h3 className="text-lg font-semibold text-[#10211d]">{platform}</h3>
      <div className="flex h-36 w-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/15 bg-[#f5f8f5]">
        <QrCode className="h-9 w-9 text-black/25" />
        <span className="text-[11px] font-medium uppercase tracking-[.12em] text-black/35">Coming soon</span>
      </div>
      <p className="max-w-[220px] text-xs leading-relaxed text-[#8a9b94]">{note}</p>
    </div>
  );
}

export default function GetStarted() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="jj-story min-h-screen overflow-x-clip bg-white">
      <style>{GLOBAL_STYLES}</style>
      <AppHeader />

      <section className="jj-dark relative px-6 pb-24 pt-40 lg:px-10 lg:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="jj-mono text-xs uppercase tracking-[.24em] text-[#45c59b]">Get started</p>
            <h1 className="mt-5 text-5xl font-semibold leading-[.98] text-white sm:text-7xl">
              Bring Digital Care<br /><span className="text-[#45c59b]">into your home.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-white/60">
              Everything you need to purchase your device, install the app, and get your
              first questions answered — in one place.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-2xl">
            <p className="jj-mono text-xs uppercase tracking-[.24em] text-[#0d8b68]">How to purchase</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.02] text-[#10211d] sm:text-5xl">Four steps from<br />interest to insight.</h2>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PURCHASE_STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08} className="rounded-[1.5rem] border border-black/8 bg-[#f9fbf9] p-6">
                <span className="jj-mono text-xs text-[#8a9b94]">{String(i + 1).padStart(2, "0")}</span>
                <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#0d8b68]/10">
                  <step.Icon className="h-5 w-5 text-[#0d8b68]" />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-[#10211d]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5c7169]">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f5f8f5] px-6 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-2xl">
            <p className="jj-mono text-xs uppercase tracking-[.24em] text-[#0d8b68]">Get the app</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.02] text-[#10211d] sm:text-5xl">Scan to install on<br />Android or iOS.</h2>
            <p className="mt-4 text-sm leading-relaxed text-[#5c7169]">
              The Digital Care app isn't published to the app stores yet — QR codes will
              go live here as soon as it is. Until then, register on the web to get set up.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 sm:max-w-xl">
            <AppQrCard platform="Android" note="Scan with your camera to open Digital Care on Google Play once it's live." />
            <AppQrCard platform="iOS" note="Scan with your camera to open Digital Care on the App Store once it's live." />
          </div>

          <Motion.button
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            onClick={() => navigate("/register")}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#0d8b68] px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            Register on the web instead <ArrowRight className="h-4 w-4" />
          </Motion.button>
        </div>
      </section>

      <section className="px-6 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.1fr_.9fr]">
          <Reveal>
            <p className="jj-mono text-xs uppercase tracking-[.24em] text-[#0d8b68]">Have questions?</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.02] text-[#10211d] sm:text-5xl">Common queries.</h2>
            <div className="mt-8">
              {FAQ.map((item, i) => (
                <FaqItem key={item.q} item={item} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="h-fit rounded-[1.75rem] border border-black/10 bg-[#f9fbf9] p-8">
            <h3 className="text-lg font-semibold text-[#10211d]">Still stuck? Talk to us.</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#5c7169]">Our team typically replies within one business day.</p>
            <div className="mt-6 flex flex-col gap-4">
              <a href="mailto:support@digitalcare.care" className="flex items-center gap-3 text-sm font-medium text-[#10211d] hover:text-[#0d8b68]">
                <Mail className="h-4 w-4 text-[#0d8b68]" /> support@digitalcare.care
              </a>
              <a href="tel:+9779800000000" className="flex items-center gap-3 text-sm font-medium text-[#10211d] hover:text-[#0d8b68]">
                <Phone className="h-4 w-4 text-[#0d8b68]" /> +977-98-0000-0000
              </a>
            </div>
            <p className="mt-6 text-xs text-[#8a9b94]">Placeholder contact details — update with your real support email and phone number.</p>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
