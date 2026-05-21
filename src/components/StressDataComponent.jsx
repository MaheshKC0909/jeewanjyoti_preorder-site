import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  ComposedChart, Line, Scatter, ReferenceArea, ReferenceLine, Customized
} from 'recharts';
import { Brain, TrendingUp, AlertCircle, RefreshCw, Activity, Clock, Calendar, Eye, EyeOff, CheckCircle2, AlertTriangle, Flame } from 'lucide-react';
import { getStressData } from '../lib/api';
import DataModal from './ui/Modal';
import DayDrillDownBanner from './vitals/DayDrillDownBanner';
import { useVitalDayDrillDown } from '../hooks/useVitalDayDrillDown';
import { isDayDrillDown } from '../utils/vitalDateRange';

function isDailyStressRow(row) {
  return row && typeof row.day === 'string' && typeof row.average_stress === 'number';
}

function parseDayISO(dayStr) {
  if (!dayStr || typeof dayStr !== 'string') return null;
  const match = dayStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Date(dayStr);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

const DAILY_CHART_HEIGHT = 208;
const LIVE_CHART_HEIGHT = 200;

function stressTier(avg) {
  if (avg < 30) {
    return { primary: '#10b981', glow: '#34d399', bandTop: '#6ee7b7', bandBottom: '#059669', label: 'Low' };
  }
  if (avg < 60) {
    return { primary: '#f59e0b', glow: '#fbbf24', bandTop: '#fde68a', bandBottom: '#d97706', label: 'Moderate' };
  }
  return { primary: '#ef4444', glow: '#f87171', bandTop: '#fecaca', bandBottom: '#dc2626', label: 'High' };
}

/** Soft vertical ribbons (wider than SpO2 capsules) with a calm-pulse mark at daily avg */
function StressRibbonLayer({ data, chartId, darkMode, onDayClick }) {
  return function Render(props) {
    const { xAxisMap, yAxisMap, offset } = props;
    if (!xAxisMap || !yAxisMap || !data?.length) return null;

    const xAxis = Object.values(xAxisMap)[0];
    const yAxis = Object.values(yAxisMap)[0];
    const xScale = xAxis.scale;
    const yScale = yAxis.scale;
    const bandwidth = typeof xScale.bandwidth === 'function' ? xScale.bandwidth() : 28;
    const left = offset?.left ?? 0;
    const top = offset?.top ?? 0;

    return (
      <g className="stress-ribbons">
        {data.map((d, i) => {
          const cx = (xScale(d.label) ?? 0) + bandwidth / 2 + left;
          const yTop = yScale(d.max) + top;
          const yBottom = yScale(d.min) + top;
          const h = Math.max(8, yBottom - yTop);
          const w = Math.min(26, Math.max(12, bandwidth * 0.62));
          const yAvg = yScale(d.avg) + top;
          const tier = stressTier(d.avg);

          return (
            <g key={d.day || i}>
              <ellipse cx={cx} cy={yTop} rx={w / 2} ry={3} fill={tier.bandTop} opacity={0.55} />
              <ellipse cx={cx} cy={yBottom} rx={w / 2} ry={3} fill={tier.bandBottom} opacity={0.55} />
              <rect
                x={cx - w / 2}
                y={yTop}
                width={w}
                height={h}
                rx={w * 0.35}
                fill={`url(#${chartId}-ribbon-${i})`}
                opacity={darkMode ? 0.88 : 0.82}
                style={{ cursor: onDayClick ? 'pointer' : undefined }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDayClick?.(d.day);
                }}
              />
              <line
                x1={cx - w / 2 + 2}
                y1={yAvg}
                x2={cx + w / 2 - 2}
                y2={yAvg}
                stroke={tier.primary}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.9}
              />
            </g>
          );
        })}
      </g>
    );
  };
}

