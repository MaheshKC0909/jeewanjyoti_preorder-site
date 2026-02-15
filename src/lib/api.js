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
 * @param {string} fromDate - Optional from date filter (YYYY-MM-DD)
 * @param {string} toDate - Optional to date filter (YYYY-MM-DD)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of sleep data records
 */
export async function getSleepData(userId = null, fromDate = null, toDate = null, range = null) {
  let url = userId ? `/api/sleep-data/?user_id=${userId}` : '/api/sleep-data/?';

  if (fromDate && toDate) {
    url = userId 
      ? `/api/sleep-data/?user_id=${userId}&from=${fromDate}&to=${toDate}`
      : `/api/sleep-data/?from=${fromDate}&to=${toDate}`;
    console.log('Fetching sleep data with from/to:', url);
  }
  else if (range) {
    url += `&range=${range}`;
    console.log('Fetching sleep data with range:', url);
  }
  else if (fromDate) {
    url += `&from=${fromDate}`;
    if (toDate) {
      url += `&to=${toDate}`;
    }
    console.log('Fetching sleep data with from:', url);
  }
  else if (toDate) {
    url += `&to=${toDate}`;
    console.log('Fetching sleep data with to:', url);
  }
  else {
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
 * @param {string} fromDate - Optional from date filter (YYYY-MM-DD)
 * @param {string} toDate - Optional to date filter (YYYY-MM-DD)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of SpO2 data records
 */
export async function getSpO2Data(userId = null, fromDate = null, toDate = null, range = null) {
  let url = userId ? `/api/Spo2-data/?user_id=${userId}` : '/api/Spo2-data/?';

  if (fromDate && toDate) {
    url = userId 
      ? `/api/Spo2-data/?user_id=${userId}&from=${fromDate}&to=${toDate}`
      : `/api/Spo2-data/?from=${fromDate}&to=${toDate}`;
    console.log('Fetching SpO2 data with from/to:', url);
  }
  else if (range) {
    url += `&range=${range}`;
    console.log('Fetching SpO2 data with range:', url);
  }
  else if (fromDate) {
    url += `&from=${fromDate}`;
    if (toDate) {
      url += `&to=${toDate}`;
    }
    console.log('Fetching SpO2 data with from:', url);
  }
  else if (toDate) {
    url += `&to=${toDate}`;
    console.log('Fetching SpO2 data with to:', url);
  }
  else {
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
 * @param {string} fromDate - Optional from date filter (YYYY-MM-DD)
 * @param {string} toDate - Optional to date filter (YYYY-MM-DD)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of Heart Rate data records
 */
export async function getHeartRateData(userId = null, fromDate = null, toDate = null, range = null) {
  let url = userId ? `/api/HeartRate_Data/?user_id=${userId}` : '/api/HeartRate_Data/?';

  if (fromDate && toDate) {
    url = userId 
      ? `/api/HeartRate_Data/?user_id=${userId}&from=${fromDate}&to=${toDate}`
      : `/api/HeartRate_Data/?from=${fromDate}&to=${toDate}`;
    console.log('Fetching heart rate data with from/to:', url);
  }
  else if (range) {
    url += `&range=${range}`;
    console.log('Fetching heart rate data with range:', url);
  }
  else if (fromDate) {
    url += `&from=${fromDate}`;
    if (toDate) {
      url += `&to=${toDate}`;
    }
    console.log('Fetching heart rate data with from:', url);
  }
  else if (toDate) {
    url += `&to=${toDate}`;
    console.log('Fetching heart rate data with to:', url);
  }
  else {
    url += `&range=24h`;
    console.log('Fetching heart rate data default 24h:', url);
  }

  console.log('Heart rate data URL:', url);
  const results = await fetchAllPages(url);
  console.log(`Total heart rate records fetched: ${results.length}`);
  return results;
}

/**
 * Get Blood Pressure data
 * @param {string} userId - Optional user ID
 * @param {string} fromDate - Optional from date filter (YYYY-MM-DD)
 * @param {string} toDate - Optional to date filter (YYYY-MM-DD)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of Blood Pressure data records
 */
export async function getBloodPressureData(userId = null, fromDate = null, toDate = null, range = null) {
  let url = userId ? `/api/BloodPressure_Data/?user_id=${userId}` : '/api/BloodPressure_Data/?';

  if (fromDate && toDate) {
    url = userId 
      ? `/api/BloodPressure_Data/?user_id=${userId}&from=${fromDate}&to=${toDate}`
      : `/api/BloodPressure_Data/?from=${fromDate}&to=${toDate}`;
    console.log('Fetching blood pressure data with from/to:', url);
  }
  else if (range) {
    url += `&range=${range}`;
    console.log('Fetching blood pressure data with range:', url);
  }
  else if (fromDate) {
    url += `&from=${fromDate}`;
    if (toDate) {
      url += `&to=${toDate}`;
    }
    console.log('Fetching blood pressure data with from:', url);
  }
  else if (toDate) {
    url += `&to=${toDate}`;
    console.log('Fetching blood pressure data with to:', url);
  }
  else {
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
 * @param {string} fromDate - Optional from date filter (YYYY-MM-DD)
 * @param {string} toDate - Optional to date filter (YYYY-MM-DD)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of Stress data records
 */
export async function getStressData(userId = null, fromDate = null, toDate = null, range = null) {
  let url = userId ? `/api/Stress_Data/?user_id=${userId}` : '/api/Stress_Data/?';

  if (fromDate && toDate) {
    url = userId 
      ? `/api/Stress_Data/?user_id=${userId}&from=${fromDate}&to=${toDate}`
      : `/api/Stress_Data/?from=${fromDate}&to=${toDate}`;
    console.log('Fetching stress data with from/to:', url);
  }
  else if (range) {
    url += `&range=${range}`;
    console.log('Fetching stress data with range:', url);
  }
  else if (fromDate) {
    url += `&from=${fromDate}`;
    if (toDate) {
      url += `&to=${toDate}`;
    }
    console.log('Fetching stress data with from:', url);
  }
  else if (toDate) {
    url += `&to=${toDate}`;
    console.log('Fetching stress data with to:', url);
  }
  else {
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
 * @param {string} fromDate - Optional from date filter (YYYY-MM-DD)
 * @param {string} toDate - Optional to date filter (YYYY-MM-DD)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of HRV data records
 */
export async function getHRVData(userId = null, fromDate = null, toDate = null, range = null) {
  let url = userId ? `/api/HRV_Iso_Data/?user_id=${userId}` : '/api/HRV_Iso_Data/?';

  if (fromDate && toDate) {
    url = userId 
      ? `/api/HRV_Iso_Data/?user_id=${userId}&from=${fromDate}&to=${toDate}`
      : `/api/HRV_Iso_Data/?from=${fromDate}&to=${toDate}`;
    console.log('Fetching HRV data with from/to:', url);
  }
  else if (range) {
    url += `&range=${range}`;
    console.log('Fetching HRV data with range:', url);
  }
  else if (fromDate) {
    url += `&from=${fromDate}`;
    if (toDate) {
      url += `&to=${toDate}`;
    }
    console.log('Fetching HRV data with from:', url);
  }
  else if (toDate) {
    url += `&to=${toDate}`;
    console.log('Fetching HRV data with to:', url);
  }
  else {
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
 * @param {string} fromDate - Optional from date filter (YYYY-MM-DD)
 * @param {string} toDate - Optional to date filter (YYYY-MM-DD)
 * @param {string} range - Optional range filter (24h, 7d, 30d)
 * @returns {Promise<Array>} List of Steps data records
 */
export async function getStepsData(userId = null, fromDate = null, toDate = null, range = null) {
  try {
    let url = '/api/Steps/';
    const params = new URLSearchParams();

    if (userId) params.append('user', userId);
    
    if (fromDate && toDate) {
      params.append('from', fromDate);
      params.append('to', toDate);
    } else if (fromDate) {
      params.append('from', fromDate);
    } else if (toDate) {
      params.append('to', toDate);
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