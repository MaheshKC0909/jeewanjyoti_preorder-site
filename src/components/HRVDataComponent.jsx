import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart, ReferenceLine } from 'recharts';
import { Zap, TrendingUp, AlertCircle, RefreshCw, Activity, Clock, Eye, EyeOff, TrendingDown, Minus } from 'lucide-react';
import { getHRVData } from '../lib/api';
import DataModal from './ui/Modal';
import DayDrillDownBanner from './vitals/DayDrillDownBanner';
import { useVitalDayDrillDown } from '../hooks/useVitalDayDrillDown';

function isDailyHRVRow(row) {
  return row && typeof row.day === 'string' && typeof row.average_hrv === 'number';
}

function zoneColor(v) {
  if (v >= 60) return { bar: '#7F77DD', light: '#EEEDFE', txt: '#3C3489', label: 'Optimal', lightBg: 'rgba(127,119,221,0.08)' };
  if (v >= 40) return { bar: '#378ADD', light: '#E6F1FB', txt: '#0C447C', label: 'Good', lightBg: 'rgba(55,138,221,0.08)' };
  return { bar: '#EF9F27', light: '#FAEEDA', txt: '#633806', label: 'Low', lightBg: 'rgba(239,159,39,0.08)' };
}

const CX = 140;
const CY = 140;
const MIN_R = 22;
const MAX_R = 115;

