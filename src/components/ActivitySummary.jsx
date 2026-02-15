import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Footprints, Flame, Clock, AlertCircle, RefreshCw, Calendar, Eye, EyeOff } from 'lucide-react';
import { getDayTotalActivity } from '../lib/api';

// Utility function to calculate the dash offset for a given percentage and circumference
const calculateOffset = (percentage, circumference) => {
    return circumference - (percentage / 100) * circumference;
};

const ActivitySummary = ({ darkMode = false, onActivityDataUpdate, selectedUserId, dateRange }) => {
    const [activityData, setActivityData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    // Cache and refs
    const cacheRef = useRef(new Map());
    const abortControllerRef = useRef(null);
    const isMountedRef = useRef(true);

    // Chart configuration
    const size = 280;
    const center = size / 2;
    const strokeWidth = 14;

    const radii = [
        center - strokeWidth * 1.5,
        center - strokeWidth * 3.5,
        center - strokeWidth * 5.5,
        center - strokeWidth * 7.5
    ];

    const circumferences = radii.map(r => 2 * Math.PI * r);

    const colors = [
        'text-cyan-500',
        'text-emerald-500',
        'text-rose-500',
        'text-amber-400'
    ];

    const icons = [Activity, Footprints, Flame, Clock];

    // Format date for API (YYYY-MM-DD)
    const formatDateForAPI = (date) => {
        if (!date) return null;
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    };

    // Fetch daily activity data from API
    const fetchActivityData = useCallback(async () => {
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
                cacheKey = `activity-${selectedUserId || 'default'}-${fromDate}-${toDate}`;
                console.log('Fetching activity data for custom range:', { fromDate, toDate });
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
                cacheKey = `activity-${selectedUserId || 'default'}-${range}`;
                console.log('Fetching activity data with range:', range);
            }

            // Check cache first (5 minutes max)
            if (cacheRef.current.has(cacheKey)) {
                const cachedData = cacheRef.current.get(cacheKey);
                const cacheTime = cachedData.timestamp;
                const now = Date.now();

                if (now - cacheTime < 5 * 60 * 1000) {
                    console.log('Using cached activity data:', cachedData.data);
                    if (isMountedRef.current) {
                        setActivityData(cachedData.data);
                        if (onActivityDataUpdate) {
                            onActivityDataUpdate(cachedData.data);
                        }
                        setLoading(false);
                    }
                    return;
                }
            }

            console.log('Making API call with params:', {
                userId: selectedUserId,
                fromDate,
                toDate,
                range
            });

            // Fetch daily activity data
            const response = await getDayTotalActivity(selectedUserId, range);

            // Check if component is still mounted and request wasn't aborted
            if (!isMountedRef.current || abortControllerRef.current.signal.aborted) {
                console.log('Component unmounted or request aborted');
                return;
            }

            console.log('Activity API Response:', response);

            let processedData = null;

            if (response && response.results && response.results.length > 0) {
                // Filter data based on date range if custom range is active
                let dataToProcess = response.results;

                if (dateRange?.customRange && fromDate && toDate) {
                    // Filter results to only include dates within the custom range
                    dataToProcess = response.results.filter(item => {
                        const itemDate = item.date;
                        return itemDate >= fromDate && itemDate <= toDate;
                    });
                    console.log(`Filtered to ${dataToProcess.length} records within custom range`);
                }

                if (dataToProcess.length > 0) {
                    // Sort by date (oldest to newest)
                    const sortedData = dataToProcess.sort((a, b) => new Date(a.date) - new Date(b.date));

                    // Get the latest data point
                    const latestData = sortedData[sortedData.length - 1];

                    // Sum up calories for the period
                    const totalCalories = sortedData.reduce((sum, item) => sum + (item.calories || 0), 0);

                    // Sum up steps for the period
                    const totalSteps = sortedData.reduce((sum, item) => sum + (item.step || 0), 0);

                    // Calculate average distance per day
                    const avgDistance = sortedData.reduce((sum, item) => sum + (item.distance || 0), 0) / sortedData.length;

                    // Calculate total exercise minutes
                    const totalExerciseMinutes = sortedData.reduce((sum, item) => sum + (item.exercise_minutes || 0), 0);

                    console.log('=== Processed Activity Data ===');
                    console.log('Records count:', sortedData.length);
                    console.log('Date range:', {
                        first: sortedData[0].date,
                        last: sortedData[sortedData.length - 1].date
                    });
                    console.log('Total steps:', totalSteps);
                    console.log('Total calories:', totalCalories);
                    console.log('Avg distance:', avgDistance.toFixed(2));
                    console.log('Total exercise minutes:', totalExerciseMinutes);

                    // Create a combined data object
                    processedData = {
                        ...latestData,
                        calories: totalCalories,
                        step: totalSteps,
                        distance: avgDistance,
                        exercise_minutes: totalExerciseMinutes,
                        recordCount: sortedData.length,
                        dateRange: {
                            from: sortedData[0].date,
                            to: sortedData[sortedData.length - 1].date
                        }
                    };
                }
            }

            // Cache the results
            cacheRef.current.set(cacheKey, {
                data: processedData,
                timestamp: Date.now()
            });

            if (isMountedRef.current) {
                setActivityData(processedData);
                if (onActivityDataUpdate) {
                    onActivityDataUpdate(processedData);
                }
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED' || !isMountedRef.current) {
                return;
            }
            console.error('Error fetching activity data:', err);
            if (isMountedRef.current) {
                setError('Failed to load activity data');
            }
        } finally {
            if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
                setLoading(false);
            }
        }
    }, [selectedUserId, onActivityDataUpdate, dateRange]);

    useEffect(() => {
        isMountedRef.current = true;
        fetchActivityData();

        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchActivityData]);

    // Transform activity data to chart format
    const getChartData = () => {
        if (!activityData) {
            // Return default/sample data when no API data is available
            return [
                {
                    id: 1,
                    percentage: 0,
                    value: '0',
                    label: 'Steps',
                    goal: '10,000 steps'
                },
                {
                    id: 2,
                    percentage: 0,
                    value: '0 km',
                    label: 'Distance',
                    goal: '5 km'
                },
                {
                    id: 3,
                    percentage: 0,
                    value: '0',
                    label: 'Calories',
                    goal: '500 cal'
                },
                {
                    id: 4,
                    percentage: 0,
                    value: '0 min',
                    label: 'Exercise',
                    goal: '60 min'
                },
            ];
        }

        // Calculate percentages based on goals (daily goals)
        // For multi-day periods, we adjust goals proportionally
        const daysMultiplier = activityData.recordCount || 1;

        const stepsPercentage = Math.min(Math.round((activityData.step / (10000 * daysMultiplier)) * 100), 100);
        const distancePercentage = Math.min(Math.round((activityData.distance * daysMultiplier / 5) * 100), 100);
        const caloriesPercentage = Math.min(Math.round((activityData.calories / (500 * daysMultiplier)) * 100), 100);
        const exercisePercentage = Math.min(Math.round((activityData.exercise_minutes / (60 * daysMultiplier)) * 100), 100);

        return [
            {
                id: 1,
                percentage: stepsPercentage,
                value: activityData.step.toLocaleString(),
                label: 'Steps',
                goal: `${(10000 * daysMultiplier).toLocaleString()} steps`
            },
            {
                id: 2,
                percentage: distancePercentage,
                value: `${activityData.distance.toFixed(2)} km`,
                label: 'Distance',
                goal: `${(5 * daysMultiplier).toFixed(1)} km`
            },
            {
                id: 3,
                percentage: caloriesPercentage,
                value: Math.round(activityData.calories).toLocaleString(),
                label: 'Calories',
                goal: `${(500 * daysMultiplier).toLocaleString()} cal`
            },
            {
                id: 4,
                percentage: exercisePercentage,
                value: `${activityData.exercise_minutes} min`,
                label: 'Exercise',
                goal: `${(60 * daysMultiplier)} min`
            },
        ];
    };

    // Format date range for display
    const getDateRangeDisplay = () => {
        if (!activityData || !activityData.dateRange) {
            const today = new Date();
            return today.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        const fromDate = new Date(activityData.dateRange.from);
        const toDate = new Date(activityData.dateRange.to);

        if (fromDate.toDateString() === toDate.toDateString()) {
            return fromDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        return `${fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    // Loading state
    if (loading) {
        return (
            <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-green-500 mx-auto mb-4" />
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Loading activity data...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
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
                            onClick={fetchActivityData}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const chartData = getChartData();

    return (
        <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            {/* Header - Matches other components */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 md:p-4 rounded-xl bg-green-500 bg-opacity-20 shadow-lg">
                        <Activity className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
                    </div>
                    <div>
                        <h3 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            Activity Summary
                        </h3>
                        <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {getDateRangeDisplay()}
                        </p>
                        {dateRange?.customRange && dateRange.from && dateRange.to && (
                            <div className="flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3 text-green-500" />
                                <span className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                    Custom Range
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <div className={`text-xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {activityData ? `${Math.round(chartData.reduce((acc, item) => acc + item.percentage, 0) / chartData.length)}%` : '0%'}
                        </div>
                        <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Overall
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

            {/* Main Content */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                {/* Chart - Center area left empty as requested */}
                <div className="relative flex-shrink-0">
                    <svg
                        width={size}
                        height={size}
                        viewBox={`0 0 ${size} ${size}`}
                        className="rotate-[-90deg] drop-shadow-lg"
                    >
                        {chartData.map((item, index) => {
                            const radius = radii[index];
                            const circumference = circumferences[index];
                            const offset = calculateOffset(item.percentage, circumference);
                            const colorClass = colors[index];

                            return (
                                <circle
                                    key={item.id}
                                    className={`${colorClass} transition-all duration-700 ease-out`}
                                    stroke="currentColor"
                                    fill="transparent"
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    r={radius}
                                    cx={center}
                                    cy={center}
                                    strokeLinecap="round"
                                    style={{ opacity: 0.9 }}
                                />
                            );
                        })}
                    </svg>

                    {/* Center area intentionally left empty - no text */}
                </div>

                {/* Stats Cards */}
                <div className="flex-1 w-full grid grid-cols-2 gap-3 md:gap-4">
                    {chartData.map((item, index) => {
                        const Icon = icons[index];
                        return (
                            <div
                                key={item.id}
                                className={`rounded-lg md:rounded-xl p-4 md:p-5 border transition-all hover:shadow-md ${darkMode
                                    ? 'bg-gray-700 border-gray-600 hover:bg-gray-650'
                                    : 'bg-gradient-to-br from-gray-50 to-white border-gray-100 hover:border-gray-200'
                                    }`}
                            >
                                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                                    <div className={`p-2 rounded-lg ${colors[index].replace('text-', 'bg-')}/20`}>
                                        <Icon className={`w-4 h-4 md:w-5 md:h-5 ${colors[index]}`} />
                                    </div>
                                    <span className={`text-xs md:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {item.label}
                                    </span>
                                </div>
                                <p className={`text-xl md:text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {item.value}
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${colors[index].replace('text-', 'bg-')} transition-all duration-700`}
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {item.percentage}%
                                    </span>
                                </div>
                                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Goal: {item.goal}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detailed View - Shows additional info when expanded */}
            {showDetails && activityData && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Days Tracked</div>
                            <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {activityData.recordCount || 1}
                            </div>
                        </div>
                        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Daily Steps</div>
                            <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {Math.round(activityData.step / (activityData.recordCount || 1)).toLocaleString()}
                            </div>
                        </div>
                        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Calories</div>
                            <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {Math.round(activityData.calories).toLocaleString()}
                            </div>
                        </div>
                        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Minutes</div>
                            <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {activityData.exercise_minutes}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivitySummary;