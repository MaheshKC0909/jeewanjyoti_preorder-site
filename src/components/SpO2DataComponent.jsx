import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  ComposedChart, Area, Scatter, ReferenceArea, ReferenceLine, Customized
} from 'recharts';
import { Droplets, TrendingUp, AlertCircle, RefreshCw, Activity, Clock, Calendar, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import { getSpO2Data } from '../lib/api';
import DataModal from './ui/Modal';
import DayDrillDownBanner from './vitals/DayDrillDownBanner';
import { useVitalLocalDateRange } from '../hooks/useVitalLocalDateRange';
import { isDayDrillDown, isMultidayPeriod } from '../utils/vitalDateRange';

function isDailySpO2Row(row) {
  return row && typeof row.day === 'string' && (
    typeof row.average_blood_oxygen === 'number' ||
    typeof row.minimum_blood_oxygen === 'number' ||
    typeof row.maximum_blood_oxygen === 'number'
  );
}

/** Parse YYYY-MM-DD as local calendar date (avoids UTC off-by-one on labels). */
function parseDayISO(dayStr) {
  if (!dayStr || typeof dayStr !== 'string') return null;
  const match = dayStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Date(dayStr);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Shared with HeartRate card — keeps side-by-side panels aligned */
const DAILY_CHART_HEIGHT = 208;
const LIVE_CHART_HEIGHT = 200;

function spo2Tier(avg) {
  if (avg < 90) return { primary: '#f43f5e', glow: '#fb7185', bandTop: '#fecdd3', bandBottom: '#e11d48' };
  if (avg < 95) return { primary: '#f59e0b', glow: '#fbbf24', bandTop: '#fde68a', bandBottom: '#d97706' };
  return { primary: '#06b6d4', glow: '#22d3ee', bandTop: '#a5f3fc', bandBottom: '#0891b2' };
}

/** Vertical min–max capsule per day (drawn in chart pixel space). */
function RangeCapsulesLayer({ data, chartId, darkMode, onDayClick }) {
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
      <g className="spo2-range-capsules">
        {data.map((d, i) => {
          const cx = (xScale(d.label) ?? 0) + bandwidth / 2 + left;
          const yTop = yScale(d.max) + top;
          const yBottom = yScale(d.min) + top;
          const h = Math.max(6, yBottom - yTop);
          const w = Math.min(20, Math.max(10, bandwidth * 0.52));
          const tier = spo2Tier(d.avg);
          return (
            <g key={d.day || i}>
              <rect
                x={cx - w / 2}
                y={yTop}
                width={w}
                height={h}
                rx={w / 2}
                fill={`url(#${chartId}-capsule-${i})`}
                opacity={darkMode ? 0.9 : 0.85}
                style={{ cursor: onDayClick ? 'pointer' : undefined }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDayClick?.(d.day);
                }}
              />
              <line x1={cx - w / 2 - 4} y1={yTop} x2={cx + w / 2 + 4} y2={yTop} stroke={tier.primary} strokeWidth={1.5} opacity={0.45} />
              <line x1={cx - w / 2 - 4} y1={yBottom} x2={cx + w / 2 + 4} y2={yBottom} stroke={tier.primary} strokeWidth={1.5} opacity={0.45} />
            </g>
          );
        })}
      </g>
    );
  };
}

function AvgPulseDot({ cx, cy, payload, darkMode, showValue, onDayClick }) {
  if (cx == null || cy == null || !payload) return null;
  const tier = spo2Tier(payload.avg);
  const handleClick = (e) => {
    e?.stopPropagation?.();
    if (payload.day) onDayClick?.(payload.day);
  };
  return (
    <g style={{ cursor: onDayClick ? 'pointer' : undefined }} onClick={handleClick}>
      <circle cx={cx} cy={cy} r={26} fill="transparent" />
      <circle cx={cx} cy={cy} r={18} fill={tier.glow} opacity={darkMode ? 0.2 : 0.28} pointerEvents="none" />
      <circle cx={cx} cy={cy} r={11} fill={tier.primary} stroke={darkMode ? '#0f172a' : '#ffffff'} strokeWidth={2.5} pointerEvents="none" />
      <circle cx={cx - 3} cy={cy - 3} r={3} fill="#ffffff" opacity={0.45} />
      {showValue && (
        <text x={cx} y={cy - 16} textAnchor="middle" fontSize={10} fontWeight={700} fill={darkMode ? '#e2e8f0' : '#0f172a'}>
          {payload.avg}%
        </text>
      )}
    </g>
  );
}

