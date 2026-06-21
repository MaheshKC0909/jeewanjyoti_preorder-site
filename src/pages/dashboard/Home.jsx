import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getBatteryStatus, getAIData } from '../../lib/api';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import BatteryWidget from '../../components/BatteryWidget';
import { Heart, Moon, Activity, Brain, Calendar, TrendingUp, Droplets, Eye, EyeOff } from 'lucide-react';
import SleepDataComponent from '../../components/SleepDataComponent';
import SpO2DataComponent from '../../components/SpO2DataComponent';
import HeartRateDataComponent from '../../components/HeartRateDataComponent';
import ActivitySummary from '../../components/ActivitySummary';
import StressDataComponent from '../../components/StressDataComponent';
import HRVDataComponent from '../../components/HRVDataComponent';
import BloodPressureDataComponent from '../../components/BloodPressureDataComponent';


const HomeTab = ({
  darkMode,
  selectedUserId,
  selectedUserInfo,
  globalDateFilter,
  globalDateRange
}) => {
  // State for all health data
  const [sleepData, setSleepData] = useState(null);
  const [spo2Data, setSpO2Data] = useState(null);
  const [heartRateData, setHeartRateData] = useState(null);
  const [stepsData, setStepsData] = useState(null);
  const [bloodPressureData, setBloodPressureData] = useState(null);
  const [stressApiData, setStressApiData] = useState(null);
  const [hrvApiData, setHrvApiData] = useState(null);
  const [batteryData, setBatteryData] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiSummaries, setShowAiSummaries] = useState(false);

  // State for loading
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoadingStates, setDataLoadingStates] = useState({
    heartRate: false,
    spo2: false,
    sleep: false,
    steps: false,
    bloodPressure: false,
    stress: false,
    hrv: false
  });

  // Cache ref
  const cacheRef = useRef(new Map());

  // Memoized values for quick stats
  const latestHeartRate = useMemo(() => {
    if (!heartRateData || !Array.isArray(heartRateData) || heartRateData.length === 0) return '—';
    const last = heartRateData[heartRateData.length - 1];
    // single reading → once_heart_value; daily aggregate → average_heart_rate
    const val = last?.once_heart_value ?? (last?.average_heart_rate ? Math.round(last.average_heart_rate) : undefined);
    return val ?? '—';
  }, [heartRateData]);

  const displaySleepScore = useMemo(() => {
    if (aiData && aiData.sleep_score !== undefined && aiData.sleep_score !== null) {
      return aiData.sleep_score;
    }
    return '—';
  }, [aiData]);

  const latestSpO2 = useMemo(() => {
    return spo2Data && Array.isArray(spo2Data) && spo2Data.length > 0
      ? spo2Data[spo2Data.length - 1]?.Blood_oxygen
      : '—';
  }, [spo2Data]);

  const dailySteps = useMemo(() => {
    return stepsData?.step
      ? stepsData.step.toLocaleString()
      : '—';
  }, [stepsData]);

  // Format date range for display
  const getDateRangeDisplay = () => {
    if (globalDateRange?.customRange && globalDateRange.date) {
      return `Filtering: ${globalDateRange.date}`;
    }

    switch (globalDateFilter) {
      case 'today':
        return 'Showing data for today';
      case 'week':
        return 'Showing data for the last 7 days';
      case 'month':
        return 'Showing data for the last 30 days';
      case 'custom':
        return 'Showing custom date';
      default:
        return 'Showing latest data';
    }
  };

  // Track loading states from child components
  const handleDataLoading = (dataType, isLoading) => {
    setDataLoadingStates(prev => ({
      ...prev,
      [dataType]: isLoading
    }));
  };

  // Update overall loading state
  useEffect(() => {
    const anyLoading = Object.values(dataLoadingStates).some(state => state === true);
    setIsLoading(anyLoading);
  }, [dataLoadingStates]);

  // Fetch battery status whenever the selected user changes
  useEffect(() => {
    let cancelled = false;
    const fetchBattery = async () => {
      try {
        // Pass userId for mapped users only; omit for self
        const data = await getBatteryStatus(selectedUserId || null);
        if (!cancelled) setBatteryData(data);
      } catch (err) {
        console.warn('Battery status fetch failed:', err);
        if (!cancelled) setBatteryData(null);
      }
    };
    fetchBattery();
    return () => { cancelled = true; };
  }, [selectedUserId]);

  // Get latest timestamps
  const latestHeartRateTime = useMemo(() => {
    if (!heartRateData || heartRateData.length === 0) return null;
    const last = heartRateData[heartRateData.length - 1];
    // single reading uses measure_time / created_at / date; daily aggregate uses day
    return last?.measure_time || last?.created_at || last?.date || last?.day || null;
  }, [heartRateData]);

  const latestSpO2Time = useMemo(() => {
    return spo2Data && spo2Data.length > 0 ? spo2Data[spo2Data.length - 1]?.measure_time || spo2Data[spo2Data.length - 1]?.created_at || spo2Data[spo2Data.length - 1]?.date : null;
  }, [spo2Data]);

  const latestSleepTime = useMemo(() => {
    return sleepData && sleepData.length > 0 ? sleepData[0]?.date : null;
  }, [sleepData]);

  const latestStepsTime = useMemo(() => {
    return stepsData?.date || null;
  }, [stepsData]);

  // Compute the latest date with available data
  const latestDataDate = useMemo(() => {
    const dates = [
      latestSleepTime,
      latestStepsTime,
      latestHeartRateTime,
      latestSpO2Time
    ].filter(Boolean).map(d => {
      if (typeof d === 'string') {
        return d.split('T')[0];
      }
      return null;
    }).filter(Boolean);

    if (dates.length > 0) {
      return dates.sort((a, b) => new Date(b) - new Date(a))[0];
    }
    return null;
  }, [latestSleepTime, latestStepsTime, latestHeartRateTime, latestSpO2Time]);

  const recommendations = useMemo(() => {
    if (!aiData) return [];
    if (Array.isArray(aiData.recommendations)) return aiData.recommendations;
    if (typeof aiData.recommendation === 'string' && aiData.recommendation.trim()) {
      return [aiData.recommendation];
    }
    return [];
  }, [aiData]);

  const hasAnySummary = useMemo(() => {
    return !!(aiData?.summary || aiData?.sleep_summary || aiData?.activity_summary);
  }, [aiData]);

  // Fetch AI data when user or date selection changes
  useEffect(() => {
    let cancelled = false;
    const fetchAIData = async () => {
      try {
        setAiLoading(true);
        let dateParam = null;
        if (globalDateRange?.customRange && globalDateRange.date) {
          const d = new Date(globalDateRange.date);
          if (!isNaN(d.getTime())) {
            dateParam = d.toISOString().split('T')[0];
          } else if (typeof globalDateRange.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(globalDateRange.date)) {
            dateParam = globalDateRange.date;
          }
        }

        const data = await getAIData(selectedUserId || null, dateParam);
        if (!cancelled) {
          setAiData(data);
        }
      } catch (err) {
        console.warn('AI data fetch failed:', err);
        if (!cancelled) setAiData(null);
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    };
    fetchAIData();
    return () => { cancelled = true; };
  }, [selectedUserId, globalDateRange]);

  const formatDateTime = (dateString, isDateOnly = false) => {
    if (!dateString) return null;
    try {
      if (typeof dateString === 'string' && dateString.length <= 10 && dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length === 3) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${months[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}, ${parts[0]}`;
        }
      }
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return isDateOnly ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 border rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{label}</p>
          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {payload[0].value} {payload[0].unit || ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* User Header */}
      <div className={`rounded-2xl p-4 md:p-6 mb-6 md:mb-8 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between w-full gap-4">

          {/* Left: Avatar + Title */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {selectedUserInfo?.profileImage ? (
              <img
                src={selectedUserInfo.profileImage}
                alt={selectedUserInfo.name}
                className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover ring-2 ring-blue-500 flex-shrink-0"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/64?text=' + (selectedUserInfo?.name?.charAt(0) || 'U');
                }}
              />
            ) : (
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl md:text-2xl font-bold ring-2 ring-blue-500 flex-shrink-0">
                {selectedUserInfo?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedUserInfo?.name}'s Fitness Dashboard
              </h2>
              <p className={`text-xs mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {getDateRangeDisplay()}
              </p>
            </div>
          </div>

          {/* Center: Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading data...
              </span>
            </div>
          )}

          {/* Right: Battery Widget with history chart popup */}
          <div className="flex-shrink-0 flex items-center justify-end">
            <BatteryWidget batteryData={batteryData} size={48} darkMode={darkMode} />
          </div>

        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-red-100">Heart Rate</p>
              <p className="text-xl md:text-3xl font-bold text-white">
                {latestHeartRate} BPM
              </p>
            </div>
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Heart className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <div className="mt-2 text-xs text-red-100 flex justify-between items-center gap-2">
            <div>
              {heartRateData && heartRateData.length > 1 && (() => {
                // Support both single-reading and daily-aggregate shapes
                const isMultiDay = 'day' in heartRateData[0];
                const minVal = isMultiDay
                  ? Math.min(...heartRateData.map(d => d.minimum_heart_rate))
                  : Math.min(...heartRateData.map(d => d.once_heart_value));
                const maxVal = isMultiDay
                  ? Math.max(...heartRateData.map(d => d.maximum_heart_rate))
                  : Math.max(...heartRateData.map(d => d.once_heart_value));
                return <span>Range: {minVal} – {maxVal} BPM</span>;
              })()}
            </div>
            {latestHeartRateTime && <div className="text-right whitespace-nowrap opacity-90">{formatDateTime(latestHeartRateTime)}</div>}
          </div>
        </div>

        <div className="rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-indigo-100">Sleep Score</p>
              <p className="text-xl md:text-3xl font-bold text-white">
                {displaySleepScore !== '—' ? `${displaySleepScore}/100` : '—'}
              </p>
            </div>
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Moon className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <div className="mt-2 text-xs text-indigo-100 flex justify-between items-center gap-2">
            <div>
              {sleepData && sleepData.length > 0 && (
                <span>Duration: {sleepData[0]?.duration || 0} hrs</span>
              )}
            </div>
            {latestSleepTime && <div className="text-right whitespace-nowrap opacity-90">{formatDateTime(latestSleepTime, true)}</div>}
          </div>
        </div>

        <div className="rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-green-100">Daily Steps</p>
              <p className="text-xl md:text-3xl font-bold text-white">
                {dailySteps}
              </p>
            </div>
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Activity className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <div className="mt-2 text-xs text-green-100 flex justify-between items-center gap-2">
            <div>
              {stepsData && stepsData.step && (
                <span>Goal: {stepsData.step_goal || 10000} steps</span>
              )}
              {aiData && aiData.activity_rating !== undefined && aiData.activity_rating !== null && (
                <span className="block mt-0.5 font-medium text-green-100">
                  Rating: {aiData.activity_rating}/100
                </span>
              )}
            </div>
            {latestStepsTime && <div className="text-right whitespace-nowrap opacity-90">{formatDateTime(latestStepsTime, true)}</div>}
          </div>
        </div>

        <div className="rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-blue-100">Blood Oxygen</p>
              <p className="text-xl md:text-3xl font-bold text-white">
                {latestSpO2}%
              </p>
            </div>
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Droplets className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-100 flex justify-between items-center gap-2">
            <div>
              {spo2Data && spo2Data.length > 1 && (
                <span>Range: {Math.min(...spo2Data.map(d => d.Blood_oxygen))} - {Math.max(...spo2Data.map(d => d.Blood_oxygen))}%</span>
              )}
            </div>
            {latestSpO2Time && <div className="text-right whitespace-nowrap opacity-90">{formatDateTime(latestSpO2Time)}</div>}
          </div>
        </div>
      </div>

      {/* Main Metrics Grid - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8 items-stretch">
        <HeartRateDataComponent
          darkMode={darkMode}
          onHeartRateDataUpdate={setHeartRateData}
          onLoadingStateChange={(loading) => handleDataLoading('heartRate', loading)}
          selectedUserId={selectedUserId}
          dateRange={globalDateRange}
        />

        <SpO2DataComponent
          darkMode={darkMode}
          onSpO2DataUpdate={setSpO2Data}
          onLoadingStateChange={(loading) => handleDataLoading('spo2', loading)}
          selectedUserId={selectedUserId}
          dateRange={globalDateRange}
        />
      </div>

      {/* Main Metrics Grid - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        <SleepDataComponent
          darkMode={darkMode}
          onSleepDataUpdate={setSleepData}
          onLoadingStateChange={(loading) => handleDataLoading('sleep', loading)}
          selectedUserId={selectedUserId}
          dateRange={globalDateRange}
          aiSleepScore={aiData?.sleep_score}
        />

        <ActivitySummary
          darkMode={darkMode}
          onActivityDataUpdate={setStepsData}
          onLoadingStateChange={(loading) => handleDataLoading('steps', loading)}
          selectedUserId={selectedUserId}
          dateRange={globalDateRange}
          aiActivityRating={aiData?.activity_rating}
        />
      </div>

      {/* Main Metrics Grid - Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        <StressDataComponent
          darkMode={darkMode}
          onStressDataUpdate={setStressApiData}
          onLoadingStateChange={(loading) => handleDataLoading('stress', loading)}
          selectedUserId={selectedUserId}
          dateRange={globalDateRange}
        />

        <div className="space-y-4 md:space-y-6">
          <BloodPressureDataComponent
            darkMode={darkMode}
            onBloodPressureDataUpdate={setBloodPressureData}
            onLoadingStateChange={(loading) => handleDataLoading('bloodPressure', loading)}
            selectedUserId={selectedUserId}
            dateRange={globalDateRange}
          />

          <HRVDataComponent
            darkMode={darkMode}
            onHRVDataUpdate={setHrvApiData}
            onLoadingStateChange={(loading) => handleDataLoading('hrv', loading)}
            selectedUserId={selectedUserId}
            dateRange={globalDateRange}
          />
        </div>
      </div>

      {/* Health Summary */}
      <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-3">
              <h3 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Health Summary
              </h3>
              {hasAnySummary && (
                <button
                  onClick={() => setShowAiSummaries(!showAiSummaries)}
                  className={`p-1 rounded-lg transition-all ${
                    darkMode 
                      ? 'hover:bg-gray-750 text-gray-400 hover:text-gray-200' 
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                  }`}
                  title={showAiSummaries ? "Hide Detailed Summaries" : "Show Detailed Summaries"}
                >
                  {showAiSummaries ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
            
            {aiLoading ? (
              <div className="mb-4">
                <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} animate-pulse`}>
                  Loading AI Recommendations...
                </p>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="mb-4">
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  AI Recommendations
                </p>
                <ul className="space-y-1.5">
                  {recommendations.map((rec, index) => (
                    <li key={index} className={`text-xs md:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} flex items-start gap-2`}>
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mb-4">
                <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} italic`}>
                  No AI recommendations available for this period.
                </p>
              </div>
            )}

            {/* Expandable Summaries */}
            {showAiSummaries && hasAnySummary && (
              <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'} space-y-3`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  Detailed AI Analysis
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {aiData.summary && (
                    <div className={`p-3.5 rounded-xl border transition-all duration-200 ${
                      darkMode 
                        ? 'bg-gray-900/30 border-gray-700 hover:border-blue-500/40 text-gray-300' 
                        : 'bg-blue-50/20 border-blue-100 hover:border-blue-300 text-gray-700'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className={`p-1 rounded-lg ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100/60 text-blue-700'}`}>
                          <Brain className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Overall Health</span>
                      </div>
                      <p className="text-xs leading-relaxed">
                        {aiData.summary}
                      </p>
                    </div>
                  )}

                  {aiData.sleep_summary && (
                    <div className={`p-3.5 rounded-xl border transition-all duration-200 ${
                      darkMode 
                        ? 'bg-gray-900/30 border-gray-700 hover:border-indigo-500/40 text-gray-300' 
                        : 'bg-indigo-50/20 border-indigo-100 hover:border-indigo-300 text-gray-700'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className={`p-1 rounded-lg ${darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100/60 text-indigo-700'}`}>
                          <Moon className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Sleep Analysis</span>
                      </div>
                      <p className="text-xs leading-relaxed">
                        {aiData.sleep_summary}
                      </p>
                    </div>
                  )}

                  {aiData.activity_summary && (
                    <div className={`p-3.5 rounded-xl border transition-all duration-200 ${
                      darkMode 
                        ? 'bg-gray-900/30 border-gray-700 hover:border-green-500/40 text-gray-300' 
                        : 'bg-green-50/20 border-green-100 hover:border-green-300 text-gray-700'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className={`p-1 rounded-lg ${darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100/60 text-green-700'}`}>
                          <Activity className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Activity Analysis</span>
                      </div>
                      <p className="text-xs leading-relaxed">
                        {aiData.activity_summary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Data completion status & AI scores */}
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/30 px-2 py-1 rounded-lg">
                <Heart className={`w-4 h-4 ${heartRateData ? 'text-red-500' : 'text-gray-400'}`} />
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Heart Rate</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/30 px-2 py-1 rounded-lg">
                <Moon className={`w-4 h-4 ${sleepData ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Sleep</span>
                {aiData && aiData.sleep_score !== undefined && aiData.sleep_score !== null && (
                  <span className={`text-[10px] font-semibold px-1 py-0.5 rounded bg-blue-500/20 text-blue-400`}>
                    Score: {aiData.sleep_score}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/30 px-2 py-1 rounded-lg">
                <Droplets className={`w-4 h-4 ${spo2Data ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>SpO2</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/30 px-2 py-1 rounded-lg">
                <Activity className={`w-4 h-4 ${stepsData ? 'text-green-500' : 'text-gray-400'}`} />
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Activity</span>
                {aiData && aiData.activity_rating !== undefined && aiData.activity_rating !== null && (
                  <span className={`text-[10px] font-semibold px-1 py-0.5 rounded bg-green-500/20 text-green-400`}>
                    Rating: {aiData.activity_rating}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Overall Score */}
          <div className="flex items-center gap-4 ml-0 md:ml-4 flex-shrink-0">
            <div className="text-center bg-yellow-500/10 dark:bg-yellow-500/5 p-4 rounded-2xl border border-yellow-500/20">
              <div className="text-3xl md:text-4xl font-black text-yellow-500">
                {aiData && aiData.daily_health_stars !== undefined && aiData.daily_health_stars !== null 
                  ? aiData.daily_health_stars 
                  : '—'
                } <span className="text-lg font-normal text-gray-500">/ 5</span>
              </div>
              <div className={`text-xs md:text-sm font-semibold mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Health Score
              </div>
              <div className="flex justify-center gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const rating = aiData?.daily_health_stars ?? 0;
                  return (
                    <svg
                      key={star}
                      className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!heartRateData && !sleepData && !spo2Data && !stepsData && !isLoading && (
        <div className={`rounded-xl md:rounded-2xl p-8 md:p-12 shadow-lg border mt-6 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className={`text-lg md:text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            No Health Data Available
          </h3>
          <p className={`text-sm md:text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'} max-w-md mx-auto`}>
            There is no health data available for the selected time period. Try selecting a different date range or check back later.
          </p>
        </div>
      )}
    </div>
  );
};

export default HomeTab;