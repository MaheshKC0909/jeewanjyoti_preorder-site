import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Activity, BarChart3, FileText,
  Bell, Smartphone, Settings, LogOut, Menu, ChevronDown, RefreshCw, Moon, Sun
} from 'lucide-react';
import OverviewTab from './institution/Overview';
import MembersTab from './institution/Members';
import SubscriptionTab from './institution/Subscription';
import VitalsTab from './institution/Vitals';
import PlaceholderTab from './institution/Placeholder';
import { getUserData, clearTokens } from '../lib/tokenManager';
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

export default function InstitutionDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [time, setTime] = useState(new Date());

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

  const handleLogout = () => {
    clearTokens();
    window.location.href = '/login';
  };

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleViewVitals = (userId, userName, profileImage) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    
    // Normalize profile image URL (add backend domain if relative)
    if (profileImage && profileImage.startsWith('/')) {
      setSelectedUserProfileImage(`https://jeewanjyoti-backend.smart.org.np${profileImage}`);
    } else {
      setSelectedUserProfileImage(profileImage);
    }
    
    setActiveTab('vitals');
  };

  const renderContent = () => {
    if (activeTab === 'overview') return <OverviewTab />;
    if (activeTab === 'members') return <MembersTab onViewVitals={handleViewVitals} />;
    if (activeTab === 'vitals') return <VitalsTab selectedUserId={selectedUserId} selectedUserInfo={{ name: selectedUserName, profileImage: selectedUserProfileImage }} darkMode={darkMode} />;
    if (activeTab === 'subscription') return <SubscriptionTab />;
    return <PlaceholderTab tab={activeTab} />;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: darkMode ? '#0f172a' : '#f8fafc', fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>
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
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
              {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
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
          {renderContent()}
        </div>
      </main>
    </div>
  );
}