function polar(angle, r) {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function HRVRecoverySpiral({ data, darkMode, progress }) {
  const N = data.length;
  if (!N) return null;
  const angleStep = (2 * Math.PI) / N;
  const startAngle = -Math.PI / 2;

  const polyPts = data.map((d, i) => {
    const angle = startAngle + i * angleStep;
    const clamped = Math.min(100, Math.max(0, d.hrv));
    const r = MIN_R + (MAX_R - MIN_R) * (clamped / 100) * progress;
    return polar(angle, r);
  });

  const gridLevels = [25, 50, 75, 100];

  return (
    <div className={`rounded-2xl p-5 flex flex-col items-center ${darkMode ? 'bg-gray-900/40' : 'bg-gray-50/80'}`}
      style={{ border: `1px solid ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
      <svg width="280" height="280" viewBox="0 0 280 280" className="max-w-full" aria-hidden>
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7F77DD" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#7F77DD" stopOpacity="0" />
          </radialGradient>
        </defs>

        {gridLevels.map((pct) => {
          const r = MIN_R + (MAX_R - MIN_R) * (pct / 100);
          return (
            <g key={pct}>
              <circle
                cx={CX} cy={CY} r={r}
                fill="none"
                stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                strokeWidth="1"
                strokeDasharray={pct === 100 ? '0' : '3,3'}
              />
              <text x={CX + 4} y={CY - r + 10} fontSize="8" fill={darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} textAnchor="start">
                {pct}
              </text>
            </g>
          );
        })}

        {data.map((_, i) => {
          const angle = startAngle + i * angleStep;
          const end = polar(angle, MAX_R);
          return (
            <line key={`spoke-${i}`} x1={CX} y1={CY} x2={end.x} y2={end.y}
              stroke={darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} strokeWidth="1" />
          );
        })}

        <polygon
          points={polyPts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}
          fill="rgba(127,119,221,0.07)"
          stroke="rgba(127,119,221,0.3)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {data.map((d, i) => {
          const angle = startAngle + i * angleStep;
          const clamped = Math.min(100, Math.max(0, d.hrv));
          const r = MIN_R + (MAX_R - MIN_R) * (clamped / 100) * progress;
          const outer = polar(angle, r);
          const labelR = Math.min(r + 18, MAX_R + 20);
          const labelPt = polar(angle, labelR);
          const z = zoneColor(d.hrv);

          return (
            <g key={`pt-${i}`}>
              <circle
                cx={outer.x.toFixed(2)}
                cy={outer.y.toFixed(2)}
                r="6"
                fill={z.bar}
                stroke={darkMode ? '#111827' : 'white'}
                strokeWidth="2"
                opacity={progress}
              />
              <text
                x={labelPt.x.toFixed(2)}
                y={(labelPt.y + 4).toFixed(2)}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill={darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                opacity={progress}
              >
                {d.day}
              </text>
            </g>
          );
        })}

        <circle cx={CX} cy={CY} r="18" fill="url(#centerGlow)" stroke="rgba(127,119,221,0.3)" strokeWidth="1.5" />
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize="8" fontWeight="600" fill="#7F77DD" letterSpacing="0.5">
          HRV
        </text>
      </svg>
    </div>
  );
}

function TrendIndicator({ data }) {
  if (!data || data.length < 2) return null;
  const recent = data.slice(-3).reduce((a, b) => a + b.hrv, 0) / Math.min(3, data.length);
  const earlier = data.slice(0, 3).reduce((a, b) => a + b.hrv, 0) / Math.min(3, data.length);
  const diff = recent - earlier;
  if (Math.abs(diff) < 2) return (
    <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
      <Minus className="w-3 h-3" /> Stable
    </span>
  );
  if (diff > 0) return (
    <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
      <TrendingUp className="w-3 h-3" /> +{Math.round(diff)} ms
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-rose-400">
      <TrendingDown className="w-3 h-3" /> {Math.round(diff)} ms
    </span>
  );
}

function StatCard({ value, label, darkMode, accent }) {
  return (
    <div className={`rounded-xl p-3.5 flex flex-col gap-1 ${darkMode ? 'bg-gray-900/60' : 'bg-white'}`}
      style={{ border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
      <p className="text-xs font-medium" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{label}</p>
      <p className="text-xl font-semibold" style={{ color: accent || (darkMode ? '#f9fafb' : '#111827') }}>{value}</p>
    </div>
  );
}

function DailyHRVChart({ data, darkMode, onDayClick }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  if (!data.length) return null;

  const PAD_TOP = 48;
  const PAD_BOTTOM = 36;
  const PAD_LEFT = 44;
  const PAD_RIGHT = 16;
  const CHART_H = 240;
  const allVals = data.flatMap(d => [d.hrv, d.min ?? d.hrv, d.max ?? d.hrv]);
  const dataMin = Math.max(0, Math.min(...allVals) - 10);
  const dataMax = Math.max(...allVals) + 12;
  const range = dataMax - dataMin;

  const toY = (v) => PAD_TOP + (CHART_H - PAD_TOP - PAD_BOTTOM) * (1 - (v - dataMin) / range);

  // Evenly space bars across chart width (responsive via %)
  const barCount = data.length;
  const slotW = (100 - (PAD_LEFT / 6) - (PAD_RIGHT / 6)) / barCount;
  const barW = Math.min(slotW * 0.55, 7);

  const gridLines = [0, 25, 50, 75, 100].map(v => dataMin + (range * v / 100));
  const zoneLines = [
    { v: 60, label: 'Optimal', color: '#7F77DD' },
    { v: 40, label: 'Good', color: '#378ADD' },
  ].filter(l => l.v > dataMin && l.v < dataMax);

  const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const hov = hoveredIdx !== null ? data[hoveredIdx] : null;
  const hovZ = hov ? zoneColor(hov.hrv) : null;

  return (
    <div ref={containerRef} style={{ position: 'relative', userSelect: 'none' }}>
      <style>{`
        @keyframes bar-rise {
          from { transform: scaleY(0); opacity: 0; }
          to   { transform: scaleY(1); opacity: 1; }
        }
        @keyframes range-fade {
          from { opacity: 0; transform: scaleY(0.6); }
          to   { opacity: 1; transform: scaleY(1); }
        }
        @keyframes tip-pop {
          from { opacity: 0; transform: translateX(-50%) scale(0.9) translateY(4px); }
          to   { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
        }
        .bar-anim { transform-origin: bottom; animation: bar-rise 0.5s cubic-bezier(0.34,1.4,0.64,1) both; }
        .range-anim { transform-origin: center; animation: range-fade 0.3s ease both; }
        .tip-anim { animation: tip-pop 0.18s ease both; }
      `}</style>

      <svg
        width="100%"
        viewBox={`0 0 440 ${CHART_H}`}
        style={{ overflow: 'visible', display: 'block' }}
        aria-hidden
      >
        {/* Subtle horizontal grid */}
        {gridLines.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT} y1={toY(v)} x2={440 - PAD_RIGHT} y2={toY(v)}
              stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
              strokeWidth="1"
            />
            <text x={PAD_LEFT - 6} y={toY(v) + 4} textAnchor="end" fontSize="9"
              fill={darkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}>
              {Math.round(v)}
            </text>
          </g>
        ))}

        {/* Zone reference lines */}
        {zoneLines.map(({ v, label, color }) => (
          <g key={label}>
            <line
              x1={PAD_LEFT} y1={toY(v)} x2={440 - PAD_RIGHT} y2={toY(v)}
              stroke={color} strokeWidth="1" strokeDasharray="4,4" opacity="0.35"
            />
            <text x={440 - PAD_RIGHT + 2} y={toY(v) + 3} fontSize="8" fill={color} opacity="0.7">{label}</text>
          </g>
        ))}

        {/* Bars + hover interaction */}
        {data.map((d, i) => {
          const z = zoneColor(d.hrv);
          const slotX = PAD_LEFT + (i + 0.5) * ((440 - PAD_LEFT - PAD_RIGHT) / barCount);
          const barX = slotX - (barW / 2);
          const avgY = toY(d.hrv);
          const barH = CHART_H - PAD_BOTTOM - avgY;
          const isHov = hoveredIdx === i;
          const delay = `${i * 45}ms`;

          const hasRange = d.min != null && d.max != null;
          const minY = hasRange ? toY(d.min) : avgY;
          const maxY = hasRange ? toY(d.max) : avgY;

          return (
            <g key={d.dayISO}>
              {/* Hover column highlight */}
              {isHov && (
                <rect
                  x={slotX - (440 - PAD_LEFT - PAD_RIGHT) / barCount / 2}
                  y={PAD_TOP}
                  width={(440 - PAD_LEFT - PAD_RIGHT) / barCount}
                  height={CHART_H - PAD_TOP - PAD_BOTTOM}
                  fill={z.bar}
                  opacity="0.06"
                  rx="4"
                />
              )}

              {/* Min–max range stem */}
              {hasRange && mounted && (
                <g className="range-anim" style={{ animationDelay: delay }}>
                  <line
                    x1={slotX} y1={maxY} x2={slotX} y2={minY}
                    stroke={isHov ? z.bar : (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)')}
                    strokeWidth={isHov ? 2.5 : 1.5}
                    strokeLinecap="round"
                    style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                  />
                  {/* Min cap */}
                  <line x1={slotX - 3} y1={minY} x2={slotX + 3} y2={minY}
                    stroke={isHov ? '#EF9F27' : (darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)')}
                    strokeWidth="1.5" strokeLinecap="round"
                    style={{ transition: 'stroke 0.2s' }} />
                  {/* Max cap */}
                  <line x1={slotX - 3} y1={maxY} x2={slotX + 3} y2={maxY}
                    stroke={isHov ? '#378ADD' : (darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)')}
                    strokeWidth="1.5" strokeLinecap="round"
                    style={{ transition: 'stroke 0.2s' }} />
                </g>
              )}

              {/* Avg bar */}
              {mounted && (
                <rect
                  className="bar-anim"
                  x={barX}
                  y={avgY}
                  width={barW}
                  height={Math.max(3, barH)}
                  rx="3"
                  fill={isHov ? z.bar : `${z.bar}cc`}
                  style={{
                    animationDelay: delay,
                    filter: isHov ? `drop-shadow(0 0 6px ${z.bar}80)` : 'none',
                    transition: 'fill 0.2s, filter 0.2s',
                  }}
                />
              )}

              {/* Avg dot */}
              {mounted && (
                <circle
                  cx={slotX} cy={avgY}
                  r={isHov ? 5 : 3.5}
                  fill={isHov ? z.bar : (darkMode ? '#1f2937' : 'white')}
                  stroke={z.bar}
                  strokeWidth={isHov ? 0 : 2}
                  style={{ transition: 'r 0.2s, fill 0.2s', animationDelay: delay, cursor: 'crosshair' }}
                />
              )}

              {/* Date label */}
              <text
                x={slotX} y={CHART_H - PAD_BOTTOM + 14}
                textAnchor="middle" fontSize="9" fontWeight={isHov ? '600' : '400'}
                fill={isHov ? z.bar : (darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')}
                style={{ transition: 'fill 0.2s' }}
              >
                {fmtDate(d.dayISO)}
              </text>

              {/* Invisible wide hover target */}
              <rect
                x={slotX - (440 - PAD_LEFT - PAD_RIGHT) / barCount / 2}
                y={PAD_TOP - 8}
                width={(440 - PAD_LEFT - PAD_RIGHT) / barCount}
                height={CHART_H - PAD_TOP - PAD_BOTTOM + 24}
                fill="transparent"
                style={{ cursor: onDayClick ? 'pointer' : 'crosshair' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onDayClick && onDayClick(d.dayISO)}
              />
            </g>
          );
        })}

        {/* Y-axis line */}
        <line
          x1={PAD_LEFT} y1={PAD_TOP - 8} x2={PAD_LEFT} y2={CHART_H - PAD_BOTTOM}
          stroke={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} strokeWidth="1"
        />
      </svg>

      {/* Floating tooltip */}
      {hov && hovZ && (() => {
        const slotX = PAD_LEFT + (hoveredIdx + 0.5) * ((440 - PAD_LEFT - PAD_RIGHT) / barCount);
        const leftPct = (slotX / 440) * 100;
        return (
          <div
            className="tip-anim pointer-events-none absolute"
            style={{
              top: 0,
              left: `${leftPct}%`,
              transform: 'translateX(-50%)',
              zIndex: 30,
            }}
          >
            <div
              style={{
                background: darkMode ? '#1a2030' : '#fff',
                border: `1px solid ${hovZ.bar}50`,
                borderRadius: 12,
                padding: '10px 14px',
                minWidth: 120,
                boxShadow: `0 8px 24px rgba(0,0,0,0.18), 0 0 0 1px ${hovZ.bar}20`,
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 10, fontWeight: 500, color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', marginBottom: 6 }}>
                {fmtDate(hov.dayISO)}
              </p>
              <p style={{ fontSize: 22, fontWeight: 700, color: hovZ.bar, lineHeight: 1, marginBottom: 8 }}>
                {hov.hrv} <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.7 }}>ms</span>
              </p>
              {hov.max != null && hov.min != null && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 9, color: '#378ADD', fontWeight: 600, marginBottom: 2 }}>HIGH</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#378ADD', tabularNums: true }}>{Math.round(hov.max)}</p>
                  </div>
                  <div style={{ width: 1, height: 24, background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 9, color: '#EF9F27', fontWeight: 600, marginBottom: 2 }}>LOW</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#EF9F27', tabularNums: true }}>{Math.round(hov.min)}</p>
                  </div>
                </div>
              )}
              <span style={{
                display: 'inline-block', fontSize: 9, fontWeight: 700,
                padding: '2px 8px', borderRadius: 20,
                background: hovZ.light, color: hovZ.txt,
              }}>{hovZ.label}</span>
            </div>
            {/* Arrow */}
            <div style={{
              width: 8, height: 8, margin: '-4px auto 0',
              background: darkMode ? '#1a2030' : '#fff',
              border: `1px solid ${hovZ.bar}50`,
              borderTop: 'none', borderLeft: 'none',
              transform: 'rotate(45deg)',
            }} />
          </div>
        );
      })()}
    </div>
  );
}

function DailyHRVSection({ spiralChartData, spiralStats, darkMode, progress, onDayClick }) {
  if (!spiralChartData.length || !spiralStats) return null;

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <StatCard value={`${spiralStats.avg} ms`} label="Avg HRV" darkMode={darkMode} accent="#7F77DD" />
        <StatCard value={`${spiralStats.peak.hrv} ms`} label="Peak" darkMode={darkMode} accent="#378ADD" />
        <StatCard value={`${spiralStats.low.hrv} ms`} label="Lowest" darkMode={darkMode} accent="#EF9F27" />
        <StatCard value={`${spiralStats.optimal}/${spiralStats.total}`} label="Optimal days" darkMode={darkMode} accent="#7F77DD" />
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {[
          { color: '#7F77DD', label: '≥60 ms · Optimal' },
          { color: '#378ADD', label: '40–59 ms · Good' },
          { color: '#EF9F27', label: '<40 ms · Low' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs"
            style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs"
          style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
          <svg width="14" height="10" style={{ display: 'inline' }}>
            <line x1="7" y1="1" x2="7" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="3" y1="1" x2="11" y2="1" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="3" y1="9" x2="11" y2="9" stroke="#EF9F27" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          High / Low range
        </span>
      </div>

      {/* Main chart */}
      <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-900/40' : 'bg-gray-50/80'}`}
        style={{ border: `1px solid ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
        <DailyHRVChart data={spiralChartData} darkMode={darkMode} onDayClick={onDayClick} />
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, darkMode }) => {
  if (active && payload && payload.length) {
    const z = zoneColor(payload[0].value);
    return (
      <div className={`px-3 py-2.5 rounded-xl shadow-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <p className="text-xs mb-1" style={{ color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
          {payload[0].payload.fullTime}
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: z.bar }} />
          <span className="text-sm font-semibold" style={{ color: darkMode ? '#f9fafb' : '#111827' }}>
            {payload[0].value} ms
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: z.light, color: z.txt }}>
            {z.label}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

function MultiDayBarPreview({ data, darkMode, onDayClick }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [mounted, setMounted] = useState(false);
  const bars = data.slice(-7);
  const maxHrv = Math.max(...bars.map(d => d.hrv));

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mt-3">
      <style>{`
        @keyframes hrv-bar-rise {
          from { transform: scaleY(0); opacity: 0; }
          to   { transform: scaleY(1); opacity: 1; }
        }
        .hrv-bar-anim {
          transform-origin: bottom;
          animation: hrv-bar-rise 0.55s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes hrv-dot-pop {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        .hrv-dot-anim {
          animation: hrv-dot-pop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
        }
      `}</style>
      <div
        className={`rounded-xl p-3 relative overflow-visible ${darkMode ? 'bg-gray-900/40' : 'bg-gray-50'}`}
        style={{ border: `1px solid ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
      >
        <div className="flex items-end justify-between gap-1.5 overflow-visible" style={{ height: 64 }}>
          {bars.map((d, i) => {
            const z = zoneColor(d.hrv);
            const pct = Math.max(8, (d.hrv / (maxHrv * 1.15)) * 100);
            const date = new Date(d.dayISO);
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const isHovered = hoveredIdx === i;
            const delay = `${i * 60}ms`;

            return (
              <div
                key={d.dayISO}
                role={onDayClick ? 'button' : undefined}
                tabIndex={onDayClick ? 0 : undefined}
                className="flex flex-col items-center gap-1 flex-1 min-w-0 relative cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onDayClick?.(d.dayISO)}
                onKeyDown={(e) => {
                  if (onDayClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onDayClick(d.dayISO);
                  }
                }}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div
                    className="absolute z-20 hrv-dot-anim"
                    style={{
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginBottom: 6,
                      pointerEvents: 'none',
                      minWidth: 110,
                    }}
                  >
                    <div
                      className={`rounded-xl px-3 py-2 shadow-xl text-center`}
                      style={{
                        background: darkMode ? '#1f2937' : '#fff',
                        border: `1px solid ${z.bar}40`,
                        boxShadow: `0 4px 20px ${z.bar}30`,
                      }}
                    >
                      <p className="text-[10px] font-semibold mb-1.5" style={{ color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }}>
                        {label}
                      </p>
                      <p className="text-[9px] font-medium mb-0.5" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                        Average
                      </p>
                      <p className="text-base font-bold tabular-nums" style={{ color: z.bar }}>{d.hrv} ms</p>
                      <div className="flex flex-col gap-1 mt-1.5 text-left w-full px-0.5">
                        {d.min != null && (
                          <span className="text-[9px] font-semibold" style={{ color: darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>
                            Min: <span style={{ color: '#EF9F27' }}>{Math.round(d.min)} ms</span>
                          </span>
                        )}
                        {d.max != null && (
                          <span className="text-[9px] font-semibold" style={{ color: darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>
                            Max: <span style={{ color: '#378ADD' }}>{Math.round(d.max)} ms</span>
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block"
                        style={{ background: z.light, color: z.txt }}
                      >{z.label}</span>
                    </div>
                    {/* Arrow */}
                    <div style={{
                      width: 8, height: 8,
                      background: darkMode ? '#1f2937' : '#fff',
                      border: `1px solid ${z.bar}40`,
                      borderTop: 'none', borderLeft: 'none',
                      transform: 'rotate(45deg)',
                      margin: '-4px auto 0',
                    }} />
                  </div>
                )}

                {/* Bar track */}
                <div
                  className="w-full rounded-md overflow-hidden flex items-end relative"
                  style={{
                    height: 40,
                    background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    transition: 'background 0.2s',
                  }}
                >
                  {mounted && (
                    <div
                      className="hrv-bar-anim w-full rounded-md"
                      style={{
                        height: `${pct}%`,
                        background: isHovered
                          ? z.bar
                          : `${z.bar}bb`,
                        animationDelay: delay,
                        transition: 'background 0.2s, height 0.3s ease',
                        borderRadius: '4px 4px 2px 2px',
                      }}
                    />
                  )}
                  {/* Hover glow ring */}
                  {isHovered && (
                    <div
                      className="absolute inset-0 rounded-md pointer-events-none"
                      style={{ boxShadow: `0 0 0 1.5px ${z.bar}` }}
                    />
                  )}
                </div>

                {/* Date label */}
                <span
                  className="text-[8px] truncate w-full text-center font-medium transition-colors"
                  style={{ color: isHovered ? z.bar : (darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const HRVDataComponent = ({ darkMode, onHRVDataUpdate, selectedUserId, dateRange }) => {
  const [hrvData, setHrvData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(100);
  const [localDateRange, setLocalDateRange] = useState(dateRange);
  const [spiralProgress, setSpiralProgress] = useState(0);
  const spiralRafRef = useRef(null);

  useEffect(() => { setLocalDateRange(dateRange); }, [dateRange]);
  useEffect(() => { setLocalDateRange(dateRange); }, [showDetails, dateRange]);

  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const { drillToDay, exitDayDrill } = useVitalDayDrillDown(localDateRange, setLocalDateRange);

  const formatDateForAPI = (date) => {
    if (!date) return null;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    return new Date(date).toISOString().split('T')[0];
  };

  const fetchHRVData = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      let range = null, cacheKey;
      let date = null;

      if (localDateRange?.customRange && localDateRange?.date) {
        date = formatDateForAPI(localDateRange.date);
        cacheKey = `${selectedUserId || 'null'}-hrv-date-${date}`;
      } else {
        if (localDateRange?.period === 'today') range = '24h';
        else if (localDateRange?.period === 'week') range = '7d';
        else if (localDateRange?.period === 'month') range = '30d';
        else range = '24h';
        cacheKey = `${selectedUserId || 'null'}-hrv-${range}`;
      }

      if (cacheRef.current.has(cacheKey)) {
        const cachedData = cacheRef.current.get(cacheKey);
        if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
          if (isMountedRef.current) {
            setHrvData(cachedData.data);
            if (onHRVDataUpdate) onHRVDataUpdate(cachedData.data);
            setLoading(false);
          }
          return;
        }
      }

      const data = await getHRVData(selectedUserId, date, range);
      if (!isMountedRef.current || abortControllerRef.current.signal.aborted) return;

      if (data && data.length > 0) {
        const sortedData = [...data].sort((a, b) => new Date(a.day || a.date) - new Date(b.day || b.date));
        cacheRef.current.set(cacheKey, { data: sortedData, timestamp: Date.now() });
        if (isMountedRef.current) {
          setHrvData(sortedData);
          if (onHRVDataUpdate) onHRVDataUpdate(sortedData);
        }
      } else {
        if (isMountedRef.current) { setHrvData([]); if (onHRVDataUpdate) onHRVDataUpdate([]); }
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED' || !isMountedRef.current) return;
      if (isMountedRef.current) setError('Failed to load HRV data. Please try again.');
    } finally {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) setLoading(false);
    }
  }, [selectedUserId, onHRVDataUpdate, localDateRange?.date, localDateRange?.customRange, localDateRange?.period]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchHRVData();
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchHRVData]);

  const processHRVData = useCallback((data) => {
    if (!data || data.length === 0 || isDailyHRVRow(data[0])) return [];
    return data.map((item) => ({
      time: new Date(item.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      value: item.hrv,
      fullTime: new Date(item.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
      date: item.date
    }));
  }, []);

  const calculateAverageHRV = useCallback((data) => {
    if (!data || data.length === 0) return 0;
    if (isDailyHRVRow(data[0])) return Math.round(data.reduce((acc, item) => acc + item.average_hrv, 0) / data.length);
    return Math.round(data.reduce((acc, item) => acc + item.hrv, 0) / data.length);
  }, []);

  const getHRVStatus = useCallback((value) => {
    if (value >= 60) return { status: 'Optimal', color: '#7F77DD', bg: 'rgba(127,119,221,0.1)', dot: '#7F77DD' };
    if (value >= 40) return { status: 'Good', color: '#378ADD', bg: 'rgba(55,138,221,0.1)', dot: '#378ADD' };
    return { status: 'Low', color: '#EF9F27', bg: 'rgba(239,159,39,0.1)', dot: '#EF9F27' };
  }, []);

  const getDateRangeDisplay = useCallback(() => {
    if (!hrvData || hrvData.length === 0) return 'No data';
    const firstDate = new Date(hrvData[0].day || hrvData[0].date);
    const lastDate = new Date(hrvData[hrvData.length - 1].day || hrvData[hrvData.length - 1].date);
    if (firstDate.toDateString() === lastDate.toDateString())
      return firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [hrvData]);

  const getVisibleData = useCallback(() => {
    if (!hrvData || hrvData.length === 0 || isDailyHRVRow(hrvData[0])) return [];
    const processedData = processHRVData(hrvData);
    if (!processedData.length) return [];
    const timestamps = processedData.map(item => new Date(item.date).getTime());
    const firstTimestamp = Math.min(...timestamps);
    const lastTimestamp = Math.max(...timestamps);
    const totalDuration = lastTimestamp - firstTimestamp;
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    if (totalDuration <= twelveHoursMs) return processedData;
    const maxStartTime = lastTimestamp - twelveHoursMs;
    const startTime = firstTimestamp + ((maxStartTime - firstTimestamp) * (sliderPosition / 100));
    const endTime = startTime + twelveHoursMs;
    return processedData.filter(item => {
      const t = new Date(item.date).getTime();
      return t >= startTime && t <= endTime;
    });
  }, [hrvData, sliderPosition, processHRVData]);

  const chartData = useMemo(() => processHRVData(hrvData), [hrvData, processHRVData]);
  const visibleData = useMemo(() => getVisibleData(), [getVisibleData]);

  const spiralChartData = useMemo(() => {
    if (!hrvData?.length || !isDailyHRVRow(hrvData[0])) return [];
    return hrvData.map((row, i) => ({
      day: String(i + 1),
      hrv: Math.round(row.average_hrv),
      dayISO: row.day,
      min: row.minimum_hrv,
      max: row.maximum_hrv,
    }));
  }, [hrvData]);

  const spiralStats = useMemo(() => {
    const pts = spiralChartData;
    if (!pts.length) return null;
    const avg = Math.round(pts.reduce((a, b) => a + b.hrv, 0) / pts.length);
    return {
      avg,
      peak: pts.reduce((a, b) => (a.hrv >= b.hrv ? a : b)),
      low: pts.reduce((a, b) => (a.hrv <= b.hrv ? a : b)),
      optimal: pts.filter((d) => d.hrv >= 60).length,
      total: pts.length,
    };
  }, [spiralChartData]);

  useEffect(() => {
    if (!spiralChartData.length) { setSpiralProgress(0); return; }
    let animStart = null;
    const duration = 1000;
    function step(ts) {
      if (animStart === null) animStart = ts;
      const p = Math.min((ts - animStart) / duration, 1);
      setSpiralProgress(1 - (1 - p) ** 3);
      if (p < 1) spiralRafRef.current = requestAnimationFrame(step);
    }
    setSpiralProgress(0);
    spiralRafRef.current = requestAnimationFrame(step);
    return () => { if (spiralRafRef.current) cancelAnimationFrame(spiralRafRef.current); };
  }, [spiralChartData]);

  const averageHRV = useMemo(() => calculateAverageHRV(hrvData), [hrvData, calculateAverageHRV]);
  const latestHrvMs = useMemo(() => {
    if (!hrvData?.length) return averageHRV;
    const last = hrvData[hrvData.length - 1];
    if (isDailyHRVRow(last)) return Math.round(last.average_hrv);
    return last.hrv ?? averageHRV;
  }, [hrvData, averageHRV]);

  const status = useMemo(() => getHRVStatus(latestHrvMs), [latestHrvMs, getHRVStatus]);
  const dateRangeDisplay = useMemo(() => getDateRangeDisplay(), [hrvData, getDateRangeDisplay]);

  const chartStroke = status.color;
  const displayData = visibleData.length ? visibleData : chartData;

  const cardBase = `rounded-2xl shadow-sm border ${darkMode ? 'bg-gray-800/80 border-gray-700/60' : 'bg-white border-gray-100'}`;

  if (loading) {
    return (
      <>
        <div className={`${cardBase} p-5`}>
          <div className="flex items-center justify-center h-40">
            <div className="text-center space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto" style={{ color: '#7F77DD' }} />
              <p className="text-sm" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Loading HRV data…</p>
            </div>
          </div>
        </div>
        <DataModal isOpen={showDetails} onClose={() => setShowDetails(false)} title="HRV Details" darkMode={darkMode}>
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ color: '#7F77DD' }} />
          </div>
        </DataModal>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className={`${cardBase} p-5`}>
          <div className="flex items-center justify-center h-40">
            <div className="text-center space-y-3">
              <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
              <p className="text-sm" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{error}</p>
              <button onClick={fetchHRVData}
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-white"
                style={{ background: '#7F77DD' }}>
                Retry
              </button>
            </div>
          </div>
        </div>
        <DataModal isOpen={showDetails} onClose={() => setShowDetails(false)} title="HRV Details" darkMode={darkMode}>
          <div className="flex items-center justify-center h-40">
            <AlertCircle className="w-8 h-8 text-rose-400" />
          </div>
        </DataModal>
      </>
    );
  }

  if (!hrvData || hrvData.length === 0) {
    return (
      <>
        <div className={`${cardBase} p-5`}>
          <div className="flex items-center justify-center h-40">
            <div className="text-center space-y-3">
              <Zap className="w-7 h-7 mx-auto" style={{ color: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }} />
              <p className="text-sm" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>No HRV data available</p>
            </div>
          </div>
        </div>
        <DataModal isOpen={showDetails} onClose={() => setShowDetails(false)} title="HRV Details" darkMode={darkMode}>
          <div className="flex items-center justify-center h-40">
            <p className="text-sm" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>No HRV data for this period.</p>
          </div>
        </DataModal>
      </>
    );
  }

  return (
    <div className={`${cardBase} p-5`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: status.bg }}>
            <Zap className="w-5 h-5" style={{ color: status.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm" style={{ color: darkMode ? '#f9fafb' : '#111827' }}>
                HRV Score
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: status.bg, color: status.color }}>
                {status.status}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
              {dateRangeDisplay}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums" style={{ color: status.color }}>
              {latestHrvMs}
              <span className="text-sm font-normal ml-1" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>ms</span>
            </div>
            <div className="flex justify-end mt-0.5">
              <TrendIndicator data={spiralChartData.length ? spiralChartData : chartData.map(d => ({ hrv: d.value }))} />
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
            {showDetails ? <EyeOff className="w-4 h-4" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} />
              : <Eye className="w-4 h-4" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} />}
          </button>
        </div>
      </div>

      {/* Mini sparkline on card — single-day, no fill */}
      {!spiralChartData.length && chartData.length > 1 && (
        <div style={{ height: 52, marginTop: 6 }} className="relative z-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <Tooltip
                content={<CustomTooltip darkMode={darkMode} />}
                cursor={{ stroke: chartStroke, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Line type="monotone" dataKey="value" stroke={chartStroke} strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: chartStroke, stroke: darkMode ? '#1f2937' : '#fff', strokeWidth: 2 }}
                isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Multi-day card preview — animated interactive bar chart */}
      {spiralChartData.length > 0 && (
        <>
          <p className={`mt-2 text-center text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Click a day to view readings
          </p>
          <MultiDayBarPreview data={spiralChartData} darkMode={darkMode} onDayClick={drillToDay} />
        </>
      )}

      <DayDrillDownBanner
        dateRange={localDateRange}
        onBack={exitDayDrill}
        darkMode={darkMode}
        accentClass="text-[#7F77DD]"
      />

      {/* Detail Modal */}
      <DataModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="HRV Score Details"
        darkMode={darkMode}
      >
        <div className="space-y-5">
          {/* Filter bar */}
          <div className={`flex flex-col md:flex-row gap-3 justify-between items-start md:items-center p-3 rounded-xl ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}
            style={{ border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: darkMode ? 'rgba(255,255,255,0.04)' : 'white', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: '7 days' },
                { id: 'month', label: '30 days' },
                { id: 'custom', label: 'Custom' }
              ].map(filter => {
                const isActive = (filter.id === 'custom' && localDateRange?.customRange) ||
                  (!localDateRange?.customRange && localDateRange?.period === filter.id) ||
                  (!localDateRange?.period && !localDateRange?.customRange && filter.id === 'today');
                return (
                  <button
                    key={filter.id}
                    onClick={() => {
                      if (filter.id === 'custom') setLocalDateRange({ ...localDateRange, customRange: true });
                      else setLocalDateRange({ period: filter.id, customRange: false });
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                    style={isActive ? {
                      background: '#7F77DD',
                      color: 'white',
                    } : {
                      color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                    }}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {localDateRange?.customRange && (
              <div className="flex items-center gap-2 text-xs w-full md:w-auto">
                <input type="date" value={localDateRange?.date || ''}
                  onChange={(e) => setLocalDateRange({ ...localDateRange, date: e.target.value })}
                  className={`flex-1 md:flex-none px-2.5 py-1.5 rounded-lg border text-xs outline-none ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'}`} />
              </div>
            )}
          </div>

          {spiralChartData.length > 0 ? (
            <DailyHRVSection
              spiralChartData={spiralChartData}
              spiralStats={spiralStats}
              darkMode={darkMode}
              onDayClick={drillToDay}
            />
          ) : (
            <>
              <DayDrillDownBanner
                dateRange={localDateRange}
                onBack={exitDayDrill}
                darkMode={darkMode}
                accentClass="text-[#7F77DD]"
              />
              <div className="grid grid-cols-3 gap-3">
                <StatCard value={`${averageHRV} ms`} label="Average" darkMode={darkMode} accent={chartStroke} />
                <StatCard value={`${latestHrvMs} ms`} label="Latest" darkMode={darkMode} accent={chartStroke} />
                <StatCard value={chartData.length} label="Readings" darkMode={darkMode} />
              </div>

              <div>
                <p className="text-xs font-medium mb-3" style={{ color: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
                  HRV over time
                </p>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={displayData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
                      <XAxis dataKey="time" stroke="transparent" tick={{ fontSize: 10, fill: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }} tickLine={false} />
                      <YAxis stroke="transparent" tick={{ fontSize: 10, fill: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }} tickLine={false} />
                      <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
                      <Line type="monotone" dataKey="value" stroke={chartStroke} strokeWidth={2.5}
                        dot={{ r: 3, fill: chartStroke, stroke: darkMode ? '#1f2937' : 'white', strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: chartStroke }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Timeline slider */}
                <div className="mt-3 px-1">
                  <input
                    type="range" min="0" max="100" step="1" value={sliderPosition}
                    onChange={(e) => setSliderPosition(Number(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${chartStroke} 0%, ${chartStroke} ${sliderPosition}%, ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} ${sliderPosition}%, ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 100%)`,
                    }}
                  />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px]" style={{ color: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>Older</span>
                    <span className="text-[10px]" style={{ color: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>Newer</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DataModal>
    </div>
  );
};

export default HRVDataComponent;