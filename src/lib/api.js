import { authenticatedFetch, getAuthHeaders, refreshAccessToken, clearTokens, getUserData, getAccessToken } from './tokenManager'

export const API_BASE_URL = 'https://jeewanjyoti-backend.smart.org.np'

// Adjust this path to match your Django route
export const REGISTER_ENDPOINT = '/api/register/'

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  return await authenticatedFetch(url, options)
}

/**
 * Admins view arbitrary users' vitals via the same endpoints the user's own
 * dashboard uses (those already grant admin access), never the institution-scoped
 * ones (which only allow institution-linked members).
 */
const isAdminUser = (userData) => !!(userData?.is_superuser || userData?.role === 'ADMIN')

/**
 * Register a new user
 * @param {object} payload - Registration data
 * @returns {Promise<object>} Registration response
 */
export async function registerUser(payload) {
  const response = await apiRequest(REGISTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error('Registration failed')
    error.details = data
    throw error
  }
  return data
}

/**
 * Login user
 * @param {object} credentials - Login credentials
 * @param {string} userType - 'individual' or 'institutional'
 * @returns {Promise<object>} Login response
 */
export async function loginUser(credentials, userType = 'individual') {
  const endpoint = userType === 'individual' ? '/api/login/' : '/api/ins/login/'

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error('Login failed')
    error.details = data
    throw error
  }
  return data
}

/**
 * Get user profile
 * @returns {Promise<object>} User profile data
 */
export async function getUserProfile() {
  const response = await apiRequest('/api/profile/')

  if (!response.ok) {
    throw new Error('Failed to fetch user profile')
  }

  return await response.json()
}

/**
 * Update user profile
 * @param {object} profileData - Profile data to update
 * @returns {Promise<object>} Updated profile data
 */
export async function updateUserProfile(profileData) {
  const response = await apiRequest('/api/profile/', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  })

  if (!response.ok) {
    throw new Error('Failed to update user profile')
  }

  return await response.json()
}

/**
 * Update user profile using profile-update endpoint (PATCH method)
 * @param {object} profileData - Profile data to update (first_name, last_name, birthdate, gender, height, weight, blood_group)
 * @returns {Promise<object>} Updated profile data
 */
export async function updateProfile(profileData) {
  console.log('updateProfile called with:', profileData);
  console.log('updateProfile payload stringified:', JSON.stringify(profileData));

  try {
    const response = await apiRequest('/api/profile-update/', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    })

    console.log('updateProfile response status:', response.status);
    console.log('updateProfile response headers:', response.headers);

    const responseText = await response.text();
    console.log('updateProfile response text:', responseText);

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { detail: responseText || 'Unknown error' };
      }
      console.error('updateProfile error:', errorData);
      console.error('updateProfile error status:', response.status);
      const error = new Error(errorData.detail || errorData.message || `Failed to update profile (Status: ${response.status})`);
      error.details = errorData;
      error.response = response;
      error.status = response.status;
      throw error;
    }

    let result = {};
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      result = { success: true, message: 'Profile updated successfully' };
    }
    console.log('updateProfile success:', result);
    return result;
  } catch (error) {
    console.error('updateProfile exception:', error);
    if (error.details) {
      throw error;
    }
    const wrappedError = new Error(error.message || 'Failed to update profile');
    wrappedError.details = { detail: error.message };
    wrappedError.originalError = error;
    throw wrappedError;
  }
}

/**
 * Get appointments
 * @returns {Promise<Array>} List of appointments
 */
export async function getAppointments() {
  const response = await apiRequest('/api/appointments/')

  if (!response.ok) {
    throw new Error('Failed to fetch appointments')
  }

  return await response.json()
}

/**
 * Create a new appointment
 * @param {object} appointmentData - Appointment data
 * @returns {Promise<object>} Created appointment
 */
export async function createAppointment(appointmentData) {
  const response = await apiRequest('/api/appointments/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(appointmentData),
  })

  if (!response.ok) {
    throw new Error('Failed to create appointment')
  }

  return await response.json()
}

/**
 * Get doctor list
 * @returns {Promise<Array>} List of doctors
 */
export async function getDoctorList() {
  const response = await apiRequest('/api/doctorlist/')

  if (!response.ok) {
    throw new Error('Failed to fetch doctor list')
  }

  return await response.json()
}

