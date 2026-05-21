// src/institution/Overview.jsx
// Drop-in replacement for the existing Overview tab.
// Requires:  npm install recharts lucide-react
// No layout, no sidebar — just the content rendered inside InstitutionDashboard.

import React, { useState, useEffect, memo } from 'react';
import {
  Users, Activity, FileText, AlertTriangle,
  TrendingUp, TrendingDown, Wifi, WifiOff, Zap, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Static demo data (replace with real API calls as needed) ────────────────

const WEEKLY_ADDITIONS = [
  { week: 'Wk 1', added: 24 }, { week: 'Wk 2', added: 19 },
  { week: 'Wk 3', added: 31 }, { week: 'Wk 4', added: 28 },
  { week: 'Wk 5', added: 22 }, { week: 'Wk 6', added: 35 },
  { week: 'Wk 7', added: 29 }, { week: 'Wk 8', added: 41 },
  { week: 'Wk 9', added: 37 }, { week: 'Wk 10', added: 33 },
  { week: 'Wk 11', added: 29 }, { week: 'Wk 12', added: 38 },
];

const MONTHLY_ADDITIONS = [
  { month: 'Dec', added: 82 }, { month: 'Jan', added: 104 },
  { month: 'Feb', added: 97 }, { month: 'Mar', added: 118 },
  { month: 'Apr', added: 142 }, { month: 'May', added: 186 },
];

const GROWTH_DATA = [
  { month: 'Jun', total: 908 }, { month: 'Jul', total: 942 },
  { month: 'Aug', total: 975 }, { month: 'Sep', total: 1004 },
  { month: 'Oct', total: 1038 }, { month: 'Nov', total: 1071 },
  { month: 'Dec', total: 1098 }, { month: 'Jan', total: 1128 },
  { month: 'Feb', total: 1167 }, { month: 'Mar', total: 1204 },
  { month: 'Apr', total: 1241 }, { month: 'May', total: 1284 },
];

const AGE_DISTRIBUTION = [
  { age: '<18',   total: 28,  active: 18, inactive: 10, rate: 36 },
  { age: '18–24', total: 72,  active: 58, inactive: 14, rate: 19 },
  { age: '25–34', total: 145, active: 118,inactive: 27, rate: 19 },
  { age: '35–44', total: 238, active: 158,inactive: 80, rate: 34 },
  { age: '45–54', total: 264, active: 170,inactive: 94, rate: 36 },
  { age: '55–64', total: 227, active: 148,inactive: 79, rate: 35 },
  { age: '65–74', total: 183, active: 112,inactive: 71, rate: 39 },
  { age: '75–84', total: 97,  active: 50, inactive: 47, rate: 48 },
  { age: '85+',   total: 30,  active: 10, inactive: 20, rate: 67 },
];

const ACTIVE_VS_INACTIVE = [
  { name: 'Active',   value: 842, color: '#378add' },
  { name: 'Inactive', value: 442, color: '#b4b2a9' },
];

const VITALS_BY_AGE = [
  { age: '<18',   hr: 21,  spo2: 14,  temp: 19  },
  { age: '25–34', hr: 130, spo2: 98,  temp: 74 },
  { age: '35–44', hr: 218, spo2: 184, temp: 132 },
  { age: '45–54', hr: 241, spo2: 216, temp: 155 },
  { age: '55–64', hr: 201, spo2: 175, temp: 128 },
  { age: '65+',   hr: 162, spo2: 139, temp: 103 },
];

const WEEK_COMPARE = [
  { day: 'Mon', thisWeek: 7, lastWeek: 5 },
  { day: 'Tue', thisWeek: 9, lastWeek: 6 },
  { day: 'Wed', thisWeek: 6, lastWeek: 8 },
  { day: 'Thu', thisWeek: 8, lastWeek: 4 },
  { day: 'Fri', thisWeek: 5, lastWeek: 6 },
  { day: 'Sat', thisWeek: 2, lastWeek: 1 },
  { day: 'Sun', thisWeek: 1, lastWeek: 3 },
];

const RADAR_DATA = [
  { metric: 'Heart Rate', A: 88 },
  { metric: 'SpO₂',       A: 75 },
  { metric: 'Temp',       A: 62 },
  { metric: 'Glucose',    A: 48 },
  { metric: 'BP',         A: 55 },
  { metric: 'ECG',        A: 30 },
];

const ALERTS = [
  { member: 'Carlos Reyes',     type: 'SpO₂ Critical',       value: '91%',    time: '1 min ago', severity: 'critical' },
  { member: 'Priya Sharma',     type: 'Elevated Heart Rate', value: '88 bpm', time: '4 min ago', severity: 'warning'  },
  { member: 'Gateway – Ward C', type: 'Device Offline',      value: '—',      time: '3 hrs ago', severity: 'warning'  },
  { member: 'Carlos Reyes',     type: 'High Temperature',  value: '38.4°C', time: '6 min ago', severity: 'critical' },
];

const DEVICES = [
  { name: 'Gateway – Ward A', serial: 'GW-0041', status: 'online',  battery: 91, last: '1m ago' },
  { name: 'Sensor Node B2',   serial: 'SN-0088', status: 'online',  battery: 67, last: '2m ago' },
  { name: 'Gateway – Ward C', serial: 'GW-0042', status: 'offline', battery: 0,  last: '3h ago' },
  { name: 'Sensor Node D5',   serial: 'SN-0091', status: 'online',  battery: 44, last: '4m ago' },
];

const STAT_CARDS = [
  { label: 'Total Members',         value: 1284, change: '+12%',  up: true,  icon: Users,         accent: '#3b82f6', bg: '#eff6ff' },
  { label: 'Actively Sending Data', value: 842,  change: '+5.2%', up: true,  icon: Activity,      accent: '#10b981', bg: '#ecfdf5' },
  { label: 'Inactive Members',      value: 442,  change: '+2',    up: false, icon: FileText,      accent: '#f59e0b', bg: '#fffbeb' },
  { label: 'Added This Week',       value: 38,   change: '+9',    up: true,  icon: TrendingUp,    accent: '#8b5cf6', bg: '#f5f3ff' },
  { label: 'Added This Month',      value: 186,  change: '+44',   up: true,  icon: Zap,           accent: '#06b6d4', bg: '#ecfeff' },
  { label: 'Critical Alerts',       value: 4,    change: '+1',    up: false, icon: AlertTriangle, accent: '#ef4444', bg: '#fef2f2' },
];

// ─── Small reusable pieces ────────────────────────────────────────────────────

const CHART_ANIM = { isAnimationActive: false };

/** Paint below-the-fold charts after first frame so pies mount instantly */
function useDeferredMount(delayMs = 80) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs]);
  return ready;
}

const ActiveVsInactivePie = memo(function ActiveVsInactivePie() {
  const legendItems = ACTIVE_VS_INACTIVE.map((d) => ({
    color: d.color,
    label: `${d.name} ${((d.value / 1284) * 100).toFixed(1)}%`,
  }));
  return (
    <Card>
      <CardHead title="Active vs inactive" />
      <Legend items={legendItems} />
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={ACTIVE_VS_INACTIVE}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={72}
            paddingAngle={3}
            dataKey="value"
            isAnimationActive={false}
          >
            {ACTIVE_VS_INACTIVE.map((d, i) => (
              <Cell key={d.name} fill={d.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        {ACTIVE_VS_INACTIVE.map((d) => (
          <div key={d.name} style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{d.value.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{d.name}</div>
          </div>
        ))}
      </div>
    </Card>
  );
});

function BatteryBar({ level }) {
  const color = level > 60 ? '#10b981' : level > 30 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 36, height: 7, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}>
        <div style={{ width: `${level}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .5s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{level}%</span>
    </div>
  );
}

const CT = memo(function CT({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}>
      <p style={{ fontWeight: 700, color: '#334155', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: <span style={{ color: '#0f172a' }}>{p.value}</span></p>
      ))}
    </div>
  );
});

// Card shell — uses inline styles to play nicely inside the parent dashboard (no Tailwind clash)
function Card({ children, style = {} }) {
  return (
    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,.04)', padding: '20px 22px', ...style }}>
      {children}
    </div>
  );
}

function CardHead({ title, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</span>
      {action && (
        <button style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
          {action} <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
      {items.map(({ color, label }) => (
        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b', fontWeight: 500 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
          {label}
        </span>
      ))}
    </div>
  );
}

const tickStyle = { fontSize: 11, fill: '#94a3b8' };
const gridStyle = { stroke: '#f1f5f9' };

// ─── Main export ──────────────────────────────────────────────────────────────

function Overview() {
  const chartsDeferred = useDeferredMount(100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
        {STAT_CARDS.map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,.04)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={17} color={s.accent} />
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                background: s.up ? '#d1fae5' : '#fee2e2',
                color: s.up ? '#065f46' : '#991b1b',
                display: 'flex', alignItems: 'center', gap: 2,
              }}>
                {s.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {s.change}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
                {s.value.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Growth area + Active/Inactive donut (priority — paints first) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Card>
          <CardHead title="Cumulative member growth — 12 months" action="Full report" />
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={GROWTH_DATA} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
              <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis domain={[850, 1350]} tick={tickStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<CT />} />
              <Area type="monotone" dataKey="total" name="Members" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gGrad)" dot={false} activeDot={{ r: 5 }} {...CHART_ANIM} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <ActiveVsInactivePie />
      </div>

      {!chartsDeferred ? (
        <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
          Loading charts…
        </div>
      ) : (
        <OverviewChartsDeferred />
      )}
    </div>
  );
}

export default memo(Overview);

function OverviewChartsDeferred() {
  return (
    <>
      {/* ── Row 2: Weekly + Monthly additions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <CardHead title="Members added — weekly (last 12 weeks)" />
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={WEEKLY_ADDITIONS} margin={{ top: 4, right: 8, bottom: 0, left: -14 }} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
              <XAxis dataKey="week" tick={{ ...tickStyle, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<CT />} />
              <Bar dataKey="added" name="Added" fill="#85b7eb" radius={[4, 4, 0, 0]} {...CHART_ANIM} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHead title="Members added — monthly (last 6 months)" />
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={MONTHLY_ADDITIONS} margin={{ top: 4, right: 8, bottom: 0, left: -14 }} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
              <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<CT />} />
              <Bar dataKey="added" name="Added" fill="#5dcaa5" radius={[5, 5, 0, 0]} {...CHART_ANIM} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Row 3: Age distribution + Active/inactive by age ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <CardHead title="Age distribution — total members" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={AGE_DISTRIBUTION} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 10 }} barSize={13}>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} horizontal={false} />
              <XAxis type="number" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="age" tick={{ ...tickStyle, fontSize: 11 }} axisLine={false} tickLine={false} width={42} />
              <Tooltip content={<CT />} />
              <Bar dataKey="total" name="Total" fill="#1d9e75" radius={[0, 5, 5, 0]} {...CHART_ANIM} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHead title="Active vs inactive by age group" />
          <Legend items={[{ color: '#378add', label: 'Active' }, { color: '#f09595', label: 'Inactive' }]} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={AGE_DISTRIBUTION} margin={{ top: 0, right: 8, bottom: 0, left: -14 }} barSize={13}>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
              <XAxis dataKey="age" tick={{ ...tickStyle, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<CT />} />
              <Bar dataKey="active"   name="Active"   stackId="a" fill="#378add" {...CHART_ANIM} />
              <Bar dataKey="inactive" name="Inactive" stackId="a" fill="#f09595" radius={[4, 4, 0, 0]} {...CHART_ANIM} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Row 4: Week compare + Inactivity rate + Radar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Card>
          <CardHead title="This week vs last week" />
          <Legend items={[{ color: '#378add', label: 'This week' }, { color: '#b5d4f4', label: 'Last week' }]} />
          <ResponsiveContainer width="100%" height={185}>
            <BarChart data={WEEK_COMPARE} margin={{ top: 4, right: 8, bottom: 0, left: -14 }} barSize={11} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
              <XAxis dataKey="day" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<CT />} />
              <Bar dataKey="thisWeek" name="This week" fill="#378add" radius={[3, 3, 0, 0]} {...CHART_ANIM} />
              <Bar dataKey="lastWeek" name="Last week" fill="#b5d4f4" radius={[3, 3, 0, 0]} {...CHART_ANIM} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHead title="Inactivity rate by age (%)" />
          <ResponsiveContainer width="100%" height={205}>
            <BarChart data={AGE_DISTRIBUTION} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 10 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} horizontal={false} />
              <XAxis type="number" domain={[0, 80]} tick={tickStyle} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="age" tick={{ ...tickStyle, fontSize: 11 }} axisLine={false} tickLine={false} width={42} />
              <Tooltip content={<CT />} formatter={v => [`${v}%`, 'Inactivity']} />
              <Bar dataKey="rate" name="Rate" fill="#ef4444" radius={[0, 5, 5, 0]} {...CHART_ANIM} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHead title="Vitals coverage — radar" />
          <ResponsiveContainer width="100%" height={205}>
            <RadarChart data={RADAR_DATA} cx="50%" cy="50%" outerRadius={72}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#cbd5e1' }} />
              <Radar name="Coverage" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} {...CHART_ANIM} />
              <Tooltip content={<CT />} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Row 5: Vitals grouped bar ── */}
      <Card>
        <CardHead title="Vitals data sent — by age group" action="View by member" />
        <Legend items={[{ color: '#e24b4a', label: 'Heart rate' }, { color: '#378add', label: 'SpO₂' }, { color: '#1d9e75', label: 'Temperature' }]} />
        <ResponsiveContainer width="100%" height={195}>
          <BarChart data={VITALS_BY_AGE} margin={{ top: 4, right: 8, bottom: 0, left: -14 }} barSize={15} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
            <XAxis dataKey="age" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
            <Tooltip content={<CT />} />
            <Bar dataKey="hr"   name="Heart rate"  fill="#e24b4a" radius={[4, 4, 0, 0]} {...CHART_ANIM} />
            <Bar dataKey="spo2" name="SpO₂"        fill="#378add" radius={[4, 4, 0, 0]} {...CHART_ANIM} />
            <Bar dataKey="temp" name="Temperature" fill="#1d9e75" radius={[4, 4, 0, 0]} {...CHART_ANIM} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Row 6: Alerts + Devices (preserved from original) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <CardHead title="Recent alerts" action="View all" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ALERTS.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 12, background: a.severity === 'critical' ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${a.severity === 'critical' ? '#fecaca' : '#fde68a'}`
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: a.severity === 'critical' ? '#fee2e2' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={15} color={a.severity === 'critical' ? '#dc2626' : '#d97706'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.member}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{a.type} · <strong style={{ color: a.severity === 'critical' ? '#dc2626' : '#d97706' }}>{a.value}</strong></div>
                </div>
                <span style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap' }}>{a.time}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead title="Device status" action="Manage" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DEVICES.map((d, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0'
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: d.status === 'online' ? '#ecfdf5' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {d.status === 'online' ? <Wifi size={16} color="#10b981" /> : <WifiOff size={16} color="#ef4444" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{d.serial} · {d.last}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: d.status === 'online' ? '#d1fae5' : '#fee2e2',
                    color: d.status === 'online' ? '#065f46' : '#991b1b'
                  }}>{d.status === 'online' ? 'Online' : 'Offline'}</span>
                  {d.status === 'online' && <BatteryBar level={d.battery} />}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
