import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Heart, Moon, Activity, Brain, Calendar, TrendingUp, Droplets } from 'lucide-react';
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

  // Calculate sleep score based on data
  const calculateSleepScore = (data) => {
    if (!data) return 0;

    let score = 0;

    const duration = data.duration;
    if (duration >= 7 && duration <= 9) {
      score += 30;
    } else if (duration >= 6 && duration <= 10) {
      score += 20;
    } else {
      score += 10;
    }

    const deepSleep = data.deep_sleep_percentage;
    if (deepSleep >= 15 && deepSleep <= 20) {
      score += 25;
    } else if (deepSleep >= 10 && deepSleep <= 25) {
      score += 15;
    } else {
      score += 5;
    }

    const lightSleep = data.light_sleep_percentage;
    if (lightSleep >= 45 && lightSleep <= 55) {
      score += 25;
    } else if (lightSleep >= 40 && lightSleep <= 60) {
      score += 15;
    } else {
      score += 5;
    }

    const awake = data.awake_percentage;
    if (awake < 5) {
      score += 20;
    } else if (awake < 10) {
      score += 10;
    } else {
      score += 5;
    }

    return Math.min(score, 100);
  };

  // Calculate heart rate score
  const calculateHeartRateScore = (data) => {
    if (!data || data.length === 0) return 70;
    
    const latestHR = data[data.length - 1]?.once_heart_value || 72;
    if (latestHR >= 60 && latestHR <= 80) return 95;
    if (latestHR >= 50 && latestHR <= 90) return 85;
    if (latestHR >= 40 && latestHR <= 100) return 75;
    return 60;
  };

  // Calculate SpO2 score
  const calculateSpO2Score = (data) => {
    if (!data || data.length === 0) return 90;
    
    const latestSpO2 = data[data.length - 1]?.Blood_oxygen || 98;
    if (latestSpO2 >= 95) return 100;
    if (latestSpO2 >= 90) return 80;
    if (latestSpO2 >= 85) return 60;
    return 40;
  };

  // Calculate steps score
  const calculateStepsScore = (data) => {
    if (!data || !data.step) return 50;
    
    const steps = data.step;
    if (steps >= 10000) return 100;
    if (steps >= 7500) return 85;
    if (steps >= 5000) return 70;
    if (steps >= 2500) return 50;
    return 30;
  };

  // Memoized values for quick stats
  const latestHeartRate = useMemo(() => {
    return heartRateData && Array.isArray(heartRateData) && heartRateData.length > 0
      ? heartRateData[heartRateData.length - 1]?.once_heart_value
      : '—';
  }, [heartRateData]);

  const sleepScore = useMemo(() => {
    return sleepData && sleepData.length > 0
      ? calculateSleepScore(sleepData[0])
      : '—';
  }, [sleepData]);

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

  // Calculate overall health score
  const overallScore = useMemo(() => {
    const scores = [];
    
    if (heartRateData) scores.push(calculateHeartRateScore(heartRateData));
    if (sleepData) scores.push(sleepScore);
    if (spo2Data) scores.push(calculateSpO2Score(spo2Data));
    if (stepsData) scores.push(calculateStepsScore(stepsData));
    
    if (scores.length > 0) {
      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
      return average.toFixed(1);
    }
    return 'N/A';
  }, [heartRateData, sleepData, spo2Data, stepsData, sleepScore]);

  // Get score letter grade
  const getScoreGrade = (score) => {
    if (score === 'N/A') return 'N/A';
    const numScore = parseFloat(score);
    if (numScore >= 90) return 'A+';
    if (numScore >= 80) return 'A';
    if (numScore >= 70) return 'B+';
    if (numScore >= 60) return 'B';
    if (numScore >= 50) return 'C';
    return 'D';
  };

  // Format date range for display
  const getDateRangeDisplay = () => {
    if (globalDateRange?.customRange && globalDateRange.from && globalDateRange.to) {
      return `Filtering: ${globalDateRange.from} to ${globalDateRange.to}`;
    }
    
    switch(globalDateFilter) {
      case 'today':
        return 'Showing data for today';
      case 'week':
        return 'Showing data for the last 7 days';
      case 'month':
        return 'Showing data for the last 30 days';
      case 'custom':
        return 'Showing custom date range';
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

  // Stress data for fallback chart
  const fallbackStressData = [
    { time: '8AM', level: 25 },
    { time: '10AM', level: 45 },
    { time: '12PM', level: 65 },
    { time: '2PM', level: 80 },
    { time: '4PM', level: 55 },
    { time: '6PM', level: 30 },
    { time: '8PM', level: 20 }
  ];

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
      {/* User Header without Filters - Now just shows user info and current filter status */}
      <div className={`rounded-2xl p-4 md:p-6 mb-6 md:mb-8 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* User Info */}
          <div className="flex items-center gap-4">
            {selectedUserInfo?.profileImage ? (
              <img
                src={selectedUserInfo.profileImage}
                alt={selectedUserInfo.name}
                className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover ring-2 ring-blue-500"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/64?text=' + (selectedUserInfo?.name?.charAt(0) || 'U');
                }}
              />
            ) : (
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl md:text-2xl font-bold ring-2 ring-blue-500">
                {selectedUserInfo?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedUserInfo?.name}'s Health Dashboard
              </h2>
              <p className={`text-sm md:text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Viewing health data for {selectedUserInfo?.fullName}
              </p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {getDateRangeDisplay()}
              </p>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading data...
              </span>
            </div>
          )}
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
          {heartRateData && heartRateData.length > 1 && (
            <div className="mt-2 text-xs text-red-100">
              Range: {Math.min(...heartRateData.map(d => d.once_heart_value))} - {Math.max(...heartRateData.map(d => d.once_heart_value))} BPM
            </div>
          )}
        </div>

        <div className="rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-indigo-100">Sleep Score</p>
              <p className="text-xl md:text-3xl font-bold text-white">
                {sleepScore}/100
              </p>
            </div>
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Moon className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          {sleepData && sleepData.length > 0 && (
            <div className="mt-2 text-xs text-indigo-100">
              Duration: {sleepData[0]?.duration || 0} hrs
            </div>
          )}
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
          {stepsData && stepsData.step && (
            <div className="mt-2 text-xs text-green-100">
              Goal: {stepsData.step_goal || 10000} steps
            </div>
          )}
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
          {spo2Data && spo2Data.length > 1 && (
            <div className="mt-2 text-xs text-blue-100">
              Range: {Math.min(...spo2Data.map(d => d.Blood_oxygen))} - {Math.max(...spo2Data.map(d => d.Blood_oxygen))}%
            </div>
          )}
        </div>
      </div>

      {/* Main Metrics Grid - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
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
        />

        <ActivitySummary
          darkMode={darkMode}
          onActivityDataUpdate={setStepsData}
          onLoadingStateChange={(loading) => handleDataLoading('steps', loading)}
          selectedUserId={selectedUserId}
          dateRange={globalDateRange}
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
          <div className="flex-1">
            <h3 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-2`}>
              Health Summary
            </h3>
            <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {getDateRangeDisplay()}. Your metrics are being tracked and analyzed to provide you with the best insights for your health journey.
            </p>
            
            {/* Data completion status */}
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${heartRateData ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Heart Rate</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${sleepData ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Sleep</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${spo2Data ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>SpO2</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${stepsData ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Steps</span>
              </div>
            </div>
          </div>
          
          {/* Overall Score */}
          <div className="flex items-center gap-4 ml-0 md:ml-4">
            <div className="text-center">
              <div className={`text-3xl md:text-4xl font-bold ${
                overallScore === 'N/A' ? 'text-gray-400' :
                parseFloat(overallScore) >= 80 ? 'text-green-500' :
                parseFloat(overallScore) >= 60 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {getScoreGrade(overallScore)}
              </div>
              <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Overall Score
              </div>
              {overallScore !== 'N/A' && (
                <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {overallScore}/100
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Empty State - Show when no data is available */}
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