/**
 * Helper function to fetch all pages from a paginated API response
 * @param {string} initialUrl - Initial API URL to fetch (relative path like /api/HeartRate_Data/)
 * @returns {Promise<Array>} Combined results from all pages
 */
async function fetchAllPages(initialUrl) {
  let allResults = [];
  let nextUrl = initialUrl;
  let useAbsolute = false;

  while (nextUrl) {
    let response;

    if (useAbsolute) {
      const secureUrl = nextUrl.replace(/^http:\/\//, 'https://');
      console.log(`Fetching page (absolute): ${secureUrl}`);
      response = await authenticatedFetch(secureUrl, {});
    } else {
      console.log(`Fetching page (relative): ${nextUrl}`);
      response = await apiRequest(nextUrl);
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    const data = await response.json();

    if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
      allResults = allResults.concat(data.results);
      console.log(`Got ${data.results.length} items | Total: ${allResults.length} / ${data.count ?? '?'}`);

      if (data.next) {
        nextUrl = data.next;
        useAbsolute = true;
        console.log(`Next page URL: ${data.next}`);
      } else {
        nextUrl = null;
        console.log(`No more pages`);
      }
    } else if (Array.isArray(data)) {
      allResults = allResults.concat(data);
      console.log(`Got ${data.length} items (non-paginated)`);
      nextUrl = null;
    } else {
      allResults.push(data);
      console.log(`Got 1 item (single object)`);
      nextUrl = null;
    }
  }

  console.log(`All pages fetched. Total items: ${allResults.length}`);
  return allResults;
}

/**
 * Get sleep data
 * @param {string} userId - Optional user ID
 * @param {string} date - Optional single date filter (YYYY-MM-DD)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of sleep data records
 */
export async function getSleepData(userId = null, date = null, range = null) {
  const userData = getUserData();
  const endpoint = (userData?.institution_type && !isAdminUser(userData)) ? 'institution_sleep_data' : 'sleep-data';
  let url = userId ? `/api/${endpoint}/?user_id=${userId}` : `/api/${endpoint}/?`;

  if (date) {
    url = userId
      ? `/api/${endpoint}/?user_id=${userId}&date=${date}`
      : `/api/${endpoint}/?date=${date}`;
    console.log('Fetching sleep data with date:', url);
  } else if (range) {
    url += `&range=${range}`;
    console.log('Fetching sleep data with range:', url);
  } else {
    url += `&range=24h`;
    console.log('Fetching sleep data default 24h:', url);
  }

  console.log('Sleep data URL:', url);
  const results = await fetchAllPages(url);
  console.log(`Total sleep records fetched: ${results.length}`);
  return results;
}

/**
 * Get SpO2/Blood Oxygen data
 * @param {string} userId - Optional user ID
 * @param {string} date - Optional single date filter (YYYY-MM-DD)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of SpO2 data records
 */
export async function getSpO2Data(userId = null, date = null, range = null) {
  const userData = getUserData();
  const endpoint = (userData?.institution_type && !isAdminUser(userData)) ? 'institution_Spo2_data' : 'Spo2-data';
  let url = userId ? `/api/${endpoint}/?user_id=${userId}` : `/api/${endpoint}/?`;

  if (date) {
    url = userId
      ? `/api/${endpoint}/?user_id=${userId}&date=${date}`
      : `/api/${endpoint}/?date=${date}`;
    console.log('Fetching SpO2 data with date:', url);
  } else if (range) {
    url += `&range=${range}`;
    console.log('Fetching SpO2 data with range:', url);
  } else {
    url += `&range=24h`;
    console.log('Fetching SpO2 data default 24h:', url);
  }

  console.log('SpO2 data URL:', url);
  const results = await fetchAllPages(url);
  console.log(`Total SpO2 records fetched: ${results.length}`);
  return results;
}

/**
 * Get Heart Rate data
 * @param {string} userId - Optional user ID
 * @param {string} date - Optional single date filter (YYYY-MM-DD)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of Heart Rate data records
 */
export async function getHeartRateData(userId = null, date = null, range = null) {
  const userData = getUserData();
  const endpoint = (userData?.institution_type && !isAdminUser(userData)) ? 'institution_heartrate_data' : 'HeartRate_Data';
  let url = userId ? `/api/${endpoint}/?user_id=${userId}` : `/api/${endpoint}/?`;

  if (date) {
    url = userId
      ? `/api/${endpoint}/?user_id=${userId}&date=${date}`
      : `/api/${endpoint}/?date=${date}`;
    console.log('Fetching heart rate data with date:', url);
  } else if (range) {
    url += `&range=${range}`;
    console.log('Fetching heart rate data with range:', url);
  } else {
    url += `&range=24h`;
    console.log('Fetching heart rate data default 24h:', url);
  }

  console.log('Heart rate data URL:', url);
  const results = await fetchAllPages(url);
  console.log(`Total heart rate records fetched: ${results.length}`);
  return results;
}

/**
 * Get daily aggregated Heart Rate data (for 7d / 30d bar-chart views).
 * Returns { count, results } where each result:
 *   { day, average_heart_rate, minimum_heart_rate, maximum_heart_rate }
 * @param {string|null} userId - Optional user ID
 * @param {string} range - '7d' or '30d'
 * @returns {Promise<{count: number, results: Array}>}
 */
export async function getDailyHeartRateData(userId = null, range = '7d') {
  const userData = getUserData();
  const endpoint = (userData?.institution_type && !isAdminUser(userData)) ? 'institution_heartrate_data' : 'HeartRate_Data';
  const base = userId
    ? `/api/${endpoint}/?user_id=${userId}&range=${range}`
    : `/api/${endpoint}/?range=${range}`;

  console.log('Fetching daily heart rate data:', base);

  let allResults = [];
  let nextUrl = base;
  let useAbsolute = false;
  let totalCount = 0;

  while (nextUrl) {
    let response;
    if (useAbsolute) {
      const secureUrl = nextUrl.replace(/^http:\/\//, 'https://');
      response = await authenticatedFetch(secureUrl, {});
    } else {
      response = await apiRequest(nextUrl);
    }
    if (!response.ok) throw new Error(`Failed to fetch daily heart rate data: ${response.status}`);
    const data = await response.json();
    if (data && typeof data === 'object' && 'results' in data) {
      allResults = allResults.concat(data.results);
      totalCount = data.count ?? allResults.length;
      nextUrl = data.next ? data.next : null;
      useAbsolute = true;
    } else {
      allResults = Array.isArray(data) ? data : [data];
      nextUrl = null;
    }
  }

  console.log(`Daily heart rate: ${allResults.length} day(s) fetched`);
  return { count: totalCount, results: allResults };
}

/**
 * Get Blood Pressure data
 * @param {string} userId - Optional user ID
 * @param {string} date - Optional single date filter (YYYY-MM-DD)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of Blood Pressure data records
 */
export async function getBloodPressureData(userId = null, date = null, range = null) {
  const userData = getUserData();
  const endpoint = (userData?.institution_type && !isAdminUser(userData)) ? 'institution_BP_data' : 'BloodPressure_Data';
  let url = userId ? `/api/${endpoint}/?user_id=${userId}` : `/api/${endpoint}/?`;

  if (date) {
    url = userId
      ? `/api/${endpoint}/?user_id=${userId}&date=${date}`
      : `/api/${endpoint}/?date=${date}`;
    console.log('Fetching blood pressure data with date:', url);
  } else if (range) {
    url += `&range=${range}`;
    console.log('Fetching blood pressure data with range:', url);
  } else {
    url += `&range=24h`;
    console.log('Fetching blood pressure data default 24h:', url);
  }

  console.log('Blood pressure data URL:', url);
  const results = await fetchAllPages(url);
  console.log(`Total blood pressure records fetched: ${results.length}`);
  return results;
}

/**
 * Get Stress data
 * @param {string} userId - Optional user ID
 * @param {string} date - Optional single date filter (YYYY-MM-DD)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of Stress data records
 */
export async function getStressData(userId = null, date = null, range = null) {
  const userData = getUserData();
  const endpoint = (userData?.institution_type && !isAdminUser(userData)) ? 'institution_Stress_data' : 'Stress_Data';
  let url = userId ? `/api/${endpoint}/?user_id=${userId}` : `/api/${endpoint}/?`;

  if (date) {
    url = userId
      ? `/api/${endpoint}/?user_id=${userId}&date=${date}`
      : `/api/${endpoint}/?date=${date}`;
    console.log('Fetching stress data with date:', url);
  } else if (range) {
    url += `&range=${range}`;
    console.log('Fetching stress data with range:', url);
  } else {
    url += `&range=24h`;
    console.log('Fetching stress data default 24h:', url);
  }

  console.log('Stress data URL:', url);
  const results = await fetchAllPages(url);
  console.log(`Total stress records fetched: ${results.length}`);
  return results;
}

/**
 * Get HRV (Heart Rate Variability) data
 * @param {string} userId - Optional user ID
 * @param {string} date - Optional single date filter (YYYY-MM-DD)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of HRV data records
 */
export async function getHRVData(userId = null, date = null, range = null) {
  const userData = getUserData();
  const endpoint = (userData?.institution_type && !isAdminUser(userData)) ? 'institution_HRV_data' : 'HRV_Iso_Data';
  let url = userId ? `/api/${endpoint}/?user_id=${userId}` : `/api/${endpoint}/?`;

  if (date) {
    url = userId
      ? `/api/${endpoint}/?user_id=${userId}&date=${date}`
      : `/api/${endpoint}/?date=${date}`;
    console.log('Fetching HRV data with date:', url);
  } else if (range) {
    url += `&range=${range}`;
    console.log('Fetching HRV data with range:', url);
  } else {
    url += `&range=24h`;
    console.log('Fetching HRV data default 24h:', url);
  }

  console.log('HRV data URL:', url);
  const results = await fetchAllPages(url);
  console.log(`Total HRV records fetched: ${results.length}`);
  return results;
}

/**
 * Get Steps data
 * @param {string} userId - Optional user ID
 * @param {string} date - Optional single date filter (YYYY-MM-DD)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of Steps data records
 */
export async function getStepsData(userId = null, date = null, range = null) {
  try {
    let url = '/api/Steps/';
    const params = new URLSearchParams();

    if (userId) params.append('user', userId);

    if (date) {
      params.append('date', date);
    } else if (range) {
      params.append('range', range);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log('Fetching steps data with URL:', url);
    const response = await apiRequest(url);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Error fetching steps data:', error);
      throw new Error(error.detail || 'Failed to fetch steps data');
    }

    const data = await response.json();
    console.log(`Total steps records fetched: ${data.length || 0}`);
    return data;
  } catch (error) {
    console.error('Error in getStepsData:', error);
    throw error;
  }
}

/**
 * Get daily total activity data
 * @param {string} userId - Optional user ID
 * @param {string} range - Optional time range filter (e.g., '24h', '7d', '30d')
 * @param {string} date - Optional single date filter (YYYY-MM-DD)
 * @returns {Promise<object>} Daily activity data
 */
export async function getDayTotalActivity(userId = null, range = null, date = null) {
  try {
    const userData = getUserData();
    const endpoint = (userData?.institution_type && !isAdminUser(userData)) ? 'institution_activity_data' : 'Day_total_activity';
    let url = `/api/${endpoint}/`;
    const params = new URLSearchParams();

    if (userId) params.append('user_id', userId);

    if (date) {
      params.append('date', date);
    } else if (range) {
      params.append('range', range);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log('Fetching daily activity data with URL:', url);
    const response = await apiRequest(url);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Error fetching daily activity data:', error);
      throw new Error(error.detail || 'Failed to fetch daily activity data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in getDayTotalActivity:', error);
    throw error;
  }
}

/**
 * Get user profile data
 * @param {string} userId - Optional user ID
 * @returns {Promise<object>} User profile data
 */
export async function getUserEmailProfile(userId = null) {
  let url = '/api/useremailprofile/';
  const params = new URLSearchParams();

  if (userId) params.append('user_id', userId);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  console.log('Fetching user profile with URL:', url);
  const response = await apiRequest(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('Error fetching user profile:', error);
    throw new Error(error.detail || 'Failed to fetch user profile');
  }

  return await response.json();
}

/**
 * Get a user's profile by their ID (for mapped users)
 * @param {string|number} userId - The user's ID
 * @returns {Promise<object>} User profile data
 */
export async function getUserById(userId) {
  if (!userId) throw new Error('User ID is required');
  const response = await apiRequest(`/api/useremailprofile/?user_id=${userId}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to fetch user profile by ID');
  }
  return await response.json();
}

/**
 * Logout user
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  try {
    await apiRequest('/api/logout/', {
      method: 'POST',
    })
  } catch (error) {
    console.warn('Logout endpoint failed:', error)
  } finally {
    clearTokens()
  }
}

/**
 * Get battery status for a device
 * @param {string|null} userId - Optional mapped user ID (omit for self)
 * @returns {Promise<object>} Battery status { percentage, timestamp, device_id, user }
 */
export async function getBatteryStatus(userId = null) {
  const userData = getUserData();
  const endpoint = (userData?.institution_type && !isAdminUser(userData)) ? 'institution_battry_status' : 'battery-status';
  const url = userId ? `/api/${endpoint}/?user_id=${userId}` : `/api/${endpoint}/`;
  const response = await apiRequest(url);
  if (!response.ok) {
    throw new Error('Failed to fetch battery status');
  }
  return await response.json();
}

/**
 * Get the last sync timestamp for a device
 * @param {string|null} userId - Optional mapped user ID (omit for self)
 * @returns {Promise<object>} Last sync info { last_sync }
 */
export async function getLastSync(userId = null) {
  const url = userId ? `/api/last_sync/?user_id=${userId}` : '/api/last_sync/'
  const response = await apiRequest(url)
  if (!response.ok) {
    throw new Error('Failed to fetch last sync')
  }
  return await response.json()
}

/**
 * Get the online/offline status of a mapped user
 * @param {string|number} userId - Mapped user ID
 * @returns {Promise<object>} Online status info
 */
export async function getUserOnlineStatus(userId) {
  const response = await apiRequest(`/api/user_online_status/${userId}/`)
  if (!response.ok) {
    throw new Error('Failed to fetch user online status')
  }
  return await response.json()
}

/**
 * Send an admin push notification to a specific user
 * @param {string|number} targetUserId - The recipient's user ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {File|null} image - Optional image attachment
 * @returns {Promise<object>} Created notification { id, target_user, title, body, image, created_at, read_at }
 */
export async function createAdminNotification(targetUserId, title, body, image = null) {
  if (image) {
    const formData = new FormData()
    formData.append('target_user', targetUserId)
    formData.append('title', title)
    formData.append('body', body)
    formData.append('image', image)
    const accessToken = getAccessToken()
    const response = await fetch(`${API_BASE_URL}/api/admin/notifications/create/`, {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      body: formData,
    })
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.detail || errData.message || 'Failed to send notification')
    }
    return await response.json()
  }
  const response = await apiRequest('/api/admin/notifications/create/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_user: targetUserId, title, body }),
  })
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.detail || errData.message || 'Failed to send notification')
  }
  return await response.json()
}

/**
 * Broadcast an admin push notification to all users
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {File|null} image - Optional image attachment
 * @returns {Promise<object>} { detail, title, body, total_recipients }
 */
export async function broadcastNotification(title, body, image = null) {
  if (image) {
    const formData = new FormData()
    formData.append('title', title)
    formData.append('body', body)
    formData.append('image', image)
    const accessToken = getAccessToken()
    const response = await fetch(`${API_BASE_URL}/api/admin/notifications/broadcast/`, {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      body: formData,
    })
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.detail || errData.message || 'Failed to broadcast notification')
    }
    return await response.json()
  }
  const response = await apiRequest('/api/admin/notifications/broadcast/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  })
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.detail || errData.message || 'Failed to broadcast notification')
  }
  return await response.json()
}

/**
 * Fetch AI data
 * @param {string|null} userId - Optional user ID
 * @param {string|null} date - Optional date (YYYY-MM-DD)
 * @returns {Promise<object>} AI data
 */
export async function getAIData(userId = null, date = null) {
  let url = '/api/fetch_AI_data/?';
  const params = new URLSearchParams();
  if (userId) params.append('user_id', userId);
  if (date) params.append('date', date);
  
  if (params.toString()) {
    url += params.toString();
  }
  
  console.log('Fetching AI data with URL:', url);
  const response = await apiRequest(url);
  if (!response.ok) {
    throw new Error('Failed to fetch AI data');
  }
  return await response.json();
}

/**
 * Get the weekly leaderboard rankings
 * @returns {Promise<object>} { leaderboard: Array, period: string }
 */
export async function getLeaderboard() {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/leaderboard/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard: ${response.status}`)
  }

  return await response.json()
}

/**
 * Get the daily leaderboard rankings
 * @returns {Promise<object>} { leaderboard: Array, period: string }
 */
export async function getDailyLeaderboard() {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/daily-leaderboard/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch daily leaderboard: ${response.status}`)
  }

  return await response.json()
}

/**
 * Get the public leaderboard (week)
 * @returns {Promise<object>} { leaderboard: Array, period: string }
 */
export async function getPublicLeaderboard() {
  const response = await fetch(`${API_BASE_URL}/api/public/weekly_leaderboard/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch public leaderboard: ${response.status}`)
  }

  return await response.json()
}

/**
 * Get the public daily leaderboard (no auth required, max 3 users)
 * @returns {Promise<object>} { leaderboard: Array, period: string }
 */
export async function getPublicDailyLeaderboard() {
  const response = await fetch(`${API_BASE_URL}/api/public/daily-leaderboard/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch public daily leaderboard: ${response.status}`)
  }

  return await response.json()
}

/**
 * Get the leaderboard posts feed
 * @returns {Promise<Array>} List of posts
 */
export async function getLeaderboardPosts() {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/leaderboard/posts/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard posts: ${response.status}`)
  }

  const data = await response.json()
  return Array.isArray(data.posts) ? data.posts : []
}

