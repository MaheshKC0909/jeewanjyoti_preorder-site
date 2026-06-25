import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  LayoutDashboard, Users, Activity, BarChart3, FileText,
  Bell, Smartphone, Settings, LogOut, Menu, ChevronDown, RefreshCw, Moon, Sun
} from 'lucide-react';
import OverviewTab from './institution/Overview';
import MembersTab from './institution/Members';
import SubscriptionTab from './institution/Subscription';
import VitalsTab from './institution/Vitals';
import AnalyticsTab from './institution/Analytics';
import ReportsTab from './institution/Reports';
import AlertsTab from './institution/Alerts';
import PlaceholderTab from './institution/Placeholder';
import { getUserData, clearTokens, authenticatedFetch } from '../lib/tokenManager';
import jjlogo from '../assets/jjlogo.png';
import { CreditCard } from 'lucide-react';

const NAV = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'vitals', label: 'Vitals', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'alerts', label: 'Alerts', icon: Bell, badge: 4 },
  null,
  { id: 'devices', label: 'Devices', icon: Smartphone },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/** Isolated clock — updates every second without re-rendering tab content or charts */
const HeaderDateLine = memo(function HeaderDateLine() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
      {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  );
});

const INSTITUTION_GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
  input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px #3b82f620 !important; }
