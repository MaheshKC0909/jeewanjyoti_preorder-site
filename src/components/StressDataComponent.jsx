import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Brain, TrendingUp, AlertCircle, RefreshCw, Activity, Clock, Calendar, X } from 'lucide-react';
import { getStressData } from '../lib/api';
import DataModal from './ui/Modal';

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

      let fromDate = null;
      let toDate = null;
      let range = null;
      let cacheKey;

      if (localDateRange?.customRange && localDateRange.from && localDateRange.to) {
        fromDate = formatDateForAPI(localDateRange.from);
        toDate = formatDateForAPI(localDateRange.to);
        cacheKey = `${selectedUserId || 'null'}-stress-${fromDate}-${toDate}`;
        console.log('Fetching stress data for custom range:', { fromDate, toDate });
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

      const data = await getStressData(selectedUserId, fromDate, toDate, range);

      if (!isMountedRef.current || abortControllerRef.current.signal.aborted) {
        return;
      }

      if (data && data.length > 0) {
        const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        
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
  }, [selectedUserId, onStressDataUpdate, localDateRange]);

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

  // Process stress data for chart
  const processStressData = useCallback((data) => {
    if (!data || data.length === 0) return [];

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

  // Calculate average stress
  const calculateAverageStress = useCallback((data) => {
    if (!data || data.length === 0) return 0;
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
    return stressData[stressData.length - 1];
  }, [stressData]);

  // Format date range for display
  const getDateRangeDisplay = useCallback(() => {
    if (!stressData || stressData.length === 0) return 'No data';
    const firstDate = new Date(stressData[0].date);
    const lastDate = new Date(stressData[stressData.length - 1].date);
    if (firstDate.toDateString() === lastDate.toDateString()) {
      return firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [stressData]);

  // Get visible data based on slider position (12-hour window)
  const getVisibleData = useCallback(() => {
    if (!stressData || stressData.length === 0) return [];

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 md:p-4 rounded-xl bg-purple-500 bg-opacity-20 shadow-lg">
            <Brain className="w-6 h-6 md:w-8 md:h-8 text-purple-500" />
          </div>
          <div>
            <h3 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Stress Level</h3>
            <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{dateRangeDisplay}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`text-xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {latestReading?.stress || averageStress}
            </div>
            <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Current Level</div>
          </div>
          <button onClick={() => setShowDetails(!showDetails)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <Activity className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${status.bgColor}`}>
          <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')}`}></div>
          <span className={`text-sm font-medium ${status.color}`}>{status.status} Stress</span>
        </div>
      </div>

      <div className="mb-6">
        <div className={`mb-3 flex items-center justify-between text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <span>{dateRange?.customRange ? 'Selected period' : 'Last 24 hours'}</span>
          <span>{stressData.length} reading{stressData.length !== 1 ? 's' : ''}</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} isAnimationActive={false}>
            {darkMode ? <CartesianGrid strokeDasharray="3 3" stroke="#374151" /> : <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis dataKey="time" stroke={darkMode ? "#9CA3AF" : "#666"} tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} stroke={darkMode ? "#9CA3AF" : "#666"} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" stroke={darkMode ? "#a855f7" : "#8b5cf6"} fill={darkMode ? "#a855f7" : "#8b5cf6"} fillOpacity={0.2} strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
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
                  value={localDateRange?.from || ''}
                  onChange={(e) => setLocalDateRange({ ...localDateRange, from: e.target.value })}
                  className={`flex-1 md:flex-none px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-purple-500/20 ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-200 focus:border-purple-500/50' : 'bg-white border-gray-200 text-gray-700 focus:border-purple-500'}`}
                />
                <span className="text-gray-400 font-medium">to</span>
                <input
                  type="date"
                  value={localDateRange?.to || ''}
                  onChange={(e) => setLocalDateRange({ ...localDateRange, to: e.target.value })}
                  className={`flex-1 md:flex-none px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-purple-500/20 ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-200 focus:border-purple-500/50' : 'bg-white border-gray-200 text-gray-700 focus:border-purple-500'}`}
                />
              </div>
            )}
          </div>

          {/* Main Chart in Modal */}
          <div className="h-[300px] w-full p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visibleData} isAnimationActive={false}>
                <defs>
                  <linearGradient id="colorStressModal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={darkMode ? "#a855f7" : "#8b5cf6"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={darkMode ? "#a855f7" : "#8b5cf6"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#374151' : '#f3f4f6'} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: darkMode ? '#9CA3AF' : '#6B7280' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: darkMode ? '#9CA3AF' : '#6B7280' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={darkMode ? "#a855f7" : "#8b5cf6"} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorStressModal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

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
                background: `linear-gradient(to right, ${darkMode ? '#a855f7' : '#8b5cf6'} 0%, ${darkMode ? '#a855f7' : '#8b5cf6'} ${sliderPosition}%, ${darkMode ? '#374151' : '#e5e7eb'} ${sliderPosition}%, ${darkMode ? '#374151' : '#e5e7eb'} 100%)`
              }}
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>Older</span>
              <span>Newer</span>
            </div>
          </div>

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
                Reading Timeline
              </h4>
              <div className={`space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar`}>
                {stressData.slice().reverse().map((reading, index) => (
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