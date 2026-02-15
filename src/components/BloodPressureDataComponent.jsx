import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Thermometer, TrendingUp, AlertCircle, RefreshCw, Activity, Clock, Calendar, Gauge, Eye, EyeOff } from 'lucide-react';
import { getBloodPressureData } from '../lib/api';

const BloodPressureDataComponent = ({ darkMode, onBloodPressureDataUpdate, selectedUserId, dateRange }) => {
  const [bpData, setBpData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Cache and refs
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

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

      let fromDate = null;
      let toDate = null;
      let range = null;
      let cacheKey;

      if (dateRange?.customRange && dateRange.from && dateRange.to) {
        fromDate = formatDateForAPI(dateRange.from);
        toDate = formatDateForAPI(dateRange.to);
        cacheKey = `${selectedUserId || 'null'}-bp-${fromDate}-${toDate}`;
        console.log('Fetching blood pressure data for custom range:', { fromDate, toDate });
      } else {
        if (dateRange?.period === 'today') range = '24h';
        else if (dateRange?.period === 'week') range = '7d';
        else if (dateRange?.period === 'month') range = '30d';
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

      const data = await getBloodPressureData(selectedUserId, fromDate, toDate, range);

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
  }, [selectedUserId, onBloodPressureDataUpdate, dateRange]);

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
    if (!data || data.length === 0) return [];

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
    return bpData[bpData.length - 1];
  }, [bpData]);

  const getDateRangeDisplay = useCallback(() => {
    if (!bpData || bpData.length === 0) return 'No data';
    const firstDate = new Date(bpData[0].date);
    const lastDate = new Date(bpData[bpData.length - 1].date);
    if (firstDate.toDateString() === lastDate.toDateString()) {
      return firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [bpData]);

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
  const latestReading = React.useMemo(() => getLatestReading(), [bpData, getLatestReading]);
  const averageBP = React.useMemo(() => calculateAverageBP(bpData), [bpData, calculateAverageBP]);
  const status = React.useMemo(() => 
    getBPStatus(latestReading?.sbp || averageBP.systolic, latestReading?.dbp || averageBP.diastolic), 
    [latestReading, averageBP, getBPStatus]
  );
  const dateRangeDisplay = React.useMemo(() => getDateRangeDisplay(), [bpData, getDateRangeDisplay]);

  if (loading) {
    return (
      <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading blood pressure...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (!bpData || bpData.length === 0) {
    return (
      <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <Thermometer className="w-8 h-8 text-gray-400 mx-auto mb-4" />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No blood pressure data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-orange-500 bg-opacity-20 shadow-lg">
            <Thermometer className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Blood Pressure
            </h3>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {dateRangeDisplay}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`text-lg md:text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {latestReading ? `${latestReading.sbp}/${latestReading.dbp}` : `${averageBP.systolic}/${averageBP.diastolic}`}
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>mmHg</div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            {showDetails ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="mb-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${status.bgColor}`}>
          <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')}`}></div>
          <span className={`text-xs font-medium ${status.color}`}>{status.status}</span>
        </div>
      </div>

      {/* Expandable Chart */}
      {showDetails && (
        <div className="mt-4 space-y-4">
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
            {bpData.length} reading{bpData.length !== 1 ? 's' : ''} available
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              {darkMode ? <CartesianGrid strokeDasharray="3 3" stroke="#374151" /> : <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
              <XAxis dataKey="time" stroke={darkMode ? "#9CA3AF" : "#666"} tick={{ fontSize: 10 }} />
              <YAxis stroke={darkMode ? "#9CA3AF" : "#666"} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="systolic" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-orange-500" />
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Avg</span>
              </div>
              <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {averageBP.systolic}/{averageBP.diastolic}
              </div>
            </div>
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-green-500" />
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Latest</span>
              </div>
              <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {latestReading ? `${latestReading.sbp}/${latestReading.dbp}` : 'N/A'}
              </div>
            </div>
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-1 mb-1">
                <Activity className="w-3 h-3 text-blue-500" />
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Readings</span>
              </div>
              <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{bpData.length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodPressureDataComponent;