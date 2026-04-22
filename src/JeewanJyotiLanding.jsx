import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  HeartPulse, Users, Video, Stethoscope, ShieldCheck, BarChart3,
  Smartphone, Menu, X, Mail, Phone, MessageSquare, Loader2,
  CheckCircle, XCircle, Activity, Clock, Star, ArrowRight,
  Zap, Globe, ChevronRight, Heart, Droplets, Wind, Thermometer,
  Brain, Dumbbell, Apple, Moon, Sun, TrendingUp, Wifi, Battery
} from "lucide-react";
import jjlogo from "./assets/jjlogo.png";
import appScreenshot from "./assets/jeewanjyotiss.gif";
import qrCode from "./assets/qr.jpg";

const API_BASE_URL = 'http://103.118.16.251:8002';

/* ─── ECG Line SVG ─────────────────────────────────────────────────────────── */
function ECGLine({ className = "", color = "#10b981", speed = 3 }) {
  const pathD = "M0,30 L60,30 L75,10 L85,50 L95,5 L110,55 L125,30 L200,30";
  return (
    <svg className={className} viewBox="0 0 200 60" preserveAspectRatio="none" fill="none">
      <motion.path
        d={pathD}
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
      />
      <motion.path
        d={pathD}
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.15"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
        style={{ filter: "blur(3px)" }}
      />
    </svg>
  );
}

/* ─── Animated Wearable Device ─────────────────────────────────────────────── */
function WearableDevice() {
  const [bpm, setBpm] = useState(72);
  const [spo2] = useState(98);
  const [beat, setBeat] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBpm(prev => {
        const next = prev + (Math.random() > 0.5 ? 1 : -1);
        return Math.max(65, Math.min(85, next));
      });
      setBeat(true);
      setTimeout(() => setBeat(false), 150);
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="relative w-48 h-56 mx-auto"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6, duration: 0.8 }}
    >
      {/* Watch body */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900 rounded-[2.5rem] border-4 border-slate-600 shadow-2xl shadow-emerald-500/20">
        {/* Band top */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-12 h-8 bg-slate-600 rounded-t-lg" />
        {/* Band bottom */}
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-12 h-8 bg-slate-600 rounded-b-lg" />

        {/* Screen */}
        <div className="absolute inset-3 bg-slate-950 rounded-[2rem] overflow-hidden flex flex-col items-center justify-center gap-1 p-3">
          {/* Time */}
          <div className="text-white text-xs font-light tracking-widest opacity-60">10:42 AM</div>

          {/* Heart rate */}
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ scale: beat ? 1.4 : 1 }}
              transition={{ duration: 0.15 }}
            >
              <Heart className="w-4 h-4 fill-red-500 text-red-500" />
            </motion.div>
            <motion.span
              key={bpm}
              initial={{ opacity: 0.5, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white text-2xl font-black tabular-nums"
            >
              {bpm}
            </motion.span>
            <span className="text-slate-400 text-xs">bpm</span>
          </div>

          {/* ECG mini */}
          <ECGLine className="w-full h-8 my-0.5" color="#ef4444" speed={2} />

          {/* SpO2 */}
          <div className="flex items-center gap-1.5">
            <Droplets className="w-3 h-3 text-cyan-400" />
            <span className="text-cyan-300 text-sm font-bold">{spo2}%</span>
            <span className="text-slate-500 text-xs">SpO₂</span>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-2 mt-1">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <Battery className="w-3 h-3 text-emerald-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Side button */}
        <div className="absolute right-0 top-16 w-1.5 h-8 bg-slate-500 rounded-r-lg translate-x-1" />
        <div className="absolute right-0 top-28 w-1.5 h-5 bg-slate-500 rounded-r-lg translate-x-1" />
      </div>

      {/* Pulse rings */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-[2.5rem] border border-emerald-500/30"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.5 + i * 0.2, opacity: 0 }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
        />
      ))}
    </motion.div>
  );
}

/* ─── Health Score Ring ────────────────────────────────────────────────────── */
function HealthScoreRing({ score = 87, label = "Health Score", color = "#10b981" }) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex flex-col items-center gap-1">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.8, delay: 0.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl font-black"
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {score}
          </motion.span>
          <span className="text-slate-500 text-[9px] uppercase tracking-wider">pts</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
  );
}