/**
 * Create a leaderboard post (challenge photo / completion update)
 * @param {FormData} formData - multipart body: summary, steps, distance, calories, is_completed, image
 * @returns {Promise<object>} Created post
 */
export async function createLeaderboardPost(formData) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/leaderboard/posts/`, {
    method: 'POST',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.detail || 'Failed to create post')
    error.details = data
    throw error
  }
  return data
}

/**
 * Update a leaderboard post (only the post's owner may do this)
 * @param {number|string} postId
 * @param {FormData} formData - multipart body: any of summary, steps, distance, calories, is_completed, image
 * @returns {Promise<object>} Updated post
 */
export async function updateLeaderboardPost(postId, formData) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/leaderboard/posts/${postId}/`, {
    method: 'PATCH',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.detail || 'Failed to update post')
    error.details = data
    throw error
  }
  return data
}

/**
 * Delete a leaderboard post (only the post's owner may do this)
 * @param {number|string} postId
 */
export async function deleteLeaderboardPost(postId) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/leaderboard/posts/${postId}/`, {
    method: 'DELETE',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (!response.ok && response.status !== 204) {
    const data = await response.json().catch(() => ({}))
    const error = new Error(data.detail || 'Failed to delete post')
    error.details = data
    throw error
  }
}

/**
 * Get the leaderboard challenges list
 * @returns {Promise<Array>} List of challenges
 */
export async function getLeaderboardChallenges() {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/leaderboard/challenge/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch challenges: ${response.status}`)
  }

  const data = await response.json()
  return Array.isArray(data.challenges) ? data.challenges : []
}

