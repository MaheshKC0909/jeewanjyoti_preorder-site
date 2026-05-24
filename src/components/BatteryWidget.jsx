import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { X, Zap } from 'lucide-react';

// ─── SVG Battery Icon ────────────────────────────────────────────────────────
const BatterySVG = ({ pct, size = 40 }) => {
  const fillColor =
    pct === null  ? '#9CA3AF'
    : pct > 50    ? '#22C55E'
    : pct > 20    ? '#F59E0B'
                  : '#EF4444';

  const innerX = 9, innerW = 52, innerY = 3, innerH = 24;
  const fillW = pct !== null ? (innerW * pct) / 100 : 0;
  const fillX = innerX + innerW - fillW;
  const textX  = innerX + innerW / 2;
  const textY  = innerY + innerH / 2 + 4;

  return (
    <svg
      width={size * 1.8}
      height={size}
      viewBox="0 0 64 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Terminal nub */}
      <rect x="0" y="9" width="6" height="12" rx="2" fill="#4B5563" />
      {/* Outer shell */}
      <rect x="6" y="0" width="58" height="30" rx="5" fill="#4B5563" />
      {/* Inner background */}
      <rect x={innerX} y={innerY} width={innerW} height={innerH} rx="3" fill="#E5E7EB" />
      {/* Dynamic fill */}
      {pct !== null && fillW > 0 && (
        <rect x={fillX} y={innerY} width={fillW} height={innerH} rx="3" fill={fillColor} />
      )}
      {/* Percentage text */}
      <text
        x={textX}
        y={textY}
        textAnchor="middle"
        fontSize="9"
        fontWeight="bold"
        fill="white"
        style={{ filter: 'drop-shadow(0px 0px 1px rgba(0,0,0,0.5))' }}
      >
        {pct !== null ? `${pct}%` : '—'}
      </text>
    </svg>
  );
};

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────
const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      minWidth: 160,
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 4, fontSize: 11 }}>{d?.fullDate}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Zap size={12} color="#facc15" fill="#facc15" />
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
          {payload[0].value}%
        </span>
      </div>
      {d?.device_id && (
        <div style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>
          Device: {d.device_id}
        </div>
      )}
    </div>
  );
};

// ─── Main BatteryWidget ───────────────────────────────────────────────────────
/**
 * Accepts `batteryData` as either:
 *   - null / undefined   → no data
 *   - a single object    → { percentage, timestamp, ... }
 *   - an array           → [{ percentage, timestamp, ... }, ...]
 *
 * Shows latest reading on the icon; clicking opens a popup with a history chart.
 */
