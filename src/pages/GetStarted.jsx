import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Mail,
  MessageCircle,
  Phone,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Truck,
  UserPlus,
  Sparkles,
  HeartPulse,
} from "lucide-react";

import AppHeader from "../components/AppHeader";
import { GLOBAL_STYLES, Reveal } from "../landing/shared";

const API_BASE = "https://jeewanjyoti-backend.smart.org.np";

// Public endpoint — no authentication required.
const PREBOOKING_PUBLIC_URL = `${API_BASE}/api/prebooking/public/`;

const toAbsolute = (url) =>
  url && url.startsWith("/") ? `${API_BASE}${url}` : url;

const hostLabel = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

// -----------------------------------------------------------------------------
// PUBLIC DOWNLOAD INPUTS
// -----------------------------------------------------------------------------

function useDownloadInputs() {
  const [inputs, setInputs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(PREBOOKING_PUBLIC_URL);

        if (!res.ok) return;

        const record = await res.json();

        if (
          !cancelled &&
          record &&
          typeof record === "object" &&
          record.is_active !== false
        ) {
          setInputs(record);
        }
      } catch (e) {
        console.error("Download inputs load error:", e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { inputs, loading };
}

// -----------------------------------------------------------------------------
// PURCHASE STEPS
// -----------------------------------------------------------------------------

const PURCHASE_STEPS = [
  {
    Icon: MessageCircle,
    number: "01",
    title: "Talk to our team",
    body: "Reach out by phone, email or WhatsApp to check availability and get answers to your questions.",
  },
  {
    Icon: ShieldCheck,
    number: "02",
    title: "Confirm your order",
    body: "We'll confirm pricing, delivery details and everything you need before placing your order.",
  },
  {
    Icon: Truck,
    number: "03",
    title: "Receive your device",
    body: "Your Digital Care wearable arrives at your doorstep, ready to pair with the app.",
  },
  {
    Icon: UserPlus,
    number: "04",
    title: "Activate & connect",
    body: "Create your account, pair your wearable and start seeing your health insights.",
  },
];

// -----------------------------------------------------------------------------
// FAQ
// -----------------------------------------------------------------------------

const FAQ = [
  {
    q: "Is Digital Care available outside Nepal?",
    a: "We currently ship within Nepal. Reach out to our team and we'll let you know as soon as we expand elsewhere.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept Khalti along with major bank transfers. Our team will share the exact options when confirming your order.",
  },
  {
    q: "Can I return or exchange the device?",
    a: "Yes — devices can be exchanged within 7 days of delivery if there's a manufacturing issue. Contact support to start a return.",
  },
  {
    q: "Is my health data kept private?",
    a: "Your health data is encrypted and only shared with the family members or care contacts you explicitly add.",
  },
];

// -----------------------------------------------------------------------------
// FAQ ITEM
// -----------------------------------------------------------------------------

function FaqItem({ item, isOpen, onToggle }) {
  return (
    <div
      className={`group border-b transition-colors ${
        isOpen
          ? "border-[#0d8b68]/25"
          : "border-black/[0.07]"
      }`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-6 py-6 text-left"
        aria-expanded={isOpen}
      >
        <span
          className={`text-[15px] font-semibold transition-colors sm:text-base ${
            isOpen
              ? "text-[#0d8b68]"
              : "text-[#10211d] group-hover:text-[#0d8b68]"
          }`}
        >
          {item.q}
        </span>

        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
            isOpen
              ? "bg-[#0d8b68] text-white"
              : "bg-[#f1f5f2] text-[#0d8b68] group-hover:bg-[#0d8b68]/10"
          }`}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      <Motion.div
        initial={false}
        animate={{
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0,
        }}
        className="overflow-hidden"
      >
        <p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-[#5c7169]">
          {item.a}
        </p>
      </Motion.div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// APP QR CARD
// -----------------------------------------------------------------------------

function AppQrCard({
  platform,
  store,
  qr,
  url,
  loading,
  icon,
}) {
  return (
    <Motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25 }}
      className="group relative overflow-hidden rounded-[2rem] border border-black/[0.07] bg-white p-6 shadow-[0_15px_50px_rgba(16,33,29,0.06)] sm:p-8"
    >
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[#45c59b]/10 blur-3xl transition-opacity group-hover:opacity-100" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0d8b68]/10">
              {icon}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8a9b94]">
                Download for
              </p>

              <h3 className="mt-0.5 text-lg font-semibold text-[#10211d]">
                {platform}
              </h3>
            </div>
          </div>

          <span className="rounded-full bg-[#f1f7f3] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#0d8b68]">
            {qr ? "Available" : "Soon"}
          </span>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="relative">
            {qr ? (
              <>
                <div className="absolute -inset-3 rounded-[1.5rem] bg-[#45c59b]/10 blur-xl" />

                <div className="relative rounded-[1.5rem] border border-black/[0.07] bg-white p-3 shadow-sm">
                  <img
                    src={qr}
                    alt={`${platform} app QR code`}
                    className="h-44 w-44 rounded-xl object-contain sm:h-48 sm:w-48"
                  />
                </div>
              </>
            ) : (
              <div className="flex h-48 w-48 flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-black/10 bg-[#f7faf8]">
                <QrCode
                  className={`h-10 w-10 text-black/20 ${
                    loading ? "animate-pulse" : ""
                  }`}
                />

                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">
                  {loading ? "Loading" : "Coming soon"}
                </span>
              </div>
            )}
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-[260px] text-center text-xs leading-6 text-[#8a9b94]">
          {qr
            ? "Scan the QR code with your phone camera to install Digital Care."
            : `The ${platform} app will be available here soon.`}
        </p>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#10211d] px-5 py-3.5 text-xs font-semibold text-white transition-all hover:bg-[#0d8b68] hover:shadow-lg hover:shadow-[#0d8b68]/20"
          >
            Open {store}

            <ArrowUpRight className="h-4 w-4" />
          </a>
        )}
      </div>
    </Motion.div>
  );
}

// -----------------------------------------------------------------------------
// BUY LINK CARD
// -----------------------------------------------------------------------------

function BuyLinkCard({ url, index }) {
  return (
    <Motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="group relative flex min-h-[150px] flex-col justify-between overflow-hidden rounded-[1.75rem] border border-black/[0.07] bg-white p-6 shadow-[0_12px_40px_rgba(16,33,29,0.04)]"
    >
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[#45c59b]/10 blur-2xl transition-transform duration-500 group-hover:scale-150" />

      <div className="relative flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d8b68]/10">
          <ShoppingBag className="h-5 w-5 text-[#0d8b68]" />
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] text-[#0d8b68] transition-all group-hover:border-[#0d8b68] group-hover:bg-[#0d8b68] group-hover:text-white">
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </div>

      <div className="relative mt-6">
        <span className="jj-mono text-[10px] uppercase tracking-[0.15em] text-[#8a9b94]">
          Official store {String(index + 1).padStart(2, "0")}
        </span>

        <p className="mt-1 truncate text-[15px] font-semibold text-[#10211d]">
          {hostLabel(url)}
        </p>

        <p className="mt-1 text-xs text-[#8a9b94]">
          Shop Digital Care →
        </p>
      </div>
    </Motion.a>
  );
}

// -----------------------------------------------------------------------------
// MAIN PAGE
// -----------------------------------------------------------------------------

export default function GetStarted() {
  const navigate = useNavigate();

  const [openFaq, setOpenFaq] = useState(null);

  const { inputs, loading } = useDownloadInputs();

  const androidQr = toAbsolute(inputs?.android_qr);
  const iosQr = toAbsolute(inputs?.ios_qr);

  const hasApp = !!(
    androidQr ||
    iosQr ||
    inputs?.android_url ||
    inputs?.ios_url
  );

  const buyLinks = [
    inputs?.buy_link1,
    inputs?.buy_link2,
    inputs?.buy_link3,
  ].filter(Boolean);

  const scrollTo = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  return (
    <div className="jj-story min-h-screen overflow-x-clip bg-white">
      <style>{GLOBAL_STYLES}</style>

      <AppHeader />

      {/* =====================================================================
          HERO
      ====================================================================== */}

      <section className="jj-dark relative overflow-hidden px-6 pb-24 pt-36 lg:px-10 lg:pb-32 lg:pt-44">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#0d8b68]/20 blur-[120px]" />

          <div className="absolute -right-32 top-20 h-72 w-72 rounded-full bg-[#45c59b]/10 blur-[100px]" />

          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
              backgroundSize: "70px 70px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <Reveal>
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[#45c59b]" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Your health, connected
              </span>
            </div>

            <p className="jj-mono mt-8 text-xs uppercase tracking-[0.24em] text-[#45c59b]">
              Get started
            </p>

            <h1 className="mt-5 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-white sm:text-7xl lg:text-[6.2rem]">
              Digital Care
              <br />
              <span className="bg-gradient-to-r from-[#45c59b] to-[#8ce8c8] bg-clip-text text-transparent">
                starts here.
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-[15px] leading-7 text-white/55 sm:text-base">
              Install the Digital Care app, get your wearable, and connect
              everything in one simple place.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => scrollTo("app")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#45c59b] px-7 py-3.5 text-sm font-semibold text-[#10211d] shadow-[0_10px_40px_rgba(69,197,155,0.2)] transition-all hover:scale-[1.02] hover:bg-[#64d7b0]"
              >
                <Smartphone className="h-4 w-4" />
                Download the app
              </button>

              <button
                onClick={() => scrollTo("buy")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-7 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/30 hover:bg-white/[0.08]"
              >
                <ShoppingBag className="h-4 w-4" />
                Buy the device
              </button>
            </div>

            <div className="mx-auto mt-12 flex max-w-md flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-white/40">
              <span className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-[#45c59b]" />
                Easy setup
              </span>

              <span className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-[#45c59b]" />
                Health insights
              </span>

              <span className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-[#45c59b]" />
                Connected care
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================================
          APP DOWNLOAD
      ====================================================================== */}

      <section
        id="app"
        className="scroll-mt-20 bg-[#f5f8f5] px-6 py-24 lg:px-10 lg:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
            <Reveal className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#0d8b68]" />

                <p className="jj-mono text-xs uppercase tracking-[0.24em] text-[#0d8b68]">
                  The Digital Care app
                </p>
              </div>

              <h2 className="mt-5 text-4xl font-semibold leading-[0.98] tracking-[-0.03em] text-[#10211d] sm:text-5xl lg:text-6xl">
                Everything you need,
                <br />
                <span className="text-[#0d8b68]">
                  right in your pocket.
                </span>
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-[#5c7169]">
                {hasApp || loading
                  ? "Scan the QR code with your phone or open the app store directly to install Digital Care."
                  : "The Digital Care app isn't published to the app stores yet. QR codes will appear here as soon as they're available."}
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="hidden items-center gap-2 rounded-full border border-black/[0.07] bg-white px-4 py-2 text-xs text-[#5c7169] shadow-sm sm:flex">
                <QrCode className="h-4 w-4 text-[#0d8b68]" />
                Scan & install
              </div>
            </Reveal>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Reveal>
              <AppQrCard
                platform="Android"
                store="Google Play"
                qr={androidQr}
                url={inputs?.android_url}
                loading={loading}
                icon={<Smartphone className="h-5 w-5 text-[#0d8b68]" />}
              />
            </Reveal>

            <Reveal delay={0.08}>
              <AppQrCard
                platform="iOS"
                store="App Store"
                qr={iosQr}
                url={inputs?.ios_url}
                loading={loading}
                icon={<Smartphone className="h-5 w-5 text-[#0d8b68]" />}
              />
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-[1.75rem] border border-black/[0.07] bg-white p-6 sm:flex-row sm:px-8">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d8b68]/10">
                  <HeartPulse className="h-4 w-4 text-[#0d8b68]" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#10211d]">
                    Don't have the app yet?
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#8a9b94]">
                    You can create your Digital Care account from the web.
                  </p>
                </div>
              </div>

              <Motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/register")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0d8b68] px-6 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#0b775a] sm:w-auto"
              >
                Register on the web
                <ArrowRight className="h-4 w-4" />
              </Motion.button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================================
          BUY DEVICE
      ====================================================================== */}

      <section
        id="buy"
        className="scroll-mt-20 bg-white px-6 py-24 lg:px-10 lg:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#0d8b68]" />

              <p className="jj-mono text-xs uppercase tracking-[0.24em] text-[#0d8b68]">
                Get your wearable
              </p>
            </div>

            <h2 className="mt-5 text-4xl font-semibold leading-[0.98] tracking-[-0.03em] text-[#10211d] sm:text-5xl lg:text-6xl">
              Your everyday
              <br />
              <span className="text-[#0d8b68]">care companion.</span>
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-7 text-[#5c7169]">
              {buyLinks.length
                ? "Choose one of our official stores below. Your Digital Care wearable ships ready to pair with the app."
                : "Online ordering is coming soon. In the meantime, contact our team and we'll help you get set up."}
            </p>
          </Reveal>

          {buyLinks.length > 0 ? (
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {buyLinks.map((url, i) => (
                <Reveal key={url} delay={i * 0.08}>
                  <BuyLinkCard url={url} index={i} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal delay={0.1}>
              <div className="mt-12 rounded-[2rem] border border-black/[0.07] bg-[#f5f8f5] p-8 sm:p-10">
                <div className="max-w-xl">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d8b68]/10">
                    <ShoppingBag className="h-5 w-5 text-[#0d8b68]" />
                  </div>

                  <h3 className="mt-6 text-xl font-semibold text-[#10211d]">
                    Online ordering is coming soon.
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-[#5c7169]">
                    Contact our team to check availability and learn how to
                    order your Digital Care wearable.
                  </p>

                  <a
                    href="mailto:support@digitalcare.care"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#10211d] px-6 py-3 text-xs font-semibold text-white transition-all hover:bg-[#0d8b68]"
                  >
                    Contact our team
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* =====================================================================
          HOW IT WORKS
      ====================================================================== */}

      <section className="relative overflow-hidden bg-[#f5f8f5] px-6 py-24 lg:px-10 lg:py-32">
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-[#45c59b]/10 blur-[100px]" />

        <div className="relative mx-auto max-w-6xl">
          <Reveal className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#0d8b68]" />

              <p className="jj-mono text-xs uppercase tracking-[0.24em] text-[#0d8b68]">
                Simple from day one
              </p>
            </div>

            <h2 className="mt-5 text-4xl font-semibold leading-[0.98] tracking-[-0.03em] text-[#10211d] sm:text-5xl lg:text-6xl">
              From device
              <br />
              <span className="text-[#0d8b68]">to insight.</span>
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-7 text-[#5c7169]">
              Getting started with Digital Care takes only a few simple steps.
            </p>
          </Reveal>

          <div className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Desktop connecting line */}
            <div className="absolute left-[12%] right-[12%] top-[34px] hidden h-px bg-[#0d8b68]/15 lg:block" />

            {PURCHASE_STEPS.map((step, i) => (
              <Reveal
                key={step.title}
                delay={i * 0.08}
                className="relative"
              >
                <div className="group h-full rounded-[1.75rem] border border-black/[0.07] bg-white p-6 shadow-[0_12px_40px_rgba(16,33,29,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(16,33,29,0.08)] sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="jj-mono text-[10px] font-medium tracking-[0.14em] text-[#8a9b94]">
                      {step.number}
                    </span>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0d8b68]/10 transition-colors group-hover:bg-[#0d8b68]">
                      <step.Icon className="h-4 w-4 text-[#0d8b68] group-hover:text-white" />
                    </div>
                  </div>

                  <h3 className="mt-7 text-[15px] font-semibold text-[#10211d]">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#5c7169]">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          FAQ + SUPPORT
      ====================================================================== */}

      <section className="bg-white px-6 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.15fr_.85fr] lg:gap-20">
          {/* FAQ */}
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#0d8b68]" />

              <p className="jj-mono text-xs uppercase tracking-[0.24em] text-[#0d8b68]">
                Help center
              </p>
            </div>

            <h2 className="mt-5 text-4xl font-semibold leading-[0.98] tracking-[-0.03em] text-[#10211d] sm:text-5xl">
              Questions,
              <br />
              <span className="text-[#0d8b68]">answered.</span>
            </h2>

            <div className="mt-8">
              {FAQ.map((item, i) => (
                <FaqItem
                  key={item.q}
                  item={item}
                  isOpen={openFaq === i}
                  onToggle={() =>
                    setOpenFaq(openFaq === i ? null : i)
                  }
                />
              ))}
            </div>
          </Reveal>

          {/* SUPPORT CARD */}
          <Reveal delay={0.1} className="h-fit">
            <div className="relative overflow-hidden rounded-[2rem] bg-[#10211d] p-7 text-white shadow-[0_25px_70px_rgba(16,33,29,0.14)] sm:p-9">
              {/* Decorative shapes */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#0d8b68]/30 blur-[70px]" />

              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#45c59b]/10">
                  <MessageCircle className="h-5 w-5 text-[#45c59b]" />
                </div>

                <h3 className="mt-7 text-2xl font-semibold">
                  Still have questions?
                </h3>

                <p className="mt-3 text-sm leading-7 text-white/50">
                  Our team can help with ordering, setup, app access and
                  anything else you need to get started.
                </p>

                <div className="mt-7 space-y-4">
                  <a
                    href="mailto:support@digitalcare.care"
                    className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.08]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#45c59b]/10">
                      <Mail className="h-4 w-4 text-[#45c59b]" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">
                        Email
                      </p>

                      <p className="mt-0.5 truncate text-sm font-medium text-white">
                        support@digitalcare.care
                      </p>
                    </div>

                    <ArrowUpRight className="ml-auto h-4 w-4 text-white/30 transition-colors group-hover:text-[#45c59b]" />
                  </a>

                  <a
                    href="tel:+9779800000000"
                    className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.08]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#45c59b]/10">
                      <Phone className="h-4 w-4 text-[#45c59b]" />
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">
                        Phone
                      </p>

                      <p className="mt-0.5 text-sm font-medium text-white">
                        +977-98-0000-0000
                      </p>
                    </div>

                    <ArrowUpRight className="ml-auto h-4 w-4 text-white/30 transition-colors group-hover:text-[#45c59b]" />
                  </a>
                </div>

                <div className="mt-7 flex items-center gap-2 text-[11px] text-white/35">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#45c59b]" />
                  Our team typically replies within one business day.
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================================
          BOTTOM CTA
      ====================================================================== */}

      <section className="px-6 pb-10 lg:px-10">
        <Reveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] bg-[#0d8b68] px-7 py-12 text-center sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-white/10 blur-[90px]" />

            <div className="relative">
              <p className="jj-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
                Ready when you are
              </p>

              <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-4xl">
                Start taking a more connected approach to your health.
              </h2>

              <button
                onClick={() => scrollTo("app")}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#10211d] transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                Get the app
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
