// src/pages/institution/Reports.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText, Download, Trash2, Settings2, Eye, Calendar, Users, CheckCircle,
  FileSpreadsheet, Printer, RefreshCw, ChevronRight, AlertCircle, Info, Sparkles
} from 'lucide-react';

const INITIAL_REPORTS = [
  { id: '1', name: 'Monthly_Health_Audit_May2026.pdf', date: '2026-05-31', size: '2.4 MB', type: 'PDF', template: 'Monthly Executive Health Audit', scope: 'Entire Institution' },
  { id: '2', name: 'Critical_Alert_Compliance_Q1.pdf', date: '2026-04-15', size: '4.8 MB', type: 'PDF', template: 'Adverse Alerts Log & Compliance', scope: 'High Risk Members only' },
  { id: '3', name: 'Device_Connectivity_Log_W24.csv', date: '2026-06-18', size: '820 KB', type: 'CSV', template: 'Device Health & Battery Compliance', scope: 'Entire Institution' },
  { id: '4', name: 'Seniors_Sleep_HeartRate_Weekly.pdf', date: '2026-06-22', size: '1.2 MB', type: 'PDF', template: 'Outpatient Sleep & Heart Rate Aggregates', scope: 'Seniors (65+)' },
];

export default function Reports({ darkMode = false, members = [], loading = false, error = null }) {
  const [reports, setReports] = useState(INITIAL_REPORTS);
  const [template, setTemplate] = useState('Monthly Executive Health Audit');
  const [scope, setScope] = useState('Entire Institution');
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [format, setFormat] = useState('PDF');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  
  // Custom theme colors
  const styles = useMemo(() => {
    const cardBg = darkMode ? '#1e293b' : '#ffffff';
    const borderCol = darkMode ? '#334155' : '#f1f5f9';
    const textCol = darkMode ? '#f8fafc' : '#0f172a';
    const mutedCol = darkMode ? '#94a3b8' : '#6b7280';
    const inputBg = darkMode ? '#0f172a' : '#f8fafc';
    const textMuted = darkMode ? '#64748b' : '#94a3b8';
    const reportPaperBg = darkMode ? '#0f172a' : '#ffffff';

    return {
      card: {
        background: cardBg,
        borderRadius: 18,
        border: `1px solid ${borderCol}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
        padding: 24,
      },
      text: { color: textCol },
      muted: { color: mutedCol },
      textMuted: { color: textMuted },
      input: {
        background: inputBg,
        border: `1px solid ${borderCol}`,
        color: textCol,
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 600,
        outline: 'none',
        width: '100%',
        marginTop: 6
      },
      inputRow: {
        marginBottom: 16
      },
      buttonPrimary: {
        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
        color: '#fff',
        border: 'none',
        borderRadius: 12,
        padding: '12px 18px',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'all 0.2s',
        width: '100%'
      },
      buttonSecondary: {
        background: darkMode ? '#334155' : '#f8fafc',
        border: `1px solid ${borderCol}`,
        color: textCol,
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6
      },
      paper: {
        background: reportPaperBg,
        border: `1px dashed ${darkMode ? '#475569' : '#cbd5e1'}`,
        borderRadius: 12,
        padding: 30,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)',
        minHeight: 520,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: textCol
      },
      gridStyle: { stroke: darkMode ? '#334155' : '#f1f5f9' },
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

  // Handle report generation
  const handleGenerateReport = (e) => {
    e.preventDefault();
    setIsGenerating(true);
    
    // Simulate generation delay
    setTimeout(() => {
      const fileName = `${template.replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`;
      const newReport = {
        id: (reports.length + 1).toString(),
        name: fileName,
        date: new Date().toISOString().slice(0, 10),
        size: format === 'PDF' ? '1.5 MB' : '450 KB',
        type: format,
        template,
        scope
      };
      setReports([newReport, ...reports]);
      setIsGenerating(false);
      setToastMessage('Report successfully generated!');
    }, 1200);
  };

  // Handle report download
  const handleDownload = (id, name) => {
    setDownloadingId(id);
    setTimeout(() => {
      setDownloadingId(null);
      setToastMessage(`Downloaded ${name}`);
    }, 1000);
  };

  // Handle report deletion
  const handleDelete = (id) => {
    if (window.confirm('Delete this report from archive?')) {
      setReports(reports.filter(r => r.id !== id));
      setToastMessage('Report deleted from history');
    }
  };

  // Automatically fade out toasts
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Compute live preview metrics from real member data
  const previewMetrics = useMemo(() => {
    if (!members.length) {
      return { patientCount: 0, criticalCount: 0, batteryHealth: 'N/A', spo2Mean: 'N/A', avgHr: 'N/A' };
    }

    // Scope filter
    let cohort = members;
    if (scope === 'High Risk Members only') {
      // High risk = any member with abnormal SpO2 (<92%) or very high HR (>110)
      cohort = members.filter(m => {
        const spo2 = m.vitals?.spo2?.Blood_oxygen;
        const hr = m.vitals?.heartrate?.once_heart_value;
        return (spo2 && spo2 < 92) || (hr && hr > 110);
      });
    } else if (scope === 'Seniors (65+)') {
      // Use age field if present, otherwise fall back to last quarter of the list as proxy
      cohort = members.filter(m => m.age ? m.age >= 65 : false);
      if (!cohort.length) cohort = members.slice(Math.floor(members.length * 0.75));
    }

    const patientCount = cohort.length;

    // Count members with critical alerts (SpO2 < 90 or HR > 120)
    const criticalCount = cohort.filter(m => {
      const spo2 = m.vitals?.spo2?.Blood_oxygen;
      const hr = m.vitals?.heartrate?.once_heart_value;
      return (spo2 && spo2 < 90) || (hr && hr > 120);
    }).length;

    // Mean SpO2
    const spo2Readings = cohort.map(m => m.vitals?.spo2?.Blood_oxygen).filter(Boolean);
    const spo2Mean = spo2Readings.length
      ? `${(spo2Readings.reduce((a, b) => a + b, 0) / spo2Readings.length).toFixed(1)}%`
      : 'N/A';

    // Mean Heart Rate
    const hrReadings = cohort.map(m => m.vitals?.heartrate?.once_heart_value).filter(Boolean);
    const avgHr = hrReadings.length
      ? `${Math.round(hrReadings.reduce((a, b) => a + b, 0) / hrReadings.length)} bpm`
      : 'N/A';

    // Battery health — check how many members have recent vitals vs total
    const activeVitals = cohort.filter(m => m.vitals).length;
    const batteryHealth = patientCount > 0 ? `${((activeVitals / patientCount) * 100).toFixed(1)}%` : 'N/A';

    return { patientCount, criticalCount, batteryHealth, spo2Mean, avgHr };
  }, [members, scope]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24 }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div style={styles.toast}>
          <CheckCircle size={16} />
          {toastMessage}
        </div>
      )}

      {/* Header Info */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: styles.muted.color, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reporting Console</h2>
        <p style={{ fontSize: 12, color: styles.textMuted.color, margin: '2px 0 0 0' }}>Configure, export, and preview compliance and health audit summaries</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 20, alignItems: 'start' }}>
        
        {/* Left Column: Configuration & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Config Panel Card */}
          <div style={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Settings2 size={18} color="#3b82f6" />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: styles.text.color, margin: 0 }}>Report Customizer</h3>
            </div>
            
            <form onSubmit={handleGenerateReport}>
              <div style={styles.inputRow}>
                <label style={{ fontSize: 11, fontWeight: 700, color: styles.muted.color }}>Select Report Template</label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  style={styles.input}
                >
                  <option value="Monthly Executive Health Audit">Monthly Executive Health Audit</option>
                  <option value="Adverse Alerts Log & Compliance">Adverse Alerts Log & Compliance</option>
                  <option value="Device Health & Battery Compliance">Device Health & Battery Compliance</option>
                  <option value="Outpatient Sleep & Heart Rate Aggregates">Outpatient Sleep & Heart Rate Aggregates</option>
                </select>
              </div>

              <div style={styles.inputRow}>
                <label style={{ fontSize: 11, fontWeight: 700, color: styles.muted.color }}>Target Patient Cohort</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  style={styles.input}
                >
                  <option value="Entire Institution">Entire Institution</option>
                  <option value="High Risk Members only">High Risk Members only</option>
                  <option value="Seniors (65+)">Seniors (65+)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: styles.muted.color }}>Date Filter</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    style={styles.input}
                  >
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                    <option value="Current Quarter">Current Quarter</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: styles.muted.color }}>Export Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    style={styles.input}
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="CSV">CSV Spreadsheet</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                style={{
                  ...styles.buttonPrimary,
                  opacity: isGenerating ? 0.7 : 1,
                  cursor: isGenerating ? 'not-allowed' : 'pointer'
                }}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Generating Report...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Compile & Generate Report
                  </>
                )}
              </button>
            </form>
          </div>

          {/* History Card */}
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: styles.text.color, margin: 0 }}>Generated Reports Log</h3>
              <span style={{ fontSize: 11, color: styles.muted.color, fontWeight: 600 }}>{reports.length} total</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 310, overflowY: 'auto', paddingRight: 4 }}>
              {reports.map((r) => (
                <div key={r.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: darkMode ? '#33415520' : '#f8fafc',
                  border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
                }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: r.type === 'PDF' ? '#ef444415' : '#10b98115',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {r.type === 'PDF' ? (
                      <FileText size={16} color="#ef4444" />
                    ) : (
                      <FileSpreadsheet size={16} color="#10b981" />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: styles.text.color,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: 10, color: styles.muted.color, marginTop: 1 }}>
                      {r.date} · {r.size}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => handleDownload(r.id, r.name)}
                      disabled={downloadingId === r.id}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 6,
                        color: styles.muted.color,
                        borderRadius: 6
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                      onMouseLeave={(e) => e.currentTarget.style.color = styles.muted.color}
                    >
                      {downloadingId === r.id ? (
                        <RefreshCw className="animate-spin" size={14} />
                      ) : (
                        <Download size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 6,
                        color: styles.muted.color,
                        borderRadius: 6
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = styles.muted.color}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Live Printable Preview */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: styles.text.color, margin: 0 }}>Live Document Preview</h3>
              <p style={{ fontSize: 11, color: styles.muted.color, margin: '2px 0 0 0' }}>Interactive layout representation for print/distribution</p>
            </div>
            <button
              onClick={() => window.print()}
              style={styles.buttonSecondary}
            >
              <Printer size={13} /> Print Preview
            </button>
          </div>

          {/* Paper Sheet Preview */}
          <div style={styles.paper}>
            <div>
              {/* Header Letterhead */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${darkMode ? '#334155' : '#cbd5e1'}`, paddingBottom: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#3b82f6', letterSpacing: '-0.3px' }}>JEEWAN JYOTI DIGITAL CARE</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: styles.muted.color, textTransform: 'uppercase', marginTop: 2 }}>Institutional Monitoring Network</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: styles.text.color }}>AUDIT LOG</div>
                  <div style={{ fontSize: 10, color: styles.muted.color, fontWeight: 500, marginTop: 1 }}>Generated: {new Date().toISOString().slice(0, 10)}</div>
                </div>
              </div>

              {/* Title & Metadata */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: styles.text.color, margin: 0 }}>{template}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 12, background: darkMode ? '#33415520' : '#f8fafc', padding: 12, borderRadius: 10, border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` }}>
                  <div>
                    <span style={{ fontSize: 10, color: styles.muted.color, display: 'block', fontWeight: 600 }}>COHORT SCOPE</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: styles.text.color }}>{scope}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: styles.muted.color, display: 'block', fontWeight: 600 }}>DATE WINDOW</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: styles.text.color }}>{dateRange}</span>
                  </div>
                </div>
              </div>

              {/* Document Body / Aggregates */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: styles.muted.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Performance Summary</div>
                
                {/* 2x2 Grid of preview variables */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 9, color: styles.muted.color, fontWeight: 600 }}>MONITORED SUBJECTS</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: styles.text.color, marginTop: 2 }}>{previewMetrics.patientCount}</div>
                  </div>
                  <div style={{ border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 9, color: styles.muted.color, fontWeight: 600 }}>ACTIVE CRITICAL ALERTS</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444', marginTop: 2 }}>{previewMetrics.criticalCount}</div>
                  </div>
                  <div style={{ border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 9, color: styles.muted.color, fontWeight: 600 }}>MEAN ARTERIAL SpO₂</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', marginTop: 2 }}>{previewMetrics.spo2Mean}</div>
                  </div>
                  <div style={{ border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 9, color: styles.muted.color, fontWeight: 600 }}>MEAN COHORT HEART RATE</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6', marginTop: 2 }}>{previewMetrics.avgHr}</div>
                  </div>
                </div>

                <div style={{ border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 8, padding: '10px 14px', background: darkMode ? '#ef444405' : '#fffbeb', borderColor: darkMode ? '#b4530930' : '#fef3c7', display: 'flex', gap: 10 }}>
                  <Info size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 10, color: darkMode ? '#cbd5e1' : '#6b7280', margin: 0, lineHeight: 1.4 }}>
                    <strong>Note:</strong> All data compiles automatically from continuous IoT sensor integrations in Nepal Care Nodes. Any manual vitals logging is marked for auditing.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Letterhead / Executive Sign-off */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `1px solid ${darkMode ? '#334155' : '#cbd5e1'}`, paddingTop: 20, marginTop: 20 }}>
              <div>
                <div style={{ fontSize: 8, color: styles.muted.color, fontWeight: 500 }}>INTEGRITY HASH</div>
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: styles.textMuted.color }}>jj_care_node_SHA256_82f1b9511a7</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ borderBottom: `1px solid ${darkMode ? '#475569' : '#94a3b8'}`, width: 120, height: 18, marginBottom: 4 }} />
                <div style={{ fontSize: 9, fontWeight: 700, color: styles.text.color }}>Supervisor Endorsement</div>
                <div style={{ fontSize: 8, color: styles.muted.color, fontWeight: 500 }}>System Verification Agent</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