/**
 * Get the public leaderboard challenges list (no auth required)
 * @returns {Promise<Array>} List of challenges
 */
export async function getPublicLeaderboardChallenges() {
  const response = await fetch(`${API_BASE_URL}/api/public/leaderboard/challenge/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch public challenges: ${response.status}`)
  }

  const data = await response.json()
  return Array.isArray(data.challenges) ? data.challenges : []
}

/**
 * Create a leaderboard challenge
 * @param {FormData} formData - multipart body: name, description, goal, steps, distance, calories, start_date, end_date, image
 * @returns {Promise<object>} Created challenge
 */
export async function createLeaderboardChallenge(formData) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/leaderboard/challenge/`, {
    method: 'POST',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.detail || 'Failed to create challenge')
    error.details = data
    throw error
  }
  return data
}

/**
 * Get likes for a leaderboard post
 * @param {number|string} postId
 * @returns {Promise<{like_count: number, likes: Array}>}
 */
export async function getPostLikes(postId) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/like/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch post likes: ${response.status}`)
  }

  return await response.json()
}

/**
 * Toggle like/unlike on a leaderboard post for the current user
 * @param {number|string} postId
 * @returns {Promise<{like_count: number, likes: Array}>}
 */
export async function toggleLikePost(postId) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/like/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.detail || 'Failed to toggle like')
    error.details = data
    throw error
  }
  return data
}

