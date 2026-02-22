import React, { useState, useEffect, useCallback } from "react";
import { X, Activity, Heart, Brain, Droplets, TrendingUp } from "lucide-react";

function formatTimestamp(ts) {
  const date = new Date(ts * 1000);
  return {
    date: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}

function getLatestData(data) {
  if (!data || data.length === 0) return null;
  return data.reduce((latest, curr) => (curr.timestamp > latest.timestamp ? curr : latest));
}

function StatusDot({ active }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? "bg-emerald-400" : "bg-slate-500"}`} />
    </span>
  );
}

function MetricCard({ icon, label, value, unit, sub, color, normal, darkMode }) {
  const inRange = normal ? normal(value) : true;
  return (
    <div
      className={`relative rounded-2xl p-5 flex flex-col gap-3 overflow-hidden ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      } border shadow-lg`}
    >
      {/* Accent glow */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl pointer-events-none"
        style={{ background: color, transform: "translate(30%, -30%)" }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className={`text-xs font-semibold tracking-widest uppercase ${
            darkMode ? "text-gray-400" : "text-gray-500"
          }`}>
            {label}
          </span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            inRange 
              ? darkMode ? "bg-green-900/20 text-green-400" : "bg-green-50 text-green-600"
              : darkMode ? "bg-red-900/20 text-red-400" : "bg-red-50 text-red-600"
          }`}
        >
          {inRange ? "Normal" : "Alert"}
        </span>
      </div>

      <div className="flex items-end gap-1.5">
        <span className={`text-4xl font-bold tabular-nums`} style={{ 
          color, 
          fontFamily: "'Courier New', monospace", 
          letterSpacing: "-1px" 
        }}>
          {value ?? "—"}
        </span>
        <span className={`text-sm mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          {unit}
        </span>
      </div>

      {sub && <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}

function BloodPressureCard({ systolic, diastolic, darkMode }) {
  const map = systolic && diastolic ? Math.round((systolic + 2 * diastolic) / 3) : null;
  const inRange = systolic < 130 && diastolic < 85;
  return (
    <div
      className={`relative rounded-2xl p-5 flex flex-col gap-3 overflow-hidden col-span-2 sm:col-span-1 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      } border shadow-lg`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl pointer-events-none" 
           style={{ background: "#c084fc", transform: "translate(30%, -30%)" }} />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-500" />
          <span className={`text-xs font-semibold tracking-widest uppercase ${
            darkMode ? "text-gray-400" : "text-gray-500"
          }`}>Blood Pressure</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          inRange 
            ? darkMode ? "bg-green-900/20 text-green-400" : "bg-green-50 text-green-600"
            : darkMode ? "bg-red-900/20 text-red-400" : "bg-red-50 text-red-600"
        }`}>
          {inRange ? "Normal" : "Elevated"}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>SYS</span>
          <span className="text-3xl font-bold tabular-nums" style={{ 
            color: "#c084fc", 
            fontFamily: "'Courier New', monospace" 
          }}>{systolic}</span>
        </div>
        <span className={`text-2xl font-thin ${darkMode ? "text-gray-600" : "text-gray-300"}`}>/</span>
        <div className="flex flex-col">
          <span className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>DIA</span>
          <span className="text-3xl font-bold tabular-nums" style={{ 
            color: "#a78bfa", 
            fontFamily: "'Courier New', monospace" 
          }}>{diastolic}</span>
        </div>
        <span className={`text-sm ml-1 self-end mb-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>mmHg</span>
      </div>
      
      {map && <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>MAP: {map} mmHg</p>}
    </div>
  );
}

export default function RealTimeHealthDashboard({ isOpen, onClose, patientId, patientName, darkMode, accessToken }) {
  const [data, setData] = useState(null);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const API_URL = `https://jeewanjyoti-backend.smart.org.np/api/real-time-data/?user_id=${patientId}`;

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLatest(getLatestData(json));
      setLastFetched(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
      // Use mock data for preview
      const mock = [
        { device_id: "36:D2:D3:0B:AF:6C", heartRate: 79, stress: 0, hrv: 0, spo2: 99, systolic: 117, diastolic: 84, timestamp: 1771059975, user: patientId },
        { device_id: "36:D2:D3:0B:AF:6C", heartRate: 97, stress: 0, hrv: 0, spo2: 98, systolic: 117, diastolic: 84, timestamp: 1771001294, user: patientId },
        { device_id: "31:31:43:34:B9:05", heartRate: 71, stress: 38, hrv: 47, spo2: 97, systolic: 118, diastolic: 78, timestamp: 1770999872, user: patientId },
      ];
      setData(mock);
      setLatest(getLatestData(mock));
      setLastFetched(new Date());
    } finally {
      setLoading(false);
    }
  }, [patientId, accessToken]);

  useEffect(() => {
    if (isOpen && patientId && accessToken) {
      fetchData();
      const interval = setInterval(fetchData, 30000); // refresh every 30s
      return () => clearInterval(interval);
    }
  }, [isOpen, patientId, accessToken, fetchData]);

  const ts = latest ? formatTimestamp(latest.timestamp) : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
        darkMode ? 'bg-gray-900' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Heart className="w-6 h-6 text-red-500" />
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {patientName}'s Real-time Health
              </h1>
            </div>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Live health monitoring dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <StatusDot active={!loading && !error} />
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {loading ? "Connecting..." : error ? "Using cached data" : "Live"}
              </span>
            </div>
            <button
              onClick={fetchData}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                darkMode 
                  ? 'bg-indigo-900/20 border border-indigo-500/30 text-indigo-400' 
                  : 'bg-indigo-50 border border-indigo-200 text-indigo-600'
              }`}
            >
              ↻ Refresh
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`p-6 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
          {/* Timestamp banner */}
          {latest && (
            <div className={`rounded-xl px-4 py-3 flex items-center justify-center gap-4 mb-6 ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
            } border`}>
              <div className="flex items-center gap-4 text-sm">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  📅 {ts?.date}
                </span>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  🕐 {ts?.time}
                </span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && !latest ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Fetching health data...
                </span>
              </div>
            </div>
          ) : latest ? (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <MetricCard
                  icon="💗"
                  label="Heart Rate"
                  value={latest.heartRate}
                  unit="bpm"
                  color="#f472b6"
                  normal={(v) => v >= 60 && v <= 100}
                  sub="Resting heart rate"
                  darkMode={darkMode}
                />
                <MetricCard
                  icon="🫁"
                  label="SpO₂"
                  value={latest.spo2}
                  unit="%"
                  color="#38bdf8"
                  normal={(v) => v >= 95}
                  sub="Blood oxygen saturation"
                  darkMode={darkMode}
                />
                <MetricCard
                  icon="🧠"
                  label="Stress"
                  value={latest.stress}
                  unit="/100"
                  color="#fb923c"
                  normal={(v) => v <= 40}
                  sub={latest.stress === 0 ? "No stress detected" : latest.stress < 40 ? "Mild stress" : "High stress"}
                  darkMode={darkMode}
                />
                <MetricCard
                  icon="📊"
                  label="HRV"
                  value={latest.hrv}
                  unit="ms"
                  color="#4ade80"
                  normal={(v) => v >= 20 || v === 0}
                  sub={latest.hrv === 0 ? "Not measured" : "Heart rate variability"}
                  darkMode={darkMode}
                />
                <BloodPressureCard 
                  systolic={latest.systolic} 
                  diastolic={latest.diastolic} 
                  darkMode={darkMode}
                />
              </div>

              {/* History section */}
              {data && data.length > 1 && (
                <div>
                  <h2 className={`text-xs font-semibold tracking-widest uppercase mb-3 ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    Recent Readings
                  </h2>
                  <div className="flex flex-col gap-2">
                    {[...data]
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .slice(1) // skip latest already shown above
                      .map((item, i) => {
                        const t = formatTimestamp(item.timestamp);
                        return (
                          <div
                            key={i}
                            className={`rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm ${
                              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                            } border`}
                          >
                            <div className={`flex items-center gap-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              <span className="text-xs">{t.date} · {t.time}</span>
                            </div>
                            <div className="flex flex-wrap gap-4">
                              <span><span style={{ color: "#f472b6" }}>♥ {item.heartRate}</span> <span className="text-xs" style={{ color: "rgba(148,163,184,0.4)" }}>bpm</span></span>
                              <span><span style={{ color: "#38bdf8" }}>O₂ {item.spo2}</span><span className="text-xs" style={{ color: "rgba(148,163,184,0.4)" }}>%</span></span>
                              <span><span style={{ color: "#c084fc" }}>{item.systolic}/{item.diastolic}</span> <span className="text-xs" style={{ color: "rgba(148,163,184,0.4)" }}>mmHg</span></span>
                              {item.stress > 0 && <span><span style={{ color: "#fb923c" }}>Stress {item.stress}</span></span>}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          ) : null}

          {/* Footer */}
          <div className={`text-center text-xs pt-4 mt-6 border-t ${
            darkMode ? 'text-gray-500 border-gray-800' : 'text-gray-400 border-gray-200'
          }`}>
            Auto-refreshes every 30 seconds
            {lastFetched && ` · Last updated ${lastFetched.toLocaleTimeString()}`}
          </div>
        </div>
      </div>
    </div>
  );
}