const BatteryWidget = ({ batteryData, size = 48, darkMode = false }) => {
  const [open, setOpen] = useState(false);
  const popupRef = useRef(null);

  // Normalise to an array sorted oldest → newest
  const readings = React.useMemo(() => {
    if (!batteryData) return [];
    const arr = Array.isArray(batteryData) ? batteryData : [batteryData];
    return [...arr].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
  }, [batteryData]);

  // Latest reading (last after sort = most recent)
  const latest = readings.length > 0 ? readings[readings.length - 1] : null;
  const latestPct = latest?.percentage ?? null;

  // Chart data
  const chartData = readings.map((r) => {
    const d = new Date(r.timestamp);
    const label = d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
    const fullDate = d.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    return {
      label,
      fullDate,
      percentage: r.percentage,
      device_id: r.device_id,
    };
  });

  // Close on outside click
  const handleOutsideClick = useCallback((e) => {
    if (popupRef.current && !popupRef.current.contains(e.target)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open, handleOutsideClick]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const fillColor =
    latestPct === null ? '#9CA3AF'
    : latestPct > 50   ? '#22C55E'
    : latestPct > 20   ? '#F59E0B'
                       : '#EF4444';

  const gradientId = 'battGrad_' + (darkMode ? 'dark' : 'light');

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Clickable battery icon */}
      <button
        onClick={() => readings.length > 0 && setOpen((v) => !v)}
        title={
          latestPct !== null
            ? `Battery ${latestPct}% — click to view history`
            : 'No battery data'
        }
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: readings.length > 0 ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 8,
          transition: 'opacity 0.15s',
          outline: 'none',
        }}
        onMouseEnter={(e) => { if (readings.length > 0) e.currentTarget.style.opacity = '0.8'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
      >
        <BatterySVG pct={latestPct} size={size} />
      </button>

      {/* Popup chart */}
      {open && (
        <div
          ref={popupRef}
          style={{
            position: 'absolute',
            top: size + 8,
            right: 0,
            width: 340,
            background: darkMode ? '#1e293b' : '#ffffff',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: 18,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'battPopIn 0.18s ease',
          }}
        >
          <style>{`
            @keyframes battPopIn {
              from { opacity: 0; transform: translateY(-8px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0)    scale(1); }
            }
          `}</style>

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px 10px',
            borderBottom: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: latestPct !== null && latestPct > 50 ? '#dcfce7'
                           : latestPct !== null && latestPct > 20 ? '#fef9c3'
                           : '#fee2e2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={14} color={fillColor} fill={fillColor} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                  Battery History
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>
                  {readings.length} reading{readings.length !== 1 ? 's' : ''}
                  {latest?.timestamp && ` · Latest: ${new Date(latest.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
                </div>
              </div>
            </div>

            {/* Current big % */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                fontSize: 22, fontWeight: 800,
                color: fillColor,
                letterSpacing: '-1px',
              }}>
                {latestPct !== null ? `${latestPct}%` : '—'}
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: darkMode ? '#334155' : '#f1f5f9',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={13} color={darkMode ? '#94a3b8' : '#64748b'} />
              </button>
            </div>
          </div>

          {/* Chart */}
          <div style={{ padding: '12px 8px 14px' }}>
            {chartData.length < 2 ? (
              // Single reading — just a nice single-point display
              <div style={{
                textAlign: 'center', padding: '20px 0',
                color: darkMode ? '#64748b' : '#94a3b8', fontSize: 12,
              }}>
                {chartData.length === 1
                  ? 'Only one reading available — connect your device to see history.'
                  : 'No battery data available.'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={fillColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={fillColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={darkMode ? '#334155' : '#f1f5f9'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: darkMode ? '#64748b' : '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: darkMode ? '#64748b' : '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                    tickCount={5}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  {/* Low battery reference line */}
                  <ReferenceLine
                    y={20}
                    stroke="#ef4444"
                    strokeDasharray="4 3"
                    strokeWidth={1}
                    label={{ value: 'Low', position: 'insideTopRight', fontSize: 9, fill: '#ef4444' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="percentage"
                    name="Battery"
                    stroke={fillColor}
                    strokeWidth={2.5}
                    fill={`url(#${gradientId})`}
                    dot={{ r: 3, fill: fillColor, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: fillColor, strokeWidth: 2, stroke: '#fff' }}
                    isAnimationActive={true}
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Footer — all readings list */}
          {readings.length > 0 && (
            <div style={{
              borderTop: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`,
              maxHeight: 120,
              overflowY: 'auto',
              padding: '8px 0',
            }}>
              {[...readings].reverse().map((r, i) => {
                const d = new Date(r.timestamp);
                const barColor =
                  r.percentage > 50 ? '#22C55E'
                  : r.percentage > 20 ? '#F59E0B'
                  : '#EF4444';
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '5px 16px',
                    borderBottom: i < readings.length - 1
                      ? `1px solid ${darkMode ? '#1e293b' : '#f8fafc'}`
                      : 'none',
                  }}>
                    {/* Mini bar */}
                    <div style={{ width: 32, height: 5, borderRadius: 3, background: darkMode ? '#334155' : '#e2e8f0', overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ width: `${r.percentage}%`, height: '100%', background: barColor, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 12, color: barColor, minWidth: 32 }}>
                      {r.percentage}%
                    </span>
                    <span style={{ fontSize: 10, color: darkMode ? '#64748b' : '#94a3b8', flex: 1, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BatteryWidget;
