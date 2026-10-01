import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { QrCode, Link2, ShoppingCart, Upload, X, Save, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { getAccessToken, getAuthHeaders, refreshAccessToken } from '../../lib/tokenManager';

const API_BASE = 'https://jeewanjyoti-backend.smart.org.np';
const PREBOOKING_QR_URL = `${API_BASE}/api/prebooking/qr/`;

const URL_FIELDS = [
  { key: 'android_url', label: 'Android App URL', placeholder: 'https://play.google.com/store/apps/details?id=...' },
  { key: 'ios_url', label: 'iOS App URL', placeholder: 'https://apps.apple.com/app/...' },
];
const BUY_FIELDS = [
  { key: 'buy_link1', label: 'Buy Link 1', placeholder: 'https://...' },
  { key: 'buy_link2', label: 'Buy Link 2', placeholder: 'https://...' },
  { key: 'buy_link3', label: 'Buy Link 3', placeholder: 'https://...' },
];

const EMPTY_FORM = { android_url: '', ios_url: '', buy_link1: '', buy_link2: '', buy_link3: '', is_active: true };

const toAbsolute = (url) => (url && url.startsWith('/') ? `${API_BASE}${url}` : url);

// authenticatedFetch always forces `Content-Type: application/json`, which
// breaks multipart uploads (the browser must set the boundary itself), so
// this does the same auth + one-shot refresh-on-401 without that header.
async function authedFetch(url, options = {}) {
  const send = () => fetch(url, { ...options, headers: { ...getAuthHeaders(), ...options.headers } });
  let res = await send();
  if (res.status === 401 && getAccessToken() && await refreshAccessToken()) {
    res = await send();
  }
  return res;
}

function formatErrors(data) {
  if (!data || typeof data !== 'object') return 'Request failed.';
  if (data.detail) return data.detail;
  if (data.message) return data.message;
  return Object.entries(data)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
    .join('\n');
}

export default function AdminInputs({ darkMode = false }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState({ android_qr: null, ios_qr: null });
  const [existing, setExisting] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', text }

  const c = {
    card: darkMode ? '#1e293b' : '#fff',
    border: darkMode ? '#334155' : '#f1f5f9',
    inputBg: darkMode ? '#0f172a' : '#f8fafc',
    inputBorder: darkMode ? '#334155' : '#e2e8f0',
    title: darkMode ? '#fff' : '#0f172a',
    text: darkMode ? '#cbd5e1' : '#374151',
    muted: darkMode ? '#94a3b8' : '#6b7280',
  };

  // Best-effort prefill with the latest saved record; the section still works
  // as a plain create form if the endpoint doesn't support GET.
  const loadExisting = useCallback(async () => {
    try {
      const res = await authedFetch(PREBOOKING_QR_URL);
      if (!res.ok) return;
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data ?? json.results ?? json);
      const record = Array.isArray(list) ? list[list.length - 1] : list;
      if (!record || typeof record !== 'object' || !('id' in record)) return;
      setExisting(record);
      setForm({
        android_url: record.android_url || '',
        ios_url: record.ios_url || '',
        buy_link1: record.buy_link1 || '',
        buy_link2: record.buy_link2 || '',
        buy_link3: record.buy_link3 || '',
        is_active: record.is_active ?? true,
      });
    } catch (e) {
      console.error('Prebooking QR load error:', e);
    }
  }, []);

  useEffect(() => { loadExisting(); }, [loadExisting]);

  const filePreviews = useMemo(() => ({
    android_qr: files.android_qr ? URL.createObjectURL(files.android_qr) : null,
    ios_qr: files.ios_qr ? URL.createObjectURL(files.ios_qr) : null,
  }), [files]);
  useEffect(() => () => Object.values(filePreviews).forEach(u => u && URL.revokeObjectURL(u)), [filePreviews]);
  const previews = {
    android_qr: filePreviews.android_qr || toAbsolute(existing?.android_qr),
    ios_qr: filePreviews.ios_qr || toAbsolute(existing?.ios_qr),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);
    // Update the saved record in place when one exists; only create on first save.
    const isUpdate = !!existing?.id;
    try {
      const body = new FormData();
      if (isUpdate) body.append('id', existing.id);
      [...URL_FIELDS, ...BUY_FIELDS].forEach(({ key }) => {
        const v = form[key].trim();
        // On update, send blanks too so a cleared link is cleared in the database.
        if (v || isUpdate) body.append(key, v);
      });
      body.append('is_active', form.is_active ? 'true' : 'false');
      if (files.android_qr) body.append('android_qr', files.android_qr);
      if (files.ios_qr) body.append('ios_qr', files.ios_qr);

      const res = await authedFetch(PREBOOKING_QR_URL, { method: isUpdate ? 'PATCH' : 'POST', body });
      const data = await res.json().catch(() => null);
      if (res.status === 401 || res.status === 403) {
        throw new Error('Only admin accounts can save these inputs.');
      }
      if (!res.ok) throw new Error(formatErrors(data));

      const saved = data?.data && typeof data.data === 'object' ? data.data : data;
      if (saved && 'id' in saved) setExisting(saved);
      setFiles({ android_qr: null, ios_qr: null });
      setStatus({ type: 'success', text: isUpdate ? 'Inputs updated successfully.' : 'Inputs saved successfully.' });
    } catch (err) {
      console.error('Prebooking QR save error:', err);
      setStatus({ type: 'error', text: err.message || 'Could not save inputs.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Same endpoint as GET/POST; the record id is sent in the body.
  const handleDelete = async () => {
    if (!existing || !window.confirm('Delete the saved inputs? The downloads page will fall back to "Coming soon".')) return;
    setStatus(null);
    setDeleting(true);
    try {
      const res = await authedFetch(PREBOOKING_QR_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing.id }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401 || res.status === 403) {
        throw new Error('Only admin accounts can delete these inputs.');
      }
      if (!res.ok) throw new Error(formatErrors(data));

      setExisting(null);
      setForm(EMPTY_FORM);
      setFiles({ android_qr: null, ios_qr: null });
      setStatus({ type: 'success', text: 'Inputs deleted.' });
      loadExisting();
    } catch (err) {
      console.error('Prebooking QR delete error:', err);
      setStatus({ type: 'error', text: err.message || 'Could not delete inputs.' });
    } finally {
      setDeleting(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, outline: 'none',
    background: c.inputBg, border: `1px solid ${c.inputBorder}`, color: c.title, fontFamily: 'inherit',
  };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: c.text, marginBottom: 6, display: 'block' };
  const cardStyle = { background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}` };

  const renderSectionHeader = (Icon, title, subtitle) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: darkMode ? '#1d4ed820' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color="#3b82f6" />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: c.title }}>{title}</div>
        <div style={{ fontSize: 12, color: c.muted }}>{subtitle}</div>
      </div>
    </div>
  );

  const renderQrUpload = (field, label) => (
    <div>
      <span style={labelStyle}>{label}</span>
      <div style={{ border: `1.5px dashed ${c.inputBorder}`, borderRadius: 14, padding: 16, background: c.inputBg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minHeight: 220, justifyContent: 'center', position: 'relative' }}>
        {previews[field] ? (
          <img src={previews[field]} alt={label} style={{ width: 140, height: 140, objectFit: 'contain', borderRadius: 10, background: '#fff', padding: 6 }} />
        ) : (
          <QrCode size={48} color={c.muted} />
        )}
        {files[field] && (
          <button type="button" onClick={() => setFiles(f => ({ ...f, [field]: null }))} title="Remove selected file" style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 8, border: 'none', background: darkMode ? '#334155' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} color={c.text} />
          </button>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: '#1d4ed8', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          <Upload size={14} />
          {previews[field] ? 'Replace image' : 'Upload image'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const file = e.target.files?.[0]; if (file) setFiles(f => ({ ...f, [field]: file })); e.target.value = ''; }} />
        </label>
        <div style={{ fontSize: 11, color: c.muted, textAlign: 'center', wordBreak: 'break-all' }}>
          {files[field] ? files[field].name : previews[field] ? 'Current saved image' : 'PNG or JPG'}
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 }}>
      <div style={cardStyle}>
        {renderSectionHeader(QrCode, 'App Download QR Codes', 'QR images shown for downloading the mobile apps')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {renderQrUpload('android_qr', 'Android QR')}
          {renderQrUpload('ios_qr', 'iOS QR')}
        </div>
      </div>

      <div style={cardStyle}>
        {renderSectionHeader(Link2, 'App Store Links', 'Direct links to the Android and iOS apps')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {URL_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label htmlFor={key} style={labelStyle}>{label}</label>
              <input id={key} type="url" value={form[key]} placeholder={placeholder} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        {renderSectionHeader(ShoppingCart, 'Buy Links', 'Where users can purchase the device')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {BUY_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label htmlFor={key} style={labelStyle}>{label}</label>
              <input id={key} type="url" value={form[key]} placeholder={placeholder} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <span
            role="switch"
            aria-checked={form.is_active}
            tabIndex={0}
            onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
            onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setForm(f => ({ ...f, is_active: !f.is_active })); } }}
            style={{ width: 42, height: 24, borderRadius: 99, background: form.is_active ? '#22c55e' : (darkMode ? '#475569' : '#cbd5e1'), position: 'relative', transition: 'background 0.15s', flexShrink: 0 }}
          >
            <span style={{ position: 'absolute', top: 3, left: form.is_active ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
          </span>
          <span>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: c.title }}>Active</span>
            <span style={{ display: 'block', fontSize: 12, color: c.muted }}>Show these inputs to users</span>
          </span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {existing?.updated_at && (
            <div style={{ fontSize: 11, color: c.muted, textAlign: 'right' }}>
              Record #{existing.id} · Last updated {new Date(existing.updated_at).toLocaleString()}
              {existing.uploaded_by_email && <><br />by {existing.uploaded_by_email}</>}
            </div>
          )}
          {existing && (
            <button type="button" onClick={handleDelete} disabled={deleting || submitting} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 10, border: `1px solid ${darkMode ? '#7f1d1d' : '#fecaca'}`, background: darkMode ? '#7f1d1d33' : '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
              {deleting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={15} />}
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
          <button type="submit" disabled={submitting || deleting}style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 10, border: 'none', background: '#1d4ed8', color: '#fff', fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
            {submitting ? 'Saving...' : existing ? 'Update Inputs' : 'Save Inputs'}
          </button>
        </div>
      </div>

      {status && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, whiteSpace: 'pre-line', background: status.type === 'success' ? (darkMode ? '#14532d55' : '#f0fdf4') : (darkMode ? '#7f1d1d55' : '#fef2f2'), color: status.type === 'success' ? '#16a34a' : '#dc2626' }}>
          {status.type === 'success' ? <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />}
          {status.text}
        </div>
      )}
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </form>
  );
}