/**
 * Get comments for a leaderboard post
 * @param {number|string} postId
 * @returns {Promise<{comment_count: number, comments: Array}>}
 */
export async function getPostComments(postId) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch post comments: ${response.status}`)
  }

  return await response.json()
}

/**
 * Add a comment to a leaderboard post
 * @param {number|string} postId
 * @param {string} comment
 * @returns {Promise<{comment_count: number, comments: Array}>}
 */
export async function addPostComment(postId, comment) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ comment }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.detail || 'Failed to add comment')
    error.details = data
    throw error
  }
  return data
}

/**
 * Update a comment on a leaderboard post (only the comment's owner may do this)
 * @param {number|string} postId
 * @param {number|string} commentId
 * @param {string} comment
 * @returns {Promise<object>}
 */
export async function updateComment(postId, commentId, comment) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments/${commentId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ comment }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.detail || 'Failed to update comment')
    error.details = data
    throw error
  }
  return data
}

/**
 * Delete a comment on a leaderboard post (only the comment's owner may do this)
 * @param {number|string} postId
 * @param {number|string} commentId
 */
export async function deleteComment(postId, commentId) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments/${commentId}/`, {
    method: 'DELETE',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (!response.ok && response.status !== 204) {
    const data = await response.json().catch(() => ({}))
    const error = new Error(data.detail || 'Failed to delete comment')
    error.details = data
    throw error
  }
}

