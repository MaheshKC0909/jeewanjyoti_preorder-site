import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getBatteryStatus, getAIData, getLastSync } from '../../lib/api';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import BatteryWidget from '../../components/BatteryWidget';
import { Heart, Moon, Activity, Brain, Calendar, TrendingUp, Droplets, Eye, EyeOff, Sparkles, Target, SlidersHorizontal, X } from 'lucide-react';
import SleepDataComponent from '../../components/SleepDataComponent';
import SpO2DataComponent from '../../components/SpO2DataComponent';
import HeartRateDataComponent from '../../components/HeartRateDataComponent';
import ActivitySummary from '../../components/ActivitySummary';
import StressDataComponent from '../../components/StressDataComponent';
import HRVDataComponent from '../../components/HRVDataComponent';
import BloodPressureDataComponent from '../../components/BloodPressureDataComponent';

const InsightCard = ({ title, icon: Icon, text, darkMode, accentColor }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const intro = lines[0];
  const items = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const parts = lines[i].split('|');
      if (parts.length >= 2) {
        items.push({
          title: parts[0].trim(),
          details: parts[1].trim(),
          status: parts[2] ? parts[2].trim() : null
        });
      }
    }
  }

  const renderBadge = (status) => {
    if (!status) return null;
    const s = status.toLowerCase();
    let bg, color, border, icon;

    if (['good', 'normal', 'excellent', 'typical'].includes(s)) {
      bg     = darkMode ? 'rgba(34,197,94,0.15)'  : '#dcfce7';
      color  = darkMode ? '#4ade80'                : '#15803d';
      border = darkMode ? 'rgba(34,197,94,0.35)'  : '#86efac';
      icon   = '✓';
    } else if (['low', 'elevated', 'short', 'high'].includes(s)) {
      bg     = darkMode ? 'rgba(234,179,8,0.15)'  : '#fef9c3';
      color  = darkMode ? '#facc15'               : '#a16207';
      border = darkMode ? 'rgba(234,179,8,0.35)'  : '#fde047';
      icon   = '⚠';
    } else if (['very low', 'none', 'poor'].includes(s)) {
      bg     = darkMode ? 'rgba(239,68,68,0.15)'  : '#fee2e2';
      color  = darkMode ? '#f87171'               : '#b91c1c';
      border = darkMode ? 'rgba(239,68,68,0.35)'  : '#fca5a5';
      icon   = '✕';
    } else {
      bg     = darkMode ? 'rgba(156,163,175,0.15)' : '#f3f4f6';
      color  = darkMode ? '#9ca3af'                : '#374151';
      border = darkMode ? 'rgba(156,163,175,0.2)'  : '#e5e7eb';
      icon   = '';
    }

    return (
      <span
        style={{ background: bg, color, border: `1px solid ${border}` }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide whitespace-nowrap flex-shrink-0"
      >
        {icon && <span>{icon}</span>} {status}
      </span>
    );
  };

  const accentMap = {
    blue:   { bg: darkMode ? 'rgba(59,130,246,0.2)'  : '#dbeafe', color: darkMode ? '#60a5fa' : '#1d4ed8' },
    indigo: { bg: darkMode ? 'rgba(99,102,241,0.2)'  : '#e0e7ff', color: darkMode ? '#818cf8' : '#4338ca' },
    green:  { bg: darkMode ? 'rgba(34,197,94,0.2)'   : '#dcfce7', color: darkMode ? '#4ade80' : '#15803d' },
    orange: { bg: darkMode ? 'rgba(249,115,22,0.2)'  : '#ffedd5', color: darkMode ? '#fb923c' : '#c2410c' },
  };
  const accent = accentMap[accentColor] || accentMap.blue;

  const cardBg     = darkMode ? '#151b2d'              : '#f9fafb';
  const cardBorder = darkMode ? 'rgba(55,65,81,0.7)'  : '#e5e7eb';
  const divider    = darkMode ? 'rgba(55,65,81,0.9)'  : '#e5e7eb';
  const titleColor = darkMode ? '#f3f4f6'              : '#111827';
  const introColor = darkMode ? '#9ca3af'              : '#6b7280';
  const itemTitleColor = darkMode ? '#e5e7eb'          : '#1f2937';
  const detailColor    = darkMode ? '#6b7280'          : '#6b7280';

  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
      className="p-4 rounded-xl transition-all duration-200 flex flex-col">

      {/* Card Header */}
      <div className="flex items-center gap-2 mb-3">
        <div style={{ background: accent.bg, color: accent.color }} className="p-1.5 rounded-lg flex-shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <span style={{ color: titleColor }} className="text-sm font-bold">{title}</span>
      </div>

      {/* Intro sentence */}
      {intro && (
        <p style={{ color: introColor }} className="text-xs mb-3 leading-relaxed">
          {intro}
        </p>
      )}

      {/* Metric rows */}
      {items.length > 0 && (
        <div>
          {items.map((item, idx) => {
            const isTrend = item.title.toLowerCase() === 'trend';
            return (
              <div key={idx} style={{ borderTop: `1px solid ${divider}` }} className="py-2.5">
                {isTrend ? (
                  <p style={{ color: detailColor }} className="text-xs leading-relaxed">
                    <span style={{ color: itemTitleColor }} className="font-semibold">{item.title}: </span>
                    {item.details}
                  </p>
                ) : (
                  <div>
                    <div className="flex justify-between items-center gap-2 mb-0.5">
                      <span style={{ color: itemTitleColor }} className="text-xs font-semibold">{item.title}</span>
                      {renderBadge(item.status)}
                    </div>
                    <p style={{ color: detailColor }} className="text-xs leading-relaxed">{item.details}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const VitalsTab = ({
  darkMode,
  selectedUserId,
  selectedUserInfo
}) => {
  // Local date filter — mirrors the member dashboard home's "Today / This Week /
  // This Month / Custom Date" filter, scoped to this Vitals view only.
  const [globalDateFilter, setGlobalDateFilter] = useState('today');
  const [showGlobalFilterDropdown, setShowGlobalFilterDropdown] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [globalDateRange, setGlobalDateRange] = useState({ date: null, customRange: false, period: 'today' });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showGlobalFilterDropdown && !event.target.closest('.admin-vitals-filter-dropdown')) {
        setShowGlobalFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showGlobalFilterDropdown]);

  const formatDateForAPI = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const handleGlobalFilterChange = (filterType) => {
    setGlobalDateFilter(filterType);

    if (filterType === 'custom') {
      setShowGlobalFilterDropdown(false);
      setShowCustomDateModal(true);
      const today = new Date().toISOString().split('T')[0];
      setCustomDate(today);
      return;
    }

    setGlobalDateRange({ date: null, customRange: false, period: filterType });
    setShowGlobalFilterDropdown(false);
  };

  const handleCustomDateApply = (date) => {
    setGlobalDateRange({ date: formatDateForAPI(date), customRange: true, period: 'custom' });
    setGlobalDateFilter('custom');
  };

  const [sleepData, setSleepData] = useState(null);
  const [spo2Data, setSpO2Data] = useState(null);
  const [heartRateData, setHeartRateData] = useState(null);
  const [stepsData, setStepsData] = useState(null);
  const [bloodPressureData, setBloodPressureData] = useState(null);
  const [stressApiData, setStressApiData] = useState(null);
  const [hrvApiData, setHrvApiData] = useState(null);
  const [batteryData, setBatteryData] = useState(null);
  const [lastSyncData, setLastSyncData] = useState(null);
  const [lastSyncLoading, setLastSyncLoading] = useState(true);
  const latestBatteryReading = useMemo(() => {
    if (!batteryData) return null;
    const readings = Array.isArray(batteryData) ? batteryData : [batteryData];
    const normalized = readings.map((item) => ({
      percentage: item.percentage ?? item.battery ?? item.level ?? item.percent ?? null,
      timestamp: item.timestamp ?? item.time ?? item.date ?? item.created_at ?? item.measure_time ?? null,
      ...item,
    }));
    const valid = normalized.filter((item) => item.percentage !== null && item.percentage !== undefined);
    if (!valid.length) return null;
    return valid.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0)).at(-1);
  }, [batteryData]);

  function formatDateTime(dateString, isDateOnly = false) {
    if (!dateString) return null;
    try {
      if (typeof dateString === 'string' && dateString.length <= 10 && dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length === 3) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${months[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
        }
      }
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return isDateOnly
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return dateString;
    }
  }

  const batteryTimestampDisplay = useMemo(() => {
    if (!latestBatteryReading || !latestBatteryReading.timestamp) {
      return 'No recent battery data';
    }
    return formatDateTime(latestBatteryReading.timestamp);
  }, [latestBatteryReading]);

  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiSummaries, setShowAiSummaries] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [dataLoadingStates, setDataLoadingStates] = useState({
    heartRate: false,
    spo2: false,
    sleep: false,
    steps: false,
    bloodPressure: false,
    stress: false,
    hrv: false
  });

  const cacheRef = useRef(new Map());

  // Memoized values for quick stats
  const latestHeartRate = useMemo(() => {
    if (!heartRateData || !Array.isArray(heartRateData) || heartRateData.length === 0) return '—';
    const last = heartRateData[heartRateData.length - 1];
    const val = last?.once_heart_value ?? (last?.average_heart_rate ? Math.round(last.average_heart_rate) : undefined);
    return val ?? '—';
  }, [heartRateData]);

  const displaySleepScore = useMemo(() => {
    if (aiData && aiData.sleep_score !== undefined && aiData.sleep_score !== null) {
      return aiData.sleep_score;
    }
    return '—';
  }, [aiData]);

  const latestSpO2 = useMemo(() => {
    return spo2Data && Array.isArray(spo2Data) && spo2Data.length > 0
      ? spo2Data[spo2Data.length - 1]?.Blood_oxygen
      : '—';
  }, [spo2Data]);

  const dailySteps = useMemo(() => {
    return stepsData?.step
      ? stepsData.step.toLocaleString()
      : '—';
  }, [stepsData]);

  const handleDataLoading = (dataType, isLoading) => {
    setDataLoadingStates(prev => ({ ...prev, [dataType]: isLoading }));
  };

  useEffect(() => {
    const anyLoading = Object.values(dataLoadingStates).some(state => state === true);
    setIsLoading(anyLoading);
  }, [dataLoadingStates]);

  useEffect(() => {
    let cancelled = false;
    const fetchBattery = async () => {
      try {
        const data = await getBatteryStatus(selectedUserId || null);
        if (!cancelled) setBatteryData(data);
      } catch (err) {
        console.warn('Battery status fetch failed:', err);
        if (!cancelled) setBatteryData(null);
      }
    };
    fetchBattery();
    return () => { cancelled = true; };
  }, [selectedUserId]);

  useEffect(() => {
    let cancelled = false;
    const fetchLastSync = async () => {
      try {
        setLastSyncLoading(true);
        const data = await getLastSync(selectedUserId || null);
        if (!cancelled) setLastSyncData(data);
      } catch (err) {
        console.warn('Last sync fetch failed:', err);
        if (!cancelled) setLastSyncData(null);
      } finally {
        if (!cancelled) setLastSyncLoading(false);
      }
    };
    fetchLastSync();
    return () => { cancelled = true; };
  }, [selectedUserId]);

  const lastSyncDisplay = useMemo(() => {
    if (lastSyncLoading) return 'Loading...';
    const value = lastSyncData?.last_sync;
    if (!value) return 'No sync data';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;

    const now = new Date();
    const isSameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    if (isSameDay(d, now)) return `Today, ${time}`;
    if (isSameDay(d, yesterday)) return `Yesterday, ${time}`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [lastSyncData, lastSyncLoading]);

  const latestHeartRateTime = useMemo(() => {
    if (!heartRateData || heartRateData.length === 0) return null;
    const last = heartRateData[heartRateData.length - 1];
    return last?.measure_time || last?.created_at || last?.date || last?.day || null;
  }, [heartRateData]);

  const latestSpO2Time = useMemo(() => {
    return spo2Data && spo2Data.length > 0
      ? spo2Data[spo2Data.length - 1]?.measure_time || spo2Data[spo2Data.length - 1]?.created_at || spo2Data[spo2Data.length - 1]?.date
      : null;
  }, [spo2Data]);

  const latestSleepTime = useMemo(() => {
    return sleepData && sleepData.length > 0 ? sleepData[0]?.date : null;
  }, [sleepData]);

  const latestStepsTime = useMemo(() => {
    return stepsData?.date || null;
  }, [stepsData]);

  // Compute the latest date with available data
  const latestDataDate = useMemo(() => {
    const dates = [
      latestSleepTime,
      latestStepsTime,
      latestHeartRateTime,
      latestSpO2Time
    ].filter(Boolean).map(d => {
      if (typeof d === 'string') {
        return d.split('T')[0];
      }
      return null;
    }).filter(Boolean);

    if (dates.length > 0) {
      return dates.sort((a, b) => new Date(b) - new Date(a))[0];
    }
    return null;
  }, [latestSleepTime, latestStepsTime, latestHeartRateTime, latestSpO2Time]);

  const recommendations = useMemo(() => {
    if (!aiData) return [];
    if (Array.isArray(aiData.recommendations)) return aiData.recommendations;
    if (typeof aiData.recommendation === 'string' && aiData.recommendation.trim()) {
      return [aiData.recommendation];
    }
    return [];
  }, [aiData]);

  const hasAnySummary = useMemo(() => {
    return !!(aiData?.summary || aiData?.sleep_summary || aiData?.activity_summary);
  }, [aiData]);

  // Fetch AI data when user or date selection changes
  useEffect(() => {
    let cancelled = false;
    const fetchAIData = async () => {
      try {
        setAiLoading(true);
        let dateParam = null;
        if (globalDateRange?.customRange && globalDateRange.date) {
          const d = new Date(globalDateRange.date);
          if (!isNaN(d.getTime())) {
            dateParam = d.toISOString().split('T')[0];
          } else if (typeof globalDateRange.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(globalDateRange.date)) {
            dateParam = globalDateRange.date;
          }
        }

        const data = await getAIData(selectedUserId || null, dateParam);
        if (!cancelled) {
          setAiData(data);
        }
      } catch (err) {
        console.warn('AI data fetch failed:', err);
        if (!cancelled) setAiData(null);
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    };
    fetchAIData();
    return () => { cancelled = true; };
  }, [selectedUserId, globalDateRange]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 border rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{label}</p>
          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {payload[0].value} {payload[0].unit || ''}
          </p>
        </div>
      );
    }
    return null;
  };

  // Admin can view any user's data — show a friendly prompt instead of a
  // near-empty dashboard until a member is picked from the Members tab.
  if (!selectedUserId) {
    return (
      <div className={`rounded-xl md:rounded-2xl p-8 md:p-12 shadow-lg border text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <Activity className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className={`text-lg md:text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          No Member Selected
        </h3>
        <p className={`text-sm md:text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'} max-w-md mx-auto`}>
          Go to the Members tab and click the eye icon next to a member to view their vitals dashboard here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* User Header */}
      <div className={`rounded-2xl p-4 md:p-6 mb-3 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between w-full gap-4">

          {/* Left: Avatar + Title */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {selectedUserInfo?.profileImage ? (
              <img
                src={selectedUserInfo.profileImage}
                alt={selectedUserInfo.name}
                className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover ring-2 ring-blue-500 flex-shrink-0"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/64?text=' + (selectedUserInfo?.name?.charAt(0) || 'U');
                }}
              />
            ) : (
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl md:text-2xl font-bold ring-2 ring-blue-500 flex-shrink-0">
                {selectedUserInfo?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedUserInfo?.name}'s Fitness Dashboard
              </h2>
            </div>
          </div>

          {/* Center: Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading data...
              </span>
            </div>
          )}

          {/* Right: Filter + Online/Offline status + Battery Widget */}
          <div className="flex-shrink-0 flex items-center gap-3">
            {/* Global Period Filter */}
            <div className="relative admin-vitals-filter-dropdown">
              <button
                onClick={() => setShowGlobalFilterDropdown(v => !v)}
                title={`Filter: ${globalDateFilter === 'today' ? 'Today' : globalDateFilter === 'week' ? 'This Week' : globalDateFilter === 'month' ? 'This Month' : 'Custom Date'}`}
                className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                  showGlobalFilterDropdown || globalDateFilter !== 'today'
                    ? (darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600')
                    : (darkMode ? 'bg-gray-800 hover:bg-purple-600/20 border border-purple-500/30' : 'bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border border-purple-200')
                }`}
              >
                <SlidersHorizontal className={`w-5 h-5 transition-colors ${showGlobalFilterDropdown || globalDateFilter !== 'today' ? 'text-white' : 'text-purple-600'}`} />
              </button>

              {showGlobalFilterDropdown && (
                <div className={`absolute top-full right-0 mt-2 w-40 rounded-lg shadow-xl border z-10 ${darkMode ? 'bg-gray-800 border-purple-500/30 shadow-purple-500/20' : 'bg-white border-purple-200 shadow-purple-100'}`}>
                  <div className="py-1">
                    {[
                      { id: 'today', label: 'Today' },
                      { id: 'week', label: 'This Week' },
                      { id: 'month', label: 'This Month' },
                      { id: 'custom', label: 'Custom Date' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => handleGlobalFilterChange(opt.id)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          globalDateFilter === opt.id
                            ? (darkMode ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-50 text-purple-600')
                            : (darkMode ? 'text-gray-300 hover:bg-purple-600/10' : 'text-gray-700 hover:bg-purple-50')
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {globalDateFilter !== 'today' && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                <span>
                  {globalDateFilter === 'week' ? 'This Week' : globalDateFilter === 'month' ? 'This Month' : 'Custom'}
                </span>
              </div>
            )}

            {(() => {
              const status = selectedUserInfo?.status || 'offline';
              const statusStyles = {
                online: { dot: '#10b981', bg: darkMode ? '#064e3b' : '#d1fae5', color: darkMode ? '#6ee7b7' : '#065f46' },
                away: { dot: '#f59e0b', bg: darkMode ? '#78350f' : '#fef3c7', color: darkMode ? '#fcd34d' : '#92400e' },
                offline: { dot: '#9ca3af', bg: darkMode ? '#334155' : '#f1f5f9', color: darkMode ? '#94a3b8' : '#6b7280' },
              };
              const s = statusStyles[status] || statusStyles.offline;
              return (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                  style={{ background: s.bg, color: s.color }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: s.dot, boxShadow: status === 'online' ? `0 0 0 3px ${s.dot}33` : 'none' }}
                  />
                  {status}
                </div>
              );
            })()}

            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                <Calendar className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div className="text-right">
                <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>TODAY</p>
                <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {new Date().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>LAST SYNC</p>
              <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {lastSyncDisplay}
              </p>
            </div>

            <div className="flex flex-col items-end justify-center gap-2">
              <BatteryWidget batteryData={batteryData} size={48} darkMode={darkMode} />
              <div className={`text-right text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <div className="font-semibold">{batteryTimestampDisplay}</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-3">
        <div className="rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-red-100">Heart Rate</p>
              <p className="text-xl md:text-3xl font-bold text-white">
                {latestHeartRate} BPM
              </p>
            </div>
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Heart className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <div className="mt-2 text-xs text-red-100 flex justify-between items-center gap-2">
            <div>
              {heartRateData && heartRateData.length > 1 && (() => {
                const isMultiDay = 'day' in heartRateData[0];
                const minVal = isMultiDay
                  ? Math.min(...heartRateData.map(d => d.minimum_heart_rate))
                  : Math.min(...heartRateData.map(d => d.once_heart_value));
                const maxVal = isMultiDay
                  ? Math.max(...heartRateData.map(d => d.maximum_heart_rate))
                  : Math.max(...heartRateData.map(d => d.once_heart_value));
                return <span>Range: {minVal} – {maxVal} BPM</span>;
              })()}
            </div>
            {latestHeartRateTime && <div className="text-right whitespace-nowrap opacity-90">{formatDateTime(latestHeartRateTime)}</div>}
          </div>
        </div>

        <div className="rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-indigo-100">Sleep Score</p>
              <p className="text-xl md:text-3xl font-bold text-white">
                {displaySleepScore !== '—' ? `${displaySleepScore}/100` : '—'}
              </p>
            </div>
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Moon className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <div className="mt-2 text-xs text-indigo-100 flex justify-between items-center gap-2">
            <div>
              {sleepData && sleepData.length > 0 && (
                <span>Duration: {sleepData[0]?.duration || 0} hrs</span>
              )}
            </div>
            {latestSleepTime && <div className="text-right whitespace-nowrap opacity-90">{formatDateTime(latestSleepTime, true)}</div>}
          </div>
        </div>

        <div className="rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-green-100">Daily Steps</p>
              <p className="text-xl md:text-3xl font-bold text-white">
                {dailySteps}
              </p>
            </div>
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Activity className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <div className="mt-2 text-xs text-green-100 flex justify-between items-center gap-2">
            <div>
              {stepsData && stepsData.step && (
                <span>Goal: {stepsData.step_goal || 10000} steps</span>
              )}
              {aiData && aiData.activity_rating !== undefined && aiData.activity_rating !== null && (
                <span className="block mt-0.5 font-medium text-green-100">
                  Rating: {aiData.activity_rating}/100
                </span>
              )}
            </div>
            {latestStepsTime && <div className="text-right whitespace-nowrap opacity-90">{formatDateTime(latestStepsTime, true)}</div>}
          </div>
        </div>

        <div className="rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-blue-100">Blood Oxygen</p>
              <p className="text-xl md:text-3xl font-bold text-white">
                {latestSpO2}%
              </p>
            </div>
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Droplets className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-100 flex justify-between items-center gap-2">
            <div>
              {spo2Data && spo2Data.length > 1 && (
                <span>Range: {Math.min(...spo2Data.map(d => d.Blood_oxygen))} - {Math.max(...spo2Data.map(d => d.Blood_oxygen))}%</span>
              )}
            </div>
            {latestSpO2Time && <div className="text-right whitespace-nowrap opacity-90">{formatDateTime(latestSpO2Time)}</div>}
          </div>
        </div>
      </div>

      {/* Main Metrics Grid - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3 mb-3 items-stretch">
        <HeartRateDataComponent
          darkMode={darkMode}
          onHeartRateDataUpdate={setHeartRateData}
          onLoadingStateChange={(loading) => handleDataLoading('heartRate', loading)}
          selectedUserId={selectedUserId}
          dateRange={globalDateRange}
        />
        <SpO2DataComponent
          darkMode={darkMode}
          onSpO2DataUpdate={setSpO2Data}
          onLoadingStateChange={(loading) => handleDataLoading('spo2', loading)}
          selectedUserId={selectedUserId}
          dateRange={globalDateRange}
        />
      </div>

      {/* Main Metrics Grid - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3 mb-3">
        <SleepDataComponent
          darkMode={darkMode}
          onSleepDataUpdate={setSleepData}
          onLoadingStateChange={(loading) => handleDataLoading('sleep', loading)}
          selectedUserId={selectedUserId}
          dateRange={globalDateRange}
          aiSleepScore={aiData?.sleep_score}
        />
        <ActivitySummary
          darkMode={darkMode}
          onActivityDataUpdate={setStepsData}
          onLoadingStateChange={(loading) => handleDataLoading('steps', loading)}
          selectedUserId={selectedUserId}
          dateRange={globalDateRange}
          aiActivityRating={aiData?.activity_rating}
        />
      </div>

      {/* Main Metrics Grid - Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3 mb-3">
        <StressDataComponent
          darkMode={darkMode}
          onStressDataUpdate={setStressApiData}
          onLoadingStateChange={(loading) => handleDataLoading('stress', loading)}
          selectedUserId={selectedUserId}
          dateRange={globalDateRange}
        />
        <div className="space-y-2">
          <BloodPressureDataComponent
            darkMode={darkMode}
            onBloodPressureDataUpdate={setBloodPressureData}
            onLoadingStateChange={(loading) => handleDataLoading('bloodPressure', loading)}
            selectedUserId={selectedUserId}
            dateRange={globalDateRange}
          />
          <HRVDataComponent
            darkMode={darkMode}
            onHRVDataUpdate={setHrvApiData}
            onLoadingStateChange={(loading) => handleDataLoading('hrv', loading)}
            selectedUserId={selectedUserId}
            dateRange={globalDateRange}
          />
        </div>
      </div>

      {/* Health Summary */}
      <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-3">
              <h3 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Health Insights
              </h3>
              {hasAnySummary && (
                <button
                  onClick={() => setShowAiSummaries(!showAiSummaries)}
                  className={`p-1 rounded-lg transition-all ${
                    darkMode
                      ? 'hover:bg-gray-750 text-gray-400 hover:text-gray-200'
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                  }`}
                  title={showAiSummaries ? "Hide Detailed Summaries" : "Show Detailed Summaries"}
                >
                  {showAiSummaries ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>

            {aiLoading && (
              <div className="mb-4">
                <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} animate-pulse`}>
                  Loading AI insights...
                </p>
              </div>
            )}

            {/* Always-visible Next Best Action */}
            {recommendations.length > 0 && (
              <div className={`mb-4 p-4 rounded-xl border ${darkMode ? 'bg-gray-900/50 border-gray-700/60' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>
                    <Target className="w-4 h-4" />
                  </div>
                  <span className={`text-sm font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Next Best Action</span>
                </div>
                <div className="space-y-3">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        darkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-500 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {rec}
                      </p>
                    </div>
                  ))}
                </div>
                <p className={`text-[10px] text-center mt-4 opacity-60 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  This report is for informational purposes only and does not replace medical advice.
                </p>
              </div>
            )}

            {/* Expandable Detail Cards (eye button) */}
            {showAiSummaries && hasAnySummary && (
              <div className={`mt-2 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'} space-y-4`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  Detailed AI Analysis
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {aiData.summary && (
                    <InsightCard
                      title="Daily Insight"
                      icon={Sparkles}
                      text={aiData.summary}
                      darkMode={darkMode}
                      accentColor="blue"
                    />
                  )}
                  {aiData.activity_summary && (
                    <InsightCard
                      title="Activity Insight"
                      icon={Activity}
                      text={aiData.activity_summary}
                      darkMode={darkMode}
                      accentColor="green"
                    />
                  )}
                  {aiData.sleep_summary && (
                    <InsightCard
                      title="Sleep Insight"
                      icon={Moon}
                      text={aiData.sleep_summary}
                      darkMode={darkMode}
                      accentColor="indigo"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Data completion status & AI scores */}
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/30 px-2 py-1 rounded-lg">
                <Heart className={`w-4 h-4 ${heartRateData ? 'text-red-500' : 'text-gray-400'}`} />
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Heart Rate</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/30 px-2 py-1 rounded-lg">
                <Moon className={`w-4 h-4 ${sleepData ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Sleep</span>
                {aiData && aiData.sleep_score !== undefined && aiData.sleep_score !== null && (
                  <span className={`text-[10px] font-semibold px-1 py-0.5 rounded bg-blue-500/20 text-blue-400`}>
                    Score: {aiData.sleep_score}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/30 px-2 py-1 rounded-lg">
                <Droplets className={`w-4 h-4 ${spo2Data ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>SpO2</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/30 px-2 py-1 rounded-lg">
                <Activity className={`w-4 h-4 ${stepsData ? 'text-green-500' : 'text-gray-400'}`} />
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Activity</span>
                {aiData && aiData.activity_rating !== undefined && aiData.activity_rating !== null && (
                  <span className={`text-[10px] font-semibold px-1 py-0.5 rounded bg-green-500/20 text-green-400`}>
                    Rating: {aiData.activity_rating}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Overall Score */}
          <div className="flex items-center gap-4 ml-0 md:ml-4 flex-shrink-0">
            <div className="text-center bg-yellow-500/10 dark:bg-yellow-500/5 p-4 rounded-2xl border border-yellow-500/20">
              <div className="text-3xl md:text-4xl font-black text-yellow-500">
                {aiData && aiData.daily_health_stars !== undefined && aiData.daily_health_stars !== null
                  ? aiData.daily_health_stars
                  : '—'
                } <span className="text-lg font-normal text-gray-500">/ 5</span>
              </div>
              <div className={`text-xs md:text-sm font-semibold mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Health Score
              </div>
              <div className="flex justify-center gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const rating = aiData?.daily_health_stars ?? 0;
                  return (
                    <svg
                      key={star}
                      className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!heartRateData && !sleepData && !spo2Data && !stepsData && !isLoading && (
        <div className={`rounded-xl md:rounded-2xl p-8 md:p-12 shadow-lg border mt-3 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className={`text-lg md:text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            No Health Data Available
          </h3>
          <p className={`text-sm md:text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'} max-w-md mx-auto`}>
            There is no health data available for the selected time period. Try selecting a different date range or check back later.
          </p>
        </div>
      )}

      {/* Custom Date Modal */}
      {showCustomDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Select Custom Date
              </h3>
              <button
                onClick={() => setShowCustomDateModal(false)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Select Date
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>

              {customDate && (
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    Selected date: <strong>{customDate}</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCustomDateModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customDate) {
                    handleCustomDateApply(customDate);
                    setShowCustomDateModal(false);
                  }
                }}
                disabled={!customDate}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${customDate ? 'bg-purple-500 hover:bg-purple-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VitalsTab;
