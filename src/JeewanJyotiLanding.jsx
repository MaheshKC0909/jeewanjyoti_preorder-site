import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  HeartPulse, Users, Video, Stethoscope, ShieldCheck, BarChart3,
  Smartphone, Menu, X, Mail, Phone, MessageSquare, Loader2,
  CheckCircle, XCircle, Activity, Clock, Star, ArrowRight,
  Zap, Globe, ChevronRight, Heart, Droplets, Wind, Thermometer
} from "lucide-react";
import jjlogo from "./assets/jjlogo.png";
import appScreenshot from "./assets/jeewanjyotiss.gif";
import qrCode from "./assets/qr.jpg";

const API_BASE_URL = 'http://103.118.16.251:8002';

// ─── Vitals Ticker ──────────────────────────────────────────────────────────
function VitalsTicker() {
  const vitals = [
    { icon: Heart, label: "Heart Rate", value: "72 bpm", color: "#ef4444" },
    { icon: Droplets, label: "Blood O₂", value: "98%", color: "#3b82f6" },
    { icon: Thermometer, label: "Temp", value: "36.6°C", color: "#f97316" },
    { icon: Wind, label: "Resp Rate", value: "16/min", color: "#10b981" },
    { icon: Activity, label: "Steps", value: "8,420", color: "#8b5cf6" },
    { icon: Zap, label: "Calories", value: "342 kcal", color: "#eab308" },
  ];

  return (
    <div className="overflow-hidden py-3 bg-emerald-950/40 backdrop-blur-sm border-y border-emerald-500/20">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {[...vitals, ...vitals].map((v, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <v.icon style={{ color: v.color }} className="h-4 w-4 shrink-0" />
            <span className="text-emerald-300/70 font-light">{v.label}</span>
            <span className="text-white font-semibold">{v.value}</span>
            <span className="text-emerald-500/40 mx-4">◆</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Floating Orb Background ─────────────────────────────────────────────────
function HealthOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-96 h-96 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)", top: "10%", left: "5%" }}
        animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 70%)", top: "50%", right: "8%" }}
        animate={{ scale: [1.2, 1, 1.2], x: [0, -20, 0], y: [0, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-64 h-64 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)", bottom: "20%", left: "30%" }}
        animate={{ scale: [1, 1.3, 1], y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* ECG line decorative */}
      <svg className="absolute bottom-0 left-0 right-0 w-full opacity-5" viewBox="0 0 1440 120" preserveAspectRatio="none">
        <motion.path
          d="M0,60 L200,60 L240,20 L260,100 L280,10 L310,110 L340,60 L600,60 L640,20 L660,100 L680,10 L710,110 L740,60 L1000,60 L1040,20 L1060,100 L1080,10 L1110,110 L1140,60 L1440,60"
          stroke="#10b981"
          strokeWidth="3"
          fill="none"
          animate={{ pathLength: [0, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </svg>
    </div>
  );
}

// ─── Pulse Ring Animation ────────────────────────────────────────────────────
function PulseRing({ color = "#10b981" }) {
  return (
    <div className="relative inline-flex">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: color }}
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
        />
      ))}
    </div>
  );
}

// ─── Stat Counter ────────────────────────────────────────────────────────────
function StatCounter({ value, suffix = "", label }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const target = parseInt(value.replace(/\D/g, ""));
    const duration = 1800;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <div ref={ref} className="text-center group">
      <div className="text-4xl lg:text-5xl font-black text-emerald-400 group-hover:scale-110 transition-transform duration-300">
        {count}{suffix}
      </div>
      <div className="mt-2 text-sm text-emerald-200/60 uppercase tracking-widest font-medium">{label}</div>
    </div>
  );
}

// ─── Preorder Popup ─────────────────────────────────────────────────────────
function PreorderPopup({ isOpen, onClose }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', feedback: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (submitStatus === 'error') { setSubmitStatus(null); setErrorMessage(''); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSubmitStatus(null);
    setErrorMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/preorder/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setSubmitStatus('success');
        setTimeout(() => { setFormData({ name: '', email: '', phone: '', feedback: '' }); onClose(); setSubmitStatus(null); }, 2000);
      } else {
        let errorData;
        try { errorData = await response.json(); } catch { errorData = { message: `HTTP ${response.status}` }; }
        let msg = 'Failed to submit';
        if (errorData.detail) msg = Array.isArray(errorData.detail) ? errorData.detail.map(e => e.msg).join(', ') : errorData.detail;
        else if (errorData.message) msg = errorData.message;
        throw new Error(msg);
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) { setFormData({ name: '', email: '', phone: '', feedback: '' }); setSubmitStatus(null); setErrorMessage(''); onClose(); }
  };

  const inputClass = "w-full px-4 py-3 bg-slate-800/60 border border-emerald-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all duration-200 disabled:opacity-50";
  const labelClass = "block text-sm font-medium text-emerald-300/80 mb-2";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-40" onClick={handleClose} />
          <motion.div
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 400 }}
            className="fixed inset-x-4 top-[5%] bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[900px] bg-slate-900 border border-emerald-500/20 rounded-3xl shadow-2xl z-50 overflow-hidden"
            style={{ boxShadow: "0 0 80px rgba(16,185,129,0.15)" }}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="relative p-8 pb-6 border-b border-emerald-500/10">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/50 to-teal-950/50" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <HeartPulse className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-emerald-400 text-sm font-semibold uppercase tracking-widest">Limited Preorder</span>
                    </div>
                    <h2 className="text-3xl font-black text-white">Reserve Your Access</h2>
                    <p className="text-slate-400 mt-1">Join Nepal's healthcare revolution — be among the first.</p>
                  </div>
                  <button onClick={handleClose} disabled={isLoading}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-50">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid md:grid-cols-[1fr,300px] gap-10">
                  <div>
                    {submitStatus === 'success' && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                        <p className="text-emerald-300">Thank you! We'll be in touch soon.</p>
                      </motion.div>
                    )}
                    {submitStatus === 'error' && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                        <div><p className="text-red-300 font-medium">Submission failed</p>{errorMessage && <p className="text-red-400/70 text-sm mt-1">{errorMessage}</p>}</div>
                      </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className={labelClass}><Users className="inline h-3.5 w-3.5 mr-1.5" />Full Name</label>
                          <input type="text" name="name" value={formData.name} onChange={handleInputChange} required disabled={isLoading} className={inputClass} placeholder="Your name" />
                        </div>
                        <div>
                          <label className={labelClass}><Phone className="inline h-3.5 w-3.5 mr-1.5" />Phone Number</label>
                          <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required disabled={isLoading} className={inputClass} placeholder="+977 98XXXXXXXX" />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}><Mail className="inline h-3.5 w-3.5 mr-1.5" />Email Address</label>
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} required disabled={isLoading} className={inputClass} placeholder="your@email.com" />
                      </div>
                      <div>
                        <label className={labelClass}><MessageSquare className="inline h-3.5 w-3.5 mr-1.5" />Feedback / Requests</label>
                        <textarea name="feedback" value={formData.feedback} onChange={handleInputChange} rows={3} disabled={isLoading} className={inputClass} placeholder="What features are you most excited about?" />
                      </div>
                      <motion.button type="submit" disabled={isLoading}
                        whileHover={!isLoading ? { scale: 1.02 } : {}} whileTap={!isLoading ? { scale: 0.98 } : {}}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-900 font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isLoading ? <><Loader2 className="h-5 w-5 animate-spin" />Submitting...</> : <><HeartPulse className="h-5 w-5" />Secure My Preorder</>}
                      </motion.button>
                    </form>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      {["Early app access", "Exclusive pricing", "Priority support", "Beta privileges"].map((perk) => (
                        <div key={perk} className="flex items-center gap-2 text-sm text-slate-400">
                          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                          {perk}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* QR Side */}
                  <div className="flex flex-col items-center">
                    <div className="p-1 bg-gradient-to-b from-emerald-500/30 to-teal-500/30 rounded-2xl mb-4">
                      <div className="bg-slate-800 p-4 rounded-xl">
                        <img src={qrCode} alt="QR Code" className="w-48 h-48 object-cover rounded-lg" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-white">📲 Scan to Download</p>
                    <p className="text-xs text-slate-500 text-center mt-1">Point your camera at the QR code to install</p>
                    <div className="mt-4 flex gap-2">
                      <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1.5 rounded-lg">Google Play</span>
                      <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1.5 rounded-lg">App Store</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-600">🔒 Your data is encrypted and secure · 📞 24/7 support available</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
function Header({ onPreorder }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handle = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handle);
    return () => window.removeEventListener('scroll', handle);
  }, []);

  const navItems = [
    { name: 'Features', href: '#features' },
    { name: 'About', href: '#about' },
    { name: 'Blogs', href: '/blogs' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <motion.header
      initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${isScrolled ? 'bg-slate-900/95 backdrop-blur-xl shadow-2xl border-b border-emerald-500/10' : 'bg-transparent'}`}
    >
      <nav className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <motion.div whileHover={{ scale: 1.03 }} className="cursor-pointer flex items-center gap-2 md:gap-3">
            <img src={jjlogo} alt="JJ Logo" className="h-8 w-8 md:h-10 md:w-10 object-contain" />
            <h1 className="text-xl md:text-2xl font-bold text-blue-500 whitespace-nowrap truncate">
              DIGITAL CARE
            </h1>
          </motion.div>

          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item, i) => (
              <motion.a key={item.name} href={item.href}
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="text-slate-300 hover:text-emerald-400 font-medium transition-colors duration-200 text-sm tracking-wide">
                {item.name}
              </motion.a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => window.location.assign('/login')}
              className="px-5 py-2 text-sm font-semibold text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/10 transition-all duration-200">
              Login
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => window.location.assign('/register')}
              className="px-5 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl transition-all duration-200">
              Join Us
            </motion.button>
          </div>

          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-300 hover:text-white rounded-xl transition-colors">
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </motion.button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="lg:hidden mt-4 bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-emerald-500/10 overflow-hidden">
              <div className="py-4">
                {navItems.map((item) => (
                  <a key={item.name} href={item.href}
                    className="block px-6 py-3 text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 font-medium transition-all duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}>{item.name}</a>
                ))}
                <div className="border-t border-slate-700/50 mt-4 pt-4 px-6 flex gap-3">
                  <button onClick={() => window.location.assign('/login')} className="flex-1 py-2.5 text-sm font-semibold text-emerald-400 border border-emerald-500/30 rounded-xl">Login</button>
                  <button onClick={() => window.location.assign('/register')} className="flex-1 py-2.5 text-sm font-semibold bg-emerald-500 text-slate-900 rounded-xl">Join Us</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}

// ─── Feature Card ────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.6, delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="group relative bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-emerald-500/30 rounded-2xl p-7 transition-all duration-300 cursor-default overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-all duration-500" />
      <div className="relative">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors duration-200">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function JeewanJyotiLanding() {
  const [isPreorderOpen, setIsPreorderOpen] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const features = [
    { icon: HeartPulse, title: "Real-Time Vitals", desc: "Monitor heart rate, blood oxygen, temperature, and more with connected wearable devices.", color: "#ef4444" },
    { icon: Users, title: "Family Health Hub", desc: "Keep track of your loved ones' well-being with shared health dashboards and alerts.", color: "#8b5cf6" },
    { icon: Stethoscope, title: "Doctor Appointments", desc: "Book consultations with certified doctors in just a few taps — no waiting rooms.", color: "#10b981" },
    { icon: Video, title: "Video Consultation", desc: "Face-to-face consultations with healthcare professionals through encrypted video calls.", color: "#3b82f6" },
    { icon: ShieldCheck, title: "Privacy First", desc: "Military-grade encryption protects your health data. Your records, your control.", color: "#f59e0b" },
    { icon: BarChart3, title: "Health Analytics", desc: "Smart trends and personalized insights that help you understand your health journey.", color: "#06b6d4" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <Header onPreorder={() => setIsPreorderOpen(true)} />

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <HealthOrbs />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(16,185,129,1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative z-10 flex flex-col items-center text-center px-6 pt-24">
          {/* Live indicator */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-emerald-300 text-sm font-medium tracking-wide">Nepal's First Digital Health Companion</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.9 }}
            className="text-6xl md:text-8xl font-black leading-none tracking-tight mb-6">
            <span className="text-white">Jeewan</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Jyoti</span>
            <span className="text-white text-4xl md:text-5xl font-bold">Digital Care</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.8 }}
            className="max-w-2xl text-slate-400 text-lg md:text-xl leading-relaxed mb-10">
            Connect your tracking device, monitor vitals in real-time, care for your loved ones, and consult doctors — all in one intelligent health platform.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setIsPreorderOpen(true)}
              className="group flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-8 py-4 rounded-2xl transition-all duration-200 text-lg shadow-lg shadow-emerald-500/25">
              Preorder Now
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700/60 backdrop-blur-sm text-white font-semibold px-8 py-4 rounded-2xl border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-200 text-lg">
              Explore Features
            </motion.button>
          </motion.div>

          {/* Mini stats row */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
            className="mt-14 flex items-center gap-8 text-sm text-slate-500">
            {[["1000+", "Early adopters"], ["24/7", "Available"], ["100%", "Secure"]].map(([val, lbl]) => (
              <div key={lbl} className="text-center">
                <div className="text-emerald-400 font-bold text-lg">{val}</div>
                <div>{lbl}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600 text-xs">
          <span className="tracking-widest uppercase">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-emerald-500/50 to-transparent" />
        </motion.div>
      </section>

      {/* ── VITALS TICKER ── */}
      <VitalsTicker />

      {/* ── ABOUT ── */}
      <section id="about" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
                <Globe className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-300 text-sm font-medium">About Us</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                Redefining Healthcare <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">for Nepal</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                At <strong className="text-emerald-400">Jeewan Jyoti Digital Care</strong>, we bridge the gap between patients and healthcare providers through smart, reliable, and accessible digital solutions built for Nepal.
              </p>
              <p className="text-slate-500 leading-relaxed mb-10">
                With a patient-centered approach and a commitment to affordability, we're making a lasting impact on the health and well-being of communities across the country.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: "🚀", title: "Innovation", desc: "Cutting-edge health technology" },
                  { icon: "🌍", title: "Accessibility", desc: "Healthcare for everyone" },
                  { icon: "⭐", title: "Quality", desc: "Premium care standards" },
                  { icon: "💚", title: "Affordability", desc: "Cost-effective solutions" }
                ].map((v, i) => (
                  <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.1 }}
                    className="bg-slate-800/40 border border-slate-700/40 hover:border-emerald-500/20 rounded-xl p-4 transition-all duration-300">
                    <div className="text-xl mb-2">{v.icon}</div>
                    <div className="font-bold text-white text-sm mb-1">{v.title}</div>
                    <div className="text-slate-500 text-xs">{v.desc}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* App Demo */}
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }}
              className="relative flex justify-center">
              <div className="relative">
                {/* Glow ring */}
                <div className="absolute -inset-8 bg-gradient-to-r from-emerald-500/20 to-teal-500/10 rounded-3xl blur-2xl" />
                {/* Phone mockup */}
                <div className="relative bg-slate-800 rounded-[2.5rem] border border-slate-700 overflow-hidden shadow-2xl w-72">
                  <div className="bg-slate-900 h-8 rounded-t-[2.5rem] flex items-center justify-center">
                    <div className="w-20 h-1.5 bg-slate-700 rounded-full" />
                  </div>
                  <img src={appScreenshot} alt="App Demo" className="w-full" />
                  <div className="bg-slate-900 h-6 rounded-b-[2.5rem]" />
                </div>

                {/* Floating badges */}
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-4 -right-8 bg-emerald-500 text-slate-900 px-4 py-2 rounded-2xl text-sm font-bold shadow-lg shadow-emerald-500/30">
                  Live ✨
                </motion.div>
                <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                  className="absolute -bottom-4 -left-8 bg-slate-800 border border-emerald-500/30 text-white px-4 py-2 rounded-2xl text-sm font-semibold shadow-lg">
                  🏥 Simplified Healthcare
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-28 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/0 via-emerald-950/10 to-slate-950/0 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
              <Zap className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-300 text-sm font-medium">Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Everything Your Health Needs,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">In One App</span>
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-lg">Built with care, designed for simplicity, powered by technology that works.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 0.08} />
            ))}
          </div>

          {/* All-in-one card */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
            className="mt-5 relative bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/20 rounded-2xl p-10 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: "radial-gradient(circle at center, rgba(16,185,129,1) 1px, transparent 1px)",
              backgroundSize: "20px 20px"
            }} />
            <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}>
              <Smartphone className="h-14 w-14 text-emerald-400 mx-auto mb-5" />
            </motion.div>
            <h3 className="text-3xl font-extrabold text-white mb-3">One App. Complete Care.</h3>
            <p className="text-slate-400 max-w-lg mx-auto text-lg">
              Every feature seamlessly integrated into a single, intuitive experience designed for you and your family.
            </p>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setIsPreorderOpen(true)}
              className="mt-8 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-7 py-3.5 rounded-xl transition-all duration-200">
              Get Early Access <ChevronRight className="h-5 w-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ── STATS BAND ── */}
      <div className="py-20 px-6 border-y border-emerald-500/10 bg-emerald-950/20">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12">
          <StatCounter value="1000" suffix="+" label="Early Adopters" />
          <StatCounter value="24" suffix="/7" label="Always Available" />
          <StatCounter value="6" suffix="+" label="Core Features" />
          <StatCounter value="100" suffix="%" label="Data Secure" />
        </div>
      </div>

      {/* ── PRICING / CTA ── */}
      <section id="pricing" className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 to-teal-950/20 pointer-events-none" />
        <HealthOrbs />

        <div className="max-w-4xl mx-auto relative text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1.5 mb-6">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-300 text-sm font-medium">Early Bird Offer</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-4">
              Preorder <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Today</span>
            </h2>
            <p className="text-slate-400 text-xl mb-4">Join Nepal's healthcare revolution at exclusive launch pricing.</p>

            <div className="inline-flex items-center gap-3 bg-slate-800/60 border border-yellow-500/20 rounded-2xl px-8 py-4 mb-10">
              <span className="text-yellow-400 text-3xl font-black">🔥 Price Revealed at Launch</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setIsPreorderOpen(true)}
                className="group flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black px-10 py-5 rounded-2xl transition-all duration-200 text-xl shadow-xl shadow-emerald-500/25">
                Secure Your Spot
                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
              {["Early app access", "Exclusive pricing", "Priority support", "Beta privileges", "No commitment"].map(perk => (
                <div key={perk} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>

            <p className="mt-6 text-slate-600 text-sm">✨ 1,000+ early adopters already signed up</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="bg-slate-900/80 border-t border-emerald-500/10 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <HeartPulse className="h-7 w-7 text-emerald-400" />
                <span className="text-lg font-black text-white">JeewanJyoti</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Revolutionizing healthcare accessibility in Nepal, one family at a time.
              </p>
            </div>

            {/* Links */}
            <div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">Platform</div>
              <div className="space-y-2">
                {['Features', 'Pricing', 'About', 'Blogs'].map(l => (
                  <a key={l} href={`#${l.toLowerCase()}`} className="block text-slate-500 hover:text-emerald-400 text-sm transition-colors">{l}</a>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">Contact</div>
              <div className="space-y-3 text-sm text-slate-500">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-emerald-500" /><span>support@jeewanjyoti.com</span></div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-500" /><span>+977 98XXXXXXXX</span></div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-500" /><span>Available 24/7</span></div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
            <span>© 2024 JeewanJyoti Digital Care. All rights reserved.</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      <PreorderPopup isOpen={isPreorderOpen} onClose={() => setIsPreorderOpen(false)} />
    </div>
  );
}