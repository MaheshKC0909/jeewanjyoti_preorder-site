import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  LayoutDashboard, Users, Activity, BarChart3, FileText,
  Bell, Smartphone, Settings, LogOut, Menu, ChevronDown, RefreshCw, Moon, Sun
} from 'lucide-react';
import OverviewTab from '../institution/Overview';
import AdminMembersTab from './Members';
import VitalsTab from './Vitals';
import AnalyticsTab from './Analytics';
import ReportsTab from '../institution/Reports';
import AlertsTab from '../institution/Alerts';
import PlaceholderTab from '../institution/Placeholder';
import { getUserData, clearTokens, authenticatedFetch } from '../../lib/tokenManager';
import { logoutUser } from '../../lib/api';
import jjlogo from '../../assets/jjlogo.png';

const NAV = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'vitals', label: 'Vitals', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'alerts', label: 'Alerts', icon: Bell, badge: 4 },
  null,
  { id: 'devices', label: 'Devices', icon: Smartphone },
  { id: 'settings', label: 'Settings', icon: Settings },
];

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

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
  input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px #3b82f620 !important; }
`;

export default function AdminDashboard() {
  const [activeTab, setActiveTabState] = useState(() => localStorage.getItem('adminActiveTab') || 'overview');
  const setActiveTab = useCallback((tab) => {
    setActiveTabState(tab);
    localStorage.setItem('adminActiveTab', tab);
  }, []);
  const [collapsed, setCollapsed] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const adminData = getUserData();
  // Only an actual admin (superuser or role === 'ADMIN') may see this dashboard —
  // a non-admin who's logged in on the normal member dashboard and navigates
  // straight to /admin/dashboard would otherwise render fine here with their
  // own name/photo, since this page never checked the account's role.
  const isAdminAccount = !!(adminData?.is_superuser || adminData?.role === 'ADMIN');
  const adminName = adminData?.first_name ? `${adminData.first_name} ${adminData.last_name || ''}`.trim() : 'Administrator';
  const adminType = adminData?.role || 'Admin';
  const adminLogo = adminData?.profile_image || null;
  const adminInitial = adminName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!isAdminAccount) {
      clearTokens();
      window.location.href = '/admin';
    }
  }, [isAdminAccount]);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState(adminName);
  const [selectedUserProfileImage, setSelectedUserProfileImage] = useState(null);
  const [selectedUserStatus, setSelectedUserStatus] = useState(null);
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

  // All registered users (doctors + patients) for the admin user directory —
  // separate from `members`, which is institution-scoped vitals data used by
  // Overview/Analytics/Reports/Alerts.
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);

  // `background` distinguishes the silent 15s auto-refresh from the initial
  // load / manual refresh click — a background poll swaps `allUsers` in
  // place once the new data arrives instead of toggling `usersLoading`,
  // which would otherwise unmount the whole members table into a spinner
  // every 15 seconds.
  const fetchAllUsers = useCallback(async (background = false) => {
    try {
      if (!background) {
        setUsersLoading(true);
        setUsersError(null);
      }
      const res = await authenticatedFetch('https://jeewanjyoti-backend.smart.org.np/api/users/');
      if (!res.ok) throw new Error('Failed to fetch users');
      const json = await res.json();
      const usersList = Array.isArray(json) ? json : (json.data || json.results || []);

      const usersWithVitals = await Promise.all(usersList.map(async (u) => {
        try {
          const vitalsRes = await authenticatedFetch(`https://jeewanjyoti-backend.smart.org.np/api/latest_data_user/?user_id=${u.id}`);
          if (vitalsRes.ok) {
            u.vitals = await vitalsRes.json();
          }
        } catch (e) {
          console.error('Vitals load error for user:', u.id, e);
        }
        return u;
      }));

      setAllUsers(usersWithVitals);
    } catch (err) {
      console.error(err);
      if (!background) setUsersError('Could not load users.');
    } finally {
      if (!background) setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdminAccount) return;
    fetchAllUsers();
    const interval = setInterval(() => fetchAllUsers(true), 15000);
    return () => clearInterval(interval);
  }, [fetchAllUsers, isAdminAccount]);

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
          console.error('Vitals load error for member:', m.user_id, e);
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
    if (!isAdminAccount) return;
    fetchMembers();
  }, [fetchMembers, isAdminAccount]);

  // Scan allUsers (all doctors + patients system-wide), not the institution-scoped
  // `members` list — admin accounts aren't tied to an institution, so `members`
  // is always empty and alerts would never generate from it.
  useEffect(() => {
    if (!allUsers.length) return;
    const scannedAlerts = [];
    allUsers.forEach(u => {
      if (!u.vitals) return;
      const userName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Unknown User';
      if (u.vitals.spo2?.Blood_oxygen) {
        const spo2 = u.vitals.spo2.Blood_oxygen;
        if (spo2 < thresholds.spo2Critical) {
          scannedAlerts.push({ id: `spo2-crit-${u.id}`, member: userName, type: 'SpO₂ Critical', value: `${spo2}%`, time: '2 mins ago', severity: 'critical', status: 'active', node: u.email || 'User Node' });
        } else if (spo2 < thresholds.spo2Warning) {
          scannedAlerts.push({ id: `spo2-warn-${u.id}`, member: userName, type: 'SpO₂ Warning', value: `${spo2}%`, time: '5 mins ago', severity: 'warning', status: 'active', node: u.email || 'User Node' });
        }
      }
      if (u.vitals.heartrate?.once_heart_value) {
        const hr = u.vitals.heartrate.once_heart_value;
        if (hr > thresholds.hrMax) {
          scannedAlerts.push({ id: `hr-high-${u.id}`, member: userName, type: 'Elevated Heart Rate', value: `${hr} bpm`, time: '3 mins ago', severity: 'critical', status: 'active', node: u.email || 'User Node' });
        } else if (hr < thresholds.hrMin) {
          scannedAlerts.push({ id: `hr-low-${u.id}`, member: userName, type: 'Low Heart Rate', value: `${hr} bpm`, time: '4 mins ago', severity: 'warning', status: 'active', node: u.email || 'User Node' });
        }
      }
    });
    setAlerts(prev => {
      const merged = [...scannedAlerts];
      prev.forEach(p => {
        if (p.status === 'resolved' || p.status === 'acknowledged') {
          const idx = merged.findIndex(m => m.id === p.id);
          if (idx !== -1) merged[idx] = { ...merged[idx], ...p };
          else merged.push(p);
        }
      });
      return merged;
    });
  }, [allUsers, thresholds]);

  const handleLogoutClick = () => {
    setShowAdminMenu(false);
    setShowLogoutConfirm(true);
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Error signing out:', error);
      clearTokens();
    }
    window.location.href = '/admin';
  };

  // Close the admin profile dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAdminMenu && !event.target.closest('.admin-user-dropdown')) {
        setShowAdminMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAdminMenu]);

  const handleViewVitals = useCallback((userId, userName, profileImage, status) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setSelectedUserStatus(status);
    if (profileImage && profileImage.startsWith('/')) {
      setSelectedUserProfileImage(`https://jeewanjyoti-backend.smart.org.np${profileImage}`);
    } else {
      setSelectedUserProfileImage(profileImage);
    }
    setActiveTab('vitals');
  }, []);

  // Analytics' cohort table only knows a user id — look the user up in
  // allUsers and hand off to the same handler Members uses for its "view
  // vitals" eye button.
  const handleViewMember = useCallback((userId) => {
    const u = allUsers.find((x) => x.id === userId);
    if (!u) return;
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Unknown User';
    handleViewVitals(userId, name, u.profile_image, u.status);
  }, [allUsers, handleViewVitals]);

  const selectedUserInfo = useMemo(
    () => ({ name: selectedUserName, profileImage: selectedUserProfileImage, status: selectedUserStatus }),
    [selectedUserName, selectedUserProfileImage, selectedUserStatus]
  );

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab members={members} loading={loading} error={error} darkMode={darkMode} alerts={alerts} />;
      case 'members':
        return <AdminMembersTab users={allUsers} loading={usersLoading} error={usersError} refreshUsers={fetchAllUsers} onViewVitals={handleViewVitals} darkMode={darkMode} />;
      case 'vitals':
        return <VitalsTab selectedUserId={selectedUserId} selectedUserInfo={selectedUserInfo} darkMode={darkMode} />;
      case 'analytics':
        return <AnalyticsTab darkMode={darkMode} allUsers={allUsers} onViewMember={handleViewMember} />;
      case 'reports':
        return <ReportsTab darkMode={darkMode} members={members} loading={loading} error={error} />;
      case 'alerts':
        return <AlertsTab darkMode={darkMode} alerts={alerts} setAlerts={setAlerts} thresholds={thresholds} setThresholds={setThresholds} members={allUsers} />;
      default:
        return <PlaceholderTab tab={activeTab} darkMode={darkMode} />;
    }
  }, [activeTab, handleViewVitals, handleViewMember, selectedUserId, selectedUserInfo, darkMode, members, loading, error, fetchMembers, thresholds, alerts, allUsers, usersLoading, usersError, fetchAllUsers]);

  // Non-admin accounts get redirected to /admin by the effect above — render
  // nothing in the meantime instead of flashing the dashboard with their data.
  if (!isAdminAccount) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: darkMode ? '#0f172a' : '#f8fafc', fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>
      <aside style={{ width: collapsed ? 72 : 240, minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, transition: 'width 0.25s cubic-bezier(.4,0,.2,1)', zIndex: 100, overflow: 'hidden' }}>
        <div style={{ padding: collapsed ? '20px 16px' : '24px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #1e293b', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <img src={jjlogo} alt="Digital Care" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain', flexShrink: 0 }} />
          {!collapsed && <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>DIGITAL CARE</div>}
          <button onClick={() => setCollapsed(!collapsed)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Menu size={16} />
          </button>
        </div>
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map((item, i) => {
            if (!item) return <div key={i} style={{ height: 1, background: '#1e293b', margin: '8px 4px' }} />;
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '10px 16px' : '10px 12px', borderRadius: 10, background: active ? '#1d4ed8' : 'transparent', border: 'none', cursor: 'pointer', marginBottom: 2, transition: 'background 0.15s', overflow: 'hidden', whiteSpace: 'nowrap', justifyContent: collapsed ? 'center' : 'flex-start' }} onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#1e293b'; }} onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <item.icon size={18} color={active ? '#fff' : '#64748b'} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#fff' : '#94a3b8', flex: 1, textAlign: 'left' }}>{item.label}</span>
                    {item.badge && <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, background: '#ef4444', color: '#fff' }}>{item.badge}</span>}
                  </>
                )}
                {collapsed && item.badge && <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: '12px 10px', borderTop: '1px solid #1e293b' }}>
          <button onClick={handleLogoutClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '10px 16px' : '10px 12px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start' }} onMouseEnter={e => e.currentTarget.style.background = '#1e293b'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <LogOut size={16} color="#ef4444" />
            {!collapsed && <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>Logout</span>}
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, marginLeft: collapsed ? 72 : 240, transition: 'margin-left 0.25s cubic-bezier(.4,0,.2,1)', display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: 64, background: darkMode ? '#1e293b' : '#fff', borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: darkMode ? '#fff' : '#0f172a' }}>{NAV.filter(Boolean).find(n => n.id === activeTab)?.label || 'Dashboard'}</div>
            <HeaderDateLine />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setDarkMode(!darkMode)} style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: darkMode ? '#334155' : '#f8fafc', border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {darkMode ? <Sun size={15} color="#cbd5e1" /> : <Moon size={15} color="#6b7280" />}
            </button>
            <button onClick={() => window.location.reload()} style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: darkMode ? '#334155' : '#f8fafc', border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <RefreshCw size={15} color={darkMode ? '#cbd5e1' : '#6b7280'} />
            </button>
            <button style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: darkMode ? '#334155' : '#f8fafc', border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Bell size={15} color={darkMode ? '#cbd5e1' : '#6b7280'} />
              <span style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, background: '#ef4444', borderRadius: '50%', border: '1.5px solid #fff' }} />
            </button>
            <div style={{ width: 1, height: 28, background: darkMode ? '#334155' : '#e2e8f0', margin: '0 4px' }} />
            <div className="admin-user-dropdown" style={{ position: 'relative' }}>
              <div
                onClick={() => setShowAdminMenu(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px 6px 6px', background: darkMode ? '#334155' : '#f8fafc', border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`, borderRadius: 12, cursor: 'pointer' }}
              >
                {adminLogo ? (
                  <img src={adminLogo} alt={adminName} style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>{adminInitial}</div>
                )}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: darkMode ? '#fff' : '#0f172a', lineHeight: 1.3 }}>{adminName}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{adminType}</div>
                </div>
                <ChevronDown size={14} color="#9ca3af" style={{ transform: showAdminMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </div>

              {showAdminMenu && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 180, background: darkMode ? '#1e293b' : '#fff', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 12, boxShadow: '0 12px 28px rgba(0,0,0,0.18)', overflow: 'hidden', zIndex: 60 }}>
                  <button
                    onClick={handleLogoutClick}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = darkMode ? '#33415580' : '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={15} color="#ef4444" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div style={{ padding: 24, flex: 1 }}>{tabContent}</div>
      </main>

      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ width: '100%', maxWidth: 400, margin: '0 16px', borderRadius: 16, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.25)', background: darkMode ? '#1e293b' : '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ padding: 12, borderRadius: '50%', background: darkMode ? '#7f1d1d33' : '#fef2f2' }}>
                <LogOut size={22} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: darkMode ? '#fff' : '#0f172a' }}>Logout</div>
                <div style={{ fontSize: 13, color: darkMode ? '#94a3b8' : '#6b7280' }}>Are you sure you want to logout?</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={handleLogoutCancel}
                style={{ padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', background: darkMode ? '#334155' : '#f1f5f9', color: darkMode ? '#e2e8f0' : '#374151' }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutConfirm}
                style={{ padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
