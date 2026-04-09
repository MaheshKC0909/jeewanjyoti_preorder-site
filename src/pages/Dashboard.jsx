import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Home, Calendar, MessageCircle, User, Moon, Sun, Bell, Settings, Menu, X, LogOut, Filter, SlidersHorizontal, ChevronDown, Loader2 } from 'lucide-react';
import jjlogo from '../assets/jjlogo.png';
import HomeTab from './dashboard/Home';
import AppointmentsTab from './dashboard/Appointments';
import ErrorBoundary from '../components/ErrorBoundary';
import ChatTab from './dashboard/Chat';
import ProfileTab from './dashboard/Profile';
import SettingsTab from './dashboard/Settings';
import ProfileCompletionForm from '../components/ProfileCompletionForm';
import { auth } from '../lib/firebase';
import { isAuthenticated, getUserData, clearTokens } from '../lib/tokenManager';
import { logoutUser, getUserEmailProfile } from '../lib/api';

const getFullImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `https://jeewanjyoti-backend.smart.org.np${url}`;
  return `https://jeewanjyoti-backend.smart.org.np/${url}`;
};

// Helper function to get valid profile image URL with fallback
const getValidProfileImage = (userData, darkMode = false) => {
  if (!userData) return null;

  // Try to get profile image from various sources
  let imageUrl = null;

  // Check for profile_image in backendUser
  if (userData.profile_image) {
    imageUrl = getFullImageUrl(userData.profile_image);
  }
  // Check for photoURL in Firebase user
  else if (userData.photoURL) {
    imageUrl = userData.photoURL;
  }
  // Check for avatar or other image fields
  else if (userData.avatar) {
    imageUrl = getFullImageUrl(userData.avatar);
  }

  // Validate if URL is accessible
  if (imageUrl) {
    return imageUrl;
  }

  // Return null to use fallback (initials or default icon)
  return null;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize activeTab from URL hash or localStorage, default to 'home'
  const [activeTab, setActiveTab] = useState(() => {
    const hash = location.hash.replace('#', '');
    const savedTab = localStorage.getItem('dashboardActiveTab');
    return hash || savedTab || 'home';
  });
  const [darkMode, setDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isChatRoomOpen, setIsChatRoomOpen] = useState(false);
  const [backendUser, setBackendUser] = useState(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mappedUsers, setMappedUsers] = useState([]);
  const [loadingMappedUsers, setLoadingMappedUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectionFeedback, setSelectionFeedback] = useState(null);
  const [imageErrors, setImageErrors] = useState({}); // Track image loading errors
  const [totalUnread, setTotalUnread] = useState(0); // Real unread count from ChatTab

  // Global filter states
  const [globalDateFilter, setGlobalDateFilter] = useState('today');
  const [showGlobalFilterDropdown, setShowGlobalFilterDropdown] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [globalDateRange, setGlobalDateRange] = useState({
    from: null,
    to: null,
    customRange: false,
    period: 'today'
  });

  // Check authentication status
  useEffect(() => {
    const checkAuthentication = () => {
      if (isAuthenticated()) {
        const userData = getUserData();
        setBackendUser(userData);
        setLoading(false);
      } else {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            setUser(firebaseUser);
            setLoading(false);
          } else {
            setUser(null);
            setLoading(false);
            navigate('/login');
          }
        });
        return unsubscribe;
      }
    };

    const unsubscribe = checkAuthentication();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigate]);

  // Silently refresh profile data
  useEffect(() => {
    const refreshProfile = async () => {
      const currentObj = getUserData();
      if (currentObj) {
        setBackendUser(prev => ({ ...prev, ...currentObj }));
      }

      if (backendUser || user) {
        try {
          const freshData = await getUserEmailProfile();
          if (freshData) {
            setBackendUser(prev => ({ ...prev, ...freshData }));
            const localData = getUserData() || {};
            localStorage.setItem('user_data', JSON.stringify({ ...localData, ...freshData }));
          }
        } catch (error) {
          console.error('Error silently refreshing profile:', error);
        }
      }
    };
    refreshProfile();
  }, [user, activeTab]);

  // Check if profile needs completion
  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!backendUser && !user) return;

      try {
        const shouldShowForm = localStorage.getItem('show_profile_form_on_dashboard');
        const userData = getUserData();

        if (userData) {
          const requiredFields = ['first_name', 'last_name', 'birthdate', 'gender', 'height', 'weight', 'blood_group'];

          const missingFields = requiredFields.filter(field => {
            const value = userData[field]
            const isMissing = !value || value === '' || value === '0.00' || value === null || value === undefined
            return isMissing
          });

          if (missingFields.length > 0) {
            if (shouldShowForm === 'true') {
              setShowProfileForm(true);
              setProfileComplete(false);
              localStorage.removeItem('show_profile_form_on_dashboard');
            } else {
              const hasSkippedProfileForm = localStorage.getItem('profile_form_skipped');
              if (!hasSkippedProfileForm) {
                setShowProfileForm(true);
                setProfileComplete(false);
              } else {
                setProfileComplete(false);
              }
            }
          } else {
            setProfileComplete(true);
            localStorage.removeItem('show_profile_form_on_dashboard');
          }
        } else {
          try {
            const profileData = await getUserEmailProfile();
            const requiredFields = ['first_name', 'last_name', 'birthdate', 'gender', 'height', 'weight', 'blood_group'];
            const missingFields = requiredFields.filter(field => {
              const value = profileData[field]
              return !value || value === '' || value === '0.00' || value === null || value === undefined
            });

            if (missingFields.length > 0) {
              if (shouldShowForm === 'true') {
                setShowProfileForm(true);
                setProfileComplete(false);
                localStorage.removeItem('show_profile_form_on_dashboard');
              } else {
                const hasSkippedProfileForm = localStorage.getItem('profile_form_skipped');
                if (!hasSkippedProfileForm) {
                  setShowProfileForm(true);
                  setProfileComplete(false);
                } else {
                  setProfileComplete(false);
                }
              }
            } else {
              setProfileComplete(true);
              localStorage.removeItem('show_profile_form_on_dashboard');
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        }
      } catch (error) {
        console.error('Error checking profile completion:', error);
      }
    };

    if (!loading && (backendUser || user)) {
      checkProfileCompletion();
    }
  }, [backendUser, user, loading]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterDropdown && !event.target.closest('.filter-dropdown')) {
        setShowFilterDropdown(false);
      }
      if (showUserDropdown && !event.target.closest('.user-dropdown')) {
        setShowUserDropdown(false);
      }
      if (showGlobalFilterDropdown && !event.target.closest('.global-filter-dropdown')) {
        setShowGlobalFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown, showUserDropdown, showGlobalFilterDropdown]);

  // Fetch mapped users
  const fetchMappedUsers = async () => {
    if (!isAuthenticated()) return;

    setLoadingMappedUsers(true);
    try {
      const token = localStorage.getItem('access_token') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('authToken');

      if (!token) {
        setLoadingMappedUsers(false);
        return;
      }

      const response = await fetch('https://jeewanjyoti-backend.smart.org.np/api/user-mapping/list/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userData = getUserData();
        const currentUserId = userData?.id;

        const filteredMappedUsers = data.filter(mapping => {
          const isNotCurrentUser = mapping.mapped_user.id !== currentUserId;
          return isNotCurrentUser;
        });

        setMappedUsers(filteredMappedUsers);
      }
    } catch (error) {
      console.error('Error fetching mapped users:', error);
    } finally {
      setLoadingMappedUsers(false);
    }
  };

  // Fetch mapped users when user is authenticated
  useEffect(() => {
    if (backendUser || user) {
      fetchMappedUsers();
    }
  }, [backendUser, user]);

  // Handle user selection
  const handleUserSelection = (userId) => {
    const newUserId = userId === selectedUserId ? null : userId;
    setSelectedUserId(newUserId);
    setShowUserDropdown(false);

    if (newUserId) {
      const selectedUser = mappedUsers.find(m => m.mapped_user.id === userId);
      if (selectedUser) {
        setSelectionFeedback(`Loading data for ${selectedUser.nickname || selectedUser.mapped_user.full_name}...`);
      }
    } else {
      setSelectionFeedback('Loading your data...');
    }

    setTimeout(() => setSelectionFeedback(null), 2000);
  };

  // Handle global filter change
  const handleGlobalFilterChange = (filterType) => {
    setGlobalDateFilter(filterType);

    if (filterType === 'custom') {
      setShowGlobalFilterDropdown(false);
      setShowCustomDateModal(true);
      const today = new Date().toISOString().split('T')[0];
      setCustomDateFrom(today);
      setCustomDateTo(today);
    } else {
      setGlobalDateRange({
        from: null,
        to: null,
        customRange: false,
        period: filterType
      });
    }
    setShowGlobalFilterDropdown(false);
  };

  // Handle custom date range apply
  const handleCustomDateApply = (from, to) => {
    setGlobalDateRange({
      from: formatDateForAPI(from),
      to: formatDateForAPI(to),
      customRange: true,
      period: 'custom'
    });
    setGlobalDateFilter('custom');
  };

  // Format date for API
  const formatDateForAPI = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  // Function to get currently viewed user info with proper image handling
  const getCurrentViewedUser = () => {
    if (selectedUserId) {
      const mappedUser = mappedUsers.find(m => m.mapped_user.id === selectedUserId);
      if (mappedUser) {
        const profileImage = getValidProfileImage(mappedUser.mapped_user);
        return {
          id: mappedUser.mapped_user.id,
          name: mappedUser.nickname || mappedUser.mapped_user.full_name,
          fullName: mappedUser.mapped_user.full_name,
          firstName: mappedUser.mapped_user.first_name,
          profileImage: profileImage,
          email: mappedUser.mapped_user.email,
          isMappedUser: true,
          rawData: mappedUser.mapped_user
        };
      }
    }

    // Get main user data - combine backendUser and Firebase user
    const mainUserData = {
      ...backendUser,
      photoURL: user?.photoURL,
      displayName: user?.displayName
    };

    const profileImage = getValidProfileImage(mainUserData);

    return {
      id: backendUser?.id || user?.uid,
      name: backendUser?.first_name || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User',
      fullName: backendUser?.full_name || user?.displayName || backendUser?.first_name || user?.email?.split('@')[0] || 'User',
      firstName: backendUser?.first_name,
      profileImage: profileImage,
      email: backendUser?.email || user?.email,
      isMappedUser: false,
      rawData: mainUserData
    };
  };

  const currentUser = useMemo(() => getCurrentViewedUser(), [
    selectedUserId, 
    backendUser?.id, 
    backendUser?.first_name, 
    user?.uid, 
    mappedUsers.length
  ]);

  // Handle image load error
  const handleImageError = (userId, imageType = 'profile') => {
    const errorKey = `${userId}_${imageType}`;
    setImageErrors(prev => ({ ...prev, [errorKey]: true }));
  };

  // Handle tab change with persistence
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('dashboardActiveTab', tab);
    window.history.replaceState(null, '', `#${tab}`);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Show logout confirmation
  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  // Handle profile form close
  const handleProfileFormClose = () => {
    setShowProfileForm(false);
    localStorage.setItem('profile_form_skipped', 'true');
  };

  // Handle profile form success
  const handleProfileFormSuccess = () => {
    setShowProfileForm(false);
    setProfileComplete(true);
    const userData = getUserData();
    if (userData) {
      setBackendUser(userData);
    }
    localStorage.removeItem('profile_form_skipped');
    localStorage.removeItem('show_profile_form_on_dashboard');
  };

  // Handle logout confirmation
  const handleLogoutConfirm = async () => {
    try {
      await logoutUser();
      if (user) {
        await signOut(auth);
      }
      clearTokens();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      clearTokens();
      navigate('/login');
    }
  };

  // Handle chat room state change
  const handleChatRoomStateChange = (isOpen) => {
    setIsChatRoomOpen(isOpen);
  };

  // Cancel logout
  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const renderContent = () => {
    const getSelectedUserInfo = () => {
      if (selectedUserId) {
        const mappedUser = mappedUsers.find(m => m.mapped_user.id === selectedUserId);
        if (mappedUser) {
          return {
            name: mappedUser.nickname || mappedUser.mapped_user.full_name,
            fullName: mappedUser.mapped_user.full_name,
            profileImage: getValidProfileImage(mappedUser.mapped_user)
          };
        }
      }
      const mainUserData = {
        ...backendUser,
        photoURL: user?.photoURL
      };
      return {
        name: backendUser?.first_name || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User',
        fullName: backendUser?.full_name || user?.displayName || backendUser?.first_name || user?.email?.split('@')[0] || 'User',
        profileImage: getValidProfileImage(mainUserData)
      };
    };

    switch (activeTab) {
      case 'home':
        return (
          <HomeTab
            darkMode={darkMode}
            selectedUserId={selectedUserId}
            selectedUserInfo={getSelectedUserInfo()}
            globalDateFilter={globalDateFilter}
            globalDateRange={globalDateRange}
          />
        );
      case 'appointments':
        return (
          <ErrorBoundary>
            <AppointmentsTab
              darkMode={darkMode}
              onSwitchToChat={() => setActiveTab('chat')}
            />
          </ErrorBoundary>
        );
      case 'chat':
        return <ChatTab darkMode={darkMode} onChatRoomStateChange={handleChatRoomStateChange} onUnreadCountChange={setTotalUnread} />;
      case 'profile':
        return <ProfileTab darkMode={darkMode} selectedUserId={selectedUserId} selectedUserInfo={currentUser} globalDateFilter={globalDateFilter} globalDateRange={globalDateRange} />;
      case 'settings':
        return <SettingsTab darkMode={darkMode} />;
      default:
        return <HomeTab darkMode={darkMode} selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} />;
    }
  };

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user && !backendUser) {
    return null;
  }

  return (
    <div className={`${activeTab === 'chat' ? 'h-screen overflow-hidden flex flex-col' : 'min-h-screen pb-20 md:pb-0'} ${darkMode
      ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}>
      {/* Navigation */}
      <nav className={`relative shadow-lg border-b z-50 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
        } ${isChatRoomOpen ? 'md:block hidden' : ''}`}>
        <div className="max-w-7xl mx-auto px-3 md:px-4">
          <div className="flex items-center justify-between gap-2 py-3">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <button
                onClick={() => handleTabChange('home')}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-200"
              >
                <img src={jjlogo} alt="JJ Logo" className="w-8 h-8" />
                <h1 className="text-xl md:text-2xl font-bold text-blue-500 whitespace-nowrap truncate">
                  DIGITAL CARE
                </h1>
              </button>
              <div className={`hidden md:flex items-center gap-1 rounded-xl p-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                <button
                  onClick={() => handleTabChange('home')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${activeTab === 'home'
                    ? darkMode
                      ? 'bg-gray-700 shadow-md text-blue-400'
                      : 'bg-white shadow-md text-blue-600'
                    : darkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  <Home className="w-5 h-5" />
                  <span className="font-medium">Home</span>
                </button>
                <button
                  onClick={() => handleTabChange('appointments')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${activeTab === 'appointments'
                    ? darkMode
                      ? 'bg-gray-700 shadow-md text-blue-400'
                      : 'bg-white shadow-md text-blue-600'
                    : darkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">Appointments</span>
                </button>
                <button
                  onClick={() => handleTabChange('chat')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${activeTab === 'chat'
                    ? darkMode
                      ? 'bg-gray-700 shadow-md text-blue-400'
                      : 'bg-white shadow-md text-blue-600'
                    : darkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">Chat</span>
                  {totalUnread > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-1">{totalUnread > 99 ? '99+' : totalUnread}</span>
                  )}
                </button>
                <button
                  onClick={() => handleTabChange('profile')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${activeTab === 'profile'
                    ? darkMode
                      ? 'bg-gray-700 shadow-md text-blue-400'
                      : 'bg-white shadow-md text-blue-600'
                    : darkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Profile</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* User Dropdown */}
              <div className="hidden lg:flex items-center gap-2 px-2 py-1.5 rounded-lg whitespace-nowrap user-dropdown relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className={`flex items-center gap-2 transition-all duration-200 transform hover:scale-105 ${darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } rounded-lg px-2 py-1.5`}
                >
                  {/* Profile Image with better fallback */}
                  {currentUser.profileImage && !imageErrors[`${currentUser.id}_profile`] ? (
                    <img
                      src={currentUser.profileImage}
                      alt={currentUser.name}
                      className="w-5 h-5 rounded-full object-cover"
                      onError={() => handleImageError(currentUser.id, 'profile')}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium truncate max-w-[8rem]">
                    {currentUser.name}
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown Menu */}
                {showUserDropdown && (
                  <div className={`absolute top-full left-0 mt-2 w-64 rounded-xl shadow-lg border z-50 ${darkMode
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-200'
                    } max-h-96 overflow-y-auto`}>
                    {/* Currently Viewing Section */}
                    <div className={`p-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        CURRENTLY VIEWING
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {currentUser.profileImage && !imageErrors[`${currentUser.id}_profile_current`] ? (
                          <img
                            src={currentUser.profileImage}
                            alt={currentUser.name}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={() => handleImageError(currentUser.id, 'profile_current')}
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500`}>
                            <span className="text-white text-sm font-bold">
                              {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium truncate">
                            {currentUser.fullName}
                          </div>
                          <div className="text-xs opacity-75">
                            {currentUser.isMappedUser ? 'Mapped User' : 'Your Account'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Your Account Option */}
                    <div className="p-3">
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        YOUR ACCOUNT
                      </p>
                      <button
                        onClick={() => {
                          handleUserSelection(null);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2 p-2 rounded transition-colors ${!selectedUserId
                            ? darkMode
                              ? 'bg-gray-700 text-blue-400'
                              : 'bg-blue-50 text-blue-600'
                            : darkMode
                              ? 'hover:bg-gray-700 text-gray-300'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                      >
                        {getValidProfileImage({ ...backendUser, photoURL: user?.photoURL }) && !imageErrors['main_user_account'] ? (
                          <img
                            src={getValidProfileImage({ ...backendUser, photoURL: user?.photoURL })}
                            alt="Your account"
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                            onError={() => handleImageError('main_user', 'account')}
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              {backendUser?.first_name?.charAt(0).toUpperCase() || user?.displayName?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <div className="text-xs font-medium truncate">
                            {backendUser?.first_name || user?.displayName?.split(' ')[0] || 'My Data'}
                          </div>
                          {!selectedUserId && (
                            <div className="text-xs opacity-75">Currently viewing</div>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Mapped Users Section */}
                    {mappedUsers.length > 0 && (
                      <div className={`p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          MAPPED USERS
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {mappedUsers.map((mapping) => {
                            const mappedUserImage = getValidProfileImage(mapping.mapped_user);
                            const errorKey = `mapped_${mapping.mapped_user.id}`;
                            return (
                              <button
                                key={mapping.id}
                                onClick={() => handleUserSelection(mapping.mapped_user.id)}
                                className={`w-full flex items-center gap-2 p-2 rounded transition-colors ${selectedUserId === mapping.mapped_user.id
                                    ? darkMode
                                      ? 'bg-gray-700 text-blue-400'
                                      : 'bg-blue-50 text-blue-600'
                                    : darkMode
                                      ? 'hover:bg-gray-700 text-gray-300'
                                      : 'hover:bg-gray-100 text-gray-700'
                                  }`}
                              >
                                {mappedUserImage && !imageErrors[errorKey] ? (
                                  <img
                                    src={mappedUserImage}
                                    alt={mapping.mapped_user.full_name}
                                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                    onError={() => handleImageError(errorKey, 'mapped')}
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-xs font-bold">
                                      {mapping.mapped_user.full_name?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                )}
                                <div className="flex-1 text-left">
                                  <div className="text-xs font-medium truncate">
                                    {mapping.nickname || mapping.mapped_user.full_name}
                                  </div>
                                  {selectedUserId === mapping.mapped_user.id && (
                                    <div className="text-xs opacity-75">Currently viewing</div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {loadingMappedUsers && (
                      <div className="p-3">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Date Display */}
              <div className={`hidden md:flex items-center gap-2 px-2 py-1.5 rounded-lg whitespace-nowrap transition-all duration-200 transform hover:scale-105 ${darkMode
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>

              {/* Global Period Filter */}
              <div className="hidden lg:block relative global-filter-dropdown">
                <button
                  onClick={() => setShowGlobalFilterDropdown(!showGlobalFilterDropdown)}
                  className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${showGlobalFilterDropdown || globalDateFilter !== 'today'
                      ? darkMode
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-purple-500 hover:bg-purple-600'
                      : darkMode
                        ? 'bg-gray-800 hover:bg-purple-600/20 border border-purple-500/30'
                        : 'bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border border-purple-200'
                    }`}
                  title={`Filter: ${globalDateFilter === 'today' ? 'Today' :
                      globalDateFilter === 'week' ? 'This Week' :
                        globalDateFilter === 'month' ? 'This Month' : 'Custom Range'
                    }`}
                >
                  <SlidersHorizontal className={`w-5 h-5 transition-colors ${showGlobalFilterDropdown || globalDateFilter !== 'today'
                      ? 'text-white'
                      : 'text-purple-600'
                    }`} />
                </button>

                {/* Filter Dropdown */}
                {showGlobalFilterDropdown && (
                  <div className={`absolute top-full right-0 mt-2 w-40 rounded-lg shadow-xl border z-10 ${darkMode
                      ? 'bg-gray-800 border-purple-500/30 shadow-purple-500/20'
                      : 'bg-white border-purple-200 shadow-purple-100'
                    }`}>
                    <div className="py-1">
                      <button
                        onClick={() => handleGlobalFilterChange('today')}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${globalDateFilter === 'today'
                            ? darkMode
                              ? 'bg-purple-600/20 text-purple-400'
                              : 'bg-purple-50 text-purple-600'
                            : darkMode
                              ? 'text-gray-300 hover:bg-purple-600/10'
                              : 'text-gray-700 hover:bg-purple-50'
                          }`}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => handleGlobalFilterChange('week')}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${globalDateFilter === 'week'
                            ? darkMode
                              ? 'bg-purple-600/20 text-purple-400'
                              : 'bg-purple-50 text-purple-600'
                            : darkMode
                              ? 'text-gray-300 hover:bg-purple-600/10'
                              : 'text-gray-700 hover:bg-purple-50'
                          }`}
                      >
                        This Week
                      </button>
                      <button
                        onClick={() => handleGlobalFilterChange('month')}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${globalDateFilter === 'month'
                            ? darkMode
                              ? 'bg-purple-600/20 text-purple-400'
                              : 'bg-purple-50 text-purple-600'
                            : darkMode
                              ? 'text-gray-300 hover:bg-purple-600/10'
                              : 'text-gray-700 hover:bg-purple-50'
                          }`}
                      >
                        This Month
                      </button>
                      <button
                        onClick={() => handleGlobalFilterChange('custom')}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${globalDateFilter === 'custom'
                            ? darkMode
                              ? 'bg-purple-600/20 text-purple-400'
                              : 'bg-purple-50 text-purple-600'
                            : darkMode
                              ? 'text-gray-300 hover:bg-purple-600/10'
                              : 'text-gray-700 hover:bg-purple-50'
                          }`}
                      >
                        Custom Range
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Show active filter indicator */}
              {globalDateFilter !== 'today' && (
                <div className={`hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                  }`}>
                  <span>
                    {globalDateFilter === 'week' ? 'This Week' :
                      globalDateFilter === 'month' ? 'This Month' :
                        globalDateFilter === 'custom' ? 'Custom' : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${darkMode
                    ? 'text-yellow-400 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
                <div className="hidden md:flex items-center gap-1">
                  <button className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${darkMode
                    ? 'hover:bg-gray-700'
                    : 'hover:bg-gray-100'
                    }`}
                  >
                    <Settings className="w-5 h-5 text-gray-500" />
                  </button>
                  <button
                    onClick={handleLogoutClick}
                    className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${darkMode
                      ? 'hover:bg-red-700'
                      : 'hover:bg-red-50'
                      }`}
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5 text-red-500" />
                  </button>
                </div>

                {/* Mobile Profile Dropdown */}
                <div className="md:hidden relative user-dropdown">
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 transform hover:scale-105 ${darkMode
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {currentUser.profileImage && !imageErrors[`${currentUser.id}_mobile`] ? (
                      <img
                        src={currentUser.profileImage}
                        alt={currentUser.name}
                        className="w-5 h-5 rounded-full object-cover"
                        onError={() => handleImageError(currentUser.id, 'mobile')}
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    {showUserDropdown && (
                      <span className="text-sm font-medium truncate max-w-[6rem]">
                        {currentUser.fullName}
                      </span>
                    )}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showUserDropdown && (
                    <div className={`absolute right-0 mt-2 w-56 rounded-lg border shadow-lg animate-in slide-in-from-top duration-200 z-50 ${darkMode
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                      }`}>
                      {/* Currently Viewing Section */}
                      <div className={`p-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          CURRENTLY VIEWING
                        </p>
                        <div className="flex items-center gap-2">
                          {currentUser.profileImage && !imageErrors[`${currentUser.id}_mobile_current`] ? (
                            <img
                              src={currentUser.profileImage}
                              alt={currentUser.name}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={() => handleImageError(currentUser.id, 'mobile_current')}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500">
                              <span className="text-white text-sm font-bold">
                                {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium truncate max-w-[150px]">
                              {currentUser.fullName}
                            </div>
                            <div className="text-xs opacity-75">
                              {currentUser.isMappedUser ? 'Mapped User' : 'Your Account'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Your Account Option */}
                      <div className="p-2">
                        <button
                          onClick={() => {
                            handleUserSelection(null);
                            setShowUserDropdown(false);
                          }}
                          className={`w-full flex items-center gap-2 p-2 rounded transition-colors ${!selectedUserId
                              ? darkMode
                                ? 'bg-gray-700 text-blue-400'
                                : 'bg-blue-50 text-blue-600'
                              : darkMode
                                ? 'hover:bg-gray-700 text-gray-300'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                        >
                          {getValidProfileImage({ ...backendUser, photoURL: user?.photoURL }) && !imageErrors['main_user_mobile'] ? (
                            <img
                              src={getValidProfileImage({ ...backendUser, photoURL: user?.photoURL })}
                              alt="Your account"
                              className="w-6 h-6 rounded-full object-cover"
                              onError={() => handleImageError('main_user', 'mobile')}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {backendUser?.first_name?.charAt(0).toUpperCase() || user?.displayName?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                          )}
                          <span className="text-sm">Your Account</span>
                          {!selectedUserId && (
                            <span className="text-xs ml-auto text-blue-500">Viewing</span>
                          )}
                        </button>
                      </div>

                      {/* Mapped Users */}
                      {mappedUsers.length > 0 && (
                        <div className={`p-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <p className={`text-xs font-medium mb-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            MAPPED USERS
                          </p>
                          {mappedUsers.map((mapping) => {
                            const mappedUserImage = getValidProfileImage(mapping.mapped_user);
                            const errorKey = `mapped_mobile_${mapping.mapped_user.id}`;
                            return (
                              <button
                                key={mapping.id}
                                onClick={() => {
                                  handleUserSelection(mapping.mapped_user.id);
                                  setShowUserDropdown(false);
                                }}
                                className={`w-full flex items-center gap-2 p-2 rounded transition-colors ${selectedUserId === mapping.mapped_user.id
                                    ? darkMode
                                      ? 'bg-gray-700 text-blue-400'
                                      : 'bg-blue-50 text-blue-600'
                                    : darkMode
                                      ? 'hover:bg-gray-700 text-gray-300'
                                      : 'hover:bg-gray-100 text-gray-700'
                                  }`}
                              >
                                {mappedUserImage && !imageErrors[errorKey] ? (
                                  <img
                                    src={mappedUserImage}
                                    alt={mapping.mapped_user.full_name}
                                    className="w-6 h-6 rounded-full object-cover"
                                    onError={() => handleImageError(errorKey, 'mobile_mapped')}
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">
                                      {mapping.mapped_user.full_name?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                )}
                                <span className="text-sm truncate max-w-[120px]">
                                  {mapping.nickname || mapping.mapped_user.full_name}
                                </span>
                                {selectedUserId === mapping.mapped_user.id && (
                                  <span className="text-xs ml-auto text-blue-500">Viewing</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile Menu Toggle */}
                <div className="flex items-center gap-1">
                  <button
                    className={`md:hidden p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${darkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  >
                    {isMobileMenuOpen ?
                      <X className="w-6 h-6" /> :
                      <Menu className="w-6 h-6" />
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className={`md:hidden fixed inset-0 z-50 ${darkMode ? 'bg-gray-900' : 'bg-white'} pt-16 animate-in slide-in-from-top duration-300`}>
          {/* Mobile Menu Header with Back Button */}
          <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} bg-gradient-to-r ${darkMode
            ? 'from-gray-800 to-gray-900'
            : 'from-blue-50 to-purple-50'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-white shadow-md'
                }`}>
                <Menu className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Menu</h2>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className={`p-2 rounded-xl transition-all duration-200 transform hover:scale-110 ${darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-white text-gray-600 hover:bg-gray-100 shadow-md'
                }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto h-full pb-20">
            {/* User Section */}
            <div className={`rounded-2xl p-4 border shadow-lg transition-all duration-200 hover:shadow-xl ${darkMode
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700'
              : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
              }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  {currentUser.profileImage && !imageErrors[`${currentUser.id}_menu`] ? (
                    <img
                      src={currentUser.profileImage}
                      alt={currentUser.name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500 ring-offset-2"
                      onError={() => handleImageError(currentUser.id, 'menu')}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                      {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  {!currentUser.isMappedUser && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentUser.fullName}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {currentUser.isMappedUser ? 'Viewing as mapped user' : 'Your account'}
                  </p>
                </div>
              </div>

              {/* Mobile User Dropdown */}
              <div className="space-y-2 user-dropdown">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] ${darkMode
                    ? 'bg-gradient-to-r from-gray-700 to-gray-600 text-gray-300 hover:from-gray-600 hover:to-gray-500'
                    : 'bg-gradient-to-r from-blue-50 to-purple-50 text-gray-700 hover:from-blue-100 hover:to-purple-100'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Switch User</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showUserDropdown && (
                  <div className={`rounded-xl border shadow-lg animate-in slide-in-from-top duration-200 ${darkMode
                    ? 'bg-gray-700 border-gray-600'
                    : 'bg-white border-gray-200'
                    }`}>
                    {/* Current User Option */}
                    <div className={`p-3 ${mappedUsers.length > 0 ? `border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}` : ''}`}>
                      <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        MY DATA
                      </p>
                      <button
                        onClick={() => {
                          setSelectedUserId(null);
                          setShowUserDropdown(false);
                          setSelectionFeedback('Loading your data...');
                          setTimeout(() => setSelectionFeedback(null), 2000);
                          setTimeout(() => setIsMobileMenuOpen(false), 500);
                        }}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] touch-manipulation ${selectedUserId === null
                          ? darkMode
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                            : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                          : darkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {getValidProfileImage({ ...backendUser, photoURL: user?.photoURL }) && !imageErrors['main_user_menu'] ? (
                          <img
                            src={getValidProfileImage({ ...backendUser, photoURL: user?.photoURL })}
                            alt={backendUser?.first_name || 'User'}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-300"
                            onError={() => handleImageError('main_user', 'menu')}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 ring-2 ring-gray-300">
                            <span className="text-white text-sm font-bold">
                              {backendUser?.first_name?.charAt(0).toUpperCase() || user?.displayName?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium truncate">
                            {backendUser?.first_name || user?.displayName?.split(' ')[0] || 'My Data'}
                          </div>
                          {selectedUserId === null && (
                            <div className="text-xs opacity-90">Currently viewing</div>
                          )}
                        </div>
                      </button>
                    </div>

                    {mappedUsers.length > 0 && (
                      <div className="p-3">
                        <p className={`text-xs font-bold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          MAPPED USERS
                        </p>
                        <div className="space-y-2">
                          {mappedUsers.map((mapping) => {
                            const mappedUserImage = getValidProfileImage(mapping.mapped_user);
                            const errorKey = `mapped_menu_${mapping.mapped_user.id}`;
                            return (
                              <button
                                key={mapping.id}
                                onClick={() => {
                                  handleUserSelection(mapping.mapped_user.id);
                                  setTimeout(() => setIsMobileMenuOpen(false), 500);
                                }}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] touch-manipulation ${selectedUserId === mapping.mapped_user.id
                                  ? darkMode
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                                    : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                                  : darkMode
                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                              >
                                {mappedUserImage && !imageErrors[errorKey] ? (
                                  <img
                                    src={mappedUserImage}
                                    alt={mapping.mapped_user.full_name}
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-300"
                                    onError={() => handleImageError(errorKey, 'menu_mapped')}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center flex-shrink-0 ring-2 ring-gray-300">
                                    <span className="text-white text-sm font-bold">
                                      {mapping.mapped_user.full_name?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                )}
                                <div className="flex-1 text-left">
                                  <div className="text-sm font-medium truncate">
                                    {mapping.nickname || mapping.mapped_user.full_name}
                                  </div>
                                  {selectedUserId === mapping.mapped_user.id && (
                                    <div className="text-xs opacity-90">Currently viewing</div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {loadingMappedUsers && (
                      <div className="p-4">
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Date Display */}
            <div className={`rounded-2xl p-4 border shadow-lg transition-all duration-200 hover:shadow-xl ${darkMode
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700'
              : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-blue-600/20' : 'bg-blue-100'
                  }`}>
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Today</p>
                  <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Global Period Filter for Mobile */}
            <div className={`rounded-2xl p-4 border shadow-lg transition-all duration-200 hover:shadow-xl ${darkMode
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700'
                : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
              }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-purple-600/20' : 'bg-purple-100'
                  }`}>
                  <SlidersHorizontal className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Filter Period
                  </p>
                  <p className={`text-xs opacity-75 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Select time range for all data
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {['today', 'week', 'month', 'custom'].map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      handleGlobalFilterChange(period);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] ${globalDateFilter === period
                        ? darkMode
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                          : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                        : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-sm font-medium capitalize">
                      {period === 'today' ? 'Today' :
                        period === 'week' ? 'This Week' :
                          period === 'month' ? 'This Month' : 'Custom Range'}
                    </span>
                    {globalDateFilter === period && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className={`rounded-2xl p-4 border shadow-lg transition-all duration-200 hover:shadow-xl ${darkMode
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700'
              : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
              }`}>
              <button
                onClick={toggleDarkMode}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] ${darkMode
                  ? 'bg-gradient-to-r from-yellow-600/20 to-orange-600/20 text-gray-300 hover:from-yellow-600/30 hover:to-orange-600/30'
                  : 'bg-gradient-to-r from-yellow-50 to-orange-50 text-gray-700 hover:from-yellow-100 hover:to-orange-100'
                  }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-yellow-600/30' : 'bg-yellow-100'
                  }`}>
                  {darkMode ? <Moon className="w-5 h-5 text-yellow-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">
                    {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  </p>
                  <p className="text-xs opacity-75">
                    {darkMode ? 'Disable dark theme' : 'Enable dark theme'}
                  </p>
                </div>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => { handleTabChange('settings'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg ${darkMode
                  ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-gray-300 hover:from-gray-700 hover:to-gray-600'
                  : 'bg-gradient-to-r from-white to-gray-100 text-gray-700 hover:from-gray-50 hover:to-gray-200 shadow-md'
                  }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-600' : 'bg-gray-200'
                  }`}>
                  <Settings className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold">Settings</p>
                  <p className="text-xs opacity-75">Manage preferences</p>
                </div>
              </button>

              <button
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg ${darkMode
                  ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-gray-300 hover:from-gray-700 hover:to-gray-600'
                  : 'bg-gradient-to-r from-white to-gray-100 text-gray-700 hover:from-gray-50 hover:to-gray-200 shadow-md'
                  }`}
              >
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-600' : 'bg-gray-200'
                    }`}>
                    <Bell className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold">Notifications</p>
                  <p className="text-xs opacity-75">
                    {totalUnread > 0 ? `${totalUnread} unread message${totalUnread === 1 ? '' : 's'}` : 'No new messages'}
                  </p>
                </div>
              </button>

              <button
                onClick={() => { handleLogoutClick(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20">
                  <LogOut className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold">Logout</p>
                  <p className="text-xs opacity-90">Sign out of account</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
                <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Logout
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Are you sure you want to logout?
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleLogoutCancel}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`${activeTab === 'chat' ? `flex-1 min-h-0 h-full ${isChatRoomOpen ? 'pb-0' : 'pb-16'} md:pb-0` : 'max-w-7xl mx-auto p-4 md:p-6'}`}>
        {renderContent()}
      </main>

      {/* Bottom Navigation for Mobile */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-10 border-t bg-white dark:bg-gray-900 dark:border-gray-800 ${isChatRoomOpen ? 'hidden' : ''}`}>
        <div className="grid grid-cols-4 h-16">
          <button
            onClick={() => handleTabChange('home')}
            className={`flex flex-col items-center justify-center p-2 transition-colors ${activeTab === 'home'
              ? darkMode
                ? 'text-blue-400'
                : 'text-blue-600'
              : darkMode
                ? 'text-gray-400'
                : 'text-gray-500'
              }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button
            onClick={() => handleTabChange('appointments')}
            className={`flex flex-col items-center justify-center p-2 transition-colors ${activeTab === 'appointments'
              ? darkMode
                ? 'text-blue-400'
                : 'text-blue-600'
              : darkMode
                ? 'text-gray-400'
                : 'text-gray-500'
              }`}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-xs mt-1">Appointments</span>
          </button>
          <button
            onClick={() => handleTabChange('chat')}
            className={`flex flex-col items-center justify-center p-2 transition-colors relative ${activeTab === 'chat'
              ? darkMode
                ? 'text-blue-400'
                : 'text-blue-600'
              : darkMode
                ? 'text-gray-400'
                : 'text-gray-500'
              }`}
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs mt-1">Chat</span>
            {totalUnread > 0 && (
              <span className="absolute top-1 right-4 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('profile')}
            className={`flex flex-col items-center justify-center p-2 transition-colors ${activeTab === 'profile'
              ? darkMode
                ? 'text-blue-400'
                : 'text-blue-600'
              : darkMode
                ? 'text-gray-400'
                : 'text-gray-500'
              }`}
          >
            <User className="w-6 h-6" />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </div>

      {/* Profile Completion Form Modal */}
      {showProfileForm && (
        <ProfileCompletionForm
          onClose={handleProfileFormClose}
          onSuccess={handleProfileFormSuccess}
        />
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
                <X className="w-5 h-5" />
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
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-transparent ${darkMode
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
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-transparent ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                    }`}
                />
              </div>

              {/* Date Range Preview */}
              {customDateFrom && customDateTo && (
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    Selected range: <strong>{customDateFrom}</strong> to <strong>{customDateTo}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCustomDateModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customDateFrom && customDateTo) {
                    handleCustomDateApply(customDateFrom, customDateTo);
                    setShowCustomDateModal(false);
                  }
                }}
                disabled={!customDateFrom || !customDateTo}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${customDateFrom && customDateTo
                    ? 'bg-purple-500 hover:bg-purple-600 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selection Feedback Toast */}
      {selectionFeedback && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-pulse">
          <div className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${darkMode
            ? 'bg-green-600 text-white'
            : 'bg-green-500 text-white'
            }`}>
            {selectionFeedback}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;