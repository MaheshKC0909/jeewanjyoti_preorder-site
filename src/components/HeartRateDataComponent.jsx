import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea } from 'recharts';
import { Heart, TrendingUp, AlertCircle, RefreshCw, Activity, Clock, Zap, Calendar } from 'lucide-react';
import { getHeartRateData } from '../lib/api';

const HeartRateDataComponent = ({ darkMode, onHeartRateDataUpdate, selectedUserId, dateRange }) => {
  const [heartRateData, setHeartRateData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

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
      if (dateRange?.customRange && dateRange.from && dateRange.to) {
        // Custom date range - use from/to parameters
        fromDate = formatDateForAPI(dateRange.from);
        toDate = formatDateForAPI(dateRange.to);
        cacheKey = `${selectedUserId || 'null'}-${fromDate}-${toDate}`;
        console.log('Fetching heart rate data for custom range:', { fromDate, toDate });
      } else {
        // Use range parameter for predefined periods
        if (dateRange?.period === 'today') {
          range = '24h';
        } else if (dateRange?.period === 'week') {
          range = '7d';
        } else if (dateRange?.period === 'month') {
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
  }, [selectedUserId, onHeartRateDataUpdate, dateRange?.from, dateRange?.to, dateRange?.customRange, dateRange?.period]);

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

  // Process Heart Rate data for visualization
  const processHeartRateData = useCallback((data) => {
    if (!data || data.length === 0) return [];

    return data.map((item) => ({
      time: new Date(item.date).toLocaleTimeString('en-US', {
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
      rawDate: new Date(item.date)
    }));
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

  // Memoize processed data to prevent recalculation on every render
  const chartData = React.useMemo(() => processHeartRateData(heartRateData), [heartRateData, processHeartRateData]);
  const latestReading = React.useMemo(() => getLatestReading(), [heartRateData, getLatestReading]);
  const averageHeartRate = React.useMemo(() => calculateAverageHeartRate(heartRateData), [heartRateData, calculateAverageHeartRate]);
  const { min, max } = React.useMemo(() => calculateMinMaxHeartRate(heartRateData), [heartRateData, calculateMinMaxHeartRate]);
  const status = React.useMemo(() => getHeartRateStatus(latestReading?.once_heart_value || averageHeartRate), [latestReading, averageHeartRate, getHeartRateStatus]);
  const heartRateZone = React.useMemo(() => getHeartRateZone(latestReading?.once_heart_value || averageHeartRate), [latestReading, averageHeartRate, getHeartRateZone]);
  const dateRangeDisplay = React.useMemo(() => getDateRangeDisplay(), [heartRateData, getDateRangeDisplay]);

  // Determine Y-axis domain based on data
  const yMin = Math.max(40, Math.min(60, min - 10));
  const yMax = Math.min(200, Math.max(120, max + 10));

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return (
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
    );
  }

  if (!heartRateData || heartRateData.length === 0) {
    return (
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

      {/* Heart Rate Chart */}
      <div className="mb-6">
        {/* Data Count Indicator */}
        <div className={`mb-3 flex items-center justify-between text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <span>
            {dateRange?.customRange ? 'Selected period' : 'Last 24 hours'}
          </span>
          <span className={`font-medium ${heartRateData.length < 20 ? 'text-yellow-500' : 'text-green-500'}`}>
            {heartRateData.length} reading{heartRateData.length !== 1 ? 's' : ''} available
          </span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            {darkMode ? (
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} vertical={false} />
            ) : (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            <XAxis
              dataKey="time"
              stroke={darkMode ? "#9CA3AF" : "#666"}
              axisLine
              tickLine
              tick={{ fontSize: 12 }}
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

            {/* Low Zone (<60 BPM) - Light red */}
            <ReferenceArea
              y1={40}
              y2={60}
              fill="#ef4444"
              fillOpacity={0.1}
              ifOverflow="extendDomain"
            />

            {/* High Zone (>100 BPM) - Light red */}
            <ReferenceArea
              y1={100}
              y2={200}
              fill="#ef4444"
              fillOpacity={0.1}
              ifOverflow="extendDomain"
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.1}
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className="mt-6 space-y-4">
          {/* Heart Rate Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-red-500" />
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Average
                </span>
              </div>
              <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {averageHeartRate} BPM
              </div>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-green-500" />
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Min/Max
                </span>
              </div>
              <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {min} / {max} BPM
              </div>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Latest
                </span>
              </div>
              <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {latestReading?.once_heart_value || 'N/A'} BPM
              </div>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-pink-500" />
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Zone
                </span>
              </div>
              <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {heartRateZone}
              </div>
            </div>
          </div>

          {/* Recent Readings */}
          <div>
            <h4 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-3`}>
              Recent Readings
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {heartRateData.slice(-5).reverse().map((reading, index) => (
                <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      reading.once_heart_value >= 60 && reading.once_heart_value <= 100 ? 'bg-green-500' :
                      reading.once_heart_value >= 50 && reading.once_heart_value <= 120 ? 'bg-yellow-500' :
                      reading.once_heart_value < 50 ? 'bg-blue-500' : 'bg-red-500'
                    }`}></div>
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {new Date(reading.date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                  <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {reading.once_heart_value} BPM
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeartRateDataComponent;