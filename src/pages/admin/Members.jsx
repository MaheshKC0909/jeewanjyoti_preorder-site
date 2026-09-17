import React, { useState } from 'react';
import {
  Search, Loader, X, Stethoscope, User as UserIcon, Phone, Droplet, Calendar,
  Ruler, Weight, Award, Building2, GraduationCap, RefreshCw,
  Heart, Droplets, Activity, Moon, Zap, BatteryFull, BatteryLow, BatteryWarning,
  Pencil, Trash2, Eye, AlertTriangle, Bell, Send, Megaphone, Image as ImageIcon,
} from 'lucide-react';
import { authenticatedFetch } from '../../lib/tokenManager';
import { updateProfile, createAdminNotification, broadcastNotification } from '../../lib/api';

const GENDER_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'O', label: 'Other' },
];

const BLOOD_GROUP_OPTIONS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function getInputStyle(darkMode) {
  return { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, outline: 'none', fontSize: 13, background: darkMode ? '#0f172a' : '#fff', color: darkMode ? '#fff' : '#0f172a' };
}

function FormField({ label, children, darkMode }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? '#94a3b8' : '#64748b', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function editFormFromUser(u) {
  return {
    first_name: u.first_name || '',
    last_name: u.last_name || '',
    birthdate: u.birthdate || '',
    gender: u.gender || '',
    height: u.height ?? '',
    weight: u.weight ?? '',
    blood_group: u.blood_group || '',
  };
}

const ROLE_STYLES = {
  DOCTOR: { label: 'Doctor', bg: '#eff6ff', darkBg: '#1d4ed820', color: '#1d4ed8', darkColor: '#60a5fa', icon: Stethoscope },
  USER: { label: 'Patient', bg: '#ecfdf5', darkBg: '#05966920', color: '#047857', darkColor: '#34d399', icon: UserIcon },
};

const STATUS_COLORS = { online: '#10b981', away: '#f59e0b', offline: '#9ca3af' };

// Normal physiological ranges used to flag out-of-range vitals in red
const VITAL_RANGES = {
  heartRate: { min: 60, max: 100 },   // bpm
  spo2: { min: 95, max: 100 },        // %
  bpSystolic: { min: 90, max: 140 },  // mmHg
  bpDiastolic: { min: 60, max: 90 },  // mmHg
  sleep: { min: 6, max: 9 },          // hrs
  hrv: { min: 20, max: 200 },         // ms
};

function isOutOfRange(value, range) {
  return value != null && !Number.isNaN(Number(value)) && (value < range.min || value > range.max);
}

function userHasFlaggedVital(u) {
  const v = u.vitals;
  if (!v) return false;
  if (v.heartrate && isOutOfRange(v.heartrate.once_heart_value, VITAL_RANGES.heartRate)) return true;
  if (v.spo2 && isOutOfRange(v.spo2.Blood_oxygen, VITAL_RANGES.spo2)) return true;
  if (v.bloodpressure && (isOutOfRange(v.bloodpressure.sbp, VITAL_RANGES.bpSystolic) || isOutOfRange(v.bloodpressure.dbp, VITAL_RANGES.bpDiastolic))) return true;
  if (v.sleep && isOutOfRange(v.sleep.duration, VITAL_RANGES.sleep)) return true;
  if (v.hrv_iso && isOutOfRange(v.hrv_iso.hrv, VITAL_RANGES.hrv)) return true;
  return false;
}

function latestVitalTimestamp(u) {
  const v = u.vitals;
  if (!v) return 0;
  const dates = [v.heartrate?.date, v.spo2?.date, v.bloodpressure?.date, v.sleep?.date, v.hrv_iso?.date, v.battery?.timestamp]
    .map(d => (d ? new Date(d).getTime() : NaN))
    .filter(t => !Number.isNaN(t));
  return dates.length ? Math.max(...dates) : 0;
}

function RoleBadge({ role, darkMode }) {
  const s = ROLE_STYLES[role] || { label: role || 'Unknown', bg: '#f1f5f9', darkBg: '#33415580', color: '#475569', darkColor: '#94a3b8', icon: UserIcon };
  const Icon = s.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
      padding: '3px 10px', borderRadius: 99, background: darkMode ? s.darkBg : s.bg, color: darkMode ? s.darkColor : s.color
    }}>
      <Icon size={11} /> {s.label}
    </span>
  );
}

