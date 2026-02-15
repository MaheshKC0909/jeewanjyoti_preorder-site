import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Heart, Moon, Activity, Brain, Calendar, TrendingUp, Droplets } from 'lucide-react';
import SleepDataComponent from '../../components/SleepDataComponent';
import SpO2DataComponent from '../../components/SpO2DataComponent';
import HeartRateDataComponent from '../../components/HeartRateDataComponent';
import ActivitySummary from '../../components/ActivitySummary';
import StressDataComponent from '../../components/StressDataComponent';
import HRVDataComponent from '../../components/HRVDataComponent';
import BloodPressureDataComponent from '../../components/BloodPressureDataComponent';
import DateRangePicker from '../../components/DateRangePicker';

const HomeTab = ({ darkMode, selectedPeriod = 'today', setSelectedPeriod, selectedUserId, selectedUserInfo }) => {
  // State for all health data
  const [sleepData, setSleepData] = useState(null);
  const [spo2Data, setSpO2Data] = useState(null);
  const [heartRateData, setHeartRateData] = useState(null);
  const [stepsData, setStepsData] = useState(null);
  const [bloodPressureData, setBloodPressureData] = useState(null);
  const [stressApiData, setStressApiData] = useState(null);
  const [hrvApiData, setHrvApiData] = useState(null);

  // State for date filtering
  const [dateRange, setDateRange] = useState({
    from: null,
    to: null,
    customRange: false,
    period: selectedPeriod
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('today');

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

  // Format date for API (YYYY-MM-DD)
  const formatDateForAPI = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  // Handle filter change
  const handleFilterChange = (filterType) => {
    setActiveFilter(filterType);
    
    if (filterType === 'custom') {
      setShowDatePicker(true);
      setDateRange(prev => ({ 
        ...prev, 
        customRange: true,
        period: filterType 
      }));
    } else {
      setShowDatePicker(false);
      setDateRange({ 
        from: null, 
        to: null, 
        customRange: false,
        period: filterType 
      });
      setSelectedPeriod(filterType);
    }
  };

  // Handle custom date range selection
  const handleDateRangeApply = (from, to) => {
    const newDateRange = {
      from: formatDateForAPI(from),
      to: formatDateForAPI(to),
      customRange: true,
      period: 'custom'
    };
    setDateRange(newDateRange);
    setShowDatePicker(false);
  };

  // Clear custom date filter
  const handleClearFilter = () => {
    setActiveFilter('today');
    setDateRange({ 
      from: null, 
      to: null, 
      customRange: false,
      period: 'today'
    });
    setSelectedPeriod('today');
    setShowDatePicker(false);
  };

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
      {/* User Header with Filters */}
      <div className={`rounded-2xl p-4 md:p-6 mb-6 md:mb-8 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* User Info */}
          <div className="flex items-center gap-4">
            {selectedUserInfo?.profileImage && (
              <img
                src={selectedUserInfo.profileImage}
                alt={selectedUserInfo.name}
                className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover ring-2 ring-blue-500"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <div>
              <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedUserInfo?.name}'s Health Dashboard
              </h2>
              <p className={`text-sm md:text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Viewing health data for {selectedUserInfo?.fullName}
              </p>
              {dateRange.customRange && dateRange.from && dateRange.to && (
                <p className={`text-xs mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  Filtering: {dateRange.from} to {dateRange.to}
                </p>
              )}
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => handleFilterChange('today')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeFilter === 'today'
                    ? 'bg-blue-500 text-white'
                    : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => handleFilterChange('week')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeFilter === 'week'
                    ? 'bg-blue-500 text-white'
                    : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => handleFilterChange('month')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeFilter === 'month'
                    ? 'bg-blue-500 text-white'
                    : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => handleFilterChange('custom')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${
                  activeFilter === 'custom'
                    ? 'bg-blue-500 text-white'
                    : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Custom
              </button>
            </div>

            {dateRange.customRange && (
              <button
                onClick={handleClearFilter}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-900'
                }`}
              >
                Clear Filter
              </button>
            )}

            {isLoading && (
              <div className="flex items-center gap-2 px-3 py-1.5">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Loading...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Range Picker Modal */}
      {showDatePicker && (
        <DateRangePicker
          darkMode={darkMode}
          onApply={handleDateRangeApply}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-red-100">Heart Rate</p>
              <p className="text-xl md:text-3xl font-bold text-white">
                {heartRateData && heartRateData.length > 0
                  ? heartRateData[heartRateData.length - 1].once_heart_value
                  : '72'
                } BPM
              </p>
            </div>
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Heart className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-indigo-100">Sleep Score</p>
              <p className="text-xl md:text-3xl font-bold text-white">
                {sleepData && sleepData.length > 0
                  ? calculateSleepScore(sleepData[0])
                  : '85'
                }/100
              </p>
            </div>
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Moon className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-green-100">Daily Steps</p>
              <p className="text-xl md:text-3xl font-bold text-white">
                {stepsData && stepsData.step
                  ? stepsData.step.toLocaleString()
                  : '0'
                }
              </p>
            </div>
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Activity className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-blue-100">Blood Oxygen</p>
              <p className="text-xl md:text-3xl font-bold text-white">
                {spo2Data && spo2Data.length > 0
                  ? spo2Data[spo2Data.length - 1].Blood_oxygen
                  : '98'
                }%
              </p>
            </div>
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Droplets className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Metrics Grid - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        <HeartRateDataComponent
          darkMode={darkMode}
          onHeartRateDataUpdate={setHeartRateData}
          selectedUserId={selectedUserId}
          dateRange={dateRange}
        />

        <SpO2DataComponent
          darkMode={darkMode}
          onSpO2DataUpdate={setSpO2Data}
          selectedUserId={selectedUserId}
          dateRange={dateRange}
        />
      </div>

      {/* Main Metrics Grid - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        <SleepDataComponent
          darkMode={darkMode}
          onSleepDataUpdate={setSleepData}
          selectedUserId={selectedUserId}
          dateRange={dateRange}
        />

        <ActivitySummary
          darkMode={darkMode}
          onActivityDataUpdate={setStepsData}
          selectedUserId={selectedUserId}
          dateRange={dateRange}
        />
      </div>

      {/* Main Metrics Grid - Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        <StressDataComponent
          darkMode={darkMode}
          onStressDataUpdate={setStressApiData}
          selectedUserId={selectedUserId}
          dateRange={dateRange}
        />

        <div className="space-y-4 md:space-y-6">
          <BloodPressureDataComponent
            darkMode={darkMode}
            onBloodPressureDataUpdate={setBloodPressureData}
            selectedUserId={selectedUserId}
            dateRange={dateRange}
          />

          <HRVDataComponent
            darkMode={darkMode}
            onHRVDataUpdate={setHrvApiData}
            selectedUserId={selectedUserId}
            dateRange={dateRange}
          />
        </div>
      </div>

      {/* Health Summary */}
      <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-2`}>
              Health Summary
            </h3>
            <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {dateRange.customRange 
                ? `Showing health data from ${dateRange.from} to ${dateRange.to}. `
                : `Showing health data for the last ${dateRange.period === 'today' ? '24 hours' : dateRange.period}. `
              }
              Your metrics are being tracked and analyzed to provide you with the best insights for your health journey.
            </p>
          </div>
          <div className="flex items-center gap-4 ml-4">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-green-500">
                {heartRateData && sleepData && spo2Data ? 'A+' : 'N/A'}
              </div>
              <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Overall Score
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeTab;