import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, Activity, BarChart3, FileText,
  Bell, Smartphone, Settings, LogOut, Menu, X, Search,
  ChevronRight, MoreVertical, Plus, TrendingUp, TrendingDown,
  Wifi, WifiOff, Heart, Thermometer, Droplets, Wind,
  AlertTriangle, CheckCircle2, Clock, ChevronDown, Zap,
  Filter, Download, RefreshCw, Eye
} from 'lucide-react';

const userData = { name: 'Dr. Sarah Chen', role: 'Institution Admin' };

const PULSE_DATA = [42, 45, 43, 48, 52, 49, 47, 51, 55, 53, 50, 48, 52, 58, 55, 53, 56, 60, 57, 54];

function SparkLine({ data, color = '#3b82f6', height = 40 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - ((v - min) / (max - min || 1)) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function AnimatedNumber({ target, duration = 1200 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{val.toLocaleString()}</>;
}

const STATS = [
  { label: 'Total Members', value: 1284, change: '+12%', up: true, icon: Users, accent: '#3b82f6', data: [30,35,32,38,40,37,42,45,43,48] },
  { label: 'Active Vitals', value: 842, change: '+5.2%', up: true, icon: Activity, accent: '#10b981', data: [20,22,25,23,28,30,27,32,35,33] },
  { label: 'Pending Reports', value: 24, change: '-8%', up: false, icon: FileText, accent: '#f59e0b', data: [35,32,30,28,25,26,24,22,25,24] },
  { label: 'Critical Alerts', value: 4, change: '+1', up: false, icon: AlertTriangle, accent: '#ef4444', data: [2,3,2,4,3,2,3,5,4,4] },
];

const MEMBERS = [
  { name: 'James Wilson', id: 'P-00124', status: 'Active', hr: 72, spo2: 98, temp: 36.6, sync: '2m ago', alerts: 0, trend: 'stable' },
  { name: 'Priya Sharma', id: 'P-00125', status: 'Active', hr: 88, spo2: 96, temp: 37.1, sync: '5m ago', alerts: 1, trend: 'up' },
  { name: 'Carlos Reyes', id: 'P-00126', status: 'Critical', hr: 112, spo2: 91, temp: 38.4, sync: '1m ago', alerts: 3, trend: 'up' },
  { name: 'Aiko Tanaka', id: 'P-00127', status: 'Active', hr: 65, spo2: 99, temp: 36.4, sync: '8m ago', alerts: 0, trend: 'stable' },
  { name: 'Mia Johnson', id: 'P-00128', status: 'Inactive', hr: 0, spo2: 0, temp: 0, sync: '2h ago', alerts: 0, trend: 'none' },
];

const DEVICES = [
  { name: 'Gateway – Ward A', serial: 'GW-0041', status: 'online', battery: 91, signal: 4, last: '1m ago' },
  { name: 'Sensor Node B2', serial: 'SN-0088', status: 'online', battery: 67, signal: 3, last: '2m ago' },
  { name: 'Gateway – Ward C', serial: 'GW-0042', status: 'offline', battery: 0, signal: 0, last: '3h ago' },
  { name: 'Sensor Node D5', serial: 'SN-0091', status: 'online', battery: 44, signal: 2, last: '4m ago' },
];

const ALERTS = [
  { member: 'Carlos Reyes', type: 'SpO₂ Critical', value: '91%', time: '1 min ago', severity: 'critical' },
  { member: 'Priya Sharma', type: 'Elevated Heart Rate', value: '88 bpm', time: '4 min ago', severity: 'warning' },
  { member: 'Gateway – Ward C', type: 'Device Offline', value: '—', time: '3 hrs ago', severity: 'warning' },
  { member: 'Carlos Reyes', type: 'High Temperature', value: '38.4°C', time: '6 min ago', severity: 'critical' },
];

function StatusDot({ status }) {
  const c = status === 'Active' || status === 'online' ? '#10b981'
    : status === 'Critical' ? '#ef4444'
    : status === 'warning' ? '#f59e0b' : '#9ca3af';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 0 2px ${c}33`, display: 'inline-block' }} />
    </span>
  );
}

function BatteryBar({ level }) {
  const c = level > 60 ? '#10b981' : level > 30 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 36, height: 8, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' }}>
        <div style={{ width: `${level}%`, height: '100%', background: c, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{level}%</span>
    </div>
  );
}

const NAV = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'vitals', label: 'Live Vitals', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'alerts', label: 'Alerts', icon: Bell, badge: 4 },
  null,
  { id: 'devices', label: 'Devices', icon: Smartphone },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function OverviewTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 20, padding: '20px 22px',
            border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', right: 0, bottom: 0, width: 80, height: 40, opacity: 0.7 }}>
              <SparkLine data={s.data} color={s.accent} height={40} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${s.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={18} color={s.accent} />
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                background: s.up ? '#d1fae5' : '#fee2e2',
                color: s.up ? '#065f46' : '#991b1b',
                display: 'flex', alignItems: 'center', gap: 2
              }}>
                {s.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {s.change}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedNumber target={s.value} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Recent Alerts</div>
            <button style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
          </div>
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
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Device Status</div>
            <button style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>Manage</button>
          </div>
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
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Live Vitals Snapshot</div>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={11} /> Live
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Avg Heart Rate', value: '74', unit: 'bpm', icon: Heart, color: '#ef4444', data: PULSE_DATA },
            { label: 'Avg SpO₂', value: '97.2', unit: '%', icon: Droplets, color: '#3b82f6', data: [96,97,96,98,97,98,97,96,98,97,98,97,97,98,97,96,97,98,97,97] },
            { label: 'Avg Temperature', value: '36.8', unit: '°C', icon: Thermometer, color: '#f59e0b', data: [36.5,36.6,36.7,36.8,36.7,36.9,36.8,36.7,36.8,36.9,36.8,36.7,36.8,36.8,36.7,36.8,36.9,36.8,36.7,36.8] },
            { label: 'Active Monitors', value: '38', unit: 'now', icon: Wind, color: '#8b5cf6', data: [34,35,36,35,37,36,38,37,38,39,38,37,38,39,38,38,37,38,39,38] },
          ].map((v, i) => (
            <div key={i} style={{ background: '#f8fafc', borderRadius: 16, padding: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `${v.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <v.icon size={14} color={v.color} />
                </div>
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{v.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                {v.value}<span style={{ fontSize: 13, fontWeight: 500, color: '#9ca3af', marginLeft: 3 }}>{v.unit}</span>
              </div>
              <div style={{ marginTop: 8, height: 32 }}>
                <SparkLine data={v.data} color={v.color} height={32} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MembersTab() {
  const [search, setSearch] = useState('');
  const filtered = MEMBERS.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Institution Members</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…" style={{
              paddingLeft: 34, paddingRight: 14, height: 36, background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 10, fontSize: 13, outline: 'none', color: '#0f172a', width: 220
            }} />
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 36, background: '#3b82f6', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={14} /> Add Member
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 36, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Filter size={14} />
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 36, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={14} />
          </button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Member', 'Status', 'Heart Rate', 'SpO₂', 'Temp', 'Last Sync', 'Alerts', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#3b82f6' }}>
                      {m.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{m.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusDot status={m.status} />
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                      background: m.status === 'Active' ? '#d1fae5' : m.status === 'Critical' ? '#fee2e2' : '#f1f5f9',
                      color: m.status === 'Active' ? '#065f46' : m.status === 'Critical' ? '#991b1b' : '#6b7280'
                    }}>{m.status}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {m.hr > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Heart size={12} color={m.hr > 100 ? '#ef4444' : '#10b981'} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: m.hr > 100 ? '#ef4444' : '#0f172a' }}>{m.hr} <span style={{ color: '#9ca3af', fontWeight: 400 }}>bpm</span></span>
                    </div>
                  ) : <span style={{ color: '#d1d5db' }}>—</span>}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {m.spo2 > 0 ? (
                    <span style={{ fontSize: 13, fontWeight: 700, color: m.spo2 < 94 ? '#ef4444' : '#0f172a' }}>{m.spo2}<span style={{ color: '#9ca3af', fontWeight: 400 }}>%</span></span>
                  ) : <span style={{ color: '#d1d5db' }}>—</span>}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {m.temp > 0 ? (
                    <span style={{ fontSize: 13, fontWeight: 700, color: m.temp > 37.5 ? '#f59e0b' : '#0f172a' }}>{m.temp}<span style={{ color: '#9ca3af', fontWeight: 400 }}>°C</span></span>
                  ) : <span style={{ color: '#d1d5db' }}>—</span>}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 12 }}>
                    <Clock size={11} /> {m.sync}
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {m.alerts > 0 ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: '#fee2e2', color: '#991b1b' }}>{m.alerts}</span>
                  ) : <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: '#f1f5f9', color: '#9ca3af' }}>0</span>}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={{ padding: 6, borderRadius: 8, background: '#eff6ff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Eye size={13} color="#3b82f6" />
                    </button>
                    <button style={{ padding: 6, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <MoreVertical size={13} color="#6b7280" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlaceholderTab({ tab }) {
  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 60, border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 400 }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <LayoutDashboard size={28} color="#3b82f6" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</div>
      <div style={{ fontSize: 14, color: '#6b7280', maxWidth: 360 }}>This section is under development. Institutional monitoring features will be available here soon.</div>
    </div>
  );
}

export default function InstitutionDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const renderContent = () => {
    if (activeTab === 'overview') return <OverviewTab />;
    if (activeTab === 'members') return <MembersTab />;
    return <PlaceholderTab tab={activeTab} />;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f8fafc', fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
        input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px #3b82f620 !important; }
      `}</style>

      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 72 : 240, minHeight: '100vh', background: '#0f172a',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0,
        transition: 'width 0.25s cubic-bezier(.4,0,.2,1)', zIndex: 100, overflow: 'hidden'
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '20px 16px' : '24px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #1e293b', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={18} color="#fff" />
          </div>
          {!collapsed && <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>DIGITAL CARE</div>}
          <button onClick={() => setCollapsed(!collapsed)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Menu size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map((item, i) => {
            if (!item) return (
              <div key={i} style={{ height: 1, background: '#1e293b', margin: '8px 4px' }} />
            );
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? '10px 16px' : '10px 12px', borderRadius: 10,
                background: active ? '#1d4ed8' : 'transparent',
                border: 'none', cursor: 'pointer', marginBottom: 2,
                transition: 'background 0.15s', overflow: 'hidden', whiteSpace: 'nowrap',
                justifyContent: collapsed ? 'center' : 'flex-start'
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#1e293b'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <item.icon size={18} color={active ? '#fff' : '#64748b'} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#fff' : '#94a3b8', flex: 1, textAlign: 'left' }}>{item.label}</span>
                    {item.badge && (
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, background: '#ef4444', color: '#fff' }}>{item.badge}</span>
                    )}
                  </>
                )}
                {collapsed && item.badge && (
                  <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid #1e293b' }}>
          <button style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '10px 16px' : '10px 12px', borderRadius: 10,
            background: 'transparent', border: 'none', cursor: 'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <LogOut size={16} color="#ef4444" />
            {!collapsed && <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, marginLeft: collapsed ? 72 : 240, transition: 'margin-left 0.25s cubic-bezier(.4,0,.2,1)', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <header style={{
          height: 64, background: '#fff', borderBottom: '1px solid #e2e8f0',
          padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 50
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
              {NAV.filter(Boolean).find(n => n.id === activeTab)?.label || 'Dashboard'}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
              {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <RefreshCw size={15} color="#6b7280" />
            </button>
            <button style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Bell size={15} color="#6b7280" />
              <span style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, background: '#ef4444', borderRadius: '50%', border: '1.5px solid #fff' }} />
            </button>
            <div style={{ width: 1, height: 28, background: '#e2e8f0', margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px 6px 6px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>
                {userData.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{userData.name}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{userData.role}</div>
              </div>
              <ChevronDown size={14} color="#9ca3af" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ padding: 24, flex: 1 }}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}