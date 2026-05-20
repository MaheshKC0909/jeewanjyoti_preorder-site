import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function Placeholder({ tab }) {
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
