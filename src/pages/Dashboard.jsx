import React, { useState, useEffect } from 'react';
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

  // Check authentication status
  useEffect(() => {
    const checkAuthentication = () => {
      // Check if user has valid tokens
      if (isAuthenticated()) {
        const userData = getUserData();
        setBackendUser(userData);
        setLoading(false);
      } else {
        // Check Firebase auth as fallback
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

  // Check if profile needs completion
  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!backendUser && !user) return;

      try {
        // Check if flag is set to show profile form (from login/register)
        const shouldShowForm = localStorage.getItem('show_profile_form_on_dashboard');

        // Check if user data has required profile fields
        const userData = getUserData();

        // If we have user data, check for missing profile fields
        if (userData) {
          const requiredFields = ['first_name', 'last_name', 'birthdate', 'gender', 'height', 'weight', 'blood_group'];

          console.log('🔍 Dashboard checking profile completion with stored user data:')
          console.log('- User data:', userData)

          const missingFields = requiredFields.filter(field => {
            const value = userData[field]
            const isMissing = !value || value === '' || value === '0.00' || value === null || value === undefined
            console.log(`- ${field}: "${value}" (type: ${typeof value}) - missing: ${isMissing}`)
            return isMissing
          });

          console.log(`- Missing fields count: ${missingFields.length}/7`)
          console.log(`- Should show form flag: ${shouldShowForm}`)

          // If ANY fields are missing, show the form
          if (missingFields.length > 0) {
            // If flag is set from login/register, always show the form (ignore skip)
            if (shouldShowForm === 'true') {
              setShowProfileForm(true);
              setProfileComplete(false);
              // Clear the flag after showing
              localStorage.removeItem('show_profile_form_on_dashboard');
            } else {
              // Check if user has skipped the form before (to avoid showing it repeatedly)
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
            // Clear flags if profile is complete
            localStorage.removeItem('show_profile_form_on_dashboard');
          }
        } else {
          // Try to fetch user profile from API
          try {
            const profileData = await getUserEmailProfile();
            const requiredFields = ['first_name', 'last_name', 'birthdate', 'gender', 'height', 'weight', 'blood_group'];
            const missingFields = requiredFields.filter(field => {
              const value = profileData[field]
              return !value || value === '' || value === '0.00' || value === null || value === undefined
            });

            if (missingFields.length > 0) {
              // If flag is set from login/register, always show the form (ignore skip)
              if (shouldShowForm === 'true') {
                setShowProfileForm(true);
                setProfileComplete(false);
                // Clear the flag after showing
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
              // Clear flags if profile is complete
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown, showUserDropdown]);

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

        // Get current user ID to filter out own profile from mapped users
        const userData = getUserData();
        const currentUserId = userData?.id;

        console.log('Current user ID:', currentUserId);
        console.log('Raw mapped users data:', data);

        // Filter out current user from mapped users list
        const filteredMappedUsers = data.filter(mapping => {
          const isNotCurrentUser = mapping.mapped_user.id !== currentUserId;
          if (!isNotCurrentUser) {
            console.log('Filtering out current user from mapped list:', mapping.mapped_user.id);
          }
          return isNotCurrentUser;
        });

        console.log('Filtered mapped users:', filteredMappedUsers);
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

  // Handle user selection from dropdown with debouncing
  const handleUserSelection = (userId) => {
    console.log('User selected:', userId);
    console.log('Current selectedUserId:', selectedUserId);
    const newUserId = userId === selectedUserId ? null : userId;
    console.log('Setting newUserId to:', newUserId);
    setSelectedUserId(newUserId);
    setShowUserDropdown(false);

    // Show feedback with loading state
    if (newUserId) {
      const selectedUser = mappedUsers.find(m => m.mapped_user.id === userId);
      if (selectedUser) {
        setSelectionFeedback(`Loading data for ${selectedUser.nickname || selectedUser.mapped_user.full_name}...`);
      }
    } else {
      setSelectionFeedback('Loading your data...');
    }

    // Clear feedback after data loads (components will handle this)
    setTimeout(() => setSelectionFeedback(null), 2000);
  };

  // Handle tab change with persistence
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('dashboardActiveTab', tab);
    // Update URL hash without causing a page reload
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
    // Mark that user has seen the form (they can skip)
    localStorage.setItem('profile_form_skipped', 'true');
  };

  // Handle profile form success
  const handleProfileFormSuccess = () => {
    setShowProfileForm(false);
    setProfileComplete(true);
    // Refresh user data
    const userData = getUserData();
    if (userData) {
      setBackendUser(userData);
    }
    // Remove the skip flag and show form flag since they completed it
    localStorage.removeItem('profile_form_skipped');
    localStorage.removeItem('show_profile_form_on_dashboard');
  };

  // Handle logout confirmation
  const handleLogoutConfirm = async () => {
    try {
      // Try to logout from backend first
      await logoutUser();

      // Also sign out from Firebase if user is signed in
      if (user) {
        await signOut(auth);
      }

      // Clear all tokens and redirect
      clearTokens();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if logout fails, clear tokens and redirect
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
    console.log('Dashboard renderContent - activeTab:', activeTab, 'user:', !!user, 'backendUser:', !!backendUser);

    // Get the selected user info
    const getSelectedUserInfo = () => {
      if (selectedUserId) {
        const mappedUser = mappedUsers.find(m => m.mapped_user.id === selectedUserId);
        if (mappedUser) {
          return {
            name: mappedUser.nickname || mappedUser.mapped_user.full_name,
            fullName: mappedUser.mapped_user.full_name,
            profileImage: mappedUser.mapped_user.profile_image
          };
        }
      }
      // Return current user info
      return {
        name: backendUser?.first_name || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User',
        fullName: backendUser?.full_name || user?.displayName || user?.email?.split('@')[0] || 'User',
        profileImage: backendUser?.profile_image || user?.photoURL
      };
    };

    switch (activeTab) {
      case 'home':
        return <HomeTab darkMode={darkMode} selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} selectedUserId={selectedUserId} selectedUserInfo={getSelectedUserInfo()} />;
      case 'appointments':
        console.log('Rendering AppointmentsTab with ErrorBoundary...');
        return (
          <ErrorBoundary>
            <AppointmentsTab darkMode={darkMode} />
          </ErrorBoundary>
        );
      case 'chat':
        return <ChatTab darkMode={darkMode} onChatRoomStateChange={handleChatRoomStateChange} />;
      case 'profile':
        return <ProfileTab darkMode={darkMode} selectedUserId={selectedUserId} />;
      case 'settings':
        return <SettingsTab darkMode={darkMode} />;
      default:
        return <HomeTab darkMode={darkMode} selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} />;
    }
  };

  // Show loading spinner while checking authentication
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

  // Don't render anything if user is not authenticated (will redirect)
  if (!user && !backendUser) {
    return null;
  }

  return (
    <div className={`${activeTab === 'chat' ? 'h-screen overflow-hidden flex flex-col' : 'min-h-screen pb-20 md:pb-0'} ${darkMode
      ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}>
      {/* Navigation */}
      <nav className={`shadow-lg border-b z-10 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
        } ${isChatRoomOpen ? 'md:block hidden' : ''}`}>
        <div className="max-w-7xl mx-auto px-3 md:px-4">
          <div className="flex items-center justify-between gap-2 py-3">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <button
                onClick={() => handleTabChange('home')}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-200"
              >
                <img src={jjlogo} alt="JJ Logo" className="w-8 h-8" />
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap truncate">
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
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-1">3</span>
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
              {/* User Dropdown - Before dark mode */}
              <div className="hidden lg:flex items-center gap-2 px-2 py-1.5 rounded-lg whitespace-nowrap user-dropdown relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className={`flex items-center gap-2 transition-all duration-200 transform hover:scale-105 ${darkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } rounded-lg px-2 py-1.5`}
                >
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium truncate max-w-[8rem]">
                    {backendUser?.first_name || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown */}
                {showUserDropdown && (
                  <div className={`absolute top-full left-0 mt-2 w-64 rounded-xl shadow-lg border z-50 ${darkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                    } max-h-96 overflow-y-auto`}>
                    <div className={`p-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'
                      }`}>
                      <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        CURRENT USER
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {backendUser?.first_name || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
                        </span>
                      </div>
                    </div>

                    {mappedUsers.length > 0 && (
                      <div className={`p-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'
                        }`}>
                        <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          MAPPED USERS
                        </p>
                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                          {mappedUsers.map((mapping) => (
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
                              <img
                                src={mapping.mapped_user.profile_image || 'https://via.placeholder.com/24'}
                                alt={mapping.mapped_user.full_name}
                                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/24?text=' + mapping.mapped_user.full_name.charAt(0);
                                }}
                              />
                              <div className="flex-1 text-left">
                                <div className="text-xs font-medium truncate">
                                  {mapping.nickname || mapping.mapped_user.full_name}
                                </div>
                                {selectedUserId === mapping.mapped_user.id && (
                                  <div className="text-xs opacity-75">Currently viewing</div>
                                )}
                              </div>
                            </button>
                          ))}
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

                    {!loadingMappedUsers && mappedUsers.length === 0 && (
                      <div className="p-3">
                        <p className={`text-xs text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          No mapped users
                        </p>
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

              {/* Period Filter - Hidden by default, show as popup button */}
              {activeTab === 'home' && (
                <div className="hidden lg:block relative filter-dropdown">
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${showFilterDropdown
                      ? darkMode
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-purple-500 hover:bg-purple-600'
                      : darkMode
                        ? 'bg-gray-800 hover:bg-purple-600/20 border border-purple-500/30'
                        : 'bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border border-purple-200'
                      }`}
                    title={`Filter: ${selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'This Week' : 'This Month'}`}
                  >
                    <SlidersHorizontal className={`w-5 h-5 transition-colors ${showFilterDropdown
                      ? 'text-white'
                      : 'text-purple-600'
                      }`} />
                  </button>

                  {/* Filter Dropdown */}
                  {showFilterDropdown && (
                    <div className={`absolute top-full right-0 mt-2 w-40 rounded-lg shadow-xl border z-10 ${darkMode
                      ? 'bg-gray-800 border-purple-500/30 shadow-purple-500/20'
                      : 'bg-white border-purple-200 shadow-purple-100'
                      }`}>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setSelectedPeriod('today');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedPeriod === 'today'
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
                          onClick={() => {
                            setSelectedPeriod('week');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedPeriod === 'week'
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
                          onClick={() => {
                            setSelectedPeriod('month');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedPeriod === 'month'
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
                      </div>
                    </div>
                  )}
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
                <div className="md:hidden relative">
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 transform hover:scale-105 ${darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    {showUserDropdown && (
                      <span className="text-sm font-medium truncate max-w-[6rem]">
                        {backendUser?.first_name || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
                      </span>
                    )}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showUserDropdown && (
                    <div className={`absolute right-0 mt-2 w-48 rounded-lg border shadow-lg animate-in slide-in-from-top duration-200 ${darkMode
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-200'
                      }`}>
                      {mappedUsers.length > 0 && (
                        <div className="p-2">
                          <p className={`text-xs font-medium mb-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            SWITCH USER
                          </p>
                          {mappedUsers.map((mapping) => (
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
                              <img
                                src={mapping.mapped_user.profile_image || 'https://via.placeholder.com/24'}
                                alt={mapping.mapped_user.full_name}
                                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/24?text=' + mapping.mapped_user.full_name.charAt(0);
                                }}
                              />
                              <div className="flex-1 text-left">
                                <div className="text-xs font-medium truncate">
                                  {mapping.nickname || mapping.mapped_user.full_name}
                                </div>
                                {selectedUserId === mapping.mapped_user.id && (
                                  <div className="text-xs opacity-75">Currently viewing</div>
                                )}
                              </div>
                            </button>
                          ))}
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
                  <img
                    src={user?.photoURL || 'https://via.placeholder.com/40'}
                    alt={user?.displayName || user?.email || 'User'}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500 ring-offset-2"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/40?text=' + (user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U');
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {backendUser?.first_name || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Mobile User Dropdown */}
              <div className="space-y-2">
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
                        <img
                          src={backendUser?.profile_image || user?.photoURL || 'https://via.placeholder.com/32'}
                          alt={backendUser?.first_name || 'User'}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-300"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/32?text=' + (backendUser?.first_name?.charAt(0) || 'U');
                          }}
                        />
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
                          {mappedUsers.map((mapping) => (
                            <button
                              key={mapping.id}
                              onClick={() => {
                                console.log('Mobile user clicked:', mapping.mapped_user.id);
                                handleUserSelection(mapping.mapped_user.id);
                                // Delay menu closing to allow data to update
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
                              <img
                                src={mapping.mapped_user.profile_image || 'https://via.placeholder.com/24'}
                                alt={mapping.mapped_user.full_name}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-300"
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/24?text=' + mapping.mapped_user.full_name.charAt(0);
                                }}
                              />
                              <div className="flex-1 text-left">
                                <div className="text-sm font-medium truncate">
                                  {mapping.nickname || mapping.mapped_user.full_name}
                                </div>
                                {selectedUserId === mapping.mapped_user.id && (
                                  <div className="text-xs opacity-90">Currently viewing</div>
                                )}
                              </div>
                            </button>
                          ))}
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

            {/* Period Filter for Home Tab */}
            {activeTab === 'home' && (
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
                      Select time range
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {['today', 'week', 'month'].map((period) => (
                    <button
                      key={period}
                      onClick={() => {
                        setSelectedPeriod(period);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] ${selectedPeriod === period
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
                        {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
                      </span>
                      {selectedPeriod === period && (
                        <div className="ml-auto">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">3</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold">Notifications</p>
                  <p className="text-xs opacity-75">3 new messages</p>
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
            <span className="absolute top-1 right-4 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">3</span>
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