/**
 * Get likes for a leaderboard challenge
 * @param {number|string} challengeId
 * @returns {Promise<{like_count: number, likes: Array}>}
 */
export async function getChallengeLikes(challengeId) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/challenges/${challengeId}/like/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch challenge likes: ${response.status}`)
  }

  return await response.json()
}

/**
 * Toggle like/unlike on a leaderboard challenge for the current user
 * @param {number|string} challengeId
 * @returns {Promise<{like_count: number, likes: Array}>}
 */
export async function toggleLikeChallenge(challengeId) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/challenges/${challengeId}/like/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.detail || 'Failed to toggle like')
    error.details = data
    throw error
  }
  return data
}

/**
 * Get comments for a leaderboard challenge
 * @param {number|string} challengeId
 * @returns {Promise<{comment_count: number, comments: Array}>}
 */
export async function getChallengeComments(challengeId) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/challenges/${challengeId}/comments/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch challenge comments: ${response.status}`)
  }

  return await response.json()
}

/**
 * Add a comment to a leaderboard challenge
 * @param {number|string} challengeId
 * @param {string} comment
 * @returns {Promise<{comment_count: number, comments: Array}>}
 */
export async function addChallengeComment(challengeId, comment) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/challenges/${challengeId}/comments/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ comment }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.detail || 'Failed to add comment')
    error.details = data
    throw error
  }
  return data
}

/**
 * Update a comment on a leaderboard challenge (only the comment's owner may do this)
 * @param {number|string} challengeId
 * @param {number|string} commentId
 * @param {string} comment
 * @returns {Promise<object>}
 */
export async function updateChallengeComment(challengeId, commentId, comment) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/challenges/${challengeId}/comments/${commentId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ comment }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.detail || 'Failed to update comment')
    error.details = data
    throw error
  }
  return data
}

/**
 * Delete a comment on a leaderboard challenge (only the comment's owner may do this)
 * @param {number|string} challengeId
 * @param {number|string} commentId
 */
export async function deleteChallengeComment(challengeId, commentId) {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/challenges/${challengeId}/comments/${commentId}/`, {
    method: 'DELETE',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (!response.ok && response.status !== 204) {
    const data = await response.json().catch(() => ({}))
    const error = new Error(data.detail || 'Failed to delete comment')
    error.details = data
    throw error
  }
}

export const initializePayment = async (token, invoiceNo, amount) => {
  return await apiRequest('/initialize_payment/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ invoice_no: invoiceNo, amount })
  });
};