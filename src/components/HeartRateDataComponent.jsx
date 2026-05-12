import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea } from 'recharts';
import { Heart, TrendingUp, AlertCircle, RefreshCw, Activity, Clock, Zap, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getHeartRateData } from '../lib/api';
import DataModal from './ui/Modal';

// Number of data points rendered in the chart window at any time
const WINDOW_SIZE = 300;

const HeartRateDataComponent = ({ darkMode, onHeartRateDataUpdate, selectedUserId, dateRange }) => {
  const [heartRateData, setHeartRateData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // sliderPosition drives the actual chart window (triggers re-render)
  const [sliderPosition, setSliderPosition] = useState(100);
  // draftPosition drives only the slider thumb visually (no chart re-render while dragging)
  const [draftPosition, setDraftPosition] = useState(100);

  const [localDateRange, setLocalDateRange] = useState(dateRange);

  useEffect(() => { setLocalDateRange(dateRange); }, [dateRange]);
  useEffect(() => { setLocalDateRange(dateRange); }, [showDetails, dateRange]);

  // Refs
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const sliderTimerRef = useRef(null);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const formatDateForAPI = (date) => {
    if (!date) return null;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    return new Date(date).toISOString().split('T')[0];
  };

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchHeartRateData = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      let fromDate = null, toDate = null, range = null, cacheKey;

      if (localDateRange?.customRange && localDateRange?.from && localDateRange?.to) {
        fromDate = formatDateForAPI(localDateRange.from);
        toDate = formatDateForAPI(localDateRange.to);
        cacheKey = `${selectedUserId || 'null'}-${fromDate}-${toDate}`;
      } else {
        range = localDateRange?.period === 'week' ? '7d'
          : localDateRange?.period === 'month' ? '30d'
            : '24h';
        cacheKey = `${selectedUserId || 'null'}-${range}`;
      }

      // Use cache if fresh (< 5 min)
      if (cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey);
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
          if (isMountedRef.current) {
            setHeartRateData(cached.data);
            onHeartRateDataUpdate(cached.data);
            setLoading(false);
          }
          return;
        }
      }

      const data = await getHeartRateData(selectedUserId, fromDate, toDate, range);

      if (!isMountedRef.current || abortControllerRef.current.signal.aborted) return;

      if (data && data.length > 0) {
        const sorted = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        cacheRef.current.set(cacheKey, { data: sorted, timestamp: Date.now() });

        if (isMountedRef.current) {
          setHeartRateData(sorted);
          onHeartRateDataUpdate(sorted);
          // Reset to newest window
          setSliderPosition(100);
          setDraftPosition(100);
        }
      } else {
        if (isMountedRef.current) {
          setHeartRateData([]);
          onHeartRateDataUpdate([]);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED' || !isMountedRef.current) return;
      if (isMountedRef.current) setError('Failed to load heart rate data. Please try again.');
    } finally {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) setLoading(false);
    }
  }, [selectedUserId, onHeartRateDataUpdate, localDateRange?.from, localDateRange?.to, localDateRange?.customRange, localDateRange?.period]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchHeartRateData();
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
      clearTimeout(sliderTimerRef.current);
    };
  }, [fetchHeartRateData]);

  // ─── Process all data once ─────────────────────────────────────────────────

  const allProcessed = useMemo(() => {
    if (!heartRateData || heartRateData.length === 0) return [];
    return heartRateData.map((item) => {
      const date = new Date(item.date);
      return {
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        value: item.once_heart_value,
        fullTime: date.toLocaleString('en-US', {
          month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        }),
        date: item.date,
        timestamp: date.getTime(),
        isNormal: item.once_heart_value >= 60 && item.once_heart_value <= 100
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
  }, [heartRateData]);

  // ─── Windowed slice — only WINDOW_SIZE points rendered ────────────────────

  const visibleData = useMemo(() => {
    if (allProcessed.length === 0) return [];
    if (allProcessed.length <= WINDOW_SIZE) return allProcessed;

    const maxStart = allProcessed.length - WINDOW_SIZE;
    const startIndex = Math.round((sliderPosition / 100) * maxStart);
    return allProcessed.slice(startIndex, startIndex + WINDOW_SIZE);
  }, [allProcessed, sliderPosition]);

  // ─── Slider handlers ──────────────────────────────────────────────────────

  const handleSliderChange = useCallback((e) => {
    const val = parseInt(e.target.value, 10);
    setDraftPosition(val); // instant thumb movement
    clearTimeout(sliderTimerRef.current);
    sliderTimerRef.current = setTimeout(() => {
      setSliderPosition(val); // delayed chart update
    }, 80);
  }, []);

  // ─── Ticks — adapt interval to visible span ───────────────────────────────

  const timeTicks = useMemo(() => {
    if (visibleData.length === 0) return [];
    const first = visibleData[0].timestamp;
    const last = visibleData[visibleData.length - 1].timestamp;
    const span = last - first;

    const intervalMs =
      span > 7 * 24 * 3600_000 ? 24 * 3600_000   // 1 day
        : span > 24 * 3600_000 ? 6 * 3600_000     // 6 hours
          : span > 6 * 3600_000 ? 3600_000          // 1 hour
            : 30 * 60_000;                               // 30 min

    const ticks = [];
    let t = Math.ceil(first / intervalMs) * intervalMs;
    while (t <= last) { ticks.push(t); t += intervalMs; }
    return ticks;
  }, [visibleData]);

  // ─── Stats (computed from full dataset) ───────────────────────────────────

  const averageHeartRate = useMemo(() => {
    if (!heartRateData.length) return 0;
    return Math.round(heartRateData.reduce((s, i) => s + i.once_heart_value, 0) / heartRateData.length);
  }, [heartRateData]);

  const { min, max } = useMemo(() => {
    if (!heartRateData.length) return { min: 0, max: 0 };
    const vals = heartRateData.map(i => i.once_heart_value);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [heartRateData]);

  const latestReading = useMemo(() =>
    heartRateData.length ? heartRateData[heartRateData.length - 1] : null,
    [heartRateData]);

  const currentValue = latestReading?.once_heart_value || averageHeartRate;

  const status = useMemo(() => {
    if (currentValue >= 60 && currentValue <= 100) return { status: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' };
    if (currentValue >= 50 && currentValue <= 120) return { status: 'Elevated', color: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' };
    if (currentValue < 50) return { status: 'Low', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20' };
    return { status: 'High', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20' };
  }, [currentValue]);

  const heartRateZone = useMemo(() => {
    if (currentValue < 50) return 'Resting';
    if (currentValue < 60) return 'Recovery';
    if (currentValue < 70) return 'Fat Burn';
    if (currentValue < 80) return 'Aerobic';
    if (currentValue < 90) return 'Anaerobic';
    return 'Maximum';
  }, [currentValue]);

  const dateRangeDisplay = useMemo(() => {
    if (!heartRateData.length) return 'No data';
    const first = new Date(heartRateData[0].date);
    const last = new Date(heartRateData[heartRateData.length - 1].date);
    if (first.toDateString() === last.toDateString()) {
      return first.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [heartRateData]);

  const yMin = Math.max(40, Math.min(60, min - 10));
  const yMax = Math.min(200, Math.max(120, max + 10));

  // ─── Sub-components ───────────────────────────────────────────────────────

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className={`p-3 border rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{payload[0].payload.fullTime}</p>
        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{payload[0].value} BPM</p>
      </div>
    );
  };

  // Gradient stops sampled to max 20 points — prevents thousands of SVG nodes
  const GradientArea = (props) => {
    const MAX_STOPS = 20;
    const step = Math.max(1, Math.floor(visibleData.length / MAX_STOPS));
    const sampled = visibleData.filter((_, i) => i % step === 0);

    return (
      <>
        <defs>
          <linearGradient id="heartRateGradient" x1="0" y1="0" x2="1" y2="0">
            {sampled.map((pt, i, arr) => {
              if (i === arr.length - 1) return null;
              return (
                <stop
                  key={i}
                  offset={`${(i / (arr.length - 1)) * 100}%`}
                  stopColor={pt.isNormal ? '#10b981' : '#ef4444'}
                  stopOpacity={1}
                />
              );
            })}
          </linearGradient>
          <linearGradient id="heartRateFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <Area {...props} stroke="url(#heartRateGradient)" fill="url(#heartRateFill)" />
      </>
    );
  };

  const formatXAxis = (ts) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  // Slider UI — uses draftPosition for visual, sliderPosition for data
  const SliderControl = () => (
    <div className="mt-4 px-2">
      {/* Page indicator */}
      {allProcessed.length > WINDOW_SIZE && (
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
            {visibleData[0]?.time}
          </span>
          <span className={`px-2 py-0.5 rounded-full font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {WINDOW_SIZE} of {allProcessed.length} readings
          </span>
          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
            {visibleData[visibleData.length - 1]?.time}
          </span>
        </div>
      )}

      <input
        type="range"
        min="0"
        max="100"
        value={draftPosition}
        onChange={handleSliderChange}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right,
            ${darkMode ? '#ef4444' : '#f87171'} 0%,
            ${darkMode ? '#ef4444' : '#f87171'} ${draftPosition}%,
            ${darkMode ? '#374151' : '#e5e7eb'} ${draftPosition}%,
            ${darkMode ? '#374151' : '#e5e7eb'} 100%)`
        }}
      />
      <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
        <span>Older</span>
        <span>Newer</span>
      </div>
    </div>
  );

  const ChartBody = ({ height = 200 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={visibleData}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={darkMode ? '#374151' : '#f0f0f0'}
          horizontal={!darkMode}
          vertical={false}
        />
        <XAxis
          dataKey="timestamp"
          domain={['dataMin', 'dataMax']}
          ticks={timeTicks}
          tickFormatter={formatXAxis}
          stroke={darkMode ? '#9CA3AF' : '#666'}
          axisLine tickLine
          tick={{ fontSize: 12 }}
          type="number"
          scale="time"
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[yMin, yMax]}
          stroke={darkMode ? '#9CA3AF' : '#666'}
          axisLine tickLine
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceArea y1={60} y2={100} fill="#10b981" fillOpacity={0.1} ifOverflow="extendDomain" />
        <GradientArea
          type="monotone"
          dataKey="value"
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  // ─── Loading / Error / Empty states ──────────────────────────────────────

  if (loading) {
    return (
      <>
        <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-red-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading Heart Rate data...</p>
            </div>
          </div>
        </div>
        <DataModal isOpen={showDetails} onClose={() => setShowDetails(false)} title="Heart Rate Analysis" darkMode={darkMode}>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-10 h-10 animate-spin text-red-500 mx-auto" />
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
              <button onClick={fetchHeartRateData} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                Retry
              </button>
            </div>
          </div>
        </div>
        <DataModal isOpen={showDetails} onClose={() => setShowDetails(false)} title="Heart Rate Analysis" darkMode={darkMode}>
          <div className="flex items-center justify-center h-64">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          </div>
        </DataModal>
      </>
    );
  }

  if (!heartRateData.length) {
    return (
      <>
        <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Heart className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No Heart Rate data available for the selected period
              </p>
              {dateRange?.customRange && dateRange.from && dateRange.to && (
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {formatDateForAPI(dateRange.from)} to {formatDateForAPI(dateRange.to)}
                </p>
              )}
            </div>
          </div>
        </div>
        <DataModal isOpen={showDetails} onClose={() => setShowDetails(false)} title="Heart Rate Analysis" darkMode={darkMode}>
          <div className="flex items-center justify-center h-64">
            <Heart className="w-10 h-10 text-gray-400 mx-auto" />
          </div>
        </DataModal>
      </>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 md:p-4 rounded-xl bg-red-500 bg-opacity-20 shadow-lg">
            <Heart className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
          </div>
          <div>
            <h3 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Heart Rate
            </h3>
            <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{dateRangeDisplay}</p>
            {dateRange?.customRange && dateRange.from && dateRange.to && (
              <div className="flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3 text-blue-500" />
                <span className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Custom Range</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`text-xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {currentValue} BPM
            </div>
            <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Current Rate</div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Activity className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Status badges */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${status.bgColor}`}>
          <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')}`} />
          <span className={`text-sm font-medium ${status.color}`}>{status.status} Range</span>
        </div>
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
          <Zap className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">{heartRateZone} Zone</span>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-2">
        <div className="mb-3 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Normal Range (60–100 BPM)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Outside Normal Range</span>
          </div>
        </div>

        <ChartBody height={200} />
        <SliderControl />
      </div>

      {/* Detail Modal */}
      <DataModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Heart Rate Analysis"
        darkMode={darkMode}
      >
        <div className="space-y-6">

          {/* Modal date filter */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700/50 text-xs">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: '7 Days' },
                { id: 'month', label: '30 Days' },
                { id: 'custom', label: 'Custom' }
              ].map(f => {
                const active =
                  (f.id === 'custom' && localDateRange?.customRange) ||
                  (!localDateRange?.customRange && localDateRange?.period === f.id) ||
                  (!localDateRange?.period && !localDateRange?.customRange && f.id === 'today');
                return (
                  <button
                    key={f.id}
                    onClick={() => f.id === 'custom'
                      ? setLocalDateRange({ ...localDateRange, customRange: true })
                      : setLocalDateRange({ period: f.id, customRange: false })
                    }
                    className={`px-3 py-1.5 font-medium rounded-md transition-all ${active
                        ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {localDateRange?.customRange && (
              <div className="flex items-center gap-2 text-xs w-full md:w-auto">
                <input
                  type="date"
                  value={localDateRange?.from || ''}
                  onChange={e => setLocalDateRange({ ...localDateRange, from: e.target.value })}
                  className={`flex-1 md:flex-none px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-red-500/20 ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-200 focus:border-red-500/50' : 'bg-white border-gray-200 text-gray-700 focus:border-red-500'}`}
                />
                <span className="text-gray-400 font-medium">to</span>
                <input
                  type="date"
                  value={localDateRange?.to || ''}
                  onChange={e => setLocalDateRange({ ...localDateRange, to: e.target.value })}
                  className={`flex-1 md:flex-none px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-red-500/20 ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-200 focus:border-red-500/50' : 'bg-white border-gray-200 text-gray-700 focus:border-red-500'}`}
                />
              </div>
            )}
          </div>

          {/* Modal chart + slider */}
          <div>
            <ChartBody height={300} />
            <SliderControl />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <TrendingUp className="w-4 h-4 text-red-500" />, label: 'Average', value: `${averageHeartRate} BPM` },
              { icon: <Activity className="w-4 h-4 text-green-500" />, label: 'Min / Max', value: `${min} / ${max} BPM` },
              { icon: <Clock className="w-4 h-4 text-purple-500" />, label: 'Latest', value: `${latestReading?.once_heart_value ?? 'N/A'} BPM` },
              { icon: <Heart className="w-4 h-4 text-pink-500" />, label: 'Zone', value: heartRateZone },
            ].map(({ icon, label, value }) => (
              <div key={label} className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {icon}
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
                </div>
                <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Recent readings list */}
          <div>
            <h4 className={`font-semibold text-base mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Recent Readings</h4>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {heartRateData.slice().reverse().map((reading, i) => {
                const v = reading.once_heart_value;
                const dotColor = v >= 60 && v <= 100 ? 'bg-green-500'
                  : v >= 50 && v <= 120 ? 'bg-yellow-500'
                    : v < 50 ? 'bg-blue-500'
                      : 'bg-red-500';
                return (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full shadow-sm ${dotColor}`} />
                      <div>
                        <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {new Date(reading.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(reading.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {v} <span className="text-xs font-normal opacity-60">BPM</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </DataModal>
    </div>
  );
};

export default HeartRateDataComponent;