`;

export default function InstitutionDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [globalDateRange] = useState({ period: 'today', customRange: false });

  // Get institution data from localStorage (stored during login)
  const institutionData = getUserData();
  const institutionName = institutionData?.name || 'Institution';
  const institutionType = institutionData?.institution_type || 'Institution';
  const institutionLogo = institutionData?.logo || null;
  const institutionInitial = institutionName.charAt(0).toUpperCase();

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState(institutionName);
  const [selectedUserProfileImage, setSelectedUserProfileImage] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [thresholds, setThresholds] = useState({
    hrMax: 120,
    hrMin: 50,
    spo2Warning: 92,
    spo2Critical: 90,
    tempMax: 38.5,
    inactivityHours: 12,
  });
  const [alerts, setAlerts] = useState([]);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authenticatedFetch('https://jeewanjyoti-backend.smart.org.np/api/instutionmember/');
      if (!res.ok) throw new Error('Failed to fetch members');
      const json = await res.json();
      const membersList = json.data || [];
      
      const membersWithVitals = await Promise.all(membersList.map(async (m) => {
        try {
          const vitalsRes = await authenticatedFetch(`https://jeewanjyoti-backend.smart.org.np/api/latest_data/?user_id=${m.user_id}`);
          if (vitalsRes.ok) {
            m.vitals = await vitalsRes.json();
          }
        } catch (e) {
          console.error("Vitals load error for member:", m.user_id, e);
        }
        return m;
      }));
      
      setMembers(membersWithVitals);
    } catch (err) {
      console.error(err);
      setError('Could not load members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Dynamic Alert Generation from active members vitals and active thresholds
  useEffect(() => {
    if (!members.length) return;
    
    // Scanned active alerts from vitals
    const scannedAlerts = [];
    members.forEach(m => {
      if (!m.vitals) return;

      const userName = m.full_name || m.user_email || 'Unknown Member';

      // 1. SpO2 critical or warning check
      if (m.vitals.spo2?.Blood_oxygen) {
        const spo2 = m.vitals.spo2.Blood_oxygen;
        
        if (spo2 < thresholds.spo2Critical) {
          scannedAlerts.push({
            id: `spo2-crit-${m.user_id}`,
            member: userName,
            type: 'SpO₂ Critical',
            value: `${spo2}%`,
            time: '2 mins ago',
            severity: 'critical',
            status: 'active',
            node: m.user_email || 'Member Node'
          });
        } else if (spo2 < thresholds.spo2Warning) {
          scannedAlerts.push({
            id: `spo2-warn-${m.user_id}`,
            member: userName,
            type: 'SpO₂ Warning',
            value: `${spo2}%`,
            time: '5 mins ago',
            severity: 'warning',
            status: 'active',
            node: m.user_email || 'Member Node'
          });
        }
      }

      // 2. Heart rate check
      if (m.vitals.heartrate?.once_heart_value) {
        const hr = m.vitals.heartrate.once_heart_value;

        if (hr > thresholds.hrMax) {
          scannedAlerts.push({
            id: `hr-high-${m.user_id}`,
            member: userName,
            type: 'Elevated Heart Rate',
            value: `${hr} bpm`,
            time: '3 mins ago',
            severity: 'critical',
            status: 'active',
            node: m.user_email || 'Member Node'
          });
        } else if (hr < thresholds.hrMin) {
          scannedAlerts.push({
            id: `hr-low-${m.user_id}`,
            member: userName,
            type: 'Low Heart Rate',
            value: `${hr} bpm`,
            time: '4 mins ago',
            severity: 'warning',
            status: 'active',
            node: m.user_email || 'Member Node'
          });
        }
      }
    });

    setAlerts(prev => {
      const merged = [...scannedAlerts];
      // Keep user actions (like resolved or acknowledged logs)
      prev.forEach(p => {
        if (p.status === 'resolved' || p.status === 'acknowledged') {
          const idx = merged.findIndex(m => m.id === p.id);
          if (idx !== -1) {
            merged[idx] = { ...merged[idx], ...p };
          } else {
            merged.push(p);
          }
        }
      });
      return merged;
    });
  }, [members, thresholds]);

  const handleLogout = () => {
    clearTokens();
    window.location.href = '/login';
  };

  const handleViewVitals = useCallback((userId, userName, profileImage) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);

    // Normalize profile image URL (add backend domain if relative)
    if (profileImage && profileImage.startsWith('/')) {
      setSelectedUserProfileImage(`https://jeewanjyoti-backend.smart.org.np${profileImage}`);
    } else {
      setSelectedUserProfileImage(profileImage);
    }

    setActiveTab('vitals');
  }, []);

  const selectedUserInfo = useMemo(
    () => ({ name: selectedUserName, profileImage: selectedUserProfileImage }),
    [selectedUserName, selectedUserProfileImage]
  );

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab members={members} loading={loading} error={error} />;
      case 'members':
        return <MembersTab members={members} loading={loading} error={error} refreshMembers={fetchMembers} onViewVitals={handleViewVitals} />;
      case 'vitals':
        return (
          <VitalsTab
            selectedUserId={selectedUserId}
            selectedUserInfo={selectedUserInfo}
            darkMode={darkMode}
            globalDateFilter={globalDateRange.period}
            globalDateRange={globalDateRange}
          />
        );
      case 'analytics':
        return <AnalyticsTab darkMode={darkMode} members={members} loading={loading} error={error} thresholds={thresholds} />;
      case 'reports':
        return <ReportsTab darkMode={darkMode} members={members} loading={loading} error={error} />;
      case 'alerts':
        return <AlertsTab darkMode={darkMode} alerts={alerts} setAlerts={setAlerts} thresholds={thresholds} setThresholds={setThresholds} members={members} />;
      case 'subscription':
        return <SubscriptionTab />;
      default:
        return <PlaceholderTab tab={activeTab} />;
    }
  }, [activeTab, handleViewVitals, selectedUserId, selectedUserInfo, darkMode, globalDateRange, members, loading, error, fetchMembers, thresholds, alerts]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: darkMode ? '#0f172a' : '#f8fafc', fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>
      <style>{INSTITUTION_GLOBAL_STYLES}</style>

      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 72 : 240, minHeight: '100vh', background: '#0f172a',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0,
        transition: 'width 0.25s cubic-bezier(.4,0,.2,1)', zIndex: 100, overflow: 'hidden'
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '20px 16px' : '24px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #1e293b', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <img src={jjlogo} alt="Digital Care" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain', flexShrink: 0 }} />
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
          <button onClick={handleLogout} style={{
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
          height: 64, background: darkMode ? '#1e293b' : '#fff', borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
          padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 50
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: darkMode ? '#fff' : '#0f172a' }}>
              {NAV.filter(Boolean).find(n => n.id === activeTab)?.label || 'Dashboard'}
            </div>
            <HeaderDateLine />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: darkMode ? '#334155' : '#f8fafc', border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {darkMode ? <Sun size={15} color="#cbd5e1" /> : <Moon size={15} color="#6b7280" />}
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: darkMode ? '#334155' : '#f8fafc', border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <RefreshCw size={15} color={darkMode ? '#cbd5e1' : "#6b7280"} />
            </button>
            <button style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: darkMode ? '#334155' : '#f8fafc', border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Bell size={15} color={darkMode ? '#cbd5e1' : "#6b7280"} />
              <span style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, background: '#ef4444', borderRadius: '50%', border: '1.5px solid #fff' }} />
            </button>
            <div style={{ width: 1, height: 28, background: darkMode ? '#334155' : '#e2e8f0', margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px 6px 6px', background: darkMode ? '#334155' : '#f8fafc', border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`, borderRadius: 12, cursor: 'pointer' }}>
              {institutionLogo ? (
                <img src={institutionLogo} alt={institutionName} style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>
                  {institutionInitial}
                </div>
              )}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: darkMode ? '#fff' : '#0f172a', lineHeight: 1.3 }}>{institutionName}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{institutionType}</div>
              </div>
              <ChevronDown size={14} color="#9ca3af" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ padding: 24, flex: 1 }}>
          {tabContent}
        </div>
      </main>
    </div>
  );
}