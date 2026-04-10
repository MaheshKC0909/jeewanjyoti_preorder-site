import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea } from 'recharts';
import { Heart, TrendingUp, AlertCircle, RefreshCw, Activity, Clock, Zap, Calendar, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { getHeartRateData } from '../lib/api';
import DataModal from './ui/Modal';

const HeartRateDataComponent = ({ darkMode, onHeartRateDataUpdate, selectedUserId, dateRange }) => {
  const [heartRateData, setHeartRateData] = useState([]);
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

  // Fetch Heart Rate data from API
  const fetchHeartRateData = useCallback(async () => {
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
      if (localDateRange?.customRange && localDateRange?.from && localDateRange?.to) {
        // Custom date range - use from/to parameters
        fromDate = formatDateForAPI(localDateRange.from);
        toDate = formatDateForAPI(localDateRange.to);
        cacheKey = `${selectedUserId || 'null'}-${fromDate}-${toDate}`;
        console.log('Fetching heart rate data for custom range:', { fromDate, toDate });
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
        console.log('Fetching heart rate data with range:', range);
      }

      // Check cache first (but don't wait for it if it's stale - 5 minutes max)
      if (cacheRef.current.has(cacheKey)) {
        const cachedData = cacheRef.current.get(cacheKey);
        const cacheTime = cachedData.timestamp;
        const now = Date.now();

        // Use cache if it's less than 5 minutes old
        if (now - cacheTime < 5 * 60 * 1000) {
          console.log('Using cached heart rate data:', cachedData.data.length, 'records');

          if (isMountedRef.current) {
            setHeartRateData(cachedData.data);
            onHeartRateDataUpdate(cachedData.data);
            setLoading(false);
          }
          return;
        } else {
          console.log('Cache stale, fetching fresh data');
        }
      }

      console.log('Making API call with params:', {
        userId: selectedUserId,
        fromDate,
        toDate,
        range
      });

      // Make API call with proper parameters
      const data = await getHeartRateData(selectedUserId, fromDate, toDate, range);

      // Check if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || abortControllerRef.current.signal.aborted) {
        console.log('Component unmounted or request aborted');
        return;
      }

      if (data && data.length > 0) {
        // Sort by date (oldest to newest for charting)
        const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));

        console.log(`Received ${sortedData.length} heart rate records`);

        // Cache the results with timestamp
        cacheRef.current.set(cacheKey, {
          data: sortedData,
          timestamp: Date.now()
        });

        if (isMountedRef.current) {
          setHeartRateData(sortedData);
          onHeartRateDataUpdate(sortedData);
          // Reset slider to most recent data when new data arrives
          setSliderPosition(100);
        }
      } else {
        console.log('No heart rate data available for selected period');
        if (isMountedRef.current) {
          setHeartRateData([]);
          onHeartRateDataUpdate([]);
        }
      }
    } catch (error) {
      // Don't set error if request was aborted or component unmounted
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED' || !isMountedRef.current) {
        console.log('Request was cancelled');
        return;
      }

      console.error('Error fetching heart rate data:', error);
      if (isMountedRef.current) {
        setError('Failed to load heart rate data. Please try again.');
      }
    } finally {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [selectedUserId, onHeartRateDataUpdate, localDateRange?.from, localDateRange?.to, localDateRange?.customRange, localDateRange?.period]);

  useEffect(() => {
    isMountedRef.current = true;

    // Immediate fetch without debounce
    fetchHeartRateData();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchHeartRateData]);

  // Process Heart Rate data for visualization with 30-minute intervals
  const processHeartRateData = useCallback((data) => {
    if (!data || data.length === 0) return [];

    return data.map((item) => {
      const date = new Date(item.date);
      return {
        time: date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        value: item.once_heart_value,
        fullTime: new Date(item.date).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }),
        date: item.date,
        rawDate: new Date(item.date),
        timestamp: new Date(item.date).getTime(),
        // Add color information based on heart rate value
        isNormal: item.once_heart_value >= 60 && item.once_heart_value <= 100
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
  }, []);

  // Get visible data based on slider position (12-hour window)
  const getVisibleData = useCallback(() => {
    if (!heartRateData || heartRateData.length === 0) return [];

    const processedData = processHeartRateData(heartRateData);
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
  }, [heartRateData, sliderPosition, processHeartRateData]);

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

  // Calculate average Heart Rate
  const calculateAverageHeartRate = useCallback((data) => {
    if (!data || data.length === 0) return 0;
    const sum = data.reduce((acc, item) => acc + item.once_heart_value, 0);
    return Math.round(sum / data.length);
  }, []);

  // Calculate min and max Heart Rate
  const calculateMinMaxHeartRate = useCallback((data) => {
    if (!data || data.length === 0) return { min: 0, max: 0 };
    const values = data.map(item => item.once_heart_value);
    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }, []);

  // Get Heart Rate status
  const getHeartRateStatus = useCallback((value) => {
    if (value >= 60 && value <= 100) return { status: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' };
    if (value >= 50 && value <= 120) return { status: 'Elevated', color: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' };
    if (value < 50) return { status: 'Low', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20' };
    return { status: 'High', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20' };
  }, []);

  // Get latest reading
  const getLatestReading = useCallback(() => {
    if (!heartRateData || heartRateData.length === 0) return null;
    return heartRateData[heartRateData.length - 1];
  }, [heartRateData]);

  // Get Heart Rate Zone
  const getHeartRateZone = useCallback((value) => {
    if (value < 50) return 'Resting';
    if (value < 60) return 'Recovery';
    if (value < 70) return 'Fat Burn';
    if (value < 80) return 'Aerobic';
    if (value < 90) return 'Anaerobic';
    return 'Maximum';
  }, []);

  // Format date range for display
  const getDateRangeDisplay = useCallback(() => {
    if (!heartRateData || heartRateData.length === 0) return 'No data';

    const firstDate = new Date(heartRateData[0].date);
    const lastDate = new Date(heartRateData[heartRateData.length - 1].date);

    if (firstDate.toDateString() === lastDate.toDateString()) {
      return firstDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [heartRateData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 border rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {payload[0].payload.fullTime}
          </p>
          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {payload[0].value} BPM
          </p>
        </div>
      );
    }
    return null;
  };

  // Handle slider change
  const handleSliderChange = (e) => {
    setSliderPosition(parseInt(e.target.value, 10));
  };

  // Memoize processed data
  const chartData = React.useMemo(() => processHeartRateData(heartRateData), [heartRateData, processHeartRateData]);
  const visibleData = React.useMemo(() => getVisibleData(), [getVisibleData]);
  const timeTicks = React.useMemo(() => generateTimeTicks(visibleData), [visibleData, generateTimeTicks]);

  const latestReading = React.useMemo(() => getLatestReading(), [heartRateData, getLatestReading]);
  const averageHeartRate = React.useMemo(() => calculateAverageHeartRate(heartRateData), [heartRateData, calculateAverageHeartRate]);
  const { min, max } = React.useMemo(() => calculateMinMaxHeartRate(heartRateData), [heartRateData, calculateMinMaxHeartRate]);
  const status = React.useMemo(() => getHeartRateStatus(latestReading?.once_heart_value || averageHeartRate), [latestReading, averageHeartRate, getHeartRateStatus]);
  const heartRateZone = React.useMemo(() => getHeartRateZone(latestReading?.once_heart_value || averageHeartRate), [latestReading, averageHeartRate, getHeartRateZone]);
  const dateRangeDisplay = React.useMemo(() => getDateRangeDisplay(), [heartRateData, getDateRangeDisplay]);

  // Determine Y-axis domain based on data
  const yMin = Math.max(40, Math.min(60, min - 10));
  const yMax = Math.min(200, Math.max(120, max + 10));

  // Custom Area component with gradient based on value
  const GradientArea = (props) => {
    return (
      <>
        <defs>
          <linearGradient id="heartRateGradient" x1="0" y1="0" x2="1" y2="0">
            {visibleData.map((point, index, array) => {
              if (index === array.length - 1) return null;

              // Calculate position based on index
              const position = index / (array.length - 1);
              const nextPosition = (index + 1) / (array.length - 1);

              // Determine colors based on values
              const currentColor = point.isNormal ? '#10b981' : '#ef4444';
              const nextColor = array[index + 1].isNormal ? '#10b981' : '#ef4444';

              return (
                <React.Fragment key={index}>
                  <stop offset={`${position * 100}%`} stopColor={currentColor} stopOpacity={1} />
                  <stop offset={`${nextPosition * 100}%`} stopColor={nextColor} stopOpacity={1} />
                </React.Fragment>
              );
            })}
          </linearGradient>
          <linearGradient id="heartRateFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <Area
          {...props}
          stroke="url(#heartRateGradient)"
          fill="url(#heartRateFill)"
        />
      </>
    );
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

  if (loading) {
    return (
      <>
        <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-red-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading Heart Rate data...
              </p>
            </div>
          </div>
        </div>
        <DataModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="Heart Rate Analysis"
          darkMode={darkMode}
        >
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-10 h-10 animate-spin text-red-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Updating heart rate details...
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
                onClick={fetchHeartRateData}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
        <DataModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="Heart Rate Analysis"
          darkMode={darkMode}
        >
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Unable to load heart rate details.
              </p>
            </div>
          </div>
        </DataModal>
      </>
    );
  }

  if (!heartRateData || heartRateData.length === 0) {
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
                  Selected range: {formatDateForAPI(dateRange.from)} to {formatDateForAPI(dateRange.to)}
                </p>
              )}
            </div>
          </div>
        </div>
        <DataModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="Heart Rate Analysis"
          darkMode={darkMode}
        >
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Heart className="w-10 h-10 text-gray-400 mx-auto mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No heart rate details are available for this range.
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 md:p-4 rounded-xl bg-red-500 bg-opacity-20 shadow-lg">
            <Heart className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
          </div>
          <div>
            <h3 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Heart Rate
            </h3>
            <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {dateRangeDisplay}
            </p>
            {dateRange?.customRange && dateRange.from && dateRange.to && (
              <div className="flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3 text-blue-500" />
                <span className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  Custom Range
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`text-xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {latestReading?.once_heart_value || averageHeartRate} BPM
            </div>
            <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Current Rate
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

      {/* Heart Rate Status and Zone */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${status.bgColor}`}>
          <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')}`}></div>
          <span className={`text-sm font-medium ${status.color}`}>
            {status.status} Range
          </span>
        </div>
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
          <Zap className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
            {heartRateZone} Zone
          </span>
        </div>
      </div>

      {/* Heart Rate Chart with 12-hour window and slider */}
      <div className="mb-6">
        {/* Icon Legend */}
        <div className="mb-3 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Normal Range (60-100 BPM)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Outside Normal Range</span>
          </div>
        </div>

        {/* Chart Container */}
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={visibleData}>
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
                domain={[yMin, yMax]}
                stroke={darkMode ? "#9CA3AF" : "#666"}
                axisLine
                tickLine
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Reference areas for normal range */}
              <ReferenceArea
                y1={60}
                y2={100}
                fill="#10b981"
                fillOpacity={0.1}
                ifOverflow="extendDomain"
              />

              <GradientArea
                type="monotone"
                dataKey="value"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0, fill: "#ef4444" }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Slider Control */}
        <div className="mt-4 px-2">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPosition}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            style={{
              background: `linear-gradient(to right, ${darkMode ? '#ef4444' : '#f87171'} 0%, ${darkMode ? '#ef4444' : '#f87171'} ${sliderPosition}%, ${darkMode ? '#374151' : '#e5e7eb'} ${sliderPosition}%, ${darkMode ? '#374151' : '#e5e7eb'} 100%)`
            }}
          />
          <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Older</span>
            <span>Newer</span>
          </div>
        </div>
      </div>

      <DataModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Heart Rate Analysis"
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
                      ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 shadow-sm'
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
                  value={localDateRange?.from || ''}
                  onChange={(e) => setLocalDateRange({ ...localDateRange, from: e.target.value })}
                  className={`flex-1 md:flex-none px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-red-500/20 ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-200 focus:border-red-500/50' : 'bg-white border-gray-200 text-gray-700 focus:border-red-500'}`}
                />
                <span className="text-gray-400 font-medium">to</span>
                <input
                  type="date"
                  value={localDateRange?.to || ''}
                  onChange={(e) => setLocalDateRange({ ...localDateRange, to: e.target.value })}
                  className={`flex-1 md:flex-none px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-red-500/20 ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-200 focus:border-red-500/50' : 'bg-white border-gray-200 text-gray-700 focus:border-red-500'}`}
                />
              </div>
            )}
          </div>

          {/* Main Chart in Modal */}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visibleData}>
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
                  domain={[yMin, yMax]}
                  stroke={darkMode ? "#9CA3AF" : "#666"}
                  axisLine
                  tickLine
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Reference areas for normal range */}
                <ReferenceArea
                  y1={60}
                  y2={100}
                  fill="#10b981"
                  fillOpacity={0.1}
                  ifOverflow="extendDomain"
                />

                <GradientArea
                  type="monotone"
                  dataKey="value"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#ef4444" }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
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
                background: `linear-gradient(to right, ${darkMode ? '#ef4444' : '#f87171'} 0%, ${darkMode ? '#ef4444' : '#f87171'} ${sliderPosition}%, ${darkMode ? '#374151' : '#e5e7eb'} ${sliderPosition}%, ${darkMode ? '#374151' : '#e5e7eb'} 100%)`
              }}
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>Older</span>
              <span>Newer</span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Heart Rate Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Average
                  </span>
                </div>
                <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {averageHeartRate} BPM
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
                  {min} / {max} BPM
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
                  {latestReading?.once_heart_value || 'N/A'} BPM
                </div>
              </div>
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Zone
                  </span>
                </div>
                <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {heartRateZone}
                </div>
              </div>
            </div>

            {/* Recent Readings */}
            <div>
              <h4 className={`font-semibold text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>
                Recent Readings
              </h4>
              <div className={`space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar`}>
                {heartRateData.slice().reverse().map((reading, index) => (
                  <div key={index} className={`flex items-center justify-between p-4 rounded-xl border ${darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-100'
                    }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full shadow-sm ${reading.once_heart_value >= 60 && reading.once_heart_value <= 100 ? 'bg-green-500' :
                        reading.once_heart_value >= 50 && reading.once_heart_value <= 120 ? 'bg-yellow-500' :
                          reading.once_heart_value < 50 ? 'bg-blue-500' : 'bg-red-500'
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
                      {reading.once_heart_value} <span className="text-xs font-normal opacity-60">BPM</span>
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

export default HeartRateDataComponent;