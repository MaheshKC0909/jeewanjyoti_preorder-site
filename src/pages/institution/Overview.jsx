import React, { useState, useEffect } from 'react';
import {
  Users, Activity, FileText, AlertTriangle, TrendingUp, TrendingDown,
  Wifi, WifiOff, Heart, Thermometer, Droplets, Wind, Zap
} from 'lucide-react';

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

const ALERTS = [
  { member: 'Carlos Reyes', type: 'SpO₂ Critical', value: '91%', time: '1 min ago', severity: 'critical' },
  { member: 'Priya Sharma', type: 'Elevated Heart Rate', value: '88 bpm', time: '4 min ago', severity: 'warning' },
  { member: 'Gateway – Ward C', type: 'Device Offline', value: '—', time: '3 hrs ago', severity: 'warning' },
  { member: 'Carlos Reyes', type: 'High Temperature', value: '38.4°C', time: '6 min ago', severity: 'critical' },
];

const DEVICES = [
  { name: 'Gateway – Ward A', serial: 'GW-0041', status: 'online', battery: 91, signal: 4, last: '1m ago' },
  { name: 'Sensor Node B2', serial: 'SN-0088', status: 'online', battery: 67, signal: 3, last: '2m ago' },
  { name: 'Gateway – Ward C', serial: 'GW-0042', status: 'offline', battery: 0, signal: 0, last: '3h ago' },
  { name: 'Sensor Node D5', serial: 'SN-0091', status: 'online', battery: 44, signal: 2, last: '4m ago' },
];

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

export default function Overview() {
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
    </div>
  );
}