function FlaggedBadge({ darkMode }) {
  return (
    <span title="Has out-of-range vitals" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
      padding: '2px 8px', borderRadius: 99, background: darkMode ? '#7f1d1d30' : '#fef2f2', color: darkMode ? '#f87171' : '#dc2626',
      marginLeft: 8, whiteSpace: 'nowrap'
    }}>
      <AlertTriangle size={10} /> Flagged
    </span>
  );
}

function StatusDot({ status }) {
  const c = STATUS_COLORS[status] || '#9ca3af';
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 0 2px ${c}33`, display: 'inline-block' }} />;
}

function getAge(birthdate) {
  if (!birthdate) return null;
  const d = new Date(birthdate);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function formatTimeShort(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('/')) return `https://jeewanjyoti-backend.smart.org.np${url}`;
  return url;
}

export default function AdminMembers({ users = [], loading = false, error = null, refreshUsers, onViewVitals, darkMode = false }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [photoLightbox, setPhotoLightbox] = useState(null);

  // Push notification form — shown inside the member detail modal
  const [notifyForm, setNotifyForm] = useState({ title: '', body: '' });
  const [notifyImage, setNotifyImage] = useState(null);
  const [notifyImagePreview, setNotifyImagePreview] = useState('');
  const [notifySending, setNotifySending] = useState(false);
  const [notifyError, setNotifyError] = useState('');
  const [notifySuccess, setNotifySuccess] = useState(false);

  // Edit modal state — pre-filled with the user's current values
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Broadcast notification modal — sends to all users
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', body: '' });
  const [broadcastImage, setBroadcastImage] = useState(null);
  const [broadcastImagePreview, setBroadcastImagePreview] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastError, setBroadcastError] = useState('');
  const [broadcastResult, setBroadcastResult] = useState(null);

  // Color tokens
  const cardBg = darkMode ? '#1e293b' : '#fff';
  const cardBorder = darkMode ? '#334155' : '#f1f5f9';
  const subtleBg = darkMode ? '#0f172a' : '#f8fafc';
  const subtleBorder = darkMode ? '#334155' : '#e2e8f0';
  const textPrimary = darkMode ? '#fff' : '#0f172a';
  const textSecondary = darkMode ? '#94a3b8' : '#64748b';
  const textMuted = darkMode ? '#64748b' : '#9ca3af';
  const rowHover = darkMode ? '#0f172a' : '#f8fafc';
  const inputStyle = getInputStyle(darkMode);

  const openDetail = (u) => {
    setSelectedUser(u);
    setNotifyForm({ title: '', body: '' });
    setNotifyImage(null);
    setNotifyImagePreview('');
    setNotifyError('');
    setNotifySuccess(false);
  };

  const closeDetail = () => {
    setSelectedUser(null);
    setPhotoLightbox(null);
    setNotifyForm({ title: '', body: '' });
    setNotifyImage(null);
    setNotifyImagePreview('');
    setNotifyError('');
    setNotifySuccess(false);
  };

  const handleNotifyImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setNotifyImage(file);
    setNotifyImagePreview(file ? URL.createObjectURL(file) : '');
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    const title = notifyForm.title.trim();
    const body = notifyForm.body.trim();
    if (!title || !body) return;
    try {
      setNotifySending(true);
      setNotifyError('');
      setNotifySuccess(false);
      await createAdminNotification(selectedUser.id, title, body, notifyImage);
      setNotifyForm({ title: '', body: '' });
      setNotifyImage(null);
      setNotifyImagePreview('');
      setNotifySuccess(true);
    } catch (err) {
      setNotifyError(err.message || 'Failed to send notification.');
    } finally {
      setNotifySending(false);
    }
  };

  const openBroadcast = () => {
    setShowBroadcast(true);
    setBroadcastForm({ title: '', body: '' });
    setBroadcastImage(null);
    setBroadcastImagePreview('');
    setBroadcastError('');
    setBroadcastResult(null);
  };

  const closeBroadcast = () => {
    setShowBroadcast(false);
    setBroadcastForm({ title: '', body: '' });
    setBroadcastImage(null);
    setBroadcastImagePreview('');
    setBroadcastError('');
    setBroadcastResult(null);
  };

  const handleBroadcastImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setBroadcastImage(file);
    setBroadcastImagePreview(file ? URL.createObjectURL(file) : '');
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    const title = broadcastForm.title.trim();
    const body = broadcastForm.body.trim();
    if (!title || !body) return;
    try {
      setBroadcastSending(true);
      setBroadcastError('');
      setBroadcastResult(null);
      const res = await broadcastNotification(title, body, broadcastImage);
      setBroadcastForm({ title: '', body: '' });
      setBroadcastImage(null);
      setBroadcastImagePreview('');
      setBroadcastResult(res);
    } catch (err) {
      setBroadcastError(err.message || 'Failed to broadcast notification.');
    } finally {
      setBroadcastSending(false);
    }
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setEditForm(editFormFromUser(u));
    setSaveError('');
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditForm(null);
    setSaveError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setIsSaving(true);
      setSaveError('');
      await updateProfile({
        id: editingUser.id,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        birthdate: editForm.birthdate || null,
        gender: editForm.gender || null,
        height: editForm.height === '' ? null : Number(editForm.height),
        weight: editForm.weight === '' ? null : Number(editForm.weight),
        blood_group: editForm.blood_group || null,
      });
      closeEdit();
      if (refreshUsers) refreshUsers();
    } catch (err) {
      setSaveError(err.message || 'Failed to update user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (u) => {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
    if (!window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;
    try {
      setDeletingId(u.id);
      const res = await authenticatedFetch('https://jeewanjyoti-backend.smart.org.np/api/delete-account/', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to delete user.');
      }
      if (refreshUsers) refreshUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = users.filter(u => {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    const matchesSearch = !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  }).sort((a, b) => latestVitalTimestamp(b) - latestVitalTimestamp(a));

  const doctorCount = users.filter(u => u.role === 'DOCTOR').length;
  const patientCount = users.filter(u => u.role === 'USER').length;

  return (
    <div style={{ background: cardBg, borderRadius: 20, border: `1px solid ${cardBorder}`, overflow: 'hidden', position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>All Users ({users.length})</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: subtleBg, border: `1px solid ${subtleBorder}`, borderRadius: 10, padding: 3 }}>
            {[
              { id: 'all', label: `All (${users.length})` },
              { id: 'DOCTOR', label: `Doctors (${doctorCount})` },
              { id: 'USER', label: `Patients (${patientCount})` },
            ].map(t => (
              <button key={t.id} onClick={() => setRoleFilter(t.id)} style={{
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                background: roleFilter === t.id ? '#3b82f6' : 'transparent',
                color: roleFilter === t.id ? '#fff' : textSecondary,
                transition: 'background 0.15s'
              }}>{t.label}</button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} color={textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" style={{
              paddingLeft: 34, paddingRight: 14, height: 36, background: subtleBg, border: `1px solid ${subtleBorder}`,
              borderRadius: 10, fontSize: 13, outline: 'none', color: textPrimary, width: 220
            }} />
          </div>
          {refreshUsers && (
            <button onClick={refreshUsers} title="Refresh" style={{ width: 36, height: 36, borderRadius: 10, background: subtleBg, border: `1px solid ${subtleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <RefreshCw size={14} color={darkMode ? '#94a3b8' : '#6b7280'} />
            </button>
          )}
          <button onClick={openBroadcast} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 10, background: '#3b82f6', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Megaphone size={14} /> Broadcast
          </button>
        </div>
      </div>

      {/* Broadcast Modal — sends a notification to every user */}
      {showBroadcast && (
        <>
          <div onClick={closeBroadcast} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: cardBg, padding: 24, borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 1000, width: 380, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Megaphone size={16} color="#3b82f6" />
                <div style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>Broadcast Notification</div>
              </div>
              <button onClick={closeBroadcast} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} color={textSecondary} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: textSecondary, marginBottom: 16 }}>
              Sends a push notification to every user ({users.length} total).
            </div>
            <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                value={broadcastForm.title}
                onChange={e => setBroadcastForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Title"
                style={inputStyle}
              />
              <textarea
                value={broadcastForm.body}
                onChange={e => setBroadcastForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Message"
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <div>
                <label htmlFor="broadcast-image" style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8,
                  border: `1px dashed ${subtleBorder}`, cursor: 'pointer', fontSize: 12, color: textSecondary,
                }}>
                  <ImageIcon size={14} />
                  {broadcastImage ? broadcastImage.name : 'Attach image (optional)'}
                </label>
                <input id="broadcast-image" type="file" accept="image/*" onChange={handleBroadcastImageChange} style={{ display: 'none' }} />
                {broadcastImagePreview && (
                  <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                    <img src={broadcastImagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 8, display: 'block' }} />
                    <button
                      type="button"
                      onClick={() => { setBroadcastImage(null); setBroadcastImagePreview(''); }}
                      title="Remove image"
                      style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={12} color="#fff" />
                    </button>
                  </div>
                )}
              </div>
              {broadcastError && <div style={{ fontSize: 11, color: '#ef4444' }}>{broadcastError}</div>}
              {broadcastResult && (
                <div style={{ fontSize: 11, color: '#10b981' }}>
                  {broadcastResult.detail || `Sent to ${broadcastResult.total_recipients} users.`}
                </div>
              )}
              <button
                type="submit"
                disabled={broadcastSending || !broadcastForm.title.trim() || !broadcastForm.body.trim()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: broadcastSending ? 'not-allowed' : 'pointer', opacity: broadcastSending || !broadcastForm.title.trim() || !broadcastForm.body.trim() ? 0.6 : 1 }}
              >
                {broadcastSending ? <Loader className="animate-spin" size={14} /> : <Send size={14} />}
                {broadcastSending ? 'Sending...' : 'Send to All'}
              </button>
            </form>
          </div>
        </>
      )}

      {/* Detail Modal — role, gender, phone and other profile fields live here, opened by clicking a member's name */}
      {selectedUser && (
        <>
          <div onClick={closeDetail} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: cardBg, borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 1000, width: 380, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${cardBorder}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              {resolveImageUrl(selectedUser.profile_image) ? (
                <img
                  src={resolveImageUrl(selectedUser.profile_image)}
                  alt=""
                  onClick={() => setPhotoLightbox(resolveImageUrl(selectedUser.profile_image))}
                  style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', cursor: 'pointer' }}
                  title="View full photo"
                />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 12, background: darkMode ? '#1d4ed820' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#3b82f6' }}>
                  {`${selectedUser.first_name?.[0] || ''}${selectedUser.last_name?.[0] || ''}`.toUpperCase() || 'U'}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>{`${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || 'Unknown'}</div>
                <RoleBadge role={selectedUser.role} darkMode={darkMode} />
              </div>
              <button onClick={closeDetail} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} color={textSecondary} />
              </button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <DetailRow icon={UserIcon} label="Email" value={selectedUser.email} darkMode={darkMode} />
              <DetailRow icon={Phone} label="Phone" value={selectedUser.phone_number} darkMode={darkMode} />
              <DetailRow icon={Calendar} label="Age / Gender" value={[getAge(selectedUser.birthdate) ? `${getAge(selectedUser.birthdate)} yrs` : null, selectedUser.gender === 'M' ? 'Male' : selectedUser.gender === 'F' ? 'Female' : selectedUser.gender].filter(Boolean).join(' • ')} darkMode={darkMode} />

              {selectedUser.role === 'DOCTOR' ? (
                <>
                  <DetailRow icon={Stethoscope} label="Specialization" value={selectedUser.specialization} darkMode={darkMode} />
                  <DetailRow icon={Building2} label="Hospital" value={selectedUser.hospital_name} darkMode={darkMode} />
                  <DetailRow icon={Award} label="License No." value={selectedUser.license_number} darkMode={darkMode} />
                  <DetailRow icon={GraduationCap} label="Education" value={selectedUser.education} darkMode={darkMode} />
                  <DetailRow icon={Calendar} label="Experience" value={selectedUser.experience != null ? `${selectedUser.experience} yrs` : null} darkMode={darkMode} />
                  {selectedUser.description && (
                    <div style={{ fontSize: 12, color: textSecondary, lineHeight: 1.5, background: subtleBg, padding: 12, borderRadius: 10 }}>
                      {selectedUser.description}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <DetailRow icon={Droplet} label="Blood Group" value={selectedUser.blood_group} darkMode={darkMode} />
                  <DetailRow icon={Ruler} label="Height" value={selectedUser.height != null ? `${selectedUser.height} cm` : null} darkMode={darkMode} />
                  <DetailRow icon={Weight} label="Weight" value={selectedUser.weight != null ? `${selectedUser.weight} kg` : null} darkMode={darkMode} />
                </>
              )}

              {/* Push Notification — send an admin notification straight to this user */}
              <div style={{ marginTop: 4, paddingTop: 16, borderTop: `1px solid ${cardBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Bell size={14} color={darkMode ? '#94a3b8' : '#64748b'} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: textPrimary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Send Notification</div>
                </div>
                <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="text"
                    value={notifyForm.title}
                    onChange={e => setNotifyForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Title"
                    style={inputStyle}
                  />
                  <textarea
                    value={notifyForm.body}
                    onChange={e => setNotifyForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="Message"
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                  <div>
                    <label htmlFor="notify-image" style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8,
                      border: `1px dashed ${subtleBorder}`, cursor: 'pointer', fontSize: 12, color: textSecondary,
                    }}>
                      <ImageIcon size={14} />
                      {notifyImage ? notifyImage.name : 'Attach image (optional)'}
                    </label>
                    <input id="notify-image" type="file" accept="image/*" onChange={handleNotifyImageChange} style={{ display: 'none' }} />
                    {notifyImagePreview && (
                      <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                        <img src={notifyImagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 8, display: 'block' }} />
                        <button
                          type="button"
                          onClick={() => { setNotifyImage(null); setNotifyImagePreview(''); }}
                          title="Remove image"
                          style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={12} color="#fff" />
                        </button>
                      </div>
                    )}
                  </div>
                  {notifyError && <div style={{ fontSize: 11, color: '#ef4444' }}>{notifyError}</div>}
                  {notifySuccess && <div style={{ fontSize: 11, color: '#10b981' }}>Notification sent.</div>}
                  <button
                    type="submit"
                    disabled={notifySending || !notifyForm.title.trim() || !notifyForm.body.trim()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: notifySending ? 'not-allowed' : 'pointer', opacity: notifySending || !notifyForm.title.trim() || !notifyForm.body.trim() ? 0.6 : 1 }}
                  >
                    {notifySending ? <Loader className="animate-spin" size={14} /> : <Send size={14} />}
                    {notifySending ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Photo Lightbox — full-size view of the avatar clicked in the detail modal */}
      {photoLightbox && (
        <div
          onClick={() => setPhotoLightbox(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
        >
          <button
            onClick={() => setPhotoLightbox(null)}
            style={{ position: 'fixed', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={18} color="#fff" />
          </button>
          <img
            src={photoLightbox}
            alt="Full size"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', objectFit: 'contain', cursor: 'default' }}
          />
        </div>
      )}

      {/* Edit Modal — pre-filled with the user's current values */}
      {editingUser && editForm && (
        <>
          <div onClick={closeEdit} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: cardBg, padding: 24, borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 1000, width: 380, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>Edit {`${editingUser.first_name || ''} ${editingUser.last_name || ''}`.trim() || 'User'}</div>
              <button onClick={closeEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} color={textSecondary} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <FormField label="First Name" darkMode={darkMode}>
                  <input type="text" value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} style={inputStyle} />
                </FormField>
                <FormField label="Last Name" darkMode={darkMode}>
                  <input type="text" value={editForm.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} style={inputStyle} />
                </FormField>
              </div>
              <FormField label="Birthdate" darkMode={darkMode}>
                <input type="date" value={editForm.birthdate || ''} onChange={e => setEditForm(f => ({ ...f, birthdate: e.target.value }))} style={inputStyle} />
              </FormField>
              <FormField label="Gender" darkMode={darkMode}>
                <select value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))} style={inputStyle}>
                  {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
              <div style={{ display: 'flex', gap: 10 }}>
                <FormField label="Height (cm)" darkMode={darkMode}>
                  <input type="number" step="0.1" value={editForm.height} onChange={e => setEditForm(f => ({ ...f, height: e.target.value }))} style={inputStyle} />
                </FormField>
                <FormField label="Weight (kg)" darkMode={darkMode}>
                  <input type="number" step="0.1" value={editForm.weight} onChange={e => setEditForm(f => ({ ...f, weight: e.target.value }))} style={inputStyle} />
                </FormField>
              </div>
              <FormField label="Blood Group" darkMode={darkMode}>
                <select value={editForm.blood_group} onChange={e => setEditForm(f => ({ ...f, blood_group: e.target.value }))} style={inputStyle}>
                  {BLOOD_GROUP_OPTIONS.map(o => <option key={o} value={o}>{o || 'Select…'}</option>)}
                </select>
              </FormField>

              {saveError && <div style={{ fontSize: 11, color: '#ef4444', lineHeight: 1.4 }}>{saveError}</div>}

              <button disabled={isSaving} type="submit" style={{ width: '100%', padding: 10, borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', marginTop: 4 }}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </>
      )}

      {loading ? (
        <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
          <Loader className="animate-spin" size={30} color="#3b82f6" />
        </div>
      ) : error ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#ef4444', fontSize: 14, fontWeight: 500 }}>{error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: textSecondary, fontSize: 14 }}>
          {search ? 'No users found matching your search.' : 'No users found.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: subtleBg }}>
                {['Member', 'Status', 'Heart Rate', 'SpO₂', 'BP', 'Sleep', 'HRV', 'Battery', 'Vitals', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: darkMode ? '#94a3b8' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${subtleBorder}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown User';
                const image = resolveImageUrl(u.profile_image);
                return (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${cardBorder}` }}
                    onMouseEnter={e => e.currentTarget.style.background = rowHover}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => openDetail(u)}>
                        {image ? (
                          <img src={image} alt={name} style={{ width: 38, height: 38, borderRadius: 12, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 38, height: 38, borderRadius: 12, background: darkMode ? '#1d4ed820' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#3b82f6' }}>
                            {name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary, display: 'flex', alignItems: 'center' }}>
                          {name}
                          {userHasFlaggedVital(u) && <FlaggedBadge darkMode={darkMode} />}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StatusDot status={u.status} />
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                          background: u.status === 'online' ? (darkMode ? '#064e3b' : '#d1fae5') : u.status === 'away' ? (darkMode ? '#78350f' : '#fef3c7') : (darkMode ? '#334155' : '#f1f5f9'),
                          color: u.status === 'online' ? (darkMode ? '#6ee7b7' : '#065f46') : u.status === 'away' ? (darkMode ? '#fcd34d' : '#92400e') : (darkMode ? '#94a3b8' : '#6b7280'),
                          textTransform: 'capitalize'
                        }}>{u.status || 'offline'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {u.vitals?.heartrate ? (() => {
                        const hr = u.vitals.heartrate.once_heart_value;
                        const abnormal = isOutOfRange(hr, VITAL_RANGES.heartRate);
                        return (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Heart size={14} color={abnormal ? '#ef4444' : '#10b981'} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: abnormal ? '#ef4444' : textPrimary }}>{hr} <span style={{ color: textMuted, fontWeight: 400 }}>bpm</span></span>
                            </div>
                            <div style={{ fontSize: 10, color: textMuted, marginTop: 4, marginLeft: 20 }}>{formatTimeShort(u.vitals.heartrate.date)}</div>
                          </div>
                        );
                      })() : <span style={{ color: darkMode ? '#475569' : '#d1d5db', fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {u.vitals?.spo2 ? (() => {
                        const spo2 = u.vitals.spo2.Blood_oxygen;
                        const abnormal = isOutOfRange(spo2, VITAL_RANGES.spo2);
                        return (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Droplets size={14} color={abnormal ? '#ef4444' : '#3b82f6'} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: abnormal ? '#ef4444' : textPrimary }}>{spo2} <span style={{ color: textMuted, fontWeight: 400 }}>%</span></span>
                            </div>
                            <div style={{ fontSize: 10, color: textMuted, marginTop: 4, marginLeft: 20 }}>{formatTimeShort(u.vitals.spo2.date)}</div>
                          </div>
                        );
                      })() : <span style={{ color: darkMode ? '#475569' : '#d1d5db', fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {u.vitals?.bloodpressure ? (() => {
                        const { sbp, dbp } = u.vitals.bloodpressure;
                        const abnormal = isOutOfRange(sbp, VITAL_RANGES.bpSystolic) || isOutOfRange(dbp, VITAL_RANGES.bpDiastolic);
                        return (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Activity size={14} color={abnormal ? '#ef4444' : '#8b5cf6'} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: abnormal ? '#ef4444' : textPrimary }}>{sbp}/{dbp}</span>
                            </div>
                            <div style={{ fontSize: 10, color: textMuted, marginTop: 4, marginLeft: 20 }}>{formatTimeShort(u.vitals.bloodpressure.date)}</div>
                          </div>
                        );
                      })() : <span style={{ color: darkMode ? '#475569' : '#d1d5db', fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {u.vitals?.sleep ? (() => {
                        const dur = u.vitals.sleep.duration;
                        const abnormal = isOutOfRange(dur, VITAL_RANGES.sleep);
                        return (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Moon size={14} color={abnormal ? '#ef4444' : '#6366f1'} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: abnormal ? '#ef4444' : textPrimary }}>{dur} <span style={{ color: textMuted, fontWeight: 400 }}>hrs</span></span>
                            </div>
                            <div style={{ fontSize: 10, color: textMuted, marginTop: 4, marginLeft: 20 }}>{formatTimeShort(u.vitals.sleep.date)}</div>
                          </div>
                        );
                      })() : <span style={{ color: darkMode ? '#475569' : '#d1d5db', fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {u.vitals?.hrv_iso ? (() => {
                        const hrv = u.vitals.hrv_iso.hrv;
                        const abnormal = isOutOfRange(hrv, VITAL_RANGES.hrv);
                        return (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Zap size={14} color={abnormal ? '#ef4444' : '#f59e0b'} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: abnormal ? '#ef4444' : textPrimary }}>{hrv} <span style={{ color: textMuted, fontWeight: 400 }}>ms</span></span>
                            </div>
                            <div style={{ fontSize: 10, color: textMuted, marginTop: 4, marginLeft: 20 }}>{formatTimeShort(u.vitals.hrv_iso.date)}</div>
                          </div>
                        );
                      })() : <span style={{ color: darkMode ? '#475569' : '#d1d5db', fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {u.vitals?.battery ? (() => {
                        const pct = u.vitals.battery.percentage;
                        const color = pct <= 20 ? '#ef4444' : pct <= 40 ? '#f59e0b' : '#10b981';
                        const BatteryIcon = pct <= 20 ? BatteryWarning : pct <= 40 ? BatteryLow : BatteryFull;
                        return (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <BatteryIcon size={14} color={color} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>{pct} <span style={{ color: textMuted, fontWeight: 400 }}>%</span></span>
                            </div>
                            <div style={{ fontSize: 10, color: textMuted, marginTop: 4, marginLeft: 20 }}>{formatTimeShort(u.vitals.battery.timestamp)}</div>
                          </div>
                        );
                      })() : <span style={{ color: darkMode ? '#475569' : '#d1d5db', fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {onViewVitals && (
                        <button
                          onClick={() => onViewVitals(u.id, name, u.profile_image, u.status)}
                          title="View Vitals Dashboard"
                          style={{ padding: 8, borderRadius: 8, background: darkMode ? '#4c1d9520' : '#f5f3ff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Eye size={14} color="#8b5cf6" />
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => openEdit(u)}
                          title="Edit User"
                          style={{ padding: 8, borderRadius: 8, background: darkMode ? '#1d4ed820' : '#eff6ff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Pencil size={14} color="#3b82f6" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={deletingId === u.id}
                          title="Delete User"
                          style={{ padding: 8, borderRadius: 8, background: darkMode ? '#7f1d1d20' : '#fef2f2', border: 'none', cursor: deletingId === u.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', opacity: deletingId === u.id ? 0.5 : 1 }}>
                          {deletingId === u.id ? <Loader className="animate-spin" size={14} color="#ef4444" /> : <Trash2 size={14} color="#ef4444" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value, darkMode }) {
  if (!value) return null;
  const Icon = icon;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: darkMode ? '#0f172a' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={13} color={darkMode ? '#94a3b8' : '#64748b'} />
      </div>
      <div>
        <div style={{ fontSize: 10, color: darkMode ? '#64748b' : '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 13, color: darkMode ? '#fff' : '#0f172a', fontWeight: 600, marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}
