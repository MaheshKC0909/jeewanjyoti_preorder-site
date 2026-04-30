import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Edit3, Mail, Phone, MapPin, Calendar, Users, Award, Star, Heart, Camera, X, User, UserCircle, Ruler, Scale, Droplets, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearTokens, getUserData } from '../../lib/tokenManager';
import { getUserEmailProfile, updateProfile, getUserById } from '../../lib/api';
import UserMapping from './UserMapping';
import TrailMap from '../../components/TrailMap';
import ECGMonitor from '../../components/ECGMonitor';
import RealTimeHealthDashboard from '../../components/RealTimeHealthDashboard';
import HeartRateDataComponent from '../../components/HeartRateDataComponent';
import SpO2DataComponent from '../../components/SpO2DataComponent';
import SleepDataComponent from '../../components/SleepDataComponent';
import ActivitySummary from '../../components/ActivitySummary';
import BloodPressureDataComponent from '../../components/BloodPressureDataComponent';
import StressDataComponent from '../../components/StressDataComponent';
import HRVDataComponent from '../../components/HRVDataComponent';
import MedicationPage from '../MedicationPage';

const API_BASE = 'https://jeewanjyoti-backend.smart.org.np';
const getFullImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
};

// Move InputField outside to prevent recreation on every render
const InputField = React.memo(({ icon: Icon, label, name, type = 'text', required = false, error, value, onChange, min, max, darkMode }) => {
  return (
    <div className="group relative">
      <label className={`flex items-center gap-2 text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <Icon className="w-4 h-4 text-violet-600" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          min={min}
          max={max}
          className={`w-full p-4 border rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 backdrop-blur-sm placeholder-gray-400 ${error ? 'border-red-500' : 'border-gray-200'
            } ${darkMode ? 'bg-gray-700 text-white' : 'bg-white/80'}`}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-1 animate-pulse flex items-center gap-1">
          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
          {typeof error === 'string' ? error : error[0]}
        </p>
      )}
    </div>
  );
});

const ProfileTab = React.memo(({ darkMode, selectedUserId = null, selectedUserInfo = null, globalDateFilter, globalDateRange }) => {
  const navigate = useNavigate();
  // Health data — populated via component callbacks (same approach as Home)
  const [heartRateData, setHeartRateData] = useState(null);
  const [spo2Data, setSpO2Data] = useState(null);
  const [sleepData, setSleepData] = useState(null);
  const [stepsData, setStepsData] = useState(null);
  const [bloodPressureData, setBloodPressureData] = useState(null);
  const [stressData, setStressData] = useState(null);
  const [hrvData, setHrvData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [mappedUserFullProfile, setMappedUserFullProfile] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showUserMappingModal, setShowUserMappingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoadingMappedUser, setIsLoadingMappedUser] = useState(false);
  const [showECGModal, setShowECGModal] = useState(false);
  const [showHealthDashboard, setShowHealthDashboard] = useState(false);
  const fileInputRef = useRef(null);

  // Check if user is admin/superuser
  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
  const isAdmin = userData.is_superuser || userData.role === 'ADMIN';

  // Determine which profile to display (own or mapped)
  const displayProfile = selectedUserId && mappedUserFullProfile
    ? mappedUserFullProfile
    : (selectedUserId && selectedUserInfo && !mappedUserFullProfile
      ? selectedUserInfo
      : userProfile);

  // Calculate BMI
  const calculateBMI = (height, weight) => {
    if (!height || !weight || height === 0 || weight === 0) return null;
    const heightInMeters = parseFloat(height) / 100;
    const weightInKg = parseFloat(weight);
    return (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
  };

  // Get BMI category
  const getBMICategory = (bmi) => {
    if (!bmi) return 'N/A';
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  // Fetch complete profile for mapped user
  useEffect(() => {
    const fetchMappedUserFullProfile = async () => {
      if (selectedUserId && selectedUserId !== userData?.id) {
        setIsLoadingMappedUser(true);
        try {
          // Fetch complete user profile from API
          const fullProfile = await getUserById(selectedUserId);
          setMappedUserFullProfile(fullProfile);
          console.log('Fetched full profile for mapped user:', fullProfile);
        } catch (error) {
          console.error('Error fetching mapped user full profile:', error);
          // Fallback to selectedUserInfo if available
          if (selectedUserInfo) {
            setMappedUserFullProfile(selectedUserInfo);
          }
        } finally {
          setIsLoadingMappedUser(false);
        }
      } else {
        // Clear mapped user profile when viewing own profile
        setMappedUserFullProfile(null);
      }
    };

    fetchMappedUserFullProfile();
  }, [selectedUserId, userData?.id, selectedUserInfo]);

  // Fetch own profile info only
  useEffect(() => {
    const fetchOwnProfile = async () => {
      if (!selectedUserId) {
        try {
          const profileResult = await getUserEmailProfile();
          setUserProfile(profileResult);
        } catch (error) {
          console.error('Error fetching own profile:', error);
        }
      }
    };
    fetchOwnProfile();
  }, [selectedUserId]);

  // Reset health data on user switch so stale data never lingers
  useEffect(() => {
    setHeartRateData(null);
    setSpO2Data(null);
    setSleepData(null);
    setStepsData(null);
    setBloodPressureData(null);
    setStressData(null);
    setHrvData(null);
  }, [selectedUserId]);

  // Handle profile image upload
  const handleProfileImageSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleProfileImageChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('profile_image', file);

      const response = await fetch('https://jeewanjyoti-backend.smart.org.np/api/profile-image/', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update profile image');
      }

      const data = await response.json().catch(() => ({}));
      const newImageUrl = data.profile_image || (data.user && data.user.profile_image) || null;

      if (newImageUrl) {
        setUserProfile((prev) => ({ ...(prev || {}), profile_image: newImageUrl }));
        try {
          const existing = JSON.parse(localStorage.getItem('user_data') || '{}');
          localStorage.setItem('user_data', JSON.stringify({ ...existing, profile_image: newImageUrl }));
        } catch { }
      }

      alert('Profile image updated successfully.');
    } catch (error) {
      console.error('Error updating profile image:', error);
      alert(error.message || 'Failed to update profile image');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Helper function to get display image URL
  const getDisplayImageUrl = () => {
    if (selectedUserId && mappedUserFullProfile) {
      return getFullImageUrl(mappedUserFullProfile.profile_image || mappedUserFullProfile.profileImage);
    }
    if (selectedUserId && selectedUserInfo && !mappedUserFullProfile) {
      return selectedUserInfo.profileImage || selectedUserInfo.profile_image;
    }
    return getFullImageUrl(userProfile?.profile_image);
  };

  // Helper function to get display name
  const getDisplayName = () => {
    if (selectedUserId && mappedUserFullProfile) {
      return `${mappedUserFullProfile.first_name || ''} ${mappedUserFullProfile.last_name || ''}`.trim() ||
        mappedUserFullProfile.name ||
        mappedUserFullProfile.fullName ||
        'User';
    }
    if (selectedUserId && selectedUserInfo && !mappedUserFullProfile) {
      return selectedUserInfo.fullName || selectedUserInfo.name || 'User';
    }
    return userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'User' : 'User';
  };

  // Helper function to get display initial for avatar
  const getDisplayInitial = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase() || 'U';
  };

  // Check if viewing own profile
  const isOwnProfile = !selectedUserId || selectedUserId === userData?.id;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Profile</h2>
        <div className="flex items-center gap-2 md:gap-3">
          {isOwnProfile && (
            <button
              onClick={() => setShowEditModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-sm md:text-base"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden md:inline">Edit Profile</span>
            </button>
          )}
          <button
            onClick={() => setShowUserMappingModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-sm md:text-base"
          >
            <Users className="w-4 h-4" />
            <span className="hidden md:inline">Add User</span>
          </button>
        </div>
      </div>

      {isLoadingMappedUser ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
              }`}>
              <div className="text-center mb-6">
                <div className="relative mx-auto w-16 h-16 md:w-24 md:h-24 mb-4">
                  {getDisplayImageUrl() ? (
                    <button onClick={() => setShowImageModal(true)} className="block w-16 h-16 md:w-24 md:h-24">
                      <img
                        src={getDisplayImageUrl()}
                        alt="Profile"
                        className="w-16 h-16 md:w-24 md:h-24 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.parentNode.innerHTML = `<div class="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg md:text-2xl font-bold">${getDisplayInitial()}</div>`;
                        }}
                      />
                    </button>
                  ) : (
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg md:text-2xl font-bold">
                      {getDisplayInitial()}
                    </div>
                  )}

                  {/* Only show camera/upload button for own profile */}
                  {isOwnProfile && (
                    <>
                      <button
                        onClick={handleProfileImageSelect}
                        className={`absolute bottom-0 right-0 border-2 rounded-full p-1 md:p-2 ${darkMode
                          ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                          } transition-colors`}
                      >
                        <Camera className="w-3 h-3 md:w-4 md:h-4 text-gray-600" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                        className="hidden"
                      />
                    </>
                  )}
                </div>

                <h3 className={`text-lg md:text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {getDisplayName()}
                </h3>

                {isOwnProfile && userProfile?.id && (
                  <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    ID: #{userProfile.id}
                  </p>
                )}

                {!isOwnProfile && (
                  <p className={`text-xs md:text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                    Mapped User
                  </p>
                )}

                {isOwnProfile && userProfile?.role === 'DOCTOR' && (
                  <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'} font-medium mt-1`}>
                    {userProfile.specialization || 'Doctor'}
                  </p>
                )}
              </div>

              {/* Contact details - only shown for own profile */}
              {isOwnProfile && (
                <div className="space-y-3 md:space-y-4">
                  {userProfile?.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                      <span className={`text-xs md:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {userProfile.email}
                      </span>
                    </div>
                  )}
                  {userProfile?.phone_number && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                      <span className={`text-xs md:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {userProfile.phone_number}
                      </span>
                    </div>
                  )}
                  {userProfile?.hospital_name && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                      <span className={`text-xs md:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {userProfile.hospital_name}
                      </span>
                    </div>
                  )}
                  {userProfile?.birthdate && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                      <span className={`text-xs md:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Born: {new Date(userProfile.birthdate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {userProfile?.gender && (
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                      <span className={`text-xs md:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {userProfile.gender}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Health Stats & Achievements */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Health Stats */}
            <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
              }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className={`text-base md:text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Health Statistics</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHealthDashboard(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                  >
                    <Activity className="w-4 h-4" />
                    Real time data
                  </button>
                  <button
                    onClick={() => setShowECGModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                    ECG
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                {/* Heart Rate */}
                <div className="text-center">
                  <div className="text-lg md:text-2xl font-bold text-red-500">
                    {heartRateData && Array.isArray(heartRateData) && heartRateData.length > 0
                      ? heartRateData[heartRateData.length - 1]?.once_heart_value
                      : '—'
                    }
                  </div>
                  <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Heart Rate</div>
                  <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>BPM</div>
                  {heartRateData && heartRateData.length > 0 && heartRateData[heartRateData.length - 1]?.date && (
                    <div className={`text-xs mt-1 px-1.5 py-0.5 rounded-full inline-block ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-500'}`}>
                      {new Date(heartRateData[heartRateData.length - 1].date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  )}
                </div>
                {/* Sleep Score */}
                <div className="text-center">
                  <div className="text-lg md:text-2xl font-bold text-indigo-500">
                    {sleepData && sleepData.length > 0
                      ? (() => {
                          const d = sleepData[0];
                          if (d.sleep_score) return d.sleep_score;
                          let score = 0;
                          const dur = d.duration;
                          if (dur >= 7 && dur <= 9) score += 30;
                          else if (dur >= 6 && dur <= 10) score += 20;
                          else score += 10;
                          const deep = d.deep_sleep_percentage;
                          if (deep >= 15 && deep <= 20) score += 25;
                          else if (deep >= 10 && deep <= 25) score += 15;
                          else score += 5;
                          const light = d.light_sleep_percentage;
                          if (light >= 45 && light <= 55) score += 25;
                          else if (light >= 40 && light <= 60) score += 15;
                          else score += 5;
                          const awake = d.awake_percentage;
                          if (awake < 5) score += 20;
                          else if (awake < 10) score += 10;
                          else score += 5;
                          return Math.min(score, 100);
                        })()
                      : '—'
                    }
                  </div>
                  <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sleep Score</div>
                  <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>/100</div>
                  {sleepData && sleepData.length > 0 && sleepData[0]?.date && (
                    <div className={`text-xs mt-1 px-1.5 py-0.5 rounded-full inline-block ${darkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-500'}`}>
                      {new Date(sleepData[0].date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  )}
                </div>
                {/* Daily Steps */}
                <div className="text-center">
                  <div className="text-lg md:text-2xl font-bold text-green-500">
                    {stepsData?.step ? stepsData.step.toLocaleString() : '—'}
                  </div>
                  <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Daily Steps</div>
                  {stepsData?.date && (
                    <div className={`text-xs mt-1 px-1.5 py-0.5 rounded-full inline-block ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}>
                      {new Date(stepsData.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  )}
                </div>
                {/* Blood Oxygen */}
                <div className="text-center">
                  <div className="text-lg md:text-2xl font-bold text-blue-500">
                    {spo2Data && Array.isArray(spo2Data) && spo2Data.length > 0
                      ? spo2Data[spo2Data.length - 1]?.Blood_oxygen
                      : '—'
                    }%
                  </div>
                  <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Blood Oxygen</div>
                  {spo2Data && spo2Data.length > 0 && (spo2Data[spo2Data.length - 1]?.date || spo2Data[spo2Data.length - 1]?.measure_time) && (
                    <div className={`text-xs mt-1 px-1.5 py-0.5 rounded-full inline-block ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-500'}`}>
                      {new Date(spo2Data[spo2Data.length - 1].date || spo2Data[spo2Data.length - 1].measure_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  )}
                </div>
                {/* Blood Pressure */}
                <div className="text-center">
                  <div className="text-lg md:text-2xl font-bold text-red-600">
                    {bloodPressureData && Array.isArray(bloodPressureData) && bloodPressureData.length > 0
                      ? `${bloodPressureData[bloodPressureData.length - 1]?.sbp}/${bloodPressureData[bloodPressureData.length - 1]?.dbp}`
                      : '—'
                    }
                  </div>
                  <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>SBP/DBP</div>
                  {bloodPressureData && bloodPressureData.length > 0 && (bloodPressureData[bloodPressureData.length - 1]?.date || bloodPressureData[bloodPressureData.length - 1]?.measure_time) && (
                    <div className={`text-xs mt-1 px-1.5 py-0.5 rounded-full inline-block ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-500'}`}>
                      {new Date(bloodPressureData[bloodPressureData.length - 1].date || bloodPressureData[bloodPressureData.length - 1].measure_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  )}
                </div>
                {/* Stress */}
                <div className="text-center">
                  <div className="text-lg md:text-2xl font-bold text-purple-500">
                    {stressData && Array.isArray(stressData) && stressData.length > 0
                      ? stressData[stressData.length - 1]?.stress
                      : '—'
                    }
                  </div>
                  <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Stress Level</div>
                  {stressData && stressData.length > 0 && (stressData[stressData.length - 1]?.date || stressData[stressData.length - 1]?.measure_time) && (
                    <div className={`text-xs mt-1 px-1.5 py-0.5 rounded-full inline-block ${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-500'}`}>
                      {new Date(stressData[stressData.length - 1].date || stressData[stressData.length - 1].measure_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  )}
                </div>
                {/* HRV */}
                <div className="text-center">
                  <div className="text-lg md:text-2xl font-bold text-teal-500">
                    {hrvData && Array.isArray(hrvData) && hrvData.length > 0
                      ? hrvData[hrvData.length - 1]?.hrv
                      : '—'
                    }
                  </div>
                  <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>HRV Score</div>
                  {hrvData && hrvData.length > 0 && (hrvData[hrvData.length - 1]?.date || hrvData[hrvData.length - 1]?.measure_time) && (
                    <div className={`text-xs mt-1 px-1.5 py-0.5 rounded-full inline-block ${darkMode ? 'bg-teal-900/30 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
                      {new Date(hrvData[hrvData.length - 1].date || hrvData[hrvData.length - 1].measure_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  )}
                </div>
              </div>

              {/* Hidden data components — same as Home, data feeds into state via callbacks */}
              <div className="hidden">
                <HeartRateDataComponent
                  darkMode={darkMode}
                  onHeartRateDataUpdate={setHeartRateData}
                  selectedUserId={selectedUserId}
                  dateRange={globalDateRange}
                />
                <SpO2DataComponent
                  darkMode={darkMode}
                  onSpO2DataUpdate={setSpO2Data}
                  selectedUserId={selectedUserId}
                  dateRange={globalDateRange}
                />
                <SleepDataComponent
                  darkMode={darkMode}
                  onSleepDataUpdate={setSleepData}
                  selectedUserId={selectedUserId}
                  dateRange={globalDateRange}
                />
                <ActivitySummary
                  darkMode={darkMode}
                  onActivityDataUpdate={setStepsData}
                  selectedUserId={selectedUserId}
                  dateRange={globalDateRange}
                />
                <BloodPressureDataComponent
                  darkMode={darkMode}
                  onBloodPressureDataUpdate={setBloodPressureData}
                  selectedUserId={selectedUserId}
                  dateRange={globalDateRange}
                />
                <StressDataComponent
                  darkMode={darkMode}
                  onStressDataUpdate={setStressData}
                  selectedUserId={selectedUserId}
                  dateRange={globalDateRange}
                />
                <HRVDataComponent
                  darkMode={darkMode}
                  onHRVDataUpdate={setHrvData}
                  selectedUserId={selectedUserId}
                  dateRange={globalDateRange}
                />
              </div>
            </div>

            {/* Medical Information */}
            <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
              }`}>
              <h3 className={`text-base md:text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>Medical Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <h4 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Basic Info</h4>
                  <div className="space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Height:</span>
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-800'}>
                        {displayProfile?.height && displayProfile.height !== '0.00'
                          ? `${displayProfile.height} cm`
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Weight:</span>
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-800'}>
                        {displayProfile?.weight && displayProfile.weight !== '0.00'
                          ? `${displayProfile.weight} kg`
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Blood Type:</span>
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-800'}>
                        {displayProfile?.blood_group || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>BMI:</span>
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-800'}>
                        {displayProfile?.height && displayProfile?.weight &&
                          displayProfile.height !== '0.00' && displayProfile.weight !== '0.00'
                          ? `${calculateBMI(displayProfile.height, displayProfile.weight)} (${getBMICategory(calculateBMI(displayProfile.height, displayProfile.weight))})`
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    {displayProfile?.role === 'DOCTOR' ? 'Professional Info' : 'Conditions'}
                  </h4>
                  {displayProfile?.role === 'DOCTOR' ? (
                    <div className="space-y-2 text-xs md:text-sm">
                      {displayProfile?.specialization && (
                        <div className="flex justify-between">
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Specialization:</span>
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-800'}>{displayProfile.specialization}</span>
                        </div>
                      )}
                      {displayProfile?.license_number && (
                        <div className="flex justify-between">
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>License:</span>
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-800'}>{displayProfile.license_number}</span>
                        </div>
                      )}
                      {displayProfile?.experience && (
                        <div className="flex justify-between">
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Experience:</span>
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-800'}>{displayProfile.experience} years</span>
                        </div>
                      )}
                      {displayProfile?.education && (
                        <div className="flex justify-between">
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Education:</span>
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-800'}>{displayProfile.education}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {displayProfile?.medical_conditions && displayProfile.medical_conditions.length > 0 ? (
                        displayProfile.medical_conditions.map((condition, index) => (
                          <span
                            key={index}
                            className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs md:text-sm mr-2 mb-2"
                          >
                            {condition}
                          </span>
                        ))
                      ) : (
                        <span className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No medical conditions recorded</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Achievements */}
            {displayProfile?.achievements && displayProfile.achievements.length > 0 && (
              <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                }`}>
                <h3 className={`text-base md:text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>Health Achievements</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  {displayProfile.achievements.map((achievement, index) => (
                    <div key={index} className={`flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl ${darkMode
                      ? 'bg-gradient-to-r from-yellow-900 to-yellow-800'
                      : 'bg-gradient-to-r from-yellow-100 to-yellow-50'
                      }`}>
                      <Award className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" />
                      <div>
                        <div className={`font-semibold text-sm md:text-base ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {achievement.title || 'Achievement'}
                        </div>
                        <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {achievement.description || ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency Contacts - only shown for own profile */}
            {isOwnProfile && userProfile?.emergency_contacts && userProfile.emergency_contacts.length > 0 && (
              <div className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                }`}>
                <h3 className={`text-base md:text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>Emergency Contacts</h3>
                <div className="space-y-3 md:space-y-4">
                  {userProfile.emergency_contacts.map((contact, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 md:p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'
                      }`}>
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
                        <div>
                          <div className={`font-semibold text-sm md:text-base ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {contact.name || 'Contact'}
                          </div>
                          {contact.relationship && (
                            <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {contact.relationship}
                            </div>
                          )}
                        </div>
                      </div>
                      {contact.phone && (
                        <div className="flex items-center gap-2">
                          <span className={`text-xs md:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {contact.phone}
                          </span>
                          <Phone className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trail Map Section */}
            <TrailMap
              darkMode={darkMode}
              userId={selectedUserId}
              globalDateFilter={globalDateFilter}
              globalDateRange={globalDateRange}
            />

            {/* Medication Section */}
            <MedicationPage
              darkMode={darkMode}
              userId={selectedUserId}
            />
          </div>
        </div>
      )}

      {/* Full Image Modal */}
      {showImageModal && getDisplayImageUrl() && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-3 -right-3 bg-white text-gray-700 rounded-full p-2 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={getDisplayImageUrl()} alt="Profile Full" className="w-full h-auto rounded-xl" />
          </div>
        </div>
      )}

      {/* Edit Profile Modal - only for own profile */}
      {showEditModal && isOwnProfile && (
        <EditProfileModal
          darkMode={darkMode}
          userProfile={userProfile}
          onClose={() => setShowEditModal(false)}
          onSuccess={async () => {
            try {
              const updatedProfile = await getUserEmailProfile();
              setUserProfile(updatedProfile);
              const userData = getUserData();
              if (userData) {
                const updatedUserData = { ...userData, ...updatedProfile };
                localStorage.setItem('user_data', JSON.stringify(updatedUserData));
              }
            } catch (error) {
              console.error('Error refreshing profile:', error);
            }
            setShowEditModal(false);
          }}
        />
      )}

      {/* User Mapping Modal */}
      {showUserMappingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            <div className={`sticky top-0 border-b px-6 py-4 rounded-t-3xl flex items-center justify-between ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>User Mapping</h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Add and manage user mappings</p>
                </div>
              </div>
              <button
                onClick={() => setShowUserMappingModal(false)}
                className={`text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full ${darkMode ? 'hover:bg-gray-700' : ''
                  }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <UserMapping darkMode={darkMode} onClose={() => setShowUserMappingModal(false)} />
            </div>
          </div>
        </div>
      )}

      {/* ECG Monitor Modal */}
      <ECGMonitor
        isOpen={showECGModal}
        onClose={() => setShowECGModal(false)}
        selectedPatient={{
          id: selectedUserId && selectedUserId !== userData?.id ? selectedUserId : userData?.id,
          name: getDisplayName()
        }}
        darkMode={darkMode}
        onRequestSent={() => console.log('ECG request sent from profile')}
        onRequestAccepted={() => console.log('ECG request accepted from profile')}
        onRequestRejected={() => console.log('ECG request rejected from profile')}
      />

      {/* Real Time Health Dashboard Modal - Mirroring Appointments GUI */}
      <RealTimeHealthDashboard
        isOpen={showHealthDashboard}
        onClose={() => setShowHealthDashboard(false)}
        patientId={selectedUserId && selectedUserId !== userData?.id ? selectedUserId : null}
        patientName={getDisplayName()}
        darkMode={darkMode}
        accessToken={localStorage.getItem('access_token')}
      />

    </div>
  );
});

// Edit Profile Modal Component
const EditProfileModal = ({ darkMode, userProfile, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birthdate: '',
    gender: '',
    height: '',
    weight: '',
    blood_group: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (userProfile) {
      setFormData({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        birthdate: userProfile.birthdate ? userProfile.birthdate.split('T')[0] : '',
        gender: userProfile.gender || '',
        height: userProfile.height || '',
        weight: userProfile.weight || '',
        blood_group: userProfile.blood_group || ''
      });
    }
  }, [userProfile]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setErrors(prev => {
      if (prev[name]) {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const payload = {};
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value === '' || value === null || value === undefined) {
          return;
        }
        if (key === 'height' || key === 'weight') {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            payload[key] = numValue.toFixed(2);
          }
        } else if (typeof value === 'string') {
          const trimmedValue = value.trim();
          if (trimmedValue !== '') {
            payload[key] = trimmedValue;
          }
        } else {
          payload[key] = value;
        }
      });

      if (Object.keys(payload).length === 0) {
        onSuccess?.();
        onClose();
        return;
      }

      console.log('Sending payload to API:', payload);
      const result = await updateProfile(payload);
      console.log('Profile update result:', result);

      const userData = getUserData();
      if (userData) {
        const updatedUserData = { ...userData, ...payload };
        localStorage.setItem('user_data', JSON.stringify(updatedUserData));
      }

      onSuccess?.();
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.details) {
        if (typeof error.details === 'object') {
          const formattedErrors = {};
          Object.keys(error.details).forEach(key => {
            if (Array.isArray(error.details[key])) {
              formattedErrors[key] = error.details[key][0];
            } else {
              formattedErrors[key] = error.details[key];
            }
          });
          setErrors(formattedErrors);
        } else {
          setErrors({ general: error.details });
        }
      }
      const errorMessage = error.details?.detail || error.details?.message || error.message || 'Failed to update profile. Please check your inputs and try again.';
      alert(`Failed to update profile: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
        <div className={`sticky top-0 border-b px-6 py-4 rounded-t-3xl flex items-center justify-between ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
              <Edit3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Edit Profile</h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Update your profile information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full ${darkMode ? 'hover:bg-gray-700' : ''
              }`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField
              icon={User}
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              error={errors.first_name}
              darkMode={darkMode}
            />
            <InputField
              icon={User}
              label="Last Name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              error={errors.last_name}
              darkMode={darkMode}
            />
            <InputField
              icon={Calendar}
              label="Birthdate"
              name="birthdate"
              type="date"
              value={formData.birthdate}
              onChange={handleChange}
              error={errors.birthdate}
              min="1900-01-01"
              max={new Date().toISOString().split('T')[0]}
              darkMode={darkMode}
            />
            <div className="group relative">
              <label className={`flex items-center gap-2 text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <UserCircle className="w-4 h-4 text-violet-600" />
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`w-full p-4 border rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 backdrop-blur-sm ${errors.gender ? 'border-red-500' : 'border-gray-200'
                  } ${darkMode ? 'bg-gray-700 text-white' : 'bg-white/80'}`}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && (
                <p className="text-red-500 text-xs mt-1 animate-pulse flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {typeof errors.gender === 'string' ? errors.gender : errors.gender[0]}
                </p>
              )}
            </div>
            <InputField
              icon={Ruler}
              label="Height (cm)"
              name="height"
              type="number"
              value={formData.height}
              onChange={handleChange}
              error={errors.height}
              darkMode={darkMode}
            />
            <InputField
              icon={Scale}
              label="Weight (kg)"
              name="weight"
              type="number"
              value={formData.weight}
              onChange={handleChange}
              error={errors.weight}
              darkMode={darkMode}
            />
            <div className="group relative md:col-span-2">
              <label className={`flex items-center gap-2 text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <Droplets className="w-4 h-4 text-violet-600" />
                Blood Group
              </label>
              <select
                name="blood_group"
                value={formData.blood_group}
                onChange={handleChange}
                className={`w-full p-4 border rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 backdrop-blur-sm ${errors.blood_group ? 'border-red-500' : 'border-gray-200'
                  } ${darkMode ? 'bg-gray-700 text-white' : 'bg-white/80'}`}
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              {errors.blood_group && (
                <p className="text-red-500 text-xs mt-1 animate-pulse flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {typeof errors.blood_group === 'string' ? errors.blood_group : errors.blood_group[0]}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-6 py-3 border-2 rounded-2xl font-semibold transition-all duration-300 ${darkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl font-semibold text-white hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileTab;