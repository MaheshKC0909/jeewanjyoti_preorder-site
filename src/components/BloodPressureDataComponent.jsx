import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  ComposedChart, Area, Scatter, ReferenceArea, ReferenceLine, Customized
} from 'recharts';
import { Thermometer, TrendingUp, AlertCircle, RefreshCw, Activity, Clock, Calendar, Eye, EyeOff } from 'lucide-react';
import { getBloodPressureData } from '../lib/api';
import DataModal from './ui/Modal';
import DayDrillDownBanner from './vitals/DayDrillDownBanner';
import { useVitalLocalDateRange } from '../hooks/useVitalLocalDateRange';
import { isDayDrillDown, isMultidayPeriod } from '../utils/vitalDateRange';

function isDailyBPRow(row) {
  return row && typeof row.day === 'string' && typeof row.avg_systolic === 'number';
}

function parseDayISO(dayStr) {
  if (!dayStr || typeof dayStr !== 'string') return null;
  const match = dayStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Date(dayStr);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

const DAILY_CHART_HEIGHT = 208;
const LIVE_CHART_HEIGHT = 200;

function bpTier(sys, dia) {
  if (sys >= 140 || dia >= 90) return { sys: '#ef4444', dia: '#dc2626', label: 'High' };
  if (sys >= 120 || dia >= 80) return { sys: '#f59e0b', dia: '#d97706', label: 'Elevated' };
  return { sys: '#f97316', dia: '#3b82f6', label: 'Normal' };
}

/** Side-by-side systolic / diastolic range capsules per day */
function BPDualRangeLayer({ data, chartId, darkMode, onDayClick }) {
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
    const pairGap = Math.min(10, Math.max(5, bandwidth * 0.18));
    const capW = Math.min(11, Math.max(6, bandwidth * 0.22));

    const drawCapsule = (cx, yMinVal, yMaxVal, gradId, day) => {
      const yTop = yScale(yMaxVal) + top;
      const yBottom = yScale(yMinVal) + top;
      const h = Math.max(5, yBottom - yTop);
      return (
        <rect
          x={cx - capW / 2}
          y={yTop}
          width={capW}
          height={h}
          rx={capW / 2}
          fill={`url(#${gradId})`}
          opacity={darkMode ? 0.92 : 0.88}
          style={{ cursor: onDayClick ? 'pointer' : undefined }}
          onClick={(e) => {
            e.stopPropagation();
            onDayClick?.(day);
          }}
        />
      );
    };

    return (
      <g className="bp-dual-ranges">
        {data.map((d, i) => {
          const cx = (xScale(d.label) ?? 0) + bandwidth / 2 + left;
          return (
            <g key={d.day || i}>
              {drawCapsule(cx - pairGap, d.minSys, d.maxSys, `${chartId}-sys-${i}`, d.day)}
              {drawCapsule(cx + pairGap, d.minDia, d.maxDia, `${chartId}-dia-${i}`, d.day)}
            </g>
          );
        })}
      </g>
    );
  };
}

function BpAvgDot({ cx, cy, payload, type, darkMode, showValue, onDayClick }) {
  if (cx == null || cy == null || !payload) return null;
  const isSys = type === 'sys';
  const val = isSys ? payload.avgSys : payload.avgDia;
  const color = isSys ? '#f97316' : '#3b82f6';
  const glow = isSys ? '#fb923c' : '#60a5fa';
  const handleClick = (e) => {
    e?.stopPropagation?.();
    if (payload.day) onDayClick?.(payload.day);
  };
  return (
    <g style={{ cursor: onDayClick ? 'pointer' : undefined }} onClick={handleClick}>
      <circle cx={cx} cy={cy} r={22} fill="transparent" />
      <circle cx={cx} cy={cy} r={16} fill={glow} opacity={darkMode ? 0.18 : 0.25} pointerEvents="none" />
      <circle cx={cx} cy={cy} r={9} fill={color} stroke={darkMode ? '#0f172a' : '#fff'} strokeWidth={2} pointerEvents="none" />
      {showValue && (
        <text x={cx} y={cy - 14} textAnchor="middle" fontSize={9} fontWeight={700} fill={darkMode ? '#e2e8f0' : '#1e293b'}>
          {Math.round(val)}
        </text>
      )}
    </g>
  );
}

function PreviewBPTooltip({ active, payload, darkMode }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const sys = payload.find((x) => x.dataKey === 'systolic')?.value ?? p.systolic;
  const dia = payload.find((x) => x.dataKey === 'diastolic')?.value ?? p.diastolic;
  return (
    <div
      className={`px-3 py-2.5 rounded-xl shadow-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
    >
      <p className="text-xs mb-1.5" style={{ color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
        {p.fullTime || p.time}
      </p>
      <div className="space-y-1 text-sm font-semibold tabular-nums">
        <p style={{ color: darkMode ? '#f9fafb' : '#111827' }}>
          <span className="text-orange-500">Sys</span> {sys} mmHg
        </p>
        <p style={{ color: darkMode ? '#f9fafb' : '#111827' }}>
          <span className="text-blue-500">Dia</span> {dia} mmHg
        </p>
      </div>
    </div>
  );
}

/** Compact multi-day preview on card (matches HRV MultiDayBarPreview height) */
function BPMultiDayPreview({ data, darkMode, onDayClick }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [mounted, setMounted] = useState(false);
  const bars = data.slice(-7);
  const maxSys = Math.max(...bars.map((d) => d.avgSys), 1);
  const maxDia = Math.max(...bars.map((d) => d.avgDia), 1);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mt-3">
      <div
        className={`rounded-xl p-3 relative overflow-visible ${darkMode ? 'bg-gray-900/40' : 'bg-gray-50'}`}
        style={{ border: `1px solid ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
      >
        <div className="flex items-end justify-between gap-1 overflow-visible" style={{ height: 52 }}>
          {bars.map((d, i) => {
            const sysPct = Math.max(10, (d.avgSys / (maxSys * 1.12)) * 100);
            const diaPct = Math.max(10, (d.avgDia / (maxDia * 1.12)) * 100);
            const isHovered = hoveredIdx === i;
            return (
              <div
                key={d.day}
                role={onDayClick ? 'button' : undefined}
                tabIndex={onDayClick ? 0 : undefined}
                className="flex flex-col items-center gap-1 flex-1 min-w-0 relative cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onDayClick?.(d.day)}
                onKeyDown={(e) => {
                  if (onDayClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onDayClick(d.day);
                  }
                }}
              >
                {isHovered && (
                  <div
                    className="absolute z-20"
                    style={{
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginBottom: 6,
                      pointerEvents: 'none',
                      minWidth: 128,
                    }}
                  >
                    <div
                      className="rounded-xl px-3 py-2 shadow-xl text-left"
                      style={{
                        background: darkMode ? '#1f2937' : '#fff',
                        border: '1px solid rgba(249,115,22,0.25)',
                        boxShadow: '0 4px 20px rgba(249,115,22,0.15)',
                      }}
                    >
                      <p
                        className="text-[10px] font-semibold mb-2 text-center"
                        style={{ color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }}
                      >
                        {d.label}
                      </p>
                      <div className="space-y-1.5">
                        <div>
                          <p className="text-[9px] font-semibold text-orange-500">Systolic</p>
                          <p className="text-xs font-bold tabular-nums" style={{ color: darkMode ? '#fff' : '#111' }}>
                            Avg {d.avgSys}
                            <span className="font-normal opacity-70 ml-1">
                              ({d.minSys}–{d.maxSys})
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold text-blue-500">Diastolic</p>
                          <p className="text-xs font-bold tabular-nums" style={{ color: darkMode ? '#fff' : '#111' }}>
                            Avg {d.avgDia}
                            <span className="font-normal opacity-70 ml-1">
                              ({d.minDia}–{d.maxDia})
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        background: darkMode ? '#1f2937' : '#fff',
                        border: '1px solid rgba(249,115,22,0.25)',
                        borderTop: 'none',
                        borderLeft: 'none',
                        transform: 'rotate(45deg)',
                        margin: '-4px auto 0',
                      }}
                    />
                  </div>
                )}
                <div
                  className="w-full flex items-end justify-center gap-0.5 rounded-md overflow-hidden"
                  style={{
                    height: 40,
                    background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  {mounted && (
                    <>
                      <div
                        className="rounded-sm transition-all"
                        style={{
                          width: '46%',
                          height: `${sysPct}%`,
                          background: isHovered ? '#f97316' : '#f97316bb',
                          borderRadius: '3px 3px 1px 1px',
                          transitionDelay: `${i * 40}ms`,
                        }}
                      />
                      <div
                        className="rounded-sm transition-all"
                        style={{
                          width: '46%',
                          height: `${diaPct}%`,
                          background: isHovered ? '#3b82f6' : '#3b82f6bb',
                          borderRadius: '3px 3px 1px 1px',
                          transitionDelay: `${i * 40 + 20}ms`,
                        }}
                      />
                    </>
                  )}
                </div>
                <span
                  className="text-[8px] truncate w-full text-center font-medium"
                  style={{
                    color: isHovered
                      ? '#f97316'
                      : darkMode
                        ? 'rgba(255,255,255,0.3)'
                        : 'rgba(0,0,0,0.3)',
                  }}
                >
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
        <div
          className="flex justify-center gap-3 mt-2 text-[8px] font-medium"
          style={{ color: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}
        >
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-orange-500" />
            Sys
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-blue-500" />
            Dia
          </span>
        </div>
      </div>
    </div>
  );
}

const BloodPressureDataComponent = ({ darkMode, onBloodPressureDataUpdate, selectedUserId, dateRange }) => {
  const [bpData, setBpData] = useState([]);
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
    if (bpData?.length && isDailyBPRow(bpData[0])) return true;
    return isMultidayPeriod(localDateRange);
  }, [localDateRange, bpData]);

  const formatDateForAPI = (date) => {
    if (!date) return null;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const fetchBPData = useCallback(async () => {
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
        cacheKey = `${selectedUserId || 'null'}-bp-date-${date}`;
        console.log('Fetching blood pressure data for custom date:', date);
      } else {
        if (localDateRange?.period === 'today') range = '24h';
        else if (localDateRange?.period === 'week') range = '7d';
        else if (localDateRange?.period === 'month') range = '30d';
        else range = '24h';
        cacheKey = `${selectedUserId || 'null'}-bp-${range}`;
        console.log('Fetching blood pressure data with range:', range);
      }

      if (cacheRef.current.has(cacheKey)) {
        const cachedData = cacheRef.current.get(cacheKey);
        const cacheTime = cachedData.timestamp;
        const now = Date.now();
        
        if (now - cacheTime < 5 * 60 * 1000) {
          console.log('Using cached blood pressure data:', cachedData.data.length, 'records');
          if (isMountedRef.current) {
            setBpData(cachedData.data);
            if (onBloodPressureDataUpdate) onBloodPressureDataUpdate(cachedData.data);
            setLoading(false);
          }
          return;
        }
      }

      const data = await getBloodPressureData(selectedUserId, date, range);

      if (!isMountedRef.current || abortControllerRef.current.signal.aborted) {
        return;
      }

      if (data && data.length > 0) {
        const sortedData = data.sort((a, b) => {
          const ta = isDailyBPRow(a) ? parseDayISO(a.day) : new Date(a.date);
          const tb = isDailyBPRow(b) ? parseDayISO(b.day) : new Date(b.date);
          return ta - tb;
        });
        
        cacheRef.current.set(cacheKey, {
          data: sortedData,
          timestamp: Date.now()
        });

        if (isMountedRef.current) {
          setBpData(sortedData);
          if (onBloodPressureDataUpdate) onBloodPressureDataUpdate(sortedData);
        }
      } else {
        if (isMountedRef.current) {
          setBpData([]);
          if (onBloodPressureDataUpdate) onBloodPressureDataUpdate([]);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED' || !isMountedRef.current) {
        return;
      }
      console.error('Error fetching blood pressure data:', error);
      if (isMountedRef.current) {
        setError('Failed to load blood pressure data. Please try again.');
      }
    } finally {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [selectedUserId, onBloodPressureDataUpdate, localDateRange?.date, localDateRange?.customRange, localDateRange?.period]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchBPData();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchBPData]);

  const processBPData = useCallback((data) => {
    if (!data || data.length === 0 || isDailyBPRow(data[0])) return [];

    return data.map((item) => ({
      time: new Date(item.date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      systolic: item.sbp,
      diastolic: item.dbp,
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

  const calculateAverageBP = useCallback((data) => {
    if (!data || data.length === 0) return { systolic: 0, diastolic: 0 };
    if (isDailyBPRow(data[0])) {
      const n = data.length;
      return {
        systolic: Math.round(data.reduce((acc, item) => acc + item.avg_systolic, 0) / n),
        diastolic: Math.round(data.reduce((acc, item) => acc + item.avg_diastolic, 0) / n),
      };
    }
    const sumSystolic = data.reduce((acc, item) => acc + item.sbp, 0);
    const sumDiastolic = data.reduce((acc, item) => acc + item.dbp, 0);
    return {
      systolic: Math.round(sumSystolic / data.length),
      diastolic: Math.round(sumDiastolic / data.length)
    };
  }, []);

  const getBPStatus = useCallback((systolic, diastolic) => {
    if (systolic < 120 && diastolic < 80) {
      return { status: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' };
    }
    if (systolic < 140 && diastolic < 90) {
      return { status: 'Elevated', color: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' };
    }
    return { status: 'High', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20' };
  }, []);

  const getLatestReading = useCallback(() => {
    if (!bpData || bpData.length === 0) return null;
    const last = bpData[bpData.length - 1];
    if (isDailyBPRow(last)) {
      return {
        sbp: Math.round(last.avg_systolic),
        dbp: Math.round(last.avg_diastolic),
        day: last.day,
      };
    }
    return last;
  }, [bpData]);

  const getDateRangeDisplay = useCallback(() => {
    if (!bpData || bpData.length === 0) return 'No data';
    if (isDailyBPRow(bpData[0])) {
      const firstDate = parseDayISO(bpData[0].day);
      const lastDate = parseDayISO(bpData[bpData.length - 1].day);
      if (!firstDate || !lastDate) return 'No data';
      if (firstDate.toDateString() === lastDate.toDateString()) {
        return firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    const firstDate = new Date(bpData[0].date);
    const lastDate = new Date(bpData[bpData.length - 1].date);
    if (firstDate.toDateString() === lastDate.toDateString()) {
      return firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [bpData]);

  const processedDailyData = useMemo(() => {
    if (!bpData?.length || !isDailyBPRow(bpData[0])) return [];
    return bpData
      .slice()
      .sort((a, b) => parseDayISO(a.day) - parseDayISO(b.day))
      .map((item) => ({
        day: item.day,
        label: parseDayISO(item.day)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) ?? item.day,
        avgSys: Math.round(item.avg_systolic),
        avgDia: Math.round(item.avg_diastolic),
        minSys: item.min_systolic,
        maxSys: item.max_systolic,
        minDia: item.min_diastolic,
        maxDia: item.max_diastolic,
      }));
  }, [bpData]);

  const dailyBPStats = useMemo(() => {
    if (!processedDailyData.length) return { peakSys: 0, peakDia: 0, lowSys: 0, lowDia: 0 };
    return {
      peakSys: Math.max(...processedDailyData.map((d) => d.maxSys)),
      peakDia: Math.max(...processedDailyData.map((d) => d.maxDia)),
      lowSys: Math.min(...processedDailyData.map((d) => d.minSys)),
      lowDia: Math.min(...processedDailyData.map((d) => d.minDia)),
    };
  }, [processedDailyData]);

  const bpYDomain = useMemo(() => {
    if (!processedDailyData.length) return [60, 140];
    const allVals = processedDailyData.flatMap((d) => [d.minSys, d.maxSys, d.minDia, d.maxDia]);
    const lo = Math.min(...allVals);
    const hi = Math.max(...allVals);
    return [Math.max(50, Math.floor(lo / 10) * 10 - 8), Math.min(180, Math.ceil(hi / 10) * 10 + 8)];
  }, [processedDailyData]);

  // Get visible data based on slider position (12-hour window)
  const getVisibleData = useCallback(() => {
    if (!bpData || bpData.length === 0 || isDailyBPRow(bpData[0])) return [];

    const processedData = processBPData(bpData);
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
  }, [bpData, sliderPosition, processBPData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 border rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{payload[0].payload.fullTime}</p>
          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {payload[0].value}/{payload[1].value} mmHg
          </p>
        </div>
      );
    }
    return null;
  };

  const chartData = React.useMemo(() => processBPData(bpData), [bpData, processBPData]);
  const visibleData = React.useMemo(() => getVisibleData(), [getVisibleData]);
  const latestReading = React.useMemo(() => getLatestReading(), [bpData, getLatestReading]);
  const averageBP = React.useMemo(() => calculateAverageBP(bpData), [bpData, calculateAverageBP]);
  const status = React.useMemo(() => 
    getBPStatus(latestReading?.sbp || averageBP.systolic, latestReading?.dbp || averageBP.diastolic), 
    [latestReading, averageBP, getBPStatus]
  );
  const dateRangeDisplay = React.useMemo(() => getDateRangeDisplay(), [bpData, getDateRangeDisplay]);

  const showDayLabels = processedDailyData.length <= 12;

  const DailyTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const tier = bpTier(d.avgSys, d.avgDia);
    return (
      <div
        className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md min-w-[188px] ${darkMode ? 'bg-slate-900/90 border-orange-500/20' : 'bg-white/95 border-orange-200'}`}
      >
        <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{d.label}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-orange-500 font-semibold">Systolic</span>
            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {d.avgSys} <span className="text-xs font-normal opacity-70">({d.minSys}–{d.maxSys})</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-blue-500 font-semibold">Diastolic</span>
            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {d.avgDia} <span className="text-xs font-normal opacity-70">({d.minDia}–{d.maxDia})</span>
            </span>
          </div>
        </div>
        <p className={`mt-2 pt-2 border-t text-[10px] ${darkMode ? 'border-slate-700 text-slate-500' : 'border-orange-50 text-slate-400'}`}>
          {tier.label}
        </p>
      </div>
    );
  };

  const BPDailyRangeChart = ({ height = DAILY_CHART_HEIGHT, chartId = 'bp' }) => (
    <div
      className={`relative rounded-2xl overflow-hidden border ${darkMode ? 'border-orange-500/10 bg-gradient-to-b from-slate-900/50 via-slate-900/20 to-transparent' : 'border-orange-100/80 bg-gradient-to-b from-orange-50/90 via-amber-50/30 to-white'}`}
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
            <linearGradient id={`${chartId}SysLine`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id={`${chartId}DiaLine`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            {processedDailyData.map((d, i) => (
              <React.Fragment key={i}>
                <linearGradient id={`${chartId}-sys-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fdba74" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id={`${chartId}-dia-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#93c5fd" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.7} />
                </linearGradient>
              </React.Fragment>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="4 6" stroke={darkMode ? 'rgba(148,163,184,0.12)' : 'rgba(249,115,22,0.1)'} vertical={false} />
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
            domain={bpYDomain}
            stroke="transparent"
            tick={{ fontSize: 10, fill: darkMode ? '#64748b' : '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(v) => `${v}`}
            tickMargin={6}
            unit=" mmHg"
          />
          <Tooltip content={<DailyTooltip />} cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <ReferenceArea y1={80} y2={120} fill="#10b981" fillOpacity={darkMode ? 0.06 : 0.1} />
          <ReferenceLine y={120} stroke="#f97316" strokeDasharray="5 5" strokeOpacity={0.55} label={{ value: '120', position: 'insideTopRight', fill: '#f97316', fontSize: 9 }} />
          <ReferenceLine y={80} stroke="#3b82f6" strokeDasharray="5 5" strokeOpacity={0.55} label={{ value: '80', position: 'insideBottomRight', fill: '#3b82f6', fontSize: 9 }} />
          <Customized component={BPDualRangeLayer({ data: processedDailyData, chartId, darkMode, onDayClick: drillToDay })} />
          <Line type="monotone" dataKey="avgSys" stroke={`url(#${chartId}SysLine)`} strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="avgDia" stroke={`url(#${chartId}DiaLine)`} strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} />
          <Scatter dataKey="avgSys" shape={(props) => <BpAvgDot {...props} type="sys" darkMode={darkMode} showValue={showDayLabels} onDayClick={drillToDay} />} isAnimationActive={false} />
          <Scatter dataKey="avgDia" shape={(props) => <BpAvgDot {...props} type="dia" darkMode={darkMode} showValue={showDayLabels} onDayClick={drillToDay} />} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className={`absolute top-2 left-3 flex flex-wrap gap-3 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-3 rounded-full bg-gradient-to-b from-orange-300 to-orange-600 opacity-80" />
          Sys range
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-3 rounded-full bg-gradient-to-b from-blue-300 to-blue-600 opacity-80" />
          Dia range
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Daily avg
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <>
        <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading blood pressure...</p>
            </div>
          </div>
        </div>
        <DataModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="Blood Pressure Details"
          darkMode={darkMode}
        >
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <RefreshCw className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Updating blood pressure details...</p>
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
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>{error}</p>
              <button onClick={fetchBPData} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                Retry
              </button>
            </div>
          </div>
        </div>
        <DataModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="Blood Pressure Details"
          darkMode={darkMode}
        >
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Unable to load blood pressure details.
              </p>
            </div>
          </div>
        </DataModal>
      </>
    );
  }

  if (!bpData || bpData.length === 0) {
    return (
      <>
        <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <Thermometer className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No blood pressure data</p>
            </div>
          </div>
        </div>
        <DataModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="Blood Pressure Details"
          darkMode={darkMode}
        >
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <Thermometer className="w-10 h-10 text-gray-400 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No blood pressure details are available for this range.
              </p>
            </div>
          </div>
        </DataModal>
      </>
    );
  }

  return (
    <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-orange-500 bg-opacity-20 shadow-lg">
            <Thermometer className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Blood Pressure
              </h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}>
                {status.status}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {dateRangeDisplay}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`text-lg md:text-xl font-bold tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {latestReading ? `${latestReading.sbp}/${latestReading.dbp}` : `${averageBP.systolic}/${averageBP.diastolic}`}
              <span className={`text-sm font-normal ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>mmHg</span>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            aria-label="View blood pressure chart"
          >
            {showDetails ? (
              <EyeOff className="w-4 h-4" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} />
            ) : (
              <Eye className="w-4 h-4" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} />
            )}
          </button>
        </div>
      </div>

      {/* Mini sparkline — single-day preview (HRV-style, 52px) */}
      {!isDailyView && chartData.length > 1 && (
        <div style={{ height: 52, marginTop: 6 }} className="relative z-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <Tooltip
                content={<PreviewBPTooltip darkMode={darkMode} />}
                cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Line
                type="monotone"
                dataKey="systolic"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#f97316', stroke: darkMode ? '#1f2937' : '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="diastolic"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6', stroke: darkMode ? '#1f2937' : '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Multi-day card preview */}
      {isDailyView && processedDailyData.length > 0 && (
        <>
          <p className={`mt-2 text-center text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Click a day to view readings
          </p>
          <BPMultiDayPreview data={processedDailyData} darkMode={darkMode} onDayClick={drillToDay} />
        </>
      )}

      <DayDrillDownBanner
        dateRange={localDateRange}
        onBack={exitDayDrill}
        darkMode={darkMode}
        accentClass="text-orange-600 dark:text-orange-400"
      />

      {/* Detailed View Modal */}
      <DataModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Blood Pressure Details"
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
                      ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-sm'
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
                  className={`flex-1 md:flex-none px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-orange-500/20 ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-200 focus:border-orange-500/50' : 'bg-white border-gray-200 text-gray-700 focus:border-orange-500'}`}
                />
              </div>
            )}
          </div>

          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {isDailyView
              ? `${bpData.length} days with readings in this period`
              : `${bpData.length} records available in this period`}
          </div>
          
          {isDailyView ? (
            <>
              <p className={`mb-2 text-center text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Click a day to view readings
              </p>
              <BPDailyRangeChart height={300} chartId="bpModal" />
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Period avg</span>
                  </div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {averageBP.systolic}/{averageBP.diastolic}
                  </div>
                </div>
                <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-rose-500" />
                    <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Peak sys / dia</span>
                  </div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dailyBPStats.peakSys}/{dailyBPStats.peakDia}
                  </div>
                </div>
                <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Days tracked</span>
                  </div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{bpData.length}</div>
                </div>
              </div>
              <div>
                <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Daily Summary</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {processedDailyData.slice().reverse().map((row) => (
                    <div
                      key={row.day}
                      role="button"
                      tabIndex={0}
                      onClick={() => drillToDay(row.day)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drillToDay(row.day); } }}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${darkMode ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' : 'bg-gray-50 border-gray-100 hover:bg-orange-50/60'}`}
                    >
                      <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{row.label}</span>
                      <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        <span className="text-orange-500">{row.avgSys}</span>
                        <span className="mx-1 opacity-50">/</span>
                        <span className="text-blue-500">{row.avgDia}</span>
                        <span className={`ml-2 text-xs font-normal ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          ({row.minSys}–{row.maxSys} / {row.minDia}–{row.maxDia})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <DayDrillDownBanner
                dateRange={localDateRange}
                onBack={exitDayDrill}
                darkMode={darkMode}
                accentClass="text-orange-600 dark:text-orange-400"
              />
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={visibleData} isAnimationActive={false}>
              {darkMode ? <CartesianGrid strokeDasharray="3 3" stroke="#374151" /> : <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
              <XAxis dataKey="time" stroke={darkMode ? '#9CA3AF' : '#666'} tick={{ fontSize: 11 }} />
              <YAxis stroke={darkMode ? '#9CA3AF' : '#666'} tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="systolic" name="Systolic" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>

          {/* Slider Control */}
          <div className="px-2">
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              style={{
                background: `linear-gradient(to right, ${darkMode ? '#f97316' : '#f97316'} 0%, ${darkMode ? '#f97316' : '#f97316'} ${sliderPosition}%, ${darkMode ? '#374151' : '#e5e7eb'} ${sliderPosition}%, ${darkMode ? '#374151' : '#e5e7eb'} 100%)`
              }}
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>Older</span>
              <span>Newer</span>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Average</span>
              </div>
              <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {averageBP.systolic}/{averageBP.diastolic}
              </div>
            </div>
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-green-500" />
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Latest</span>
              </div>
              <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {latestReading ? `${latestReading.sbp}/${latestReading.dbp}` : 'N/A'}
              </div>
            </div>
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Readings</span>
              </div>
              <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{bpData.length}</div>
            </div>
          </div>
            </>
          )}
        </div>
      </DataModal>
    </div>
  );
};

export default BloodPressureDataComponent;