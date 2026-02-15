import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Brain, TrendingUp, AlertCircle, RefreshCw, Activity, Clock, Calendar } from 'lucide-react';
import { getStressData } from '../lib/api';

const StressDataComponent = ({ darkMode, onStressDataUpdate, selectedUserId, dateRange }) => {
  const [stressData, setStressData] = useState([]);
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

      if (dateRange?.customRange && dateRange.from && dateRange.to) {
        fromDate = formatDateForAPI(dateRange.from);
        toDate = formatDateForAPI(dateRange.to);
        cacheKey = `${selectedUserId || 'null'}-stress-${fromDate}-${toDate}`;
        console.log('Fetching stress data for custom range:', { fromDate, toDate });
      } else {
        if (dateRange?.period === 'today') range = '24h';
        else if (dateRange?.period === 'week') range = '7d';
        else if (dateRange?.period === 'month') range = '30d';
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
  }, [selectedUserId, onStressDataUpdate, dateRange]);

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
  const latestReading = React.useMemo(() => getLatestReading(), [stressData, getLatestReading]);
  const averageStress = React.useMemo(() => calculateAverageStress(stressData), [stressData, calculateAverageStress]);
  const status = React.useMemo(() => getStressStatus(latestReading?.stress || averageStress), [latestReading, averageStress, getStressStatus]);
  const dateRangeDisplay = React.useMemo(() => getDateRangeDisplay(), [stressData, getDateRangeDisplay]);

  if (loading) {
    return (
      <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading stress data...</p>
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
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>{error}</p>
            <button onClick={fetchStressData} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
              Retry
            </button>
          </div>
        </div>
      </div>
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
          <AreaChart data={chartData}>
            {darkMode ? <CartesianGrid strokeDasharray="3 3" stroke="#374151" /> : <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis dataKey="time" stroke={darkMode ? "#9CA3AF" : "#666"} tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} stroke={darkMode ? "#9CA3AF" : "#666"} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {showDetails && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Average</span>
              </div>
              <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{averageStress}</div>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-green-500" />
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Latest</span>
              </div>
              <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{latestReading?.stress || 'N/A'}</div>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Readings</span>
              </div>
              <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stressData.length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StressDataComponent;