function StressCalmPulseDot({ cx, cy, payload, darkMode, showValue }) {
  if (cx == null || cy == null || !payload) return null;
  const tier = stressTier(payload.avg);
  return (
    <g>
      <circle cx={cx} cy={cy} r={22} fill="none" stroke={tier.glow} strokeWidth={1.5} opacity={darkMode ? 0.35 : 0.45} />
      <circle cx={cx} cy={cy} r={14} fill={tier.glow} opacity={darkMode ? 0.22 : 0.3} />
      <circle cx={cx} cy={cy} r={9} fill={tier.primary} stroke={darkMode ? '#0f172a' : '#fff'} strokeWidth={2.5} />
      <circle cx={cx - 2.5} cy={cy - 2.5} r={2.5} fill="#fff" opacity={0.5} />
      {showValue && (
        <text x={cx} y={cy - 18} textAnchor="middle" fontSize={10} fontWeight={700} fill={darkMode ? '#e9d5ff' : '#4c1d95'}>
          {payload.avg}
        </text>
      )}
    </g>
  );
}

function StressDailyRangeChart({ processedDailyData, darkMode, onDayClick, height = DAILY_CHART_HEIGHT, chartId = 'stress' }) {
  const showDayLabels = processedDailyData.length <= 12;
  const stressYDomain = useMemo(() => {
    if (!processedDailyData.length) return [0, 100];
    const allVals = processedDailyData.flatMap((d) => [d.min, d.max, d.avg]);
    const lo = Math.min(...allVals);
    const hi = Math.max(...allVals);
    return [Math.max(0, Math.floor(lo / 10) * 10 - 5), Math.min(100, Math.ceil(hi / 10) * 10 + 5)];
  }, [processedDailyData]);

  const DailyTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const tier = stressTier(d.avg);
    return (
      <div
        className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md min-w-[168px] ${darkMode ? 'bg-slate-900/90 border-purple-500/20' : 'bg-white/95 border-purple-200'}`}
      >
        <p className={`text-sm font-semibold mb-3 ${darkMode ? 'text-purple-100' : 'text-slate-800'}`}>{d.label}</p>
        <p className="text-xs text-gray-500 mb-1">Average</p>
        <p className="text-lg font-bold tabular-nums" style={{ color: tier.primary }}>{d.avg}</p>
        <div className="flex justify-between gap-4 mt-2 text-xs">
          <span>Min: <strong>{d.min}</strong></span>
          <span>Max: <strong>{d.max}</strong></span>
        </div>
        <p className={`text-[10px] mt-2 pt-2 border-t ${darkMode ? 'border-slate-700 text-slate-500' : 'border-purple-50 text-slate-400'}`}>
          {tier.label} stress
        </p>
        {onDayClick && (
          <p className={`text-[10px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Click to view that day&apos;s readings
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border ${darkMode ? 'border-violet-500/15 bg-gradient-to-b from-slate-900/60 via-violet-950/20 to-transparent' : 'border-violet-200/80 bg-gradient-to-b from-violet-50/95 via-fuchsia-50/25 to-white'}`}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart 
          data={processedDailyData} 
          margin={{ top: 28, right: 12, left: 0, bottom: 8 }}
          onClick={(data) => {
            if (onDayClick && data?.activePayload?.length) {
              const payload = data.activePayload[0].payload;
              if (payload.day) onDayClick(payload.day);
            }
          }}
          style={{ cursor: onDayClick ? 'pointer' : 'default' }}
        >
          <defs>
            <linearGradient id={`${chartId}AvgLine`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e879f9" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id={`${chartId}AvgGlow`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d946ef" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${chartId}MinTrail`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0.85} />
            </linearGradient>
            <linearGradient id={`${chartId}MaxTrail`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fcd34d" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.9} />
            </linearGradient>
            {processedDailyData.map((d, i) => {
              const tier = stressTier(d.avg);
              return (
                <linearGradient key={i} id={`${chartId}-ribbon-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tier.bandTop} stopOpacity={0.55} />
                  <stop offset="45%" stopColor={tier.primary} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={tier.bandBottom} stopOpacity={0.7} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="4 6" stroke={darkMode ? 'rgba(148,163,184,0.12)' : 'rgba(168,85,247,0.1)'} vertical={false} />
          <XAxis
            dataKey="label"
            stroke="transparent"
            tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            interval={processedDailyData.length > 14 ? 'preserveStartEnd' : 0}
          />
          <YAxis
            domain={stressYDomain}
            stroke="transparent"
            tick={{ fontSize: 10, fill: darkMode ? '#64748b' : '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={32}
            tickMargin={6}
          />
          <Tooltip content={<DailyTooltip />} cursor={{ stroke: '#a855f7', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <ReferenceArea y1={0} y2={30} fill="#10b981" fillOpacity={darkMode ? 0.08 : 0.12} />
          <ReferenceArea y1={30} y2={60} fill="#f59e0b" fillOpacity={darkMode ? 0.06 : 0.1} />
          <ReferenceArea y1={60} y2={100} fill="#ef4444" fillOpacity={darkMode ? 0.05 : 0.08} />
          <ReferenceLine y={30} stroke="#10b981" strokeDasharray="6 4" strokeOpacity={0.45} />
          <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="6 4" strokeOpacity={0.45} />
          <Area type="monotone" dataKey="avg" stroke="none" fill={`url(#${chartId}AvgGlow)`} isAnimationActive={false} />
          <Customized component={StressRibbonLayer({ data: processedDailyData, chartId, darkMode, onDayClick })} />
          <Line type="monotone" dataKey="min" stroke={`url(#${chartId}MinTrail)`} strokeWidth={1.75} strokeDasharray="5 4" dot={false} activeDot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="max" stroke={`url(#${chartId}MaxTrail)`} strokeWidth={1.75} strokeDasharray="5 4" dot={false} activeDot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="avg" stroke={`url(#${chartId}AvgLine)`} strokeWidth={3} dot={false} activeDot={false} isAnimationActive={false} />
          <Scatter
            dataKey="avg"
            name="Daily avg"
            shape={(props) => <StressCalmPulseDot {...props} darkMode={darkMode} showValue={showDayLabels} />}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className={`absolute top-2 left-3 flex flex-wrap gap-3 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-3.5 rounded-md bg-gradient-to-b from-violet-300/80 to-violet-600/90 opacity-90" />
          Day ribbon
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-fuchsia-500 shadow-[0_0_8px_#d946ef]" />
          Avg pulse
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-emerald-400" />
          Calm floor
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-amber-400" />
          Peak trail
        </span>
      </div>
    </div>
  );
}


const StressDataComponent = ({ darkMode, onStressDataUpdate, selectedUserId, dateRange }) => {
  const [stressData, setStressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(100); // 100 = most recent, 0 = oldest
  const [localDateRange, setLocalDateRange] = useState(dateRange);

  useEffect(() => {
    setLocalDateRange(dateRange);
  }, [dateRange]);

  // Sync local date range with global when modal opens/closes
  useEffect(() => {
    setLocalDateRange(dateRange);
  }, [showDetails, dateRange]);

  // Cache and refs
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const { drillToDay, exitDayDrill } = useVitalDayDrillDown(localDateRange, setLocalDateRange);

  const isDailyView = useMemo(() => {
    if (isDayDrillDown(localDateRange)) return false;
    if (stressData?.length && isDailyStressRow(stressData[0])) return true;
    return !localDateRange?.customRange &&
      (localDateRange?.period === 'week' || localDateRange?.period === 'month');
  }, [localDateRange, stressData]);

  // Format date for API (YYYY-MM-DD)
  const formatDateForAPI = (date) => {
    if (!date) return null;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  // Fetch stress data from API
  const fetchStressData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      let range = null;
      let cacheKey;
      let date = null;

      if (localDateRange?.customRange && localDateRange?.date) {
        date = formatDateForAPI(localDateRange.date);
        cacheKey = `${selectedUserId || 'null'}-stress-date-${date}`;
        console.log('Fetching stress data for custom date:', date);
      } else {
        if (localDateRange?.period === 'today') range = '24h';
        else if (localDateRange?.period === 'week') range = '7d';
        else if (localDateRange?.period === 'month') range = '30d';
        else range = '24h';
        cacheKey = `${selectedUserId || 'null'}-stress-${range}`;
        console.log('Fetching stress data with range:', range);
      }

      if (cacheRef.current.has(cacheKey)) {
        const cachedData = cacheRef.current.get(cacheKey);
        const cacheTime = cachedData.timestamp;
        const now = Date.now();
        
        if (now - cacheTime < 5 * 60 * 1000) {
          console.log('Using cached stress data:', cachedData.data.length, 'records');
          if (isMountedRef.current) {
            setStressData(cachedData.data);
            if (onStressDataUpdate) onStressDataUpdate(cachedData.data);
            setLoading(false);
          }
          return;
        }
      }

      const data = await getStressData(selectedUserId, date, range);

      if (!isMountedRef.current || abortControllerRef.current.signal.aborted) {
        return;
      }

      if (data && data.length > 0) {
        const sortedData = [...data].sort((a, b) => {
          const ta = isDailyStressRow(a) ? parseDayISO(a.day) : new Date(a.date);
          const tb = isDailyStressRow(b) ? parseDayISO(b.day) : new Date(b.date);
          return ta - tb;
        });
        
        cacheRef.current.set(cacheKey, {
          data: sortedData,
          timestamp: Date.now()
        });

        if (isMountedRef.current) {
          setStressData(sortedData);
          if (onStressDataUpdate) onStressDataUpdate(sortedData);
        }
      } else {
        if (isMountedRef.current) {
          setStressData([]);
          if (onStressDataUpdate) onStressDataUpdate([]);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED' || !isMountedRef.current) {
        return;
      }
      console.error('Error fetching stress data:', error);
      if (isMountedRef.current) {
        setError('Failed to load stress data. Please try again.');
      }
    } finally {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [selectedUserId, onStressDataUpdate, localDateRange?.date, localDateRange?.customRange, localDateRange?.period]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchStressData();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStressData]);

  const processStressData = useCallback((data) => {
    if (!data || data.length === 0 || isDailyStressRow(data[0])) return [];

    return data.map((item) => ({
      time: new Date(item.date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      value: item.stress,
      fullTime: new Date(item.date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      date: item.date
    }));
  }, []);

  const processedDailyData = useMemo(() => {
    if (!stressData?.length) return [];

    if (isDailyStressRow(stressData[0])) {
      return stressData
        .slice()
        .sort((a, b) => parseDayISO(a.day) - parseDayISO(b.day))
        .map((item) => ({
          day: item.day,
          label: parseDayISO(item.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          avg: Math.round(item.average_stress),
          min: item.minimum_stress,
          max: item.maximum_stress,
        }));
    }

    const buckets = new Map();
    for (const item of stressData) {
      const dateStr = item?.date;
      const value = item?.stress;
      if (!dateStr || typeof value !== 'number') continue;
      const day = new Date(dateStr).toISOString().slice(0, 10);
      const b = buckets.get(day) || { day, sum: 0, n: 0, min: Infinity, max: -Infinity };
      b.sum += value;
      b.n += 1;
      b.min = Math.min(b.min, value);
      b.max = Math.max(b.max, value);
      buckets.set(day, b);
    }

    return Array.from(buckets.values())
      .sort((a, b) => new Date(a.day) - new Date(b.day))
      .map((b) => {
        const avgRaw = b.n ? b.sum / b.n : 0;
        return {
          day: b.day,
          label: parseDayISO(b.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          avg: Math.round(avgRaw),
          min: Number.isFinite(b.min) ? b.min : 0,
          max: Number.isFinite(b.max) ? b.max : 0,
        };
      });
  }, [stressData]);

  const calculateAverageStress = useCallback((data) => {
    if (!data || data.length === 0) return 0;
    if (isDailyStressRow(data[0])) {
      const sum = data.reduce((acc, item) => acc + item.average_stress, 0);
      return Math.round(sum / data.length);
    }
    const sum = data.reduce((acc, item) => acc + item.stress, 0);
    return Math.round(sum / data.length);
  }, []);

  // Get stress status
  const getStressStatus = useCallback((value) => {
    if (value < 30) return { status: 'Low', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' };
    if (value < 60) return { status: 'Moderate', color: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' };
    return { status: 'High', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20' };
  }, []);

  // Get latest reading
  const getLatestReading = useCallback(() => {
    if (!stressData || stressData.length === 0) return null;
    const last = stressData[stressData.length - 1];
    if (isDailyStressRow(last)) {
      return { stress: Math.round(last.average_stress), day: last.day, isDaily: true };
    }
    return last;
  }, [stressData]);

  const getDateRangeDisplay = useCallback(() => {
    if (!stressData || stressData.length === 0) return 'No data';
    const first = stressData[0];
    const last = stressData[stressData.length - 1];
    const firstDate = isDailyStressRow(first) ? parseDayISO(first.day) : new Date(first.date);
    const lastDate = isDailyStressRow(last) ? parseDayISO(last.day) : new Date(last.date);
    if (firstDate.toDateString() === lastDate.toDateString()) {
      return firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [stressData]);

  const getVisibleData = useCallback(() => {
    if (!stressData || stressData.length === 0 || isDailyStressRow(stressData[0])) return [];

    const processedData = processStressData(stressData);
    if (processedData.length === 0) return [];

    // Get the time range of all data
    const timestamps = processedData.map(item => new Date(item.date).getTime());
    const firstTimestamp = Math.min(...timestamps);
    const lastTimestamp = Math.max(...timestamps);
    const totalDuration = lastTimestamp - firstTimestamp;

    // Calculate 12 hours in milliseconds
    const twelveHoursMs = 12 * 60 * 60 * 1000;

    // If total duration is less than 12 hours, show all data
    if (totalDuration <= twelveHoursMs) {
      return processedData;
    }

    // Calculate window position based on slider (0 = oldest, 100 = newest)
    const maxStartTime = lastTimestamp - twelveHoursMs;
    const startTime = firstTimestamp + ((maxStartTime - firstTimestamp) * (sliderPosition / 100));
    const endTime = startTime + twelveHoursMs;

    // Filter data within the 12-hour window
    return processedData.filter(item => {
      const itemTime = new Date(item.date).getTime();
      return itemTime >= startTime && itemTime <= endTime;
    });
  }, [stressData, sliderPosition, processStressData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 border rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {payload[0].payload.fullTime}
          </p>
          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Stress: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  const chartData = React.useMemo(() => processStressData(stressData), [stressData, processStressData]);
  const visibleData = React.useMemo(() => getVisibleData(), [getVisibleData]);
  const latestReading = React.useMemo(() => getLatestReading(), [stressData, getLatestReading]);
  const averageStress = React.useMemo(() => calculateAverageStress(stressData), [stressData, calculateAverageStress]);
  const status = React.useMemo(() => getStressStatus(latestReading?.stress || averageStress), [latestReading, averageStress, getStressStatus]);
  const dateRangeDisplay = React.useMemo(() => getDateRangeDisplay(), [stressData, getDateRangeDisplay]);

  const dailyStressStats = useMemo(() => {
    if (!processedDailyData.length) {
      return { periodAvg: 0, calmest: 0, peak: 0, lowestFloor: 0, highestPeak: 0 };
    }
    const avgs = processedDailyData.map((d) => d.avg);
    const mins = processedDailyData.map((d) => d.min);
    const maxs = processedDailyData.map((d) => d.max);
    return {
      periodAvg: Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length),
      calmest: Math.min(...avgs),
      peak: Math.max(...avgs),
      lowestFloor: Math.min(...mins),
      highestPeak: Math.max(...maxs),
    };
  }, [processedDailyData]);

  if (loading) {
    return (
      <>
        <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading stress data...</p>
            </div>
          </div>
        </div>
        <DataModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="Stress Analysis Details"
          darkMode={darkMode}
        >
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Updating stress details...</p>
            </div>
          </div>
        </DataModal>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>{error}</p>
              <button onClick={fetchStressData} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                Retry
              </button>
            </div>
          </div>
        </div>
        <DataModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="Stress Analysis Details"
          darkMode={darkMode}
        >
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Unable to load stress details.
              </p>
            </div>
          </div>
        </DataModal>
      </>
    );
  }

  if (!stressData || stressData.length === 0) {
    return (
      <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="w-8 h-8 text-gray-400 mx-auto mb-4" />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No stress data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500 bg-opacity-20 shadow-lg">
            <Brain className="w-5 h-5 md:w-6 md:h-6 text-purple-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Stress Level</h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}>
                {status.status}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{dateRangeDisplay}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`text-lg md:text-xl font-bold tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {latestReading?.stress ?? averageStress}
            </div>
            <div className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {isDailyView ? 'Latest day avg' : 'Current level'}
            </div>
          </div>
          <button
            onClick={() => setShowDetails(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            aria-label="View stress chart"
          >
            {showDetails ? (
              <EyeOff className="w-4 h-4" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} />
            ) : (
              <Eye className="w-4 h-4" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} />
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 mb-2 flex flex-wrap gap-3 min-h-[36px] shrink-0">
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${status.bgColor}`}>
          <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')}`} />
          <span className={`text-sm font-medium ${status.color}`}>{status.status} stress</span>
        </div>
        {isDailyView && (
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-violet-900/25' : 'bg-violet-50'}`}>
            <Calendar className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-medium text-violet-600 dark:text-violet-400">Daily summary</span>
          </div>
        )}
      </div>

      <div className="mb-2 flex-1 flex flex-col min-h-0">
        {isDailyView ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs min-h-[32px] shrink-0">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Low (&lt;30)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Moderate (30–59)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-500" />
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>High (60+)</span>
              </div>
            </div>
            <p className={`mb-2 text-center text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Click a day to view readings
            </p>
            <StressDailyRangeChart
              processedDailyData={processedDailyData}
              darkMode={darkMode}
              height={DAILY_CHART_HEIGHT}
              chartId="stressCard"
              onDayClick={drillToDay}
            />
          </>
        ) : (
        <div className="mt-4">
          <DayDrillDownBanner
            dateRange={localDateRange}
            onBack={exitDayDrill}
            darkMode={darkMode}
            accentClass="text-violet-600 dark:text-violet-400"
          />
          <div className={`mb-3 flex items-center justify-between text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span>{dateRange?.customRange ? 'Selected date' : 'Last 24 hours'}</span>
            <span>{stressData.length} reading{stressData.length !== 1 ? 's' : ''}</span>
          </div>
          <ResponsiveContainer width="100%" height={LIVE_CHART_HEIGHT}>
            <AreaChart data={chartData} isAnimationActive={false}>
              {darkMode ? <CartesianGrid strokeDasharray="3 3" stroke="#374151" /> : <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
              <XAxis dataKey="time" stroke={darkMode ? '#9CA3AF' : '#666'} tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} stroke={darkMode ? '#9CA3AF' : '#666'} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke={darkMode ? '#a855f7' : '#8b5cf6'} fill={darkMode ? '#a855f7' : '#8b5cf6'} fillOpacity={0.2} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Detailed View Modal */}
      <DataModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Stress Analysis Details"
        darkMode={darkMode}
      >
        <div className="space-y-6">
          {/* Modal Filter UI */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700/50 text-xs">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: '7 Days' },
                { id: 'month', label: '30 Days' },
                { id: 'custom', label: 'Custom' }
              ].map(filter => {
                const isActive = (filter.id === 'custom' && localDateRange?.customRange) ||
                  (!localDateRange?.customRange && localDateRange?.period === filter.id) ||
                  (!localDateRange?.period && !localDateRange?.customRange && filter.id === 'today');
                return (
                  <button
                    key={filter.id}
                    onClick={() => {
                      if (filter.id === 'custom') {
                        setLocalDateRange({ ...localDateRange, customRange: true });
                      } else {
                        setLocalDateRange({ period: filter.id, customRange: false });
                      }
                    }}
                    className={`px-3 py-1.5 font-medium rounded-md transition-all ${isActive
                      ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {localDateRange?.customRange && (
              <div className="flex items-center gap-2 text-xs w-full md:w-auto">
                <input
                  type="date"
                  value={localDateRange?.date || ''}
                  onChange={(e) => setLocalDateRange({ ...localDateRange, date: e.target.value })}
                  className={`flex-1 md:flex-none px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-purple-500/20 ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-200 focus:border-purple-500/50' : 'bg-white border-gray-200 text-gray-700 focus:border-purple-500'}`}
                />
              </div>
            )}
          </div>

          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {isDailyView
              ? `${stressData.length} days with readings in this period`
              : `${stressData.length} records available in this period`}
          </div>

          {isDailyView ? (
            <>
              <p className={`mb-2 text-center text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Click a day to view readings
              </p>
              <StressDailyRangeChart
                processedDailyData={processedDailyData}
                darkMode={darkMode}
                height={300}
                chartId="stressModal"
                onDayClick={drillToDay}
              />
            </>
          ) : (
            <>
              <DayDrillDownBanner
                dateRange={localDateRange}
                onBack={exitDayDrill}
                darkMode={darkMode}
                accentClass="text-violet-600 dark:text-violet-400"
              />
              <div className="h-[300px] w-full p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={visibleData} isAnimationActive={false}>
                    <defs>
                      <linearGradient id="colorStressModal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={darkMode ? '#a855f7' : '#8b5cf6'} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={darkMode ? '#a855f7' : '#8b5cf6'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#374151' : '#f3f4f6'} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: darkMode ? '#9CA3AF' : '#6B7280' }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: darkMode ? '#9CA3AF' : '#6B7280' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" stroke={darkMode ? '#a855f7' : '#8b5cf6'} strokeWidth={3} fillOpacity={1} fill="url(#colorStressModal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="px-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  style={{
                    background: `linear-gradient(to right, ${darkMode ? '#a855f7' : '#8b5cf6'} 0%, ${darkMode ? '#a855f7' : '#8b5cf6'} ${sliderPosition}%, ${darkMode ? '#374151' : '#e5e7eb'} ${sliderPosition}%, ${darkMode ? '#374151' : '#e5e7eb'} 100%)`,
                  }}
                />
                <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>Older</span>
                  <span>Newer</span>
                </div>
              </div>
            </>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Average</span>
                </div>
                <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{averageStress}</div>
              </div>
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Latest</span>
                </div>
                <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{latestReading?.stress || 'N/A'}</div>
              </div>
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Readings</span>
                </div>
                <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stressData.length}</div>
              </div>
            </div>

            {/* Recent Readings */}
            <div>
              <h4 className={`font-semibold text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>
                {isDailyView ? 'Daily Summary' : 'Reading Timeline'}
              </h4>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {isDailyView
                  ? processedDailyData.slice().reverse().map((row) => {
                    const tier = stressTier(row.avg);
                    return (
                      <div key={row.day} className={`flex items-center justify-between p-4 rounded-xl border ${darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: tier.primary }} />
                          <div>
                            <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{row.label}</div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Min {row.min} Â· Max {row.max}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold tabular-nums" style={{ color: tier.primary }}>{row.avg}</div>
                          <div className="text-[10px] font-medium" style={{ color: tier.primary }}>{tier.label}</div>
                        </div>
                      </div>
                    );
                  })
                  : stressData.slice().reverse().map((reading, index) => (
                  <div key={index} className={`flex items-center justify-between p-4 rounded-xl border ${
                    darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full shadow-sm ${
                        reading.stress < 30 ? 'bg-green-500' :
                        reading.stress < 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {new Date(reading.date).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(reading.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {reading.stress}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DataModal>
    </div>
  );
};

export default StressDataComponent;