/* ─── Activity Bar Chart ───────────────────────────────────────────────────── */
function ActivityBars() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const values = [65, 80, 45, 90, 70, 55, 88];
  return (
    <div className="flex items-end gap-1.5 h-14">
      {days.map((day, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <motion.div
            className="w-full rounded-sm"
            style={{
              background: i === 6 ? '#10b981' : 'rgba(16,185,129,0.3)',
              height: `${values[i]}%`
            }}
            initial={{ height: 0 }}
            animate={{ height: `${values[i]}%` }}
            transition={{ delay: 0.8 + i * 0.08, duration: 0.6, ease: "easeOut" }}
          />
          <span className="text-[9px] text-slate-500">{day}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Hero Health Dashboard ─────────────────────────────────────────────────── */
function HeroDashboard() {
  return (
    <motion.div
      className="relative w-full max-w-sm mx-auto lg:mx-0"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.7, duration: 0.9 }}
    >
      {/* Main card */}
      <div className="bg-slate-800/70 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-5 shadow-2xl shadow-emerald-500/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest">Good morning</p>
            <p className="text-white font-bold text-sm">Aditya Sharma</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-900 font-black text-sm">AS</div>
        </div>

        {/* Score rings */}
        <div className="flex justify-around mb-4 py-3 bg-slate-900/50 rounded-2xl">
          <HealthScoreRing score={87} label="Overall" color="#10b981" />
          <HealthScoreRing score={72} label="Fitness" color="#3b82f6" />
          <HealthScoreRing score={94} label="Sleep" color="#8b5cf6" />
        </div>

        {/* ECG strip */}
        <div className="bg-slate-900/60 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-red-400" /> Live ECG
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">Normal Sinus Rhythm</span>
          </div>
          <ECGLine className="w-full h-10" color="#ef4444" speed={2.5} />
        </div>

        {/* Activity */}
        <div className="bg-slate-900/60 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Weekly Activity</span>
            <span className="text-xs text-emerald-400 font-semibold">8,420 steps today</span>
          </div>
          <ActivityBars />
        </div>

        {/* Vitals row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Heart, val: "72", unit: "bpm", label: "Heart", color: "#ef4444" },
            { icon: Droplets, val: "98%", unit: "SpO₂", label: "Oxygen", color: "#3b82f6" },
            { icon: Thermometer, val: "36.6°", unit: "Temp", label: "Temp", color: "#f97316" },
          ].map((v, i) => (
            <motion.div
              key={v.label}
              className="bg-slate-900/70 rounded-xl p-2.5 flex flex-col items-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 + i * 0.1 }}
            >
              <v.icon className="w-4 h-4 mb-1" style={{ color: v.color }} />
              <span className="text-white text-sm font-black">{v.val}</span>
              <span className="text-slate-500 text-[9px] uppercase tracking-wider">{v.unit}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Floating notification */}
      <motion.div
        className="absolute -top-5 -right-4 bg-slate-800 border border-emerald-500/30 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-lg"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white text-xs font-semibold">Dr. Sharma online</span>
      </motion.div>

      {/* Floating goal badge */}
      <motion.div
        className="absolute -bottom-4 -left-4 bg-emerald-500 rounded-2xl px-3 py-2 shadow-lg shadow-emerald-500/30"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <span className="text-slate-900 text-xs font-black">🎯 Goal: 94%</span>
      </motion.div>
    </motion.div>
  );
}

/* ─── Health Suggestions ────────────────────────────────────────────────────── */
function HealthSuggestions() {
  const suggestions = [
    { icon: Droplets, title: "Stay Hydrated", desc: "Drink at least 2 liters of water today for optimal health.", color: "#3b82f6" },
    { icon: Dumbbell, title: "Light Exercise", desc: "A 30-minute walk can improve your cardiovascular health.", color: "#10b981" },
    { icon: Moon, title: "Quality Sleep", desc: "Try going to bed 30 minutes earlier to hit your sleep goal.", color: "#8b5cf6" },
    { icon: Apple, title: "Nutritious Diet", desc: "Incorporate more leafy greens for boosted energy levels.", color: "#f59e0b" },
    { icon: Brain, title: "Mindfulness", desc: "Take 5 minutes to meditate and reduce daily stress.", color: "#ec4899" },
    { icon: Sun, title: "Morning Sun", desc: "Get 15 minutes of sunlight for your daily vitamin D.", color: "#eab308" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {suggestions.map((s, i) => (
        <motion.div
          key={s.title}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-emerald-500/30 transition-all duration-300"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.07 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <span className="text-sm font-bold text-white">{s.title}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Vitals Ticker ─────────────────────────────────────────────────────────── */
function VitalsTicker() {
  const vitals = [
    { icon: Heart, label: "Heart Rate", value: "72 bpm", color: "#ef4444" },
    { icon: Droplets, label: "Blood O₂", value: "98%", color: "#3b82f6" },
    { icon: Thermometer, label: "Temp", value: "36.6°C", color: "#f97316" },
    { icon: Wind, label: "Resp Rate", value: "16/min", color: "#10b981" },
    { icon: Activity, label: "Steps", value: "8,420", color: "#8b5cf6" },
    { icon: Zap, label: "Calories", value: "342 kcal", color: "#eab308" },
    { icon: Brain, label: "Stress", value: "Low", color: "#ec4899" },
    { icon: Moon, label: "Sleep Score", value: "94", color: "#a78bfa" },
    { icon: TrendingUp, label: "Trend", value: "Improving", color: "#10b981" },
  ];

  return (
    <div className="overflow-hidden py-3 bg-emerald-950/40 backdrop-blur-sm border-y border-emerald-500/20">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
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

/* ─── Animated Background Orbs ─────────────────────────────────────────────── */
function HealthOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)", top: "-5%", left: "-5%" }}
        animate={{ scale: [1, 1.15, 1], x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-96 h-96 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(52,211,153,0.09) 0%, transparent 70%)", top: "45%", right: "-3%" }}
        animate={{ scale: [1.15, 1, 1.15], x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-72 h-72 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)", bottom: "15%", left: "25%" }}
        animate={{ scale: [1, 1.25, 1], y: [0, 25, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Full-width ECG at bottom */}
      <svg className="absolute bottom-0 left-0 right-0 w-full opacity-20" viewBox="0 0 1440 100" preserveAspectRatio="none">
        <motion.path
          d="M0,50 L180,50 L210,20 L230,80 L250,10 L275,90 L300,50 L520,50 L550,20 L570,80 L590,10 L615,90 L640,50 L860,50 L890,20 L910,80 L930,10 L955,90 L980,50 L1200,50 L1230,20 L1250,80 L1270,10 L1295,90 L1320,50 L1440,50"
          stroke="#10b981" strokeWidth="3" strokeLinecap="round" fill="none"
          animate={{ pathLength: [0, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </svg>
    </div>
  );
}

/* ─── Stat Counter ──────────────────────────────────────────────────────────── */
function StatCounter({ value, suffix = "", label }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!inView) return;
    const target = parseInt(value.replace(/\D/g, ""));
    const duration = 1800, step = target / (duration / 16);
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

/* ─── Preorder Popup ────────────────────────────────────────────────────────── */
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
    setIsLoading(true); setSubmitStatus(null); setErrorMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/preorder/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      setSubmitStatus('error'); setErrorMessage(error.message || 'Network error. Please try again.');
    } finally { setIsLoading(false); }
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
                          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />{perk}
                        </div>
                      ))}
                    </div>
                  </div>
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

/* ─── Header ────────────────────────────────────────────────────────────────── */
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
    { name: 'Lifestyle', href: '#lifestyle' },
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
            <h1 className="text-xl md:text-2xl font-bold text-blue-500 whitespace-nowrap truncate">DIGITAL CARE</h1>
          </motion.div>
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item, i) => (
              <motion.a key={item.name} href={item.href}
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="text-slate-300 hover:text-emerald-400 font-medium transition-colors duration-200 text-sm tracking-wide">{item.name}</motion.a>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => window.location.assign('/login')}
              className="px-5 py-2 text-sm font-semibold text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/10 transition-all duration-200">Login</motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => window.location.assign('/register')}
              className="px-5 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl transition-all duration-200">Join Us</motion.button>
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

/* ─── Feature Card ──────────────────────────────────────────────────────────── */
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

/* ─── Digital Healthcare Journey Timeline ───────────────────────────────────── */
function HealthJourneyTimeline() {
  const steps = [
    {
      icon: Smartphone,
      title: "Connect Your Device",
      desc: "Pair your wearable or smartwatch. Instant sync across all your health metrics.",
      color: "#10b981",
      stat: "50+ devices supported"
    },
    {
      icon: Activity,
      title: "Track & Monitor",
      desc: "Real-time vitals, ECG readings, sleep patterns, and daily activity — all in one dashboard.",
      color: "#3b82f6",
      stat: "24/7 live monitoring"
    },
    {
      icon: Brain,
      title: "AI Health Insights",
      desc: "Smart algorithms analyze your data and recommend personalized lifestyle improvements.",
      color: "#8b5cf6",
      stat: "Personalized for you"
    },
    {
      icon: Stethoscope,
      title: "Consult a Doctor",
      desc: "When your vitals need attention, book a certified doctor in minutes — no waiting room.",
      color: "#f59e0b",
      stat: "200+ certified doctors"
    },
  ];

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-emerald-500/40 via-teal-500/40 to-blue-500/40 hidden md:block" />

      <div className="space-y-6">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.6 }}
            className="relative flex gap-5 group"
          >
            {/* Icon node */}
            <div className="relative z-10 shrink-0">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center border"
                style={{ background: `${step.color}15`, borderColor: `${step.color}40` }}>
                <step.icon className="w-5 h-5" style={{ color: step.color }} />
              </div>
            </div>
            {/* Content */}
            <div className="bg-slate-800/40 border border-slate-700/40 group-hover:border-emerald-500/20 rounded-2xl p-4 flex-1 transition-all duration-300">
              <div className="flex items-start justify-between mb-1 flex-wrap gap-2">
                <h3 className="text-white font-bold text-base">{step.title}</h3>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: `${step.color}20`, color: step.color }}>{step.stat}</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main App ──────────────────────────────────────────────────────────────── */
export default function JeewanJyotiLanding() {
  const [isPreorderOpen, setIsPreorderOpen] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

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

      {/* ══ HERO ══ */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <HealthOrbs />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: "linear-gradient(rgba(16,185,129,1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />

        <motion.div style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-24 pb-12 flex flex-col lg:flex-row items-center justify-between gap-16">

          {/* Left: Text */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl">
            {/* Live pill */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 mb-6">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-emerald-300 text-sm font-medium tracking-wide">Nepal's First Digital Health Companion</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.9 }}
              className="text-5xl sm:text-6xl md:text-7xl font-black leading-none tracking-tight mb-5">
              <span className="text-white">Your Health,</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Reimagined.</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.8 }}
              className="text-slate-400 text-lg leading-relaxed mb-8 max-w-lg">
              Connect your device, monitor vitals in real-time, build healthy habits, and consult doctors — all in one intelligent health platform built for Nepal.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setIsPreorderOpen(true)}
                className="group flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-8 py-4 rounded-2xl transition-all duration-200 text-lg shadow-lg shadow-emerald-500/30">
                Preorder Now
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center justify-center gap-2 bg-slate-800/60 hover:bg-slate-700/60 backdrop-blur-sm text-white font-semibold px-8 py-4 rounded-2xl border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-200 text-lg">
                Explore Features
              </motion.button>
            </motion.div>

            {/* Mini stats */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
              className="mt-10 flex items-center gap-8 text-sm text-slate-500">
              {[["1000+", "Early adopters"], ["24/7", "Available"], ["100%", "Secure"]].map(([val, lbl]) => (
                <div key={lbl} className="text-center">
                  <div className="text-emerald-400 font-bold text-lg">{val}</div>
                  <div>{lbl}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Dashboard */}
          <div className="w-full lg:w-auto">
            <HeroDashboard />
          </div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600 text-xs z-10">
          <span className="tracking-widest uppercase">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-emerald-500/50 to-transparent" />
        </motion.div>
      </section>

      {/* ══ VITALS TICKER ══ */}
      <VitalsTicker />

      {/* ══ DIGITAL HEALTH JOURNEY ══ */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
                <Activity className="h-4 w-4 text-blue-400" />
                <span className="text-blue-300 text-sm font-medium">How It Works</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                Your Digital Health <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Journey</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-10">
                From wearable to doctor — a seamless, intelligent system that cares for you around the clock.
              </p>
              <HealthJourneyTimeline />
            </motion.div>

            {/* Wearable Device visual */}
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="flex flex-col items-center gap-8">
              <WearableDevice />

              {/* Wearable stats */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                {[
                  { label: "Data Points/Day", val: "2,840+", color: "#10b981" },
                  { label: "Battery Life", val: "7 days", color: "#3b82f6" },
                  { label: "Sync Interval", val: "5 sec", color: "#8b5cf6" },
                  { label: "Accuracy", val: "99.2%", color: "#f59e0b" },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center"
                  >
                    <div className="text-xl font-black" style={{ color: s.color }}>{s.val}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ LIFESTYLE SECTION ══ */}
      <section id="lifestyle" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/0 via-teal-950/10 to-slate-950/0 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 mb-6">
              <TrendingUp className="h-4 w-4 text-teal-400" />
              <span className="text-teal-300 text-sm font-medium">Healthy Lifestyle</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Build Better Habits,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">Every Single Day</span>
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-lg">Track, improve, and celebrate every aspect of your health journey.</p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Health Suggestions */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-xl">Health Suggestions</h3>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold">Daily Updated</span>
              </div>
              <HealthSuggestions />
            </motion.div>

            {/* Lifestyle tips */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <h3 className="text-white font-bold text-xl mb-4">AI Wellness Tips</h3>
              <div className="space-y-3">
                {[
                  { icon: Droplets, tip: "You're 500ml short of your hydration goal. Have a glass of water now!", color: "#3b82f6", badge: "Hydration" },
                  { icon: Moon, tip: "Your sleep score improved by 12% this week. Keep up your bedtime routine.", color: "#8b5cf6", badge: "Sleep ↑12%" },
                  { icon: Heart, tip: "Your resting heart rate is down 3 bpm this month — great cardiovascular trend!", color: "#ef4444", badge: "Cardio ↑" },
                  { icon: Dumbbell, tip: "You've hit your exercise goal 5 days in a row! Aim for 7 this week.", color: "#10b981", badge: "Streak: 5🔥" },
                  { icon: Brain, tip: "High stress detected at 3 PM. Try 5 minutes of mindful breathing.", color: "#ec4899", badge: "Mindfulness" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="flex items-start gap-3 bg-slate-800/40 border border-slate-700/40 hover:border-emerald-500/20 rounded-xl p-4 transition-all duration-300 group"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                      style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                      <item.icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-sm leading-relaxed">{item.tip}</p>
                    </div>
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap"
                      style={{ background: `${item.color}20`, color: item.color }}>{item.badge}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/0 via-emerald-950/10 to-slate-950/0 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
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
            {features.map((f, i) => <FeatureCard key={f.title} {...f} delay={i * 0.08} />)}
          </div>

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
            <p className="text-slate-400 max-w-lg mx-auto text-lg">Every feature seamlessly integrated into a single, intuitive experience designed for you and your family.</p>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setIsPreorderOpen(true)}
              className="mt-8 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-7 py-3.5 rounded-xl transition-all duration-200">
              Get Early Access <ChevronRight className="h-5 w-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ══ ABOUT ══ */}
      <section id="about" className="py-24 px-6">
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
                At <strong className="text-emerald-400">Digital Care</strong>, we bridge the gap between patients and healthcare providers through smart, reliable, and accessible digital solutions built for Nepal.
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

            {/* Phone mockup */}
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }}
              className="relative flex justify-center">
              <div className="relative">
                <div className="absolute -inset-8 bg-gradient-to-r from-emerald-500/20 to-teal-500/10 rounded-3xl blur-2xl" />
                <div className="relative bg-slate-800 rounded-[2.5rem] border border-slate-700 overflow-hidden shadow-2xl w-72">
                  <div className="bg-slate-900 h-8 rounded-t-[2.5rem] flex items-center justify-center">
                    <div className="w-20 h-1.5 bg-slate-700 rounded-full" />
                  </div>
                  <img src={appScreenshot} alt="App Demo" className="w-full" />
                  <div className="bg-slate-900 h-6 rounded-b-[2.5rem]" />
                </div>
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

      {/* ══ STATS BAND ══ */}
      <div className="py-20 px-6 border-y border-emerald-500/10 bg-emerald-950/20">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12">
          <StatCounter value="1000" suffix="+" label="Early Adopters" />
          <StatCounter value="24" suffix="/7" label="Always Available" />
          <StatCounter value="6" suffix="+" label="Core Features" />
          <StatCounter value="100" suffix="%" label="Data Secure" />
        </div>
      </div>

      {/* ══ PRICING / CTA ══ */}
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

      {/* ══ FOOTER ══ */}
      <footer id="contact" className="bg-slate-900/80 border-t border-emerald-500/10 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <HeartPulse className="h-7 w-7 text-emerald-400" />
                <span className="text-lg font-black text-white">Digital Care</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">Revolutionizing healthcare accessibility in Nepal, one family at a time.</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">Platform</div>
              <div className="space-y-2">
                {['Features', 'Lifestyle', 'Pricing', 'About', 'Blogs'].map(l => (
                  <a key={l} href={`#${l.toLowerCase()}`} className="block text-slate-500 hover:text-emerald-400 text-sm transition-colors">{l}</a>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">Contact</div>
              <div className="space-y-3 text-sm text-slate-500">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-emerald-500" /><span>support@digitalcare.com</span></div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-500" /><span>+977 98XXXXXXXX</span></div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-500" /><span>Available 24/7</span></div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
            <span>© 2024 Digital Care. All rights reserved.</span>
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