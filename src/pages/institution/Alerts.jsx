// src/pages/institution/Alerts.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Bell, AlertTriangle, ShieldAlert, CheckCircle2, ShieldCheck, Search, Filter,
  Phone, UserMinus, ToggleLeft, ToggleRight, Settings, Check, RefreshCw, X, Eye, Users
} from 'lucide-react';


export default function Alerts({ darkMode = false, alerts = [], setAlerts, thresholds, setThresholds, members = [] }) {
  const [activeFilterTab, setActiveFilterTab] = useState('active'); // 'all', 'active', 'critical', 'warning', 'resolved'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local threshold state — mirrors parent, allows slider preview before save
  const [localThresholds, setLocalThresholds] = useState(thresholds || {
    hrMax: 120,
    hrMin: 50,
    spo2Warning: 92,
    spo2Critical: 90,
    tempMax: 38.5,
    inactivityHours: 12,
  });

  // Keep local state in sync if parent thresholds change externally
  useEffect(() => {
    if (thresholds) setLocalThresholds(thresholds);
  }, [thresholds]);
  
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);
  const [showToast, setShowToast] = useState('');
  
  // Interactive Resolving Modal
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');

  // Styles configuration
  const styles = useMemo(() => {
    const cardBg = darkMode ? '#1e293b' : '#ffffff';
    const borderCol = darkMode ? '#334155' : '#f1f5f9';
    const textCol = darkMode ? '#f8fafc' : '#0f172a';
    const mutedCol = darkMode ? '#94a3b8' : '#6b7280';
    const inputBg = darkMode ? '#0f172a' : '#f8fafc';
    const textMuted = darkMode ? '#64748b' : '#94a3b8';

    return {
      card: {
        background: cardBg,
        borderRadius: 18,
        border: `1px solid ${borderCol}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
        padding: 22,
      },
      text: { color: textCol },
      muted: { color: mutedCol },
      textMuted: { color: textMuted },
      input: {
        background: inputBg,
        border: `1px solid ${borderCol}`,
        color: textCol,
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 13,
        fontWeight: 600,
        outline: 'none',
        width: '100%'
      },
      actionBtn: {
        border: `1px solid ${borderCol}`,
        background: darkMode ? '#334155' : '#f8fafc',
        color: textCol,
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: 700,
        padding: '6px 12px',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        transition: 'all 0.15s'
      },
      toast: {
        position: 'fixed',
        bottom: 24,
        right: 24,
        background: '#10b981',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: 12,
        fontWeight: 700,
        boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        zIndex: 1000
      }
    };
  }, [darkMode]);

  // Handle action triggers
  const handleAcknowledge = (id) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
    setShowToast('Alert acknowledged');
  };

  const handleOpenResolveModal = (id) => {
    setResolvingId(id);
    setResolutionNote('');
  };

  const handleResolveAlert = (e) => {
    e.preventDefault();
    if (!resolvingId) return;

    setAlerts(alerts.map(a => a.id === resolvingId ? {
      ...a,
      status: 'resolved',
      resolver: 'Supervisor',
      note: resolutionNote || 'Checked and resolved manually.'
    } : a));

    setResolvingId(null);
    setResolutionNote('');
    setShowToast('Alert successfully resolved');
  };

  const handleSaveThresholds = (e) => {
    e.preventDefault();
    setIsSavingThresholds(true);
    setTimeout(() => {
      // Propagate updated thresholds to the parent so alert scanning re-runs
      if (setThresholds) setThresholds(localThresholds);
      setIsSavingThresholds(false);
      setShowToast('Threshold criteria updated — alert scan refreshed');
    }, 800);
  };

  // Toast automatic dismiss
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Compute metrics from live alerts list
  const metrics = useMemo(() => {
    const active = alerts.filter(a => a.status === 'active' || a.status === 'acknowledged');
    const critical = active.filter(a => a.severity === 'critical');
    const warnings = active.filter(a => a.severity === 'warning');
    const resolvedToday = alerts.filter(a => a.status === 'resolved').length;
    // Members with active vitals data (connected devices)
    const connectedDevices = members.filter(m => !!m.vitals).length;

    return {
      activeCount: active.length,
      criticalCount: critical.length,
      warningCount: warnings.length,
      resolvedCount: resolvedToday,
      connectedDevices
    };
  }, [alerts, members]);

  // Filtered Alert List computation
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      // Tab filter
      if (activeFilterTab === 'active' && (a.status !== 'active' && a.status !== 'acknowledged')) return false;
      if (activeFilterTab === 'critical' && (a.severity !== 'critical' || (a.status !== 'active' && a.status !== 'acknowledged'))) return false;
      if (activeFilterTab === 'warning' && (a.severity !== 'warning' || (a.status !== 'active' && a.status !== 'acknowledged'))) return false;
      if (activeFilterTab === 'resolved' && a.status !== 'resolved') return false;
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return a.member.toLowerCase().includes(query) || a.type.toLowerCase().includes(query) || a.node.toLowerCase().includes(query);
      }

      return true;
    });
  }, [alerts, activeFilterTab, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24 }}>
      {/* Toast popup */}
      {showToast && (
        <div style={styles.toast}>
          <CheckCircle2 size={16} />
          {showToast}
        </div>
      )}

      {/* Resolution Dialog Modal */}
      {resolvingId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            ...styles.card,
            width: '100%', maxWidth: 440,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: styles.text.color, margin: 0 }}>Resolve Alert</h3>
              <button onClick={() => setResolvingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: styles.muted.color }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleResolveAlert}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: styles.muted.color, display: 'block', marginBottom: 6 }}>RESOLUTION NOTES</label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Patient checked, medication administered, nasal cannula adjusted..."
                  rows={4}
                  required
                  style={{
                    ...styles.input,
                    resize: 'none',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    padding: 12
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setResolvingId(null)}
                  style={{
                    padding: '8px 16px', background: 'none', border: `1px solid ${darkMode ? '#334155' : '#cbd5e1'}`,
                    color: styles.text.color, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
                    color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Resolve Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Headers */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: styles.muted.color, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alert Command Center</h2>
        <p style={{ fontSize: 12, color: styles.textMuted.color, margin: '2px 0 0 0' }}>Real-time institutional alarm console, threshold monitors, and caretaker actions</p>
      </div>

      {/* Stats Counter Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Active Critical Alerts', value: metrics.criticalCount, color: '#ef4444', icon: ShieldAlert, bg: '#ef444415' },
          { label: 'Active Warning Alerts', value: metrics.warningCount, color: '#f59e0b', icon: AlertTriangle, bg: '#f59e0b15' },
          { label: 'Connected Devices', value: metrics.connectedDevices, color: '#3b82f6', icon: Users, bg: '#3b82f615' },
          { label: 'Alerts Resolved Today', value: metrics.resolvedCount, color: '#10b981', icon: ShieldCheck, bg: '#10b98115' },
        ].map((item, idx) => (
          <div key={idx} style={{ ...styles.card, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <item.icon size={22} color={item.color} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: styles.muted.color, fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: styles.text.color, marginTop: 2 }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Split Console Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
        
        {/* Left Column: Live Alerts Log */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 4, background: darkMode ? '#0f172a' : '#f1f5f9', padding: 4, borderRadius: 10 }}>
              {[
                { id: 'active', label: `Active (${metrics.activeCount})` },
                { id: 'critical', label: `Critical (${alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length})` },
                { id: 'warning', label: `Warnings (${alerts.filter(a => a.severity === 'warning' && a.status !== 'resolved').length})` },
                { id: 'resolved', label: `Resolved (${metrics.resolvedCount})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilterTab(tab.id)}
                  style={{
                    padding: '6px 12px', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: activeFilterTab === tab.id ? (darkMode ? '#1e293b' : '#fff') : 'transparent',
                    color: activeFilterTab === tab.id ? styles.text.color : styles.muted.color,
                    boxShadow: activeFilterTab === tab.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search filter */}
            <div style={{ position: 'relative', width: 220 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member/vital..."
                style={{
                  ...styles.input,
                  paddingLeft: 34,
                  fontSize: 12
                }}
              />
              <Search size={14} color={styles.muted.color} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* List display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 380, maxHeight: 600, overflowY: 'auto' }}>
            {filteredAlerts.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, color: styles.muted.color }}>
                <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, fontWeight: 700 }}>No alerts matching criteria</div>
                <div style={{ fontSize: 11, color: styles.textMuted.color, marginTop: 4 }}>System status is fully functional and stable.</div>
              </div>
            ) : (
              filteredAlerts.map(a => {
                const isCritical = a.severity === 'critical';
                const isAck = a.status === 'acknowledged';
                const isResolved = a.status === 'resolved';

                let accentBg = isResolved ? '#10b98115' : isCritical ? '#ef444415' : '#f59e0b15';
                let accentCol = isResolved ? '#10b981' : isCritical ? '#ef4444' : '#f59e0b';
                let borderStyle = `1px solid ${isResolved ? '#10b98125' : isCritical ? '#ef444425' : '#f59e0b25'}`;

                if (isAck) {
                  accentBg = darkMode ? '#33415550' : '#f1f5f9';
                  accentCol = styles.text.color;
                  borderStyle = `1px solid ${darkMode ? '#334155' : '#cbd5e1'}`;
                }

                return (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: 14,
                    borderRadius: 14, background: accentBg, border: borderStyle,
                    transition: 'all 0.15s'
                  }}>
                    {/* Badge circle */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: isResolved ? '#10b98125' : isCritical ? '#ef444425' : '#f59e0b25',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {isResolved ? (
                        <CheckCircle2 size={16} color="#10b981" />
                      ) : isCritical ? (
                        <ShieldAlert size={16} color="#ef4444" />
                      ) : (
                        <AlertTriangle size={16} color="#f59e0b" />
                      )}
                    </div>

                    {/* Member and metrics description */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: styles.text.color }}>{a.member}</span>
                        <span style={{ fontSize: 10, color: styles.muted.color }}>· {a.node}</span>
                      </div>
                      
                      <div style={{ fontSize: 11, color: styles.muted.color, marginTop: 4 }}>
                        Alert Category: <strong style={{ color: accentCol }}>{a.type}</strong>
                        {a.value !== '—' && (
                          <> · Value: <strong style={{ color: accentCol }}>{a.value}</strong></>
                        )}
                      </div>

                      {/* Display resolver description if resolved */}
                      {isResolved && (
                        <div style={{
                          marginTop: 6, padding: '6px 10px', borderRadius: 8, background: darkMode ? '#0f172a40' : '#ffffff80',
                          border: `1px solid ${styles.gridStyle.stroke}`, fontSize: 10, color: styles.text.color
                        }}>
                          <strong>Resolved by {a.resolver}:</strong> {a.note}
                        </div>
                      )}
                    </div>

                    {/* Right side controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: styles.textMuted.color, fontWeight: 500 }}>{a.time}</span>
                      
                      {!isResolved && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {!isAck && (
                            <button
                              onClick={() => handleAcknowledge(a.id)}
                              style={{
                                ...styles.actionBtn,
                                border: 'none',
                                background: '#3b82f620',
                                color: '#3b82f6'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#3b82f630'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f620'}
                            >
                              Ack
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenResolveModal(a.id)}
                            style={{
                              ...styles.actionBtn,
                              border: 'none',
                              background: '#10b98120',
                              color: '#10b981'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#10b98130'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#10b98120'}
                          >
                            Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Threshold Settings */}
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Settings size={16} color="#8b5cf6" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: styles.text.color, margin: 0 }}>System Thresholds</h3>
          </div>

          <form onSubmit={handleSaveThresholds}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: styles.muted.color, marginBottom: 4 }}>
                  <span>HEART RATE UPPER LIMIT</span>
                  <span style={{ color: '#3b82f6' }}>{localThresholds.hrMax} bpm</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="160"
                  value={localThresholds.hrMax}
                  onChange={(e) => setLocalThresholds({ ...localThresholds, hrMax: parseInt(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: styles.muted.color, marginBottom: 4 }}>
                  <span>HEART RATE LOWER LIMIT</span>
                  <span style={{ color: '#3b82f6' }}>{localThresholds.hrMin} bpm</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="70"
                  value={localThresholds.hrMin}
                  onChange={(e) => setLocalThresholds({ ...localThresholds, hrMin: parseInt(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: styles.muted.color, marginBottom: 4 }}>
                  <span>SpO₂ WARNING LIMIT</span>
                  <span style={{ color: '#f59e0b' }}>{localThresholds.spo2Warning}%</span>
                </div>
                <input
                  type="range"
                  min="90"
                  max="95"
                  value={localThresholds.spo2Warning}
                  onChange={(e) => setLocalThresholds({ ...localThresholds, spo2Warning: parseInt(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: styles.muted.color, marginBottom: 4 }}>
                  <span>SpO₂ CRITICAL LIMIT</span>
                  <span style={{ color: '#ef4444' }}>{localThresholds.spo2Critical}%</span>
                </div>
                <input
                  type="range"
                  min="85"
                  max="91"
                  value={localThresholds.spo2Critical}
                  onChange={(e) => setLocalThresholds({ ...localThresholds, spo2Critical: parseInt(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: styles.muted.color, marginBottom: 4 }}>
                  <span>MAX TEMPERATURE LIMIT</span>
                  <span style={{ color: '#ef4444' }}>{localThresholds.tempMax}°C</span>
                </div>
                <input
                  type="range"
                  min="37.5"
                  max="40.0"
                  step="0.1"
                  value={localThresholds.tempMax}
                  onChange={(e) => setLocalThresholds({ ...localThresholds, tempMax: parseFloat(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: styles.muted.color, marginBottom: 4 }}>
                  <span>MAX INACTIVITY HOUR</span>
                  <span style={{ color: '#3b82f6' }}>{localThresholds.inactivityHours} hours</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="24"
                  value={localThresholds.inactivityHours}
                  onChange={(e) => setLocalThresholds({ ...localThresholds, inactivityHours: parseInt(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={isSavingThresholds}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 16px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              {isSavingThresholds ? (
                <>
                  <RefreshCw className="animate-spin" size={14} /> Updating Thresholds...
                </>
              ) : (
                <>
                  <Check size={14} /> Apply Settings
                </>
              )}
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
