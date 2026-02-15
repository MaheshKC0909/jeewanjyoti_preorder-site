import { authenticatedFetch, getAuthHeaders, refreshAccessToken, clearTokens, getUserData } from './tokenManager'

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
  console.log('updateProfile called with:', profileData); // Debug log
  console.log('updateProfile payload stringified:', JSON.stringify(profileData)); // Debug log
  
  try {
    const response = await apiRequest('/api/profile-update/', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    })
    
    console.log('updateProfile response status:', response.status); // Debug log
    console.log('updateProfile response headers:', response.headers); // Debug log
    
    const responseText = await response.text();
    console.log('updateProfile response text:', responseText); // Debug log
    
    if (!response.ok) {
      let errorData = {};
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { detail: responseText || 'Unknown error' };
      }
      console.error('updateProfile error:', errorData); // Debug log
      console.error('updateProfile error status:', response.status); // Debug log
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
    console.log('updateProfile success:', result); // Debug log
    return result;
  } catch (error) {
    console.error('updateProfile exception:', error);
    // Re-throw if it's already our formatted error
    if (error.details) {
      throw error;
    }
    // Otherwise, wrap it
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
 * Get sleep data
 * @param {string} userId - Optional user ID
 * @param {string} startDate - Optional start date filter (ISO string)
 * @param {string} endDate - Optional end date filter (ISO string)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of sleep data records
 */
export async function getSleepData(userId = null, startDate = null, endDate = null, range = null) {
  let url = userId ? `/api/sleep-data/?user_id=${userId}` : '/api/sleep-data/?'
  
  // Add range filter if provided (prefer range over date filters)
  if (range) {
    url += `&range=${range}`
  }
  // Add date range filters if provided (fallback if range not used)
  else if (startDate) {
    url += `&start_date=${startDate}`
    if (endDate) {
      url += `&end_date=${endDate}`
    }
  } else if (endDate) {
    url += `&end_date=${endDate}`
  } else {
    // Default to 24h if no filters provided
    url += `&range=24h`
  }
  
  return await fetchAllPages(url)
}

/**
 * Get SpO2/Blood Oxygen data
 * @param {string} userId - Optional user ID
 * @param {string} startDate - Optional start date filter (ISO string)
 * @param {string} endDate - Optional end date filter (ISO string)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of SpO2 data records
 */
export async function getSpO2Data(userId = null, startDate = null, endDate = null, range = null) {
  let url = userId ? `/api/Spo2-data/?user_id=${userId}` : '/api/Spo2-data/?'
  
  // Add range filter if provided (prefer range over date filters)
  if (range) {
    url += `&range=${range}`
  }
  // Add date range filters if provided (fallback if range not used)
  else if (startDate) {
    url += `&start_date=${startDate}`
    if (endDate) {
      url += `&end_date=${endDate}`
    }
  } else if (endDate) {
    url += `&end_date=${endDate}`
  } else {
    // Default to 24h if no filters provided
    url += `&range=24h`
  }
  
  return await fetchAllPages(url)
}

/**
 * Helper function to fetch all pages from a paginated API response
 * @param {string} initialUrl - Initial API URL to fetch (relative path like /api/HeartRate_Data/)
 * @returns {Promise<Array>} Combined results from all pages
 */
async function fetchAllPages(initialUrl) {
  let allResults = [];
  let currentUrl = initialUrl;
  let isFirstRequest = true;
  
  while (currentUrl) {
    // For the first request, ensure page=1 is included if not already present
    let url = currentUrl;
    if (isFirstRequest && !currentUrl.includes('page=')) {
      const hasParams = currentUrl.includes('?');
      url = hasParams 
        ? `${currentUrl}&page=1` 
        : `${currentUrl}?page=1`;
    }
    // For subsequent requests, use the URL from data.next which already includes page parameter
    
    console.log(`Fetching: ${url}`);
    
    const response = await apiRequest(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if response is paginated (has count, next, previous, results)
    if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
      // Paginated response
      allResults = allResults.concat(data.results);
      console.log(`Received ${data.results.length} items (Total: ${allResults.length} / ${data.count || 'unknown'})`);
      
      // Check if there's a next page
      if (data.next) {
        // Extract relative URL from the next link
        // Remove the base URL to get just the path
        let nextRelativeUrl = data.next;
        if (nextRelativeUrl.startsWith(API_BASE_URL)) {
          nextRelativeUrl = nextRelativeUrl.replace(API_BASE_URL, '');
        } else if (nextRelativeUrl.startsWith('http://') || nextRelativeUrl.startsWith('https://')) {
          // Full URL, extract the path
          try {
            const urlObj = new URL(nextRelativeUrl);
            nextRelativeUrl = urlObj.pathname + urlObj.search;
          } catch (e) {
            console.error('Error parsing next URL:', e);
            currentUrl = null;
            break;
          }
        }
        currentUrl = nextRelativeUrl;
        isFirstRequest = false;
      } else {
        currentUrl = null;
      }
    } else if (Array.isArray(data)) {
      // Non-paginated response (direct array)
      allResults = allResults.concat(data);
      console.log(`Received ${data.length} items (non-paginated)`);
      currentUrl = null;
    } else {
      // Single object response (not paginated)
      allResults.push(data);
      currentUrl = null;
    }
  }
  
  console.log(`Total items fetched: ${allResults.length}`);
  return allResults;
}

/**
 * Get Heart Rate data
 * @param {string} userId - Optional user ID
 * @param {string} startDate - Optional start date filter (YYYY-MM-DD format)
 * @param {string} endDate - Optional end date filter (YYYY-MM-DD format)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of Heart Rate data records
 */
export async function getHeartRateData(userId = null, startDate = null, endDate = null, range = null) {
  let url = userId ? `/api/HeartRate_Data/?user_id=${userId}` : '/api/HeartRate_Data/?'
  
  // Add date range filters if provided (prefer from/to over range)
  if (startDate && endDate) {
    url += `&from=${startDate}&to=${endDate}`
  }
  // Add range filter if provided (fallback)
  else if (range) {
    url += `&range=${range}`
  }
  // Add single date filter if only start date provided
  else if (startDate) {
    url += `&from=${startDate}`
  }
  // Default to 24h if no filters provided
  else {
    url += `&range=24h`
  }
  
  return await fetchAllPages(url)
}

/**
 * Get Stress data
 * @param {string} userId - Optional user ID
 * @param {string} startDate - Optional start date filter (YYYY-MM-DD format)
 * @param {string} endDate - Optional end date filter (YYYY-MM-DD format)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of Stress data records
 */
export async function getStressData(userId = null, startDate = null, endDate = null, range = null) {
  let url = userId ? `/api/Stress_Data/?user_id=${userId}` : '/api/Stress_Data/?'
  
  // Add date range filters if provided (prefer from/to over range)
  if (startDate && endDate) {
    url += `&from=${startDate}&to=${endDate}`
  }
  // Add range filter if provided (fallback)
  else if (range) {
    url += `&range=${range}`
  }
  // Add single date filter if only start date provided
  else if (startDate) {
    url += `&from=${startDate}`
  }
  // Default to 24h if no filters provided
  else {
    url += `&range=24h`
  }
  
  return await fetchAllPages(url)
}

/**
 * Get HRV (Heart Rate Variability) data
 * @param {string} userId - Optional user ID
 * @param {string} startDate - Optional start date filter (YYYY-MM-DD format)
 * @param {string} endDate - Optional end date filter (YYYY-MM-DD format)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of HRV data records
 */
export async function getHRVData(userId = null, startDate = null, endDate = null, range = null) {
  let url = userId ? `/api/HRV_Iso_Data/?user_id=${userId}` : '/api/HRV_Iso_Data/?'
  
  // Add date range filters if provided (prefer from/to over range)
  if (startDate && endDate) {
    url += `&from=${startDate}&to=${endDate}`
  }
  // Add range filter if provided (fallback)
  else if (range) {
    url += `&range=${range}`
  }
  // Add single date filter if only start date provided
  else if (startDate) {
    url += `&from=${startDate}`
  }
  // Default to 24h if no filters provided
  else {
    url += `&range=24h`
  }
  
  return await fetchAllPages(url)
}

/**
 * Get Steps data
 * @param {string} userId - Optional user ID
 * @param {string} startDate - Optional start date filter (ISO string)
 * @param {string} endDate - Optional end date filter (ISO string)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of Steps data records
 */
export async function getStepsData(userId = null, startDate = null, endDate = null, range = null) {
  try {
    let url = '/api/Steps/';
    const params = new URLSearchParams();
    
    if (userId) params.append('user', userId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (range) params.append('range', range);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiRequest(url);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Error fetching steps data:', error);
      throw new Error(error.detail || 'Failed to fetch steps data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getStepsData:', error);
    throw error;
  }
}

/**
 * Get daily total activity data
 * @param {string} userId - Optional user ID
 * @param {string} range - Optional time range filter (e.g., '24h', '7d', '30d')
 * @returns {Promise<object>} Daily activity data
 */
export async function getDayTotalActivity(userId = null, range = null) {
  try {
    let url = '/api/Day_total_activity/';
    const params = new URLSearchParams();
    
    if (userId) params.append('user_id', userId);
    if (range) params.append('range', range);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
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
  
  const response = await apiRequest(url);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('Error fetching user profile:', error);
    throw new Error(error.detail || 'Failed to fetch user profile');
  }
  
  return await response.json();
}

/**
 * Logout user
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  try {
    // Call logout endpoint if available
    await apiRequest('/api/logout/', {
      method: 'POST',
    })
  } catch (error) {
    console.warn('Logout endpoint failed:', error)
  } finally {
    // Always clear local tokens
    clearTokens()
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