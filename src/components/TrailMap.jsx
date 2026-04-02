import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, Navigation, RefreshCw, AlertCircle, Calendar, SlidersHorizontal, ChevronDown } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getLocationData } from '../lib/locationApi';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to recenter map when trail changes
const MapController = ({ center }) => {
    const map = useMap();

    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);

    return null;
};

const TrailMap = ({ darkMode, userId = null, globalDateFilter, globalDateRange }) => {
    const [trailPoints, setTrailPoints] = useState([]);
    const [filteredTrailPoints, setFilteredTrailPoints] = useState([]);
    const [mapCenter, setMapCenter] = useState([27.7172, 85.3240]); // Default: Kathmandu, Nepal
    const [mapZoom, setMapZoom] = useState(13);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Local date filter state - syncs with global filter
    const [localDateFilter, setLocalDateFilter] = useState(globalDateFilter || 'today');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');
    const [showCustomDateModal, setShowCustomDateModal] = useState(false);

    // Fetch location data from API
    const fetchLocationData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await getLocationData(userId);

            if (data && data.length > 0) {
                // Sort by timestamp to ensure correct order
                const sortedData = [...data].sort((a, b) =>
                    new Date(a.created_at) - new Date(b.created_at)
                );

                // Convert API data to trail points format
                const points = sortedData.map(location => ({
                    lat: parseFloat(location.latitude),
                    lng: parseFloat(location.longitude),
                    id: location.id,
                    accuracy: location.accuracy,
                    altitude: location.altitude,
                    speed: location.speed,
                    bearing: location.bearing,
                    timestamp: new Date(location.timestamp).toLocaleString(),
                    created_at: new Date(location.created_at).toLocaleString(),
                    device_id: location.device_id,
                    mode: location.mode
                }));

                setTrailPoints(points);

                // Center map on first point
                if (points.length > 0) {
                    setMapCenter([points[0].lat, points[0].lng]);
                    setMapZoom(13);
                }
            } else {
                setTrailPoints([]);
            }
        } catch (err) {
            console.error('Error fetching location data:', err);
            setError(err.message || 'Failed to load location data');
        } finally {
            setIsLoading(false);
        }
    };

    // Load data when component mounts or userId changes
    useEffect(() => {
        fetchLocationData();
    }, [userId]);

    // Sync local filter with global filter when it changes
    useEffect(() => {
        if (globalDateFilter) {
            setLocalDateFilter(globalDateFilter);
        }
        if (globalDateRange?.from && globalDateRange?.to) {
            setCustomDateFrom(globalDateRange.from);
            setCustomDateTo(globalDateRange.to);
        }
    }, [globalDateFilter, globalDateRange]);

    // Calculate date range based on filter type
    const getDateRange = (filterType) => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        switch (filterType) {
            case 'today':
                return { from: todayStr, to: todayStr };
            case 'week': {
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                return { from: weekAgo.toISOString().split('T')[0], to: todayStr };
            }
            case 'month': {
                const monthAgo = new Date(today);
                monthAgo.setDate(today.getDate() - 30);
                return { from: monthAgo.toISOString().split('T')[0], to: todayStr };
            }
            case 'custom':
                if (customDateFrom && customDateTo) {
                    return { from: customDateFrom, to: customDateTo };
                }
                return { from: todayStr, to: todayStr };
            default:
                return { from: todayStr, to: todayStr };
        }
    };

    // Filter trail points by date range
    const filterTrailPointsByDate = () => {
        if (!trailPoints.length) return;
        
        const { from, to } = getDateRange(localDateFilter);
        
        if (!from || !to) {
            setFilteredTrailPoints(trailPoints);
            return;
        }
        
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // Include the full end date
        
        const filtered = trailPoints.filter(point => {
            const pointDate = new Date(point.timestamp);
            return pointDate >= fromDate && pointDate <= toDate;
        });
        
        setFilteredTrailPoints(filtered);
        
        // Update map center to first filtered point
        if (filtered.length > 0) {
            setMapCenter([filtered[0].lat, filtered[0].lng]);
        }
    };

    // Apply filtering when data or filter changes
    useEffect(() => {
        filterTrailPointsByDate();
    }, [trailPoints, localDateFilter, customDateFrom, customDateTo]);

    // Handle local filter change
    const handleLocalFilterChange = (filterType) => {
        setLocalDateFilter(filterType);
        setShowFilterDropdown(false);
        
        if (filterType === 'custom') {
            setShowCustomDateModal(true);
            const today = new Date().toISOString().split('T')[0];
            setCustomDateFrom(today);
            setCustomDateTo(today);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showFilterDropdown && !event.target.closest('.trail-map-filter')) {
                setShowFilterDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showFilterDropdown]);

    // Calculate total distance for filtered points (approximate)
    const calculateDistance = () => {
        if (filteredTrailPoints.length < 2) return 0;

        let totalDistance = 0;
        for (let i = 0; i < filteredTrailPoints.length - 1; i++) {
            const p1 = filteredTrailPoints[i];
            const p2 = filteredTrailPoints[i + 1];

            // Haversine formula for distance calculation
            const R = 6371; // Earth's radius in km
            const dLat = (p2.lat - p1.lat) * Math.PI / 180;
            const dLng = (p2.lng - p1.lng) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            totalDistance += R * c;
        }

        return totalDistance.toFixed(2);
    };

    return (
        <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                        <Navigation className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className={`text-base md:text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            Activity Trail Map
                        </h3>
                        <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Your GPS location trail with direction
                        </p>
                    </div>
                </div>
                
                {/* Filter and Refresh Controls */}
                <div className="flex items-center gap-2">
                    {/* Date Filter Dropdown */}
                    <div className="relative trail-map-filter">
                        <button
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm ${
                                showFilterDropdown || localDateFilter !== 'today'
                                    ? darkMode
                                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                                    : darkMode
                                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span className="hidden sm:inline">
                                {localDateFilter === 'today' ? 'Today' :
                                 localDateFilter === 'week' ? 'This Week' :
                                 localDateFilter === 'month' ? 'This Month' : 'Custom'}
                            </span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Filter Dropdown Menu */}
                        {showFilterDropdown && (
                            <div className={`absolute top-full right-0 mt-2 w-40 rounded-lg shadow-xl border z-20 ${
                                darkMode
                                    ? 'bg-gray-700 border-gray-600'
                                    : 'bg-white border-gray-200'
                            }`}>
                                <div className="py-1">
                                    {['today', 'week', 'month', 'custom'].map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => handleLocalFilterChange(filter)}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                                localDateFilter === filter
                                                    ? darkMode
                                                        ? 'bg-purple-600/20 text-purple-400'
                                                        : 'bg-purple-50 text-purple-600'
                                                    : darkMode
                                                        ? 'text-gray-300 hover:bg-gray-600'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            {filter === 'today' && 'Today'}
                                            {filter === 'week' && 'This Week'}
                                            {filter === 'month' && 'This Month'}
                                            {filter === 'custom' && 'Custom Range'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={fetchLocationData}
                        disabled={isLoading}
                        className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm ${isLoading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Active Filter Indicator */}
            {localDateFilter !== 'today' && (
                <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
                    <div className="flex items-center gap-2">
                        <Calendar className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                        <span className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                            Showing data for: 
                            <strong>
                                {localDateFilter === 'today' && 'Today'}
                                {localDateFilter === 'week' && 'Last 7 Days'}
                                {localDateFilter === 'month' && 'Last 30 Days'}
                                {localDateFilter === 'custom' && customDateFrom && customDateTo && 
                                    `${customDateFrom} to ${customDateTo}`}
                            </strong>
                            {' '}({filteredTrailPoints.length} points)
                        </span>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className={`p-8 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Loading location data...
                    </p>
                </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
                <div className={`p-4 rounded-xl border-2 ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-center gap-3">
                        <AlertCircle className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                        <div>
                            <h4 className={`font-semibold ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
                                Error Loading Data
                            </h4>
                            <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                                {error}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Trail Statistics - Showing Filtered Data */}
            {!isLoading && !error && filteredTrailPoints.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-blue-600'}`}>Filtered Points</div>
                        <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-blue-700'}`}>
                            {filteredTrailPoints.length}
                        </div>
                    </div>
                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-green-600'}`}>Distance</div>
                        <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-green-700'}`}>
                            {calculateDistance()} km
                        </div>
                    </div>
                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-purple-50'} col-span-2 md:col-span-1`}>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-purple-600'}`}>Last Updated</div>
                        <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-purple-700'}`}>
                            {filteredTrailPoints.length > 0
                                ? new Date(filteredTrailPoints[filteredTrailPoints.length - 1].timestamp).toLocaleString()
                                : 'N/A'
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* Map Container */}
            {!isLoading && !error && (
                <div className="rounded-xl overflow-hidden shadow-lg" style={{ height: '500px' }}>
                    <MapContainer
                        center={mapCenter}
                        zoom={mapZoom}
                        style={{ height: '100%', width: '100%' }}
                        className="z-0"
                    >
                        <MapController center={mapCenter} />
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Draw trail line - Using filtered points */}
                        {filteredTrailPoints.length > 1 && (
                            <Polyline
                                positions={filteredTrailPoints.map(p => [p.lat, p.lng])}
                                color="#10b981"
                                weight={5}
                                opacity={0.8}
                                smoothFactor={1}
                            />
                        )}

                        {/* Add directional arrow markers using filtered points */}
                        {filteredTrailPoints.length > 1 && filteredTrailPoints.map((point, index) => {
                            // Only show arrows at intervals to reduce clutter
                            const interval = filteredTrailPoints.length <= 5 ? 1 : filteredTrailPoints.length <= 10 ? 2 : 3;

                            if (index === filteredTrailPoints.length - 1 || index % interval !== 0) return null;

                            const nextPoint = filteredTrailPoints[index + 1];
                            const midLat = (point.lat + nextPoint.lat) / 2;
                            const midLng = (point.lng + nextPoint.lng) / 2;

                            // Calculate angle for arrow rotation
                            const angle = Math.atan2(
                                nextPoint.lat - point.lat,
                                nextPoint.lng - point.lng
                            ) * (180 / Math.PI);

                            return (
                                <Marker
                                    key={`arrow-${index}`}
                                    position={[midLat, midLng]}
                                    icon={L.divIcon({
                                        className: 'arrow-icon',
                                        html: `
                      <div style="
                        transform: rotate(${angle + 90}deg);
                        width: 0;
                        height: 0;
                        border-left: 6px solid transparent;
                        border-right: 6px solid transparent;
                        border-bottom: 12px solid #10b981;
                        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
                        opacity: 0.9;
                      "></div>
                    `,
                                        iconSize: [12, 12],
                                        iconAnchor: [6, 6]
                                    })}
                                />
                            );
                        })}

                        {/* Add markers for start and end points using filtered points */}
                        {filteredTrailPoints.length > 0 && (
                            <>
                                {/* Start Point */}
                                <Marker
                                    key="start"
                                    position={[filteredTrailPoints[0].lat, filteredTrailPoints[0].lng]}
                                    icon={L.divIcon({
                                        className: 'custom-marker',
                                        html: `
                                            <div style="
                                                background: #3b82f6;
                                                width: 24px;
                                                height: 24px;
                                                border-radius: 50%;
                                                border: 3px solid white;
                                                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                                display: flex;
                                                align-items: center;
                                                justify-content: center;
                                                color: white;
                                                font-weight: bold;
                                                font-size: 10px;
                                            ">S</div>
                                        `,
                                        iconSize: [24, 24],
                                        iconAnchor: [12, 12]
                                    })}
                                >
                                    <Popup>
                                        <div className="text-sm">
                                            <strong className="text-blue-600">Start Point</strong><br />
                                            <strong>Location:</strong> {filteredTrailPoints[0].locality || 'Unknown'}<br />
                                            <strong>City:</strong> {filteredTrailPoints[0].city || 'Unknown'}<br />
                                            <strong>Coordinates:</strong><br />
                                            Lat: {filteredTrailPoints[0].lat.toFixed(6)}<br />
                                            Lng: {filteredTrailPoints[0].lng.toFixed(6)}<br />
                                            <strong>Time:</strong> {new Date(filteredTrailPoints[0].timestamp).toLocaleString()}
                                        </div>
                                    </Popup>
                                </Marker>

                                {/* End Point */}
                                {filteredTrailPoints.length > 1 && (
                                    <Marker
                                        key="end"
                                        position={[filteredTrailPoints[filteredTrailPoints.length - 1].lat, filteredTrailPoints[filteredTrailPoints.length - 1].lng]}
                                        icon={L.divIcon({
                                            className: 'custom-marker',
                                            html: `
                                                <div style="
                                                    background: #ef4444;
                                                    width: 24px;
                                                    height: 24px;
                                                    border-radius: 50%;
                                                    border: 3px solid white;
                                                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                                    display: flex;
                                                    align-items: center;
                                                    justify-content: center;
                                                    color: white;
                                                    font-weight: bold;
                                                    font-size: 10px;
                                                ">E</div>
                                            `,
                                            iconSize: [24, 24],
                                            iconAnchor: [12, 12]
                                        })}
                                    >
                                        <Popup>
                                            <div className="text-sm">
                                                <strong className="text-red-600">End Point</strong><br />
                                                <strong>Location:</strong> {filteredTrailPoints[filteredTrailPoints.length - 1].locality || 'Unknown'}<br />
                                                <strong>City:</strong> {filteredTrailPoints[filteredTrailPoints.length - 1].city || 'Unknown'}<br />
                                                <strong>Coordinates:</strong><br />
                                                Lat: {filteredTrailPoints[filteredTrailPoints.length - 1].lat.toFixed(6)}<br />
                                                Lng: {filteredTrailPoints[filteredTrailPoints.length - 1].lng.toFixed(6)}<br />
                                                <strong>Time:</strong> {new Date(filteredTrailPoints[filteredTrailPoints.length - 1].timestamp).toLocaleString()}
                                            </div>
                                        </Popup>
                                    </Marker>
                                )}
                            </>
                        )}
                    </MapContainer>
                </div>
            )}

            {/* Empty State - No Filtered Data */}
            {!isLoading && !error && filteredTrailPoints.length === 0 && (
                <div className={`mt-4 p-8 rounded-lg border-2 border-dashed text-center ${darkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-gray-50'
                    }`}>
                    <MapPin className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {trailPoints.length > 0 
                            ? `No location data found for the selected ${localDateFilter === 'custom' ? 'date range' : 'time period'}. Try selecting a different date range.`
                            : 'No location data available yet. Your GPS trail will appear here once location data is recorded.'
                        }
                    </p>
                </div>
            )}

            {/* Trail Points List - Showing Filtered Data */}
            {!isLoading && !error && filteredTrailPoints.length > 0 && (
                <div className="mt-4">
                    <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Trail Points ({filteredTrailPoints.length} of {trailPoints.length} total)
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                        {filteredTrailPoints.map((point, index) => (
                            <div
                                key={point.id || index}
                                className={`flex items-center justify-between p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-2 flex-1">
                                    <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-xs block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <strong>Point {index + 1}:</strong> {point.locality || point.city || 'Unknown'}
                                        </span>
                                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                                        </span>
                                    </div>
                                </div>
                                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {new Date(point.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* Custom Date Range Modal */}
            {showCustomDateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className={`rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                Custom Date Range
                            </h3>
                            <button
                                onClick={() => setShowCustomDateModal(false)}
                                className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                            >
                                <span className="sr-only">Close</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* From Date */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={customDateFrom}
                                    onChange={(e) => setCustomDateFrom(e.target.value)}
                                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                                        darkMode
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                />
                            </div>

                            {/* To Date */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    value={customDateTo}
                                    onChange={(e) => setCustomDateTo(e.target.value)}
                                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                                        darkMode
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                />
                            </div>

                            {/* Date Range Preview */}
                            {customDateFrom && customDateTo && (
                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                                    <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                                        Selected range: <strong>{customDateFrom}</strong> to <strong>{customDateTo}</strong>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCustomDateModal(false)}
                                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                                    darkMode
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (customDateFrom && customDateTo) {
                                        setShowCustomDateModal(false);
                                    }
                                }}
                                disabled={!customDateFrom || !customDateTo}
                                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                                    customDateFrom && customDateTo
                                        ? 'bg-green-500 hover:bg-green-600 text-white'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                Apply Filter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrailMap;
