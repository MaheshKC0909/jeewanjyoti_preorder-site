import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Download, Heart, Clock, Eye, Trash2, X, Loader, Droplets, Activity, Moon, Zap } from 'lucide-react';
import { authenticatedFetch } from '../../lib/tokenManager';

function StatusDot({ status }) {
  const c = status === 'Active' || status === 'online' || status === true ? '#10b981' : '#9ca3af';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 0 2px ${c}33`, display: 'inline-block' }} />
    </span>
  );
}

function formatTimeShort(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function Members({ onViewVitals }) {
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchMembers = async () => {
    try {
      setLoading(true);
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
        } catch (e) {}
        return m;
      }));
      
      setMembers(membersWithVitals);
    } catch (err) {
      console.error(err);
      setError('Could not load members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    try {
      setIsAdding(true);
      setAddError('');
      const res = await authenticatedFetch('https://jeewanjyoti-backend.smart.org.np/api/instutionmember/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim() })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || 'Failed to add member. They may not exist or are already added.');
      }
      setNewEmail('');
      setShowAddModal(false);
      fetchMembers(); // refresh list
    } catch (err) {
      setAddError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
      const res = await authenticatedFetch(`https://jeewanjyoti-backend.smart.org.np/api/instutionmember/${id}/`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete member');
      fetchMembers(); // refresh list
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = members.filter(m => 
    m.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    m.user_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f1f5f9', overflow: 'hidden', position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Institution Members ({members.length})</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…" style={{
              paddingLeft: 34, paddingRight: 14, height: 36, background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 10, fontSize: 13, outline: 'none', color: '#0f172a', width: 220
            }} />
          </div>
          <button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 36, background: '#3b82f6', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={14} /> Add Member
          </button>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <>
          <div onClick={() => { setShowAddModal(false); setAddError(''); setNewEmail(''); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 1000, width: 340 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Add New Member</div>
              <button onClick={() => { setShowAddModal(false); setAddError(''); setNewEmail(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} color="#64748b" />
              </button>
            </div>
          <form onSubmit={handleAddMember}>
            <input 
              type="email" 
              required
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)} 
              placeholder="Enter user email..." 
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', fontSize: 13, marginBottom: 12 }} 
            />
            {addError && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 12, lineHeight: 1.4 }}>{addError}</div>}
            <button disabled={isAdding} type="submit" style={{ width: '100%', padding: 10, borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: isAdding ? 'not-allowed' : 'pointer' }}>
              {isAdding ? 'Adding...' : 'Add Member'}
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
        <div style={{ padding: 60, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
          {search ? 'No members found matching your search.' : 'No members found. Click "Add Member" to invite someone.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Member', 'Email', 'Status', 'Heart Rate', 'SpO₂', 'BP', 'Sleep', 'HRV', 'Joined', 'Actions'].map(h => (
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
                        {(m.full_name || m.user_email).substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{m.full_name || 'Unknown User'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569', fontWeight: 500 }}>
                    {m.user_email}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <StatusDot status={m.is_active} />
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                        background: m.is_active ? '#d1fae5' : '#f1f5f9',
                        color: m.is_active ? '#065f46' : '#6b7280'
                      }}>{m.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {m.vitals?.heartrate ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Heart size={14} color={m.vitals.heartrate.once_heart_value > 100 ? '#ef4444' : '#10b981'} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{m.vitals.heartrate.once_heart_value} <span style={{ color: '#9ca3af', fontWeight: 400 }}>bpm</span></span>
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, marginLeft: 20 }}>{formatTimeShort(m.vitals.heartrate.date)}</div>
                      </div>
                    ) : <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {m.vitals?.spo2 ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Droplets size={14} color="#3b82f6" />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{m.vitals.spo2.Blood_oxygen} <span style={{ color: '#9ca3af', fontWeight: 400 }}>%</span></span>
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, marginLeft: 20 }}>{formatTimeShort(m.vitals.spo2.date)}</div>
                      </div>
                    ) : <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {m.vitals?.bloodpressure ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Activity size={14} color="#8b5cf6" />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{m.vitals.bloodpressure.sbp}/{m.vitals.bloodpressure.dbp}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, marginLeft: 20 }}>{formatTimeShort(m.vitals.bloodpressure.date)}</div>
                      </div>
                    ) : <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {m.vitals?.sleep ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Moon size={14} color="#6366f1" />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{m.vitals.sleep.duration} <span style={{ color: '#9ca3af', fontWeight: 400 }}>hrs</span></span>
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, marginLeft: 20 }}>{formatTimeShort(m.vitals.sleep.date)}</div>
                      </div>
                    ) : <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {m.vitals?.hrv_iso ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Zap size={14} color="#f59e0b" />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{m.vitals.hrv_iso.hrv} <span style={{ color: '#9ca3af', fontWeight: 400 }}>ms</span></span>
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, marginLeft: 20 }}>{formatTimeShort(m.vitals.hrv_iso.date)}</div>
                      </div>
                    ) : <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={12} />
                      {new Date(m.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => onViewVitals && onViewVitals(m.user_id, m.full_name, m.profile_image)}
                        title="View Vitals Dashboard"
                        style={{ padding: 8, borderRadius: 8, background: '#eff6ff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Eye size={14} color="#3b82f6" />
                      </button>
                      <button 
                        onClick={() => handleDeleteMember(m.id)}
                        title="Remove Member"
                        style={{ padding: 8, borderRadius: 8, background: '#fef2f2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