const SpO2DataComponent = ({ darkMode, onSpO2DataUpdate, selectedUserId, dateRange }) => {
  const [spo2Data, setSpO2Data] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(100); // 100 = most recent, 0 = oldest
  const { localDateRange, setLocalDateRange, drillToDay, exitDayDrill } = useVitalLocalDateRange(dateRange);

  // Cache and refs
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const isDailyView = useMemo(() => {
    if (isDayDrillDown(localDateRange)) return false;
    if (spo2Data?.length && isDailySpO2Row(spo2Data[0])) return true;
    return isMultidayPeriod(localDateRange);
  }, [localDateRange, spo2Data]);

  // Format date for API (YYYY-MM-DD)
  const formatDateForAPI = (date) => {
    if (!date) return null;
    // If it's already in YYYY-MM-DD format, return as is
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  // Fetch SpO2 data from API
  const fetchSpO2Data = useCallback(async () => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      let fromDate = null;
      let toDate = null;
      let range = null;
      let cacheKey;

      // Determine API parameters based on date range
      let date = null;
      if (localDateRange?.customRange && localDateRange?.date) {
        // Custom date - use date parameter
        date = formatDateForAPI(localDateRange.date);
        cacheKey = `${selectedUserId || 'null'}-date-${date}`;
        console.log('Fetching SpO2 data for custom date:', date);
      } else {
        // Use range parameter for predefined periods
        if (localDateRange?.period === 'today') {
          range = '24h';
        } else if (localDateRange?.period === 'week') {
          range = '7d';
        } else if (localDateRange?.period === 'month') {
          range = '30d';
        } else {
          range = '24h'; // default
        }
        cacheKey = `${selectedUserId || 'null'}-${range}`;
        console.log('Fetching SpO2 data with range:', range);
      }

      // Check cache first (5 minutes max)
      if (cacheRef.current.has(cacheKey)) {
        const cachedData = cacheRef.current.get(cacheKey);
        const cacheTime = cachedData.timestamp;
        const now = Date.now();

        // Use cache if it's less than 5 minutes old
        if (now - cacheTime < 5 * 60 * 1000) {
          console.log('Using cached SpO2 data:', cachedData.data.length, 'records');

          if (isMountedRef.current) {
            setSpO2Data(cachedData.data);
            if (onSpO2DataUpdate) {
              onSpO2DataUpdate(cachedData.data);
            }
            setLoading(false);
            // Reset slider to most recent data when new data loads
            setSliderPosition(100);
          }
          return;
        } else {
          console.log('Cache stale, fetching fresh SpO2 data');
        }
      }

      console.log('Making API call with params:', {
        userId: selectedUserId,
        fromDate,
        toDate,
        range
      });

      // Make API call with proper parameters
      const data = await getSpO2Data(selectedUserId, date, range);

      // Check if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || abortControllerRef.current.signal.aborted) {
        console.log('Component unmounted or request aborted');
        return;
      }

      if (data && data.length > 0) {
        // Sort by date or day (oldest to newest for charting)
        const sortedData = [...data].sort(
          (a, b) => new Date(a.day || a.date) - new Date(b.day || b.date)
        );

        console.log(`Received ${sortedData.length} SpO2 records`);

        // Cache the results with timestamp
        cacheRef.current.set(cacheKey, {
          data: sortedData,
          timestamp: Date.now()
        });

        if (isMountedRef.current) {
          setSpO2Data(sortedData);
          if (onSpO2DataUpdate) {
            onSpO2DataUpdate(sortedData);
          }
          // Reset slider to most recent data when new data arrives
          setSliderPosition(100);
        }
      } else {
        console.log('No SpO2 data available for selected period');
        if (isMountedRef.current) {
          setSpO2Data([]);
          if (onSpO2DataUpdate) {
            onSpO2DataUpdate([]);
          }
        }
      }
    } catch (error) {
      // Don't set error if request was aborted or component unmounted
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED' || !isMountedRef.current) {
        console.log('Request was cancelled');
        return;
      }

      console.error('Error fetching SpO2 data:', error);
      if (isMountedRef.current) {
        setError('Failed to load SpO2 data. Please try again.');
      }
    } finally {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [selectedUserId, onSpO2DataUpdate, localDateRange?.date, localDateRange?.customRange, localDateRange?.period]);

  useEffect(() => {
    isMountedRef.current = true;

    // Immediate fetch without debounce
    fetchSpO2Data();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSpO2Data]);

  // Process SpO2 data for visualization with proper timestamps
  const processSpO2Data = useCallback((data) => {
    if (!data || data.length === 0 || isDailySpO2Row(data[0])) return [];

    // Remove duplicates based on date
    const uniqueData = [];
    const seenDates = new Set();

    data.forEach(item => {
      const dateKey = item.date;
      if (!seenDates.has(dateKey)) {
        seenDates.add(dateKey);
        uniqueData.push(item);
      }
    });

    // Sort by date
    const sortedData = uniqueData.sort((a, b) => new Date(a.date) - new Date(b.date));

    return sortedData.map((item) => ({
      time: new Date(item.date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      value: item.Blood_oxygen,
      fullTime: new Date(item.date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }),
      date: item.date,
      timestamp: new Date(item.date).getTime(),
      rawDate: new Date(item.date)
    }));
  }, []);

  // Process daily SpO2 (either backend daily objects OR client-side aggregated)
  const processedDailyData = useMemo(() => {
    if (!spo2Data?.length) return [];

    if (isDailySpO2Row(spo2Data[0])) {
      return spo2Data
        .slice()
        .sort((a, b) => parseDayISO(a.day) - parseDayISO(b.day))
        .map((item) => ({
          day: item.day,
          label: parseDayISO(item.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          avg: Math.round(item.average_blood_oxygen),
          min: item.minimum_blood_oxygen,
          max: item.maximum_blood_oxygen,
          isNormal: item.average_blood_oxygen >= 95,
        }));
    }

    // Otherwise: aggregate raw readings by day (for 7d/30d views)
    const buckets = new Map();
    for (const item of spo2Data) {
      const dateStr = item?.date;
      const value = item?.Blood_oxygen;
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
          isNormal: avgRaw >= 95,
        };
      });
  }, [spo2Data]);

  // Get visible data based on slider position (12-hour window)
  const getVisibleData = useCallback(() => {
    if (!spo2Data || spo2Data.length === 0 || isDailySpO2Row(spo2Data[0])) return [];

    const processedData = processSpO2Data(spo2Data);
    if (processedData.length === 0) return [];

    // Get the time range of all data
    const firstTimestamp = processedData[0].timestamp;
    const lastTimestamp = processedData[processedData.length - 1].timestamp;
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
    return processedData.filter(item =>
      item.timestamp >= startTime && item.timestamp <= endTime
    );
  }, [spo2Data, sliderPosition, processSpO2Data]);

  // Generate 30-minute interval ticks for X-axis
  const generateTimeTicks = useCallback((visibleData) => {
    if (visibleData.length === 0) return [];

    const ticks = [];
    const firstItem = visibleData[0];
    const lastItem = visibleData[visibleData.length - 1];

    // Create ticks at 30-minute intervals
    let currentTime = new Date(firstItem.timestamp);
    // Round to nearest 30 minutes
    const minutes = currentTime.getMinutes();
    currentTime.setMinutes(Math.floor(minutes / 30) * 30);
    currentTime.setSeconds(0);
    currentTime.setMilliseconds(0);

    const lastTime = lastItem.timestamp;
    const thirtyMinutesMs = 30 * 60 * 1000;

    while (currentTime.getTime() <= lastTime + thirtyMinutesMs) {
      ticks.push(currentTime.getTime());
      currentTime = new Date(currentTime.getTime() + thirtyMinutesMs);
    }

    return ticks;
  }, []);

  // Calculate average SpO2
  const calculateAverageSpO2 = useCallback((data) => {
    if (!data || data.length === 0) return 0;
    // daily aggregate
    if (isDailySpO2Row(data[0])) {
      const sum = data.reduce((acc, item) => acc + (item.average_blood_oxygen || 0), 0);
      return Math.round(sum / data.length);
    }
    // raw readings
    const sum = data.reduce((acc, item) => acc + (item.Blood_oxygen || 0), 0);
    return Math.round(sum / data.length);
  }, []);

  // Calculate min and max SpO2
  const calculateMinMaxSpO2 = useCallback((data) => {
    if (!data || data.length === 0) return { min: 0, max: 0 };
    // daily aggregate
    if (isDailySpO2Row(data[0])) {
      return {
        min: Math.min(...data.map(item => item.minimum_blood_oxygen)),
        max: Math.max(...data.map(item => item.maximum_blood_oxygen)),
      };
    }
    const values = data.map(item => item.Blood_oxygen).filter(v => typeof v === 'number');
    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }, []);

  // Get SpO2 status
  const getSpO2Status = useCallback((value) => {
    if (value >= 95) return { status: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' };
    if (value >= 90) return { status: 'Low', color: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' };
    return { status: 'Critical', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20' };
  }, []);

  // Get latest reading
  const getLatestReading = useCallback(() => {
    if (!spo2Data || spo2Data.length === 0) return null;
    return spo2Data[spo2Data.length - 1];
  }, [spo2Data]);

  const getLatestSpO2Value = useCallback(() => {
    if (!spo2Data?.length) return 0;
    const last = spo2Data[spo2Data.length - 1];
    if (isDailySpO2Row(last)) return Math.round(last.average_blood_oxygen);
    return last.Blood_oxygen ?? 0;
  }, [spo2Data]);

  // Format date range for display
  const getDateRangeDisplay = useCallback(() => {
    if (!spo2Data || spo2Data.length === 0) return 'No data';

    const firstKey = spo2Data[0].day || spo2Data[0].date;
    const lastKey = spo2Data[spo2Data.length - 1].day || spo2Data[spo2Data.length - 1].date;
    const firstDate = isDailySpO2Row(spo2Data[0]) ? parseDayISO(firstKey) : new Date(firstKey);
    const lastDate = isDailySpO2Row(spo2Data[0]) ? parseDayISO(lastKey) : new Date(lastKey);

    if (firstDate.toDateString() === lastDate.toDateString()) {
      return firstDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [spo2Data]);

  // Handle slider change
  const handleSliderChange = (e) => {
    setSliderPosition(parseInt(e.target.value, 10));
  };

  // Format X-axis tick to show 30-minute intervals
  const formatXAxis = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 border rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {payload[0].payload.fullTime}
          </p>
          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {payload[0].value}% SpO2
          </p>
        </div>
      );
    }
    return null;
  };

  const DailyTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload.find(p => p?.payload && 'avg' in p.payload)?.payload || payload[0].payload;
    const tier = spo2Tier(d.avg);
    const span = Math.max(d.max - d.min, 1);
    const avgPos = ((d.avg - d.min) / span) * 100;
    return (
      <div
        className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md min-w-[168px] ${darkMode ? 'bg-slate-900/90 border-cyan-500/20' : 'bg-white/95 border-cyan-200'}`}
        style={{ boxShadow: `0 12px 40px ${tier.glow}33` }}
      >
        <p className={`text-sm font-semibold mb-3 ${darkMode ? 'text-cyan-100' : 'text-slate-800'}`}>{d.label}</p>
        <div
          className="relative h-2 rounded-full mb-3 overflow-hidden"
          style={{ background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }}
        >
          <div
            className="absolute inset-y-0 rounded-full"
            style={{ left: 0, right: 0, background: `linear-gradient(90deg, ${tier.bandBottom}55, ${tier.bandTop}88)` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md"
            style={{ left: `calc(${avgPos}% - 6px)`, background: tier.primary }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Min</p>
            <p className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{d.min}%</p>
          </div>
          <div>
            <p className={darkMode ? 'text-cyan-400/80' : 'text-cyan-600'}>Avg</p>
            <p className="font-bold" style={{ color: tier.primary }}>{d.avg}%</p>
          </div>
          <div>
            <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Max</p>
            <p className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{d.max}%</p>
          </div>
        </div>
        <p className={`mt-2 pt-2 border-t text-[10px] ${darkMode ? 'border-slate-700 text-slate-500' : 'border-cyan-50 text-slate-400'}`}>
          Click to view that day&apos;s readings
        </p>
      </div>
    );
  };

  // Memoize processed data
  const chartData = React.useMemo(() => processSpO2Data(spo2Data), [spo2Data, processSpO2Data]);
  const visibleData = React.useMemo(() => getVisibleData(), [getVisibleData]);
  const timeTicks = React.useMemo(() => generateTimeTicks(visibleData), [visibleData, generateTimeTicks]);

  const latestReading = React.useMemo(() => getLatestReading(), [spo2Data, getLatestReading]);
  const latestSpO2 = React.useMemo(() => getLatestSpO2Value(), [spo2Data, getLatestSpO2Value]);
  const averageSpO2 = React.useMemo(() => calculateAverageSpO2(spo2Data), [spo2Data, calculateAverageSpO2]);
  const { min, max } = React.useMemo(() => calculateMinMaxSpO2(spo2Data), [spo2Data, calculateMinMaxSpO2]);
  const spo2YMin = React.useMemo(() => Math.max(85, min - 2), [min]);
  const spo2YMax = React.useMemo(() => Math.min(100, max + 1), [max]);
  const status = React.useMemo(() => getSpO2Status(latestSpO2 || averageSpO2), [latestSpO2, averageSpO2, getSpO2Status]);
  const dateRangeDisplay = React.useMemo(() => getDateRangeDisplay(), [spo2Data, getDateRangeDisplay]);

  const showDayLabels = processedDailyData.length <= 12;

  const SpO2DailyRangeChart = ({ height = DAILY_CHART_HEIGHT, chartId = 'spo2' }) => (
    <div
      className={`relative rounded-2xl overflow-hidden border ${darkMode ? 'border-cyan-500/10 bg-gradient-to-b from-slate-900/50 via-slate-900/20 to-transparent' : 'border-cyan-100/80 bg-gradient-to-b from-cyan-50/90 via-sky-50/40 to-white'}`}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart 
          data={processedDailyData} 
          margin={{ top: 28, right: 12, left: 0, bottom: 8 }}
          onClick={(data) => {
            if (data?.activePayload?.length) {
              const payload = data.activePayload[0].payload;
              if (payload.day) drillToDay(payload.day);
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <defs>
            <linearGradient id={`${chartId}AvgLine`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <linearGradient id={`${chartId}AvgGlow`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
            {processedDailyData.map((d, i) => {
              const tier = spo2Tier(d.avg);
              return (
                <linearGradient key={i} id={`${chartId}-capsule-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tier.bandTop} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={tier.bandBottom} stopOpacity={0.75} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="4 6" stroke={darkMode ? 'rgba(148,163,184,0.12)' : 'rgba(14,165,233,0.12)'} vertical={false} />
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
            domain={[spo2YMin, spo2YMax]}
            stroke="transparent"
            tick={{ fontSize: 10, fill: darkMode ? '#64748b' : '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={(v) => `${v}%`}
            tickMargin={6}
          />
          <Tooltip content={<DailyTooltip />} cursor={{ stroke: '#22d3ee', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <ReferenceArea y1={95} y2={100} fill="#10b981" fillOpacity={darkMode ? 0.1 : 0.14} />
          <ReferenceArea y1={90} y2={95} fill="#f59e0b" fillOpacity={darkMode ? 0.06 : 0.1} />
          <ReferenceLine
            y={95}
            stroke="#10b981"
            strokeDasharray="5 5"
            strokeOpacity={0.7}
            label={{ value: '95%', position: 'insideTopRight', fill: '#10b981', fontSize: 10 }}
          />
          <Area type="monotone" dataKey="avg" stroke="none" fill={`url(#${chartId}AvgGlow)`} isAnimationActive={false} />
          <Customized component={RangeCapsulesLayer({ data: processedDailyData, chartId, darkMode, onDayClick: drillToDay })} />
          <Line
            type="monotone"
            dataKey="avg"
            stroke={`url(#${chartId}AvgLine)`}
            strokeWidth={2.5}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Scatter
            dataKey="avg"
            name="Daily avg"
            shape={(props) => <AvgPulseDot {...props} darkMode={darkMode} showValue={showDayLabels} onDayClick={drillToDay} />}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className={`absolute top-2 left-3 flex flex-wrap gap-3 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-3 rounded-full bg-gradient-to-b from-cyan-300 to-cyan-600 opacity-80" />
          Day range
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#22d3ee]" />
          Avg
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-emerald-500" />
          95% target
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <>
        <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading SpO2 data...
              </p>
            </div>
          </div>
        </div>
        <DataModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="SpO2 Analysis"
          darkMode={darkMode}
        >
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Updating SpO2 details...
              </p>
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
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                {error}
              </p>
              <button
                onClick={fetchSpO2Data}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
        <DataModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="SpO2 Analysis"
          darkMode={darkMode}
        >
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Unable to load SpO2 details.
              </p>
            </div>
          </div>
        </DataModal>
      </>
    );
  }

  if (!spo2Data || spo2Data.length === 0) {
    return (
      <>
        <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Droplets className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No SpO2 data available for the selected period
              </p>
              {dateRange?.customRange && dateRange.date && (
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Selected date: {formatDateForAPI(dateRange.date)}
                </p>
              )}
            </div>
          </div>
        </div>
        <DataModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="SpO2 Analysis"
          darkMode={darkMode}
        >
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Droplets className="w-10 h-10 text-gray-400 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No SpO2 details are available for this range.
              </p>
            </div>
          </div>
        </DataModal>
      </>
    );
  }

  return (
    <div className={`h-full flex flex-col rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 md:p-4 rounded-xl bg-blue-500 bg-opacity-20 shadow-lg">
            <Droplets className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
          </div>
          <div>
            <h3 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Blood Oxygen (SpO2)
            </h3>
            <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {dateRangeDisplay}
            </p>
            {dateRange?.customRange && dateRange.date && (
              <div className="flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3 text-blue-500" />
                <span className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  Custom Date
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`text-xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {latestSpO2 || averageSpO2}%
            </div>
            <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {isDailyView ? 'Latest Day Avg' : 'Current Level'}
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Activity className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* SpO2 Status */}
      <div className="mb-4 flex flex-wrap gap-3 min-h-[40px] shrink-0">
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${status.bgColor}`}>
          <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')}`}></div>
          <span className={`text-sm font-medium ${status.color}`}>
            {status.status} Range
          </span>
        </div>
        {isDailyView && (
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Daily Summary</span>
          </div>
        )}
      </div>

      {/* SpO2 Chart */}
      <div className="mb-2 flex-1 flex flex-col min-h-0">
        {/* Icon Legend */}
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs min-h-[32px] shrink-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Normal (≥95%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Low (90-94%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Critical (&lt;90%)</span>
          </div>
        </div>

        {/* Chart Container */}
        <div>
          {isDailyView ? (
            <>
              <p className={`mb-2 text-center text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Click a day to view readings
              </p>
              <SpO2DailyRangeChart height={DAILY_CHART_HEIGHT} chartId="spo2Card" />
              <div className="mt-4 grid grid-cols-3 gap-2 shrink-0">
                {[
                  { label: 'Period avg', value: `${averageSpO2}%`, accent: 'from-cyan-500 to-blue-600', icon: TrendingUp },
                  { label: 'Lowest day', value: `${min}%`, accent: 'from-teal-500 to-emerald-600', icon: Activity },
                  { label: 'Peak day', value: `${max}%`, accent: 'from-sky-400 to-cyan-600', icon: Droplets },
                ].map(({ label, value, accent, icon: Icon }) => (
                  <div
                    key={label}
                    className={`relative overflow-hidden rounded-xl p-3 border ${darkMode ? 'bg-slate-800/60 border-slate-600/50' : 'bg-white border-cyan-100/80 shadow-sm'}`}
                  >
                    <div className={`absolute inset-0 opacity-[0.07] bg-gradient-to-br ${accent}`} />
                    <Icon className={`w-3.5 h-3.5 mb-1.5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <div className={`text-lg font-bold bg-gradient-to-r ${accent} bg-clip-text text-transparent`}>{value}</div>
                    <div className={`text-[10px] mt-0.5 uppercase tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <DayDrillDownBanner
                dateRange={localDateRange}
                onBack={exitDayDrill}
                darkMode={darkMode}
                accentClass="text-cyan-600 dark:text-cyan-400"
              />
              <ResponsiveContainer width="100%" height={LIVE_CHART_HEIGHT}>
              <LineChart data={visibleData}>
                {darkMode ? (
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} vertical={false} />
                ) : (
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                )}
                <XAxis
                  dataKey="timestamp"
                  domain={['dataMin', 'dataMax']}
                  ticks={timeTicks}
                  tickFormatter={formatXAxis}
                  stroke={darkMode ? "#9CA3AF" : "#666"}
                  axisLine
                  tickLine
                  tick={{ fontSize: 12 }}
                  type="number"
                  scale="time"
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[Math.max(85, min - 2), Math.min(100, max + 1)]}
                  stroke={darkMode ? "#9CA3AF" : "#666"}
                  axisLine
                  tickLine
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={(props) => {
                    const { payload, cx, cy } = props;
                    let dotColor = '#3b82f6';
                    if (payload.value < 90) {
                      dotColor = '#ef4444';
                    } else if (payload.value < 95) {
                      dotColor = '#eab308';
                    }
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={dotColor}
                        stroke="none"
                      />
                    );
                  }}
                  activeDot={{ r: 6, fill: '#3b82f6' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Slider Control */}
        {!isDailyView && (
          <div className="mt-4 px-2">
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={handleSliderChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              style={{
                background: `linear-gradient(to right, ${darkMode ? '#3b82f6' : '#60a5fa'} 0%, ${darkMode ? '#3b82f6' : '#60a5fa'} ${sliderPosition}%, ${darkMode ? '#374151' : '#e5e7eb'} ${sliderPosition}%, ${darkMode ? '#374151' : '#e5e7eb'} 100%)`
              }}
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>Older</span>
              <span>Newer</span>
            </div>
          </div>
        )}
      </div>
      <DataModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="SpO2 Analysis"
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
                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm'
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
                  className={`flex-1 md:flex-none px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500/20 ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-200 focus:border-blue-500/50' : 'bg-white border-gray-200 text-gray-700 focus:border-blue-500'}`}
                />
              </div>
            )}
          </div>

          {/* Main Chart in Modal */}
          <div className="h-[300px] w-full">
            {isDailyView ? (
              <>
                <p className={`mb-2 text-center text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Click a day to view readings
                </p>
                <SpO2DailyRangeChart height={300} chartId="spo2Modal" />
              </>
            ) : (
              <>
                <DayDrillDownBanner
                  dateRange={localDateRange}
                  onBack={exitDayDrill}
                  darkMode={darkMode}
                  accentClass="text-cyan-600 dark:text-cyan-400"
                />
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visibleData}>
                  {darkMode ? (
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} vertical={false} />
                  ) : (
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  )}
                  <XAxis
                    dataKey="timestamp"
                    domain={['dataMin', 'dataMax']}
                    ticks={timeTicks}
                    tickFormatter={formatXAxis}
                    stroke={darkMode ? "#9CA3AF" : "#666"}
                    axisLine
                    tickLine
                    tick={{ fontSize: 12 }}
                    type="number"
                    scale="time"
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[Math.max(85, min - 2), Math.min(100, max + 1)]}
                    stroke={darkMode ? "#9CA3AF" : "#666"}
                    axisLine
                    tickLine
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={(props) => {
                      const { payload, cx, cy } = props;
                      let dotColor = '#3b82f6';
                      if (payload.value < 90) {
                        dotColor = '#ef4444';
                      } else if (payload.value < 95) {
                        dotColor = '#eab308';
                      }
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={dotColor}
                          stroke="none"
                        />
                      );
                    }}
                    activeDot={{ r: 6, fill: '#3b82f6' }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              </>
            )}
          </div>

          {/* Slider Control in Modal */}
          <div className="mt-2 px-2">
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={handleSliderChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              style={{
                background: `linear-gradient(to right, ${darkMode ? '#3b82f6' : '#60a5fa'} 0%, ${darkMode ? '#3b82f6' : '#60a5fa'} ${sliderPosition}%, ${darkMode ? '#374151' : '#e5e7eb'} ${sliderPosition}%, ${darkMode ? '#374151' : '#e5e7eb'} 100%)`
              }}
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>Older</span>
              <span>Newer</span>
            </div>
          </div>

          <div className="space-y-6">
            {/* SpO2 Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Average
                  </span>
                </div>
                <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {averageSpO2}%
                </div>
              </div>
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Min/Max
                  </span>
                </div>
                <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {min}% / {max}%
                </div>
              </div>
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Latest
                  </span>
                </div>
                <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {latestSpO2 || 'N/A'}%
                </div>
              </div>
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-4 h-4 text-cyan-500" />
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status
                  </span>
                </div>
                <div className={`text-xl font-bold ${status.color}`}>
                  {status.status}
                </div>
              </div>
            </div>

            {/* Recent Readings */}
            <div>
              <h4 className={`font-semibold text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>
                {isDailyView ? 'Daily Summary' : 'Recent Readings'}
              </h4>
              <div className={`space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar`}>
                {isDailyView
                  ? processedDailyData.slice().reverse().map((row) => (
                    <div
                      key={row.day}
                      role="button"
                      tabIndex={0}
                      onClick={() => drillToDay(row.day)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drillToDay(row.day); } }}
                      className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${darkMode ? 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/60' : 'bg-gray-50 border-gray-100 hover:bg-cyan-50/60'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full shadow-sm ${row.avg >= 95 ? 'bg-green-500' : row.avg >= 90 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        <div>
                          <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{row.label}</div>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Min {row.min}% · Max {row.max}%
                          </div>
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {row.avg}<span className="text-xs font-normal opacity-60">% avg</span>
                      </div>
                    </div>
                  ))
                  : spo2Data.slice().reverse().map((reading, index) => (
                  <div key={index} className={`flex items-center justify-between p-4 rounded-xl border ${darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-100'
                    }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full shadow-sm ${reading.Blood_oxygen >= 95 ? 'bg-green-500' :
                        reading.Blood_oxygen >= 90 ? 'bg-yellow-500' : 'bg-red-500'
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
                      {reading.Blood_oxygen}<span className="text-xs font-normal opacity-60">%</span>
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

export default SpO2DataComponent;