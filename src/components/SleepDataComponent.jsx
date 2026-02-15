import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Moon, Clock, TrendingUp, Eye, EyeOff, Activity, Zap, Brain, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { getSleepData } from '../lib/api';

const SleepDataComponent = ({ darkMode, onSleepDataUpdate, selectedUserId, dateRange }) => {
  const [sleepData, setSleepData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
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

  // Fetch sleep data from API
  const fetchSleepData = useCallback(async () => {
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
        console.log('Fetching sleep data for custom range:', { fromDate, toDate });
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
        console.log('Fetching sleep data with range:', range);
      }

      // Check cache first (5 minutes max)
      if (cacheRef.current.has(cacheKey)) {
        const cachedData = cacheRef.current.get(cacheKey);
        const cacheTime = cachedData.timestamp;
        const now = Date.now();
        
        // Use cache if it's less than 5 minutes old
        if (now - cacheTime < 5 * 60 * 1000) {
          console.log('Using cached sleep data:', cachedData.data.length, 'records');
          
          if (isMountedRef.current) {
            setSleepData(cachedData.data);
            if (onSleepDataUpdate) {
              onSleepDataUpdate(cachedData.data);
            }
            
            // Reset selected date when data changes
            setSelectedDate(null);
            setLoading(false);
          }
          return;
        } else {
          console.log('Cache stale, fetching fresh sleep data');
        }
      }

      console.log('Making API call with params:', { 
        userId: selectedUserId, 
        fromDate, 
        toDate, 
        range 
      });
      
      // Make API call with proper parameters
      const data = await getSleepData(selectedUserId, fromDate, toDate, range);

      // Check if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || abortControllerRef.current.signal.aborted) {
        console.log('Component unmounted or request aborted');
        return;
      }

      if (data && data.length > 0) {
        // Sort by date (oldest to newest)
        const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        console.log(`Received ${sortedData.length} sleep records`);
        console.log('Date range:', {
          first: new Date(sortedData[0].date).toLocaleDateString(),
          last: new Date(sortedData[sortedData.length - 1].date).toLocaleDateString()
        });
        
        // Cache the results with timestamp
        cacheRef.current.set(cacheKey, {
          data: sortedData,
          timestamp: Date.now()
        });

        if (isMountedRef.current) {
          setSleepData(sortedData);
          if (onSleepDataUpdate) {
            onSleepDataUpdate(sortedData);
          }
          
          // Reset selected date when data changes
          setSelectedDate(null);
        }
      } else {
        console.log('No sleep data available for selected period');
        if (isMountedRef.current) {
          setSleepData([]);
          if (onSleepDataUpdate) {
            onSleepDataUpdate([]);
          }
        }
      }
    } catch (error) {
      // Don't set error if request was aborted or component unmounted
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED' || !isMountedRef.current) {
        console.log('Request was cancelled');
        return;
      }
      
      console.error('Error fetching sleep data:', error);
      if (isMountedRef.current) {
        setError('Failed to load sleep data. Please try again.');
      }
    } finally {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [selectedUserId, onSleepDataUpdate, dateRange?.from, dateRange?.to, dateRange?.customRange, dateRange?.period]);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Immediate fetch without debounce
    fetchSleepData();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSleepData]);

  // Get available dates for selection
  const availableDates = React.useMemo(() => {
    if (!sleepData || sleepData.length === 0) return [];
    return sleepData.map(item => item.date);
  }, [sleepData]);

  // Handle date selection
  const handleDateSelect = (date) => {
    const selected = sleepData.find(item => item.date === date);
    setSelectedDate(selected);
  };

  // Process sleep data for visualization
  const processSleepData = useCallback((data) => {
    if (!data) return null;

    const sleepStages = [
      {
        stage: 'Deep Sleep',
        value: data.deep_sleep_percentage,
        color: '#1e40af',
        hours: (data.duration * data.deep_sleep_percentage / 100).toFixed(1)
      },
      {
        stage: 'Light Sleep',
        value: data.light_sleep_percentage,
        color: '#3b82f6',
        hours: (data.duration * data.light_sleep_percentage / 100).toFixed(1)
      },
      {
        stage: 'Medium Sleep',
        value: data.medium_sleep_percentage,
        color: '#60a5fa',
        hours: (data.duration * data.medium_sleep_percentage / 100).toFixed(1)
      },
      {
        stage: 'Awake',
        value: data.awake_percentage,
        color: '#e5e7eb',
        hours: (data.duration * data.awake_percentage / 100).toFixed(1)
      }
    ];

    return sleepStages;
  }, []);

  // Parse sleep quality sequence for visualization
  const parseSleepQualitySequence = useCallback((sequence) => {
    if (!sequence) return [];

    const qualityMap = {
      '-1': { label: 'Unknown', color: '#6b7280' },
      '1': { label: 'Light Sleep', color: '#3b82f6' },
      '2': { label: 'Deep Sleep', color: '#1e40af' },
      '3': { label: 'REM Sleep', color: '#8b5cf6' }
    };

    return sequence.split(' ').map((quality, index) => ({
      time: index * 10, // Assuming 10-minute intervals
      quality: parseInt(quality),
      ...qualityMap[quality] || qualityMap['-1']
    }));
  }, []);

  // Calculate sleep score based on data
  const calculateSleepScore = useCallback((data) => {
    if (!data) return 0;

    let score = 0;

    // Duration score (optimal: 7-9 hours)
    const duration = data.duration;
    if (duration >= 7 && duration <= 9) {
      score += 30;
    } else if (duration >= 6 && duration <= 10) {
      score += 20;
    } else {
      score += 10;
    }

    // Deep sleep percentage (optimal: 15-20%)
    const deepSleep = data.deep_sleep_percentage;
    if (deepSleep >= 15 && deepSleep <= 20) {
      score += 25;
    } else if (deepSleep >= 10 && deepSleep <= 25) {
      score += 15;
    } else {
      score += 5;
    }

    // Light sleep percentage (optimal: 45-55%)
    const lightSleep = data.light_sleep_percentage;
    if (lightSleep >= 45 && lightSleep <= 55) {
      score += 25;
    } else if (lightSleep >= 40 && lightSleep <= 60) {
      score += 15;
    } else {
      score += 5;
    }

    // Awake percentage (optimal: <5%)
    const awake = data.awake_percentage;
    if (awake < 5) {
      score += 20;
    } else if (awake < 10) {
      score += 10;
    } else {
      score += 5;
    }

    return Math.min(score, 100);
  }, []);

  // Format time for display
  const formatTime = useCallback((timeString) => {
    if (!timeString) return 'N/A';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }, []);

  // Format date for display
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // Format date range for display
  const getDateRangeDisplay = useCallback(() => {
    if (!sleepData || sleepData.length === 0) return 'No data';
    
    const firstDate = new Date(sleepData[0].date);
    const lastDate = new Date(sleepData[sleepData.length - 1].date);
    
    if (firstDate.toDateString() === lastDate.toDateString()) {
      return firstDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
    
    return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [sleepData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 border rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {payload[0].payload.stage}
          </p>
          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {payload[0].value}% ({payload[0].payload.hours}h)
          </p>
        </div>
      );
    }
    return null;
  };

  // Memoize processed data
  const currentData = selectedDate || (sleepData.length > 0 ? sleepData[0] : null);
  const processedData = React.useMemo(() => currentData ? processSleepData(currentData) : null, [currentData, processSleepData]);
  const sleepScore = React.useMemo(() => currentData ? calculateSleepScore(currentData) : 0, [currentData, calculateSleepScore]);
  const qualitySequence = React.useMemo(() => currentData ? parseSleepQualitySequence(currentData.sleep_quality_sequence) : [], [currentData, parseSleepQualitySequence]);
  const dateRangeDisplay = React.useMemo(() => getDateRangeDisplay(), [sleepData, getDateRangeDisplay]);

  if (loading) {
    return (
      <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading sleep data...
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
              onClick={fetchSleepData}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!sleepData || sleepData.length === 0 || !currentData) {
    return (
      <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Moon className="w-8 h-8 text-gray-400 mx-auto mb-4" />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No sleep data available for the selected period
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
          <div className="p-3 md:p-4 rounded-xl bg-indigo-500 bg-opacity-20 shadow-lg">
            <Moon className="w-6 h-6 md:w-8 md:h-8 text-indigo-500" />
          </div>
          <div>
            <h3 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Sleep Analysis
            </h3>
            <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {dateRangeDisplay}
            </p>
            {dateRange?.customRange && dateRange.from && dateRange.to && (
              <div className="flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3 text-indigo-500" />
                <span className={`text-xs ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  Custom Range
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`text-xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {sleepScore}/100
            </div>
            <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Sleep Score
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            {showDetails ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
          </button>
        </div>
      </div>

      {/* Date Selection (if multiple days) */}
      {availableDates.length > 1 && (
        <div className="mb-4">
          <label className={`block text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Select Date
          </label>
          <select
            value={currentData?.date || ''}
            onChange={(e) => handleDateSelect(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            {availableDates.map((date) => (
              <option key={date} value={date}>
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sleep Duration and Time */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {currentData.duration}h
          </div>
          <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Duration
          </div>
        </div>
        <div className="text-center">
          <div className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {formatTime(currentData.start_time)}
          </div>
          <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Sleep Start
          </div>
        </div>
        <div className="text-center">
          <div className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {formatTime(currentData.end_time)}
          </div>
          <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Wake Up
          </div>
        </div>
      </div>

      {/* Sleep Stages Chart */}
      <div className="mb-6">
        {/* Data Count Indicator */}
        <div className={`mb-3 flex items-center justify-between text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <span>
            {dateRange?.customRange ? 'Selected period' : 'Last 24 hours'}
          </span>
          <span className={`font-medium ${sleepData.length < 2 ? 'text-yellow-500' : 'text-green-500'}`}>
            {sleepData.length} sleep session{sleepData.length !== 1 ? 's' : ''} available
          </span>
        </div>
        <div className="flex items-center justify-between">
          <ResponsiveContainer width="60%" height={200}>
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="w-35% space-y-2">
            {processedData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className={`text-xs md:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {item.stage}
                </span>
                <span className={`text-xs md:text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className="mt-6 space-y-4">
          {/* Sleep Quality Sequence */}
          {qualitySequence.length > 0 && (
            <div>
              <h4 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-3`}>
                Sleep Quality Timeline
              </h4>
              <div className="grid grid-cols-12 gap-1 mb-4">
                {qualitySequence.slice(0, 48).map((item, index) => (
                  <div
                    key={index}
                    className="h-4 rounded-sm"
                    style={{ backgroundColor: item.color }}
                    title={`${Math.floor(item.time / 60)}h ${item.time % 60}m - ${item.label}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Unknown</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Light Sleep</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-800"></div>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Deep Sleep</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>REM Sleep</span>
                </div>
              </div>
            </div>
          )}

          {/* Sleep Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Deep Sleep
                </span>
              </div>
              <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentData.deep_sleep_percentage}%
              </div>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-green-500" />
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Light Sleep
                </span>
              </div>
              <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentData.light_sleep_percentage}%
              </div>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-500" />
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Medium Sleep
                </span>
              </div>
              <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentData.medium_sleep_percentage}%
              </div>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Awake
                </span>
              </div>
              <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentData.awake_percentage}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SleepDataComponent;
