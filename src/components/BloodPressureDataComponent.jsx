import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Thermometer, TrendingUp, AlertCircle, RefreshCw, Activity, Clock, Calendar, Gauge, Eye, EyeOff, X } from 'lucide-react';
import { getBloodPressureData } from '../lib/api';
import DataModal from './ui/Modal';

const BloodPressureDataComponent = ({ darkMode, onBloodPressureDataUpdate, selectedUserId, dateRange }) => {
  const [bpData, setBpData] = useState([]);
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

      if (localDateRange?.customRange && localDateRange.from && localDateRange.to) {
        fromDate = formatDateForAPI(localDateRange.from);
        toDate = formatDateForAPI(localDateRange.to);
        cacheKey = `${selectedUserId || 'null'}-bp-${fromDate}-${toDate}`;
        console.log('Fetching blood pressure data for custom range:', { fromDate, toDate });
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
  }, [selectedUserId, onBloodPressureDataUpdate, localDateRange]);

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

  // Get visible data based on slider position (12-hour window)
  const getVisibleData = useCallback(() => {
    if (!bpData || bpData.length === 0) return [];

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
                  value={localDateRange?.from || ''}
                  onChange={(e) => setLocalDateRange({ ...localDateRange, from: e.target.value })}
                  className={`flex-1 md:flex-none px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-orange-500/20 ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-200 focus:border-orange-500/50' : 'bg-white border-gray-200 text-gray-700 focus:border-orange-500'}`}
                />
                <span className="text-gray-400 font-medium">to</span>
                <input
                  type="date"
                  value={localDateRange?.to || ''}
                  onChange={(e) => setLocalDateRange({ ...localDateRange, to: e.target.value })}
                  className={`flex-1 md:flex-none px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-orange-500/20 ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-200 focus:border-orange-500/50' : 'bg-white border-gray-200 text-gray-700 focus:border-orange-500'}`}
                />
              </div>
            )}
          </div>

          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {bpData.length} records available in this period
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={visibleData} isAnimationActive={false}>
              {darkMode ? <CartesianGrid strokeDasharray="3 3" stroke="#374151" /> : <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
              <YAxis stroke={darkMode ? "#9CA3AF" : "#666"} tick={{ fontSize: 11 }} />
              <YAxis stroke={darkMode ? "#9CA3AF" : "#666"} tick={{ fontSize: 11 }} />
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
        </div>
      </DataModal>
    </div>
  );
};

export default BloodPressureDataComponent;