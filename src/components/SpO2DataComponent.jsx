import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Droplets, TrendingUp, AlertCircle, RefreshCw, Activity, Clock, Calendar } from 'lucide-react';
import { getSpO2Data } from '../lib/api';

const SpO2DataComponent = ({ darkMode, onSpO2DataUpdate, selectedUserId, dateRange }) => {
  const [spo2Data, setSpO2Data] = useState([]);
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
      if (dateRange?.customRange && dateRange.from && dateRange.to) {
        // Custom date range - use from/to parameters
        fromDate = formatDateForAPI(dateRange.from);
        toDate = formatDateForAPI(dateRange.to);
        cacheKey = `${selectedUserId || 'null'}-${fromDate}-${toDate}`;
        console.log('Fetching SpO2 data for custom range:', { fromDate, toDate });
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
      const data = await getSpO2Data(selectedUserId, fromDate, toDate, range);

      // Check if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || abortControllerRef.current.signal.aborted) {
        console.log('Component unmounted or request aborted');
        return;
      }

      if (data && data.length > 0) {
        // Sort by date (oldest to newest for charting)
        const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        
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
  }, [selectedUserId, onSpO2DataUpdate, dateRange?.from, dateRange?.to, dateRange?.customRange, dateRange?.period]);

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

  // Process SpO2 data for visualization
  const processSpO2Data = useCallback((data) => {
    if (!data || data.length === 0) return [];

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

    return sortedData.map((item, index) => ({
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
      rawDate: new Date(item.date)
    }));
  }, []);

  // Calculate average SpO2
  const calculateAverageSpO2 = useCallback((data) => {
    if (!data || data.length === 0) return 0;
    const sum = data.reduce((acc, item) => acc + item.Blood_oxygen, 0);
    return Math.round(sum / data.length);
  }, []);

  // Calculate min and max SpO2
  const calculateMinMaxSpO2 = useCallback((data) => {
    if (!data || data.length === 0) return { min: 0, max: 0 };
    const values = data.map(item => item.Blood_oxygen);
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

  // Format date range for display
  const getDateRangeDisplay = useCallback(() => {
    if (!spo2Data || spo2Data.length === 0) return 'No data';
    
    const firstDate = new Date(spo2Data[0].date);
    const lastDate = new Date(spo2Data[spo2Data.length - 1].date);
    
    if (firstDate.toDateString() === lastDate.toDateString()) {
      return firstDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
    
    return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [spo2Data]);

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

  // Memoize processed data to prevent recalculation on every render
  const chartData = React.useMemo(() => processSpO2Data(spo2Data), [spo2Data, processSpO2Data]);
  const latestReading = React.useMemo(() => getLatestReading(), [spo2Data, getLatestReading]);
  const averageSpO2 = React.useMemo(() => calculateAverageSpO2(spo2Data), [spo2Data, calculateAverageSpO2]);
  const { min, max } = React.useMemo(() => calculateMinMaxSpO2(spo2Data), [spo2Data, calculateMinMaxSpO2]);
  const status = React.useMemo(() => getSpO2Status(latestReading?.Blood_oxygen || averageSpO2), [latestReading, averageSpO2, getSpO2Status]);
  const dateRangeDisplay = React.useMemo(() => getDateRangeDisplay(), [spo2Data, getDateRangeDisplay]);

  if (loading) {
    return (
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
              onClick={fetchSpO2Data}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!spo2Data || spo2Data.length === 0) {
    return (
      <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Droplets className="w-8 h-8 text-gray-400 mx-auto mb-4" />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No SpO2 data available for the selected period
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
              {latestReading?.Blood_oxygen || averageSpO2}%
            </div>
            <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Current Level
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
      <div className="mb-6 flex flex-wrap gap-3">
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${status.bgColor}`}>
          <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')}`}></div>
          <span className={`text-sm font-medium ${status.color}`}>
            {status.status} Range
          </span>
        </div>
      </div>

      {/* SpO2 Chart */}
      <div className="mb-6">
        {/* Data Count Indicator */}
        <div className={`mb-3 flex items-center justify-between text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <span>
            {dateRange?.customRange ? 'Selected period' : 'Last 24 hours'}
          </span>
          <span className={`font-medium ${spo2Data.length < 20 ? 'text-yellow-500' : 'text-green-500'}`}>
            {spo2Data.length} reading{spo2Data.length !== 1 ? 's' : ''} available
          </span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
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
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className="mt-6 space-y-4">
          {/* SpO2 Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Average
                </span>
              </div>
              <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {averageSpO2}%
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
                {min}% / {max}%
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
                {latestReading?.Blood_oxygen || 'N/A'}%
              </div>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-4 h-4 text-cyan-500" />
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Status
                </span>
              </div>
              <div className={`text-lg font-bold ${status.color}`}>
                {status.status}
              </div>
            </div>
          </div>

          {/* Recent Readings */}
          <div>
            <h4 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-3`}>
              Recent Readings
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {spo2Data.slice(-5).reverse().map((reading, index) => (
                <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      reading.Blood_oxygen >= 95 ? 'bg-green-500' :
                      reading.Blood_oxygen >= 90 ? 'bg-yellow-500' : 'bg-red-500'
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
                    {reading.Blood_oxygen}%
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

export default SpO2DataComponent;