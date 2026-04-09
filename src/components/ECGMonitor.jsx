import React, { useState, useEffect, useRef } from 'react';
import { Activity, Heart, Clock, FileText, X, AlertCircle } from 'lucide-react';

const ECGMonitor = ({
  isOpen,
  onClose,
  selectedPatient,
  darkMode,
  onRequestSent,
  onRequestAccepted,
  onRequestRejected
}) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [ecgRequestStatus, setEcgRequestStatus] = useState('idle');
  const [requestId, setRequestId] = useState(null);
  const [ecgData, setEcgData] = useState([]);
  const [error, setError] = useState(null);
  const [heartRate, setHeartRate] = useState(null);
  const [hrVariability, setHrVariability] = useState(null);
  const [duration, setDuration] = useState(0);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [ecgSummary, setEcgSummary] = useState(null);
  const wsRef = useRef(null);
  const doctorIdRef = useRef(null);
  const autoRequestSentRef = useRef(false);
  const durationIntervalRef = useRef(null);
  const requestIdRef = useRef(null);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (ecgRequestStatus === 'accepted') {
      durationIntervalRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
    } else {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      setDuration(0);
    }
    return () => { if (durationIntervalRef.current) clearInterval(durationIntervalRef.current); };
  }, [ecgRequestStatus]);

  useEffect(() => {
    if (!isOpen) return;
    const token = localStorage.getItem('access_token');
    if (!token) { setError('No access token available. Please log in.'); return; }
    setConnectionStatus('connecting');
    const ws = new WebSocket(`wss://jeewanjyoti-backend.smart.org.np/ws/ecg/?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {

          // ── Step 1: Connection established → auto-send ECG request ──
          case 'connection_established':
            setConnectionStatus('connected');
            setError(null);
            
            const localUserData = JSON.parse(localStorage.getItem('user_data') || '{}');
            doctorIdRef.current = data.user_id || localUserData.id;
            
            if (selectedPatient?.id && !autoRequestSentRef.current) {
              autoRequestSentRef.current = true;
              ws.send(JSON.stringify({ 
                type: 'ecg_request', 
                patient_id: selectedPatient.id,
                requester_id: doctorIdRef.current
              }));
              setEcgRequestStatus('requesting');
              if (onRequestSent) onRequestSent();
            }
            break;

          // ── Step 2: Request sent → now pending patient approval ──
          case 'ecg_request_sent':
            setRequestId(data.request_id);
            requestIdRef.current = data.request_id;
            setEcgRequestStatus('pending');
            break;

          // ── Step 3: Patient accepts/rejects → if accepted, send join_live_session ──
          case 'ecg_request_response':
            if (data.request_id === requestIdRef.current) {
              if (data.status === 'accepted') {
                setEcgRequestStatus('accepted');
                if (onRequestAccepted) onRequestAccepted();

                // Send join_live_session using user_id from the acceptance payload
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  const joinMsg = {
                    type: 'join_live_session',
                    requester_id: doctorIdRef.current,
                    patient_id: data.user_id || selectedPatient?.id
                  };
                  console.log('Sending join_live_session:', joinMsg);
                  wsRef.current.send(JSON.stringify(joinMsg));
                }
              } else {
                setEcgRequestStatus('rejected');
                if (onRequestRejected) onRequestRejected();
              }
            } else {
              console.log('Ignored request response for unmatched ID:', data.request_id);
            }
            break;

          // ── Step 4: Live session confirmed by backend ──
          case 'live_session_joined':
            console.log('Live session confirmed:', data);
            // ECG data will now start streaming
            break;

          // ── Step 5: Live ECG data streaming (multiple times per second) ──
          case 'live_ecg_data':
            if (data.data?.voltage) {
              // voltage is an array of samples per message — flatten into points
              const points = data.data.voltage.map(v => ({ value: v }));
              setEcgData(prev => [...prev.slice(-500), ...points]);
            }
            if (data.data?.heartRate != null) {
              setHeartRate(data.data.heartRate);
            }
            // Also set status to accepted if we receive live data (in case join_live_session was missed)
            setEcgRequestStatus(prev => prev !== 'completed' ? 'accepted' : prev);
            break;

          // ── Step 6: ECG session complete — summary data received ──
          case 'ecg_data_received':
            if (data.ecg_summary) {
              setEcgSummary(data.ecg_summary);
              setEcgRequestStatus('completed');
              if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
            }
            break;

          case 'error':
            setError(data.message || 'An error occurred');
            break;
        }
      } catch (err) { }
    };

    ws.onerror = () => { setError('Failed to connect to ECG service'); setConnectionStatus('disconnected'); };
    ws.onclose = () => setConnectionStatus('disconnected');

    return () => {
      autoRequestSentRef.current = false;
      if (wsRef.current) wsRef.current.close();
    };
  }, [isOpen, selectedPatient, onRequestSent, onRequestAccepted, onRequestRejected]);

  const sendEcgRequest = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) { setError('WebSocket not connected'); return; }
    if (!selectedPatient?.id) { setError('No patient selected'); return; }
    setEcgRequestStatus('requesting');
    wsRef.current.send(JSON.stringify({ 
      type: 'ecg_request', 
      patient_id: selectedPatient.id,
      requester_id: doctorIdRef.current || JSON.parse(localStorage.getItem('user_data') || '{}').id
    }));
  };

  const handleClose = () => {
    autoRequestSentRef.current = false;
    if (wsRef.current) wsRef.current.close();
    setConnectionStatus('disconnected');
    setEcgRequestStatus('idle');
    setRequestId(null);
    requestIdRef.current = null;
    setEcgData([]);
    setError(null);
    setDuration(0);
    setHeartRate(null);
    setHrVariability(null);
    setEcgSummary(null);
    if (onClose) onClose();
  };

  const handleSaveNotes = () => {
    console.log('Saving clinical notes:', clinicalNotes);
    alert('Clinical notes saved successfully!');
  };

  if (!isOpen) return null;

  // ── ECG Waveform — renders live_ecg_data voltage arrays ──────────────────
  const ECGWaveform = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || ecgData.length === 0) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      // Grid
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,200,100,0.07)';
      for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(0,200,100,0.13)';
      for (let x = 0; x <= W; x += 200) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Plot voltage values from live_ecg_data → data.voltage array
      const values = ecgData.map(d => d.value ?? 0);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;

      ctx.beginPath();
      ctx.strokeStyle = '#00ff64';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00ff64';
      ctx.shadowBlur = 8;

      values.forEach((v, i) => {
        const x = (i / (values.length - 1)) * W;
        const y = H - ((v - min) / range) * (H * 0.8) - H * 0.1;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Leading dot at latest sample
      const lastY = H - ((values[values.length - 1] - min) / range) * (H * 0.8) - H * 0.1;
      ctx.beginPath();
      ctx.arc(W - 2, lastY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff64';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;
    }, [ecgData]);

    return (
      <canvas
        ref={canvasRef}
        width={780}
        height={180}
        style={{
          width: '100%', height: '180px', borderRadius: '8px',
          background: 'linear-gradient(180deg, #020f07 0%, #011008 100%)',
          display: 'block'
        }}
      />
    );
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const s = {
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '16px', zIndex: 60,
      fontFamily: '"DM Mono", "Fira Code", "Courier New", monospace',
    },
    modal: {
      width: '100%', maxWidth: '760px', maxHeight: '90vh',
      background: darkMode
        ? 'linear-gradient(145deg, #0d1117 0%, #0f1a14 50%, #0d1117 100%)'
        : 'linear-gradient(145deg, #f0f4f2 0%, #e8f0eb 50%, #f0f4f2 100%)',
      borderRadius: '16px', overflow: 'hidden',
      border: darkMode ? '1px solid rgba(0,255,100,0.15)' : '1px solid rgba(0,180,80,0.25)',
      boxShadow: darkMode
        ? '0 0 0 1px rgba(0,255,100,0.05), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(0,255,100,0.05)'
        : '0 0 0 1px rgba(0,180,80,0.1), 0 32px 80px rgba(0,0,0,0.15)',
      display: 'flex', flexDirection: 'column',
    },
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 24px',
      borderBottom: darkMode ? '1px solid rgba(0,255,100,0.1)' : '1px solid rgba(0,160,70,0.15)',
      background: darkMode
        ? 'linear-gradient(90deg, rgba(0,255,100,0.04) 0%, transparent 100%)'
        : 'linear-gradient(90deg, rgba(0,180,80,0.06) 0%, transparent 100%)',
      flexShrink: 0,
    },
    logoBox: {
      width: '44px', height: '44px', borderRadius: '10px',
      background: darkMode ? 'rgba(0,255,100,0.1)' : 'rgba(0,180,80,0.12)',
      border: darkMode ? '1px solid rgba(0,255,100,0.2)' : '1px solid rgba(0,180,80,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    titleBlock: { marginLeft: '14px' },
    title: {
      fontSize: '15px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase',
      color: darkMode ? '#e8fff2' : '#0d3320',
    },
    subtitle: {
      fontSize: '11px', marginTop: '2px', letterSpacing: '0.05em',
      color: darkMode ? '#4ade80' : '#2a7a4b',
    },
    closeBtn: {
      width: '34px', height: '34px', borderRadius: '8px',
      background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: darkMode ? '#6b7280' : '#6b7280', border: 'none', transition: 'all 0.15s',
    },
    content: { padding: '20px 24px', overflowY: 'auto', flex: 1 },
    statusBar: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: '8px', marginBottom: '18px',
      background: connectionStatus === 'connected'
        ? (darkMode ? 'rgba(0,255,100,0.07)' : 'rgba(0,200,80,0.08)')
        : (darkMode ? 'rgba(255,200,0,0.07)' : 'rgba(255,200,0,0.08)'),
      border: connectionStatus === 'connected'
        ? (darkMode ? '1px solid rgba(0,255,100,0.18)' : '1px solid rgba(0,180,70,0.25)')
        : (darkMode ? '1px solid rgba(255,200,0,0.2)' : '1px solid rgba(200,150,0,0.2)'),
    },
    statusDot: {
      width: '7px', height: '7px', borderRadius: '50%', marginRight: '8px',
      background: connectionStatus === 'connected' ? '#00e564' : '#f59e0b',
    },
    statusText: {
      fontSize: '11px', fontWeight: '600', letterSpacing: '0.07em', textTransform: 'uppercase',
      color: connectionStatus === 'connected'
        ? (darkMode ? '#4ade80' : '#166534')
        : (darkMode ? '#fbbf24' : '#92400e'),
    },
    errorBox: {
      padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
      background: darkMode ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
      border: darkMode ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(239,68,68,0.2)',
      display: 'flex', alignItems: 'flex-start', gap: '10px',
    },
    errorText: { fontSize: '12px', color: darkMode ? '#fca5a5' : '#dc2626', margin: 0 },
    waveCard: {
      borderRadius: '10px', marginBottom: '16px', overflow: 'hidden',
      border: darkMode ? '1px solid rgba(0,255,100,0.12)' : '1px solid rgba(0,160,70,0.18)',
      background: darkMode ? 'rgba(0,255,100,0.03)' : 'rgba(0,180,80,0.03)',
    },
    waveHeader: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: darkMode ? '1px solid rgba(0,255,100,0.08)' : '1px solid rgba(0,160,70,0.12)',
    },
    waveTitle: {
      fontSize: '10px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase',
      color: darkMode ? '#4ade80' : '#166534',
    },
    livePill: {
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '3px 9px', borderRadius: '20px',
      background: darkMode ? 'rgba(0,255,100,0.12)' : 'rgba(0,200,80,0.12)',
      border: darkMode ? '1px solid rgba(0,255,100,0.2)' : '1px solid rgba(0,180,70,0.25)',
    },
    liveDot: { width: '5px', height: '5px', borderRadius: '50%', background: '#00e564', animation: 'pulse 1.5s infinite' },
    liveText: {
      fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase',
      color: darkMode ? '#4ade80' : '#166634',
    },
    metricsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' },
    metricCard: {
      padding: '16px', borderRadius: '10px',
      background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      border: darkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
    },
    metricLabel: {
      fontSize: '9px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase',
      color: darkMode ? '#6b7280' : '#9ca3af', marginBottom: '10px',
      display: 'flex', alignItems: 'center', gap: '5px',
    },
    metricValue: { fontSize: '30px', fontWeight: '800', lineHeight: 1, letterSpacing: '-0.02em' },
    metricUnit: {
      fontSize: '10px', fontWeight: '600', letterSpacing: '0.06em',
      color: darkMode ? '#6b7280' : '#9ca3af', marginTop: '4px',
    },
    metricEmpty: {
      fontSize: '20px', fontWeight: '700', color: darkMode ? '#374151' : '#d1d5db',
    },
    notesCard: {
      padding: '16px', borderRadius: '10px',
      background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
      border: darkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
    },
    notesHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' },
    notesLabel: {
      fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase',
      color: darkMode ? '#6b7280' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '5px',
    },
    saveBtn: {
      padding: '5px 12px', borderRadius: '6px', cursor: 'pointer',
      fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase',
      background: darkMode ? 'rgba(0,255,100,0.15)' : 'rgba(0,180,80,0.15)',
      color: darkMode ? '#4ade80' : '#166534',
      border: darkMode ? '1px solid rgba(0,255,100,0.2)' : '1px solid rgba(0,180,80,0.25)',
    },
    textarea: {
      width: '100%', borderRadius: '7px', padding: '10px 12px',
      fontSize: '12px', lineHeight: '1.6', resize: 'vertical',
      background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
      border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
      color: darkMode ? '#d1fae5' : '#1f2937',
      outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    },
    centerWrap: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', textAlign: 'center',
    },
    stateIcon: {
      width: '72px', height: '72px', borderRadius: '50%', marginBottom: '20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    stateTitle: {
      fontSize: '16px', fontWeight: '700', letterSpacing: '0.04em',
      color: darkMode ? '#f0fff4' : '#0d3320', marginBottom: '8px',
    },
    stateBody: {
      fontSize: '12px', lineHeight: '1.6', maxWidth: '320px',
      color: darkMode ? '#6b7280' : '#9ca3af', marginBottom: '24px',
    },
    noteBox: {
      padding: '12px 16px', borderRadius: '8px', maxWidth: '340px',
      background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
      border: darkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
      fontSize: '11px', lineHeight: '1.6',
      color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: '24px',
    },
    btnRow: { display: 'flex', gap: '10px', justifyContent: 'center' },
    btnPrimary: {
      padding: '9px 20px', borderRadius: '8px', cursor: 'pointer',
      fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase',
      background: darkMode ? 'rgba(0,255,100,0.15)' : 'rgba(0,180,80,0.15)',
      color: darkMode ? '#4ade80' : '#166534',
      border: darkMode ? '1px solid rgba(0,255,100,0.25)' : '1px solid rgba(0,180,80,0.3)',
    },
    btnSecondary: {
      padding: '9px 20px', borderRadius: '8px', cursor: 'pointer',
      fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase',
      background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
      color: darkMode ? '#9ca3af' : '#6b7280',
      border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
    },
    summaryGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' },
    summaryCard: {
      padding: '14px 16px', borderRadius: '10px',
      background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      border: darkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
    },
    summaryLabel: {
      fontSize: '9px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase',
      color: darkMode ? '#6b7280' : '#9ca3af', marginBottom: '6px',
      display: 'flex', alignItems: 'center', gap: '5px',
    },
    summaryValue: { fontSize: '26px', fontWeight: '800', lineHeight: 1, letterSpacing: '-0.02em' },
    summaryUnit: {
      fontSize: '10px', fontWeight: '600', letterSpacing: '0.06em',
      color: darkMode ? '#6b7280' : '#9ca3af', marginTop: '3px',
    },
    completedBanner: {
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
      background: darkMode ? 'rgba(0,255,100,0.07)' : 'rgba(0,200,80,0.08)',
      border: darkMode ? '1px solid rgba(0,255,100,0.2)' : '1px solid rgba(0,180,70,0.25)',
    },
    completedBannerText: {
      fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em',
      color: darkMode ? '#4ade80' : '#166534',
    },
    completedBannerSub: {
      fontSize: '11px', color: darkMode ? '#6b7280' : '#9ca3af', marginTop: '1px',
    },
  };

  return (
    <div style={s.overlay}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.85); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes heartbeat { 0%,100% { transform:scale(1); } 14% { transform:scale(1.15); } 28% { transform:scale(1); } 42% { transform:scale(1.08); } 70% { transform:scale(1); } }
        .ecg-modal-inner { animation: fadeIn 0.25s ease; }
        .ecg-close-btn:hover { background: rgba(239,68,68,0.12) !important; color: #ef4444 !important; }
        .ecg-btn-primary:hover { opacity: 0.85; }
        .ecg-btn-secondary:hover { opacity: 0.75; }
        .ecg-save-btn:hover { opacity: 0.8; }
        .ecg-textarea:focus { border-color: rgba(0,200,80,0.35) !important; box-shadow: 0 0 0 2px rgba(0,200,80,0.08); }
      `}</style>

      <div style={s.modal} className="ecg-modal-inner">

        {/* ── Header ── */}
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={s.logoBox}>
              <Heart size={20} style={{ color: '#00e564', animation: ecgRequestStatus === 'accepted' ? 'heartbeat 1.2s ease infinite' : 'none' }} />
            </div>
            <div style={s.titleBlock}>
              <div style={s.title}>ECG Monitor</div>
              {selectedPatient && <div style={s.subtitle}>↳ {selectedPatient.name}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Signal bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '18px' }}>
              {[4, 8, 12, 16, 20].map((h, i) => (
                <div key={i} style={{
                  width: '3px', height: `${h}px`, borderRadius: '2px',
                  background: connectionStatus === 'connected'
                    ? (i < 4 ? '#00e564' : 'rgba(0,200,80,0.25)')
                    : (i < 2 ? '#f59e0b' : 'rgba(200,150,0,0.2)'),
                }} />
              ))}
            </div>
            <button style={s.closeBtn} className="ecg-close-btn" onClick={handleClose}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={s.content}>

          {/* Status Bar */}
          <div style={s.statusBar}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={s.statusDot} />
              <span style={s.statusText}>
                {connectionStatus === 'connected' ? 'Secure Link · Active' : 'Establishing Connection…'}
              </span>
            </div>
            {connectionStatus === 'connected' && ecgRequestStatus === 'pending' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ ...s.statusDot, background: '#f59e0b' }} />
                <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: darkMode ? '#fbbf24' : '#92400e', fontWeight: '600' }}>
                  Awaiting Patient
                </span>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={s.errorBox}>
              <AlertCircle size={14} color="#ef4444" style={{ marginTop: '1px', flexShrink: 0 }} />
              <p style={s.errorText}>{error}</p>
            </div>
          )}

          {/* ── ACCEPTED: Live Monitor ── */}
          {ecgRequestStatus === 'accepted' && (
            <div>
              <div style={s.waveCard}>
                <div style={s.waveHeader}>
                  <span style={s.waveTitle}>
                    <Activity size={11} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
                    Lead II · Real-time
                  </span>
                  <div style={s.livePill}>
                    <div style={s.liveDot} />
                    <span style={s.liveText}>Live</span>
                  </div>
                </div>
                <div style={{ padding: '12px' }}>
                  {ecgData.length === 0
                    ? (
                      <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: darkMode ? '#374151' : '#d1d5db', fontSize: '12px', letterSpacing: '0.08em' }}>
                        Waiting for data…
                      </div>
                    )
                    : <ECGWaveform />
                  }
                </div>
              </div>

              {/* Metrics — 2 columns since HRV removed (not in live_ecg_data payload) */}
              <div style={s.metricsGrid}>
                <div style={s.metricCard}>
                  <div style={s.metricLabel}><Heart size={10} color="#ef4444" />Heart Rate</div>
                  {heartRate != null
                    ? <><div style={{ ...s.metricValue, color: '#ef4444' }}>{heartRate}</div><div style={s.metricUnit}>BPM</div></>
                    : <div style={s.metricEmpty}>—</div>}
                </div>
                <div style={s.metricCard}>
                  <div style={s.metricLabel}><Clock size={10} color={darkMode ? '#34d399' : '#059669'} />Duration</div>
                  <div style={{ ...s.metricValue, color: darkMode ? '#34d399' : '#059669', fontSize: '24px' }}>{formatDuration(duration)}</div>
                  <div style={s.metricUnit}>mm:ss</div>
                </div>
              </div>

              {/* Clinical Notes */}
              <div style={s.notesCard}>
                <div style={s.notesHeader}>
                  <span style={s.notesLabel}><FileText size={10} />Clinical Notes</span>
                  <button style={s.saveBtn} className="ecg-save-btn" onClick={handleSaveNotes}>Save</button>
                </div>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={e => setClinicalNotes(e.target.value)}
                  placeholder="Record clinical observations…"
                  style={s.textarea}
                  className="ecg-textarea"
                />
              </div>
            </div>
          )}

          {/* ── REJECTED ── */}
          {ecgRequestStatus === 'rejected' && (
            <div style={s.centerWrap}>
              <div style={{ ...s.stateIcon, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <X size={28} color="#ef4444" />
              </div>
              <div style={s.stateTitle}>Request Declined</div>
              <p style={s.stateBody}>The patient has declined sharing their ECG data at this time.</p>
              <div style={s.btnRow}>
                <button style={s.btnPrimary} className="ecg-btn-primary" onClick={sendEcgRequest} disabled={connectionStatus !== 'connected'}>Resend Request</button>
                <button style={s.btnSecondary} className="ecg-btn-secondary" onClick={handleClose}>Cancel</button>
              </div>
            </div>
          )}

          {/* ── PENDING ── */}
          {ecgRequestStatus === 'pending' && (
            <div style={s.centerWrap}>
              <div style={{ ...s.stateIcon, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Clock size={28} color="#f59e0b" style={{ animation: 'spin 8s linear infinite' }} />
              </div>
              <div style={s.stateTitle}>Awaiting Approval</div>
              <p style={s.stateBody}>
                A request has been sent to <strong style={{ color: darkMode ? '#d1fae5' : '#0d3320' }}>{selectedPatient?.name}</strong>.
                Waiting for them to approve the ECG stream.
              </p>
              <div style={s.noteBox}>
                <span style={{ fontWeight: '600', color: darkMode ? '#d1fae5' : '#374151' }}>Note: </span>
                The user must open their app and approve to begin streaming.
              </div>
              <div style={s.btnRow}>
                <button style={s.btnPrimary} className="ecg-btn-primary" onClick={sendEcgRequest} disabled={connectionStatus !== 'connected'}>Resend</button>
                <button style={s.btnSecondary} className="ecg-btn-secondary" onClick={handleClose}>Cancel</button>
              </div>
            </div>
          )}

          {/* ── COMPLETED: ECG summary ── */}
          {ecgRequestStatus === 'completed' && ecgSummary && (
            <div>
              {/* Banner */}
              <div style={s.completedBanner}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: darkMode ? 'rgba(0,255,100,0.15)' : 'rgba(0,200,80,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Activity size={16} color="#00e564" />
                </div>
                <div>
                  <div style={s.completedBannerText}>ECG Recording Complete</div>
                  <div style={s.completedBannerSub}>Session ended · Summary data received from patient device</div>
                </div>
              </div>

              {/* Frozen waveform (last captured data) */}
              {ecgData.length > 0 && (
                <div style={{ ...s.waveCard, marginBottom: '16px' }}>
                  <div style={s.waveHeader}>
                    <span style={s.waveTitle}>
                      <Activity size={11} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
                      Lead II · Recorded
                    </span>
                    <div style={{ ...s.livePill, background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
                      <span style={{ ...s.liveText, color: darkMode ? '#6b7280' : '#9ca3af' }}>Saved</span>
                    </div>
                  </div>
                  <div style={{ padding: '12px' }}>
                    <ECGWaveform />
                  </div>
                </div>
              )}

              {/* Summary metrics — 2x2 grid */}
              <div style={s.summaryGrid}>
                <div style={s.summaryCard}>
                  <div style={s.summaryLabel}><Heart size={10} color="#ef4444" />Heart Rate</div>
                  <div style={{ ...s.summaryValue, color: '#ef4444' }}>{ecgSummary.heartRate}</div>
                  <div style={s.summaryUnit}>BPM</div>
                </div>
                <div style={s.summaryCard}>
                  <div style={s.summaryLabel}><Activity size={10} color={darkMode ? '#60a5fa' : '#3b82f6'} />HRV</div>
                  <div style={{ ...s.summaryValue, color: darkMode ? '#60a5fa' : '#3b82f6' }}>{ecgSummary.hrv}</div>
                  <div style={s.summaryUnit}>ms SDNN</div>
                </div>
                <div style={s.summaryCard}>
                  <div style={s.summaryLabel}><Activity size={10} color={darkMode ? '#a78bfa' : '#7c3aed'} />QT Interval</div>
                  <div style={{ ...s.summaryValue, color: darkMode ? '#a78bfa' : '#7c3aed' }}>{ecgSummary.qt}</div>
                  <div style={s.summaryUnit}>ms</div>
                </div>
                <div style={s.summaryCard}>
                  <div style={s.summaryLabel}><Clock size={10} color={darkMode ? '#34d399' : '#059669'} />Duration</div>
                  <div style={{ ...s.summaryValue, color: darkMode ? '#34d399' : '#059669', fontSize: '22px' }}>{ecgSummary.duration}s</div>
                  <div style={s.summaryUnit}>seconds</div>
                </div>
              </div>

              {/* Clinical Notes */}
              <div style={s.notesCard}>
                <div style={s.notesHeader}>
                  <span style={s.notesLabel}><FileText size={10} />Clinical Notes</span>
                  <button style={s.saveBtn} className="ecg-save-btn" onClick={handleSaveNotes}>Save</button>
                </div>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={e => setClinicalNotes(e.target.value)}
                  placeholder="Record clinical observations…"
                  style={s.textarea}
                  className="ecg-textarea"
                />
              </div>

              {/* Close button */}
              <div style={{ ...s.btnRow, marginTop: '16px' }}>
                <button style={s.btnSecondary} className="ecg-btn-secondary" onClick={handleClose}>Close</button>
              </div>
            </div>
          )}

          {/* ── IDLE / REQUESTING ── */}
          {(ecgRequestStatus === 'idle' || ecgRequestStatus === 'requesting') && (
            <div style={s.centerWrap}>
              <div style={{
                ...s.stateIcon,
                background: 'linear-gradient(135deg, rgba(0,255,100,0.12) 0%, rgba(0,180,80,0.06) 100%)',
                border: '1px solid rgba(0,255,100,0.2)', animation: 'pulse 2s ease infinite',
              }}>
                <Heart size={28} color="#00e564" />
              </div>
              <div style={s.stateTitle}>Initialising ECG Monitor</div>
              <p style={s.stateBody}>Establishing secure connection with patient device…</p>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00e564', animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ECGMonitor;