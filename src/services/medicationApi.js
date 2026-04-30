import axios from 'axios';

const BASE_URL = 'https://jeewanjyoti-backend.smart.org.np';

/**
 * Create an axios instance that automatically attaches the JWT Bearer token
 * from localStorage on every request.
 */
const medicationAxios = axios.create({
  baseURL: BASE_URL,
});

medicationAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

/**
 * Fetch all medications for a given user.
 * @param {string|number} userId
 * @returns {Promise<Array>}
 */
export async function getMedications(userId) {
  const response = await medicationAxios.get('/api/medication/', {
    params: { user_id: userId },
  });
  return response.data;
}

/**
 * Create a new medication record.
 * @param {object} payload  - Medication fields
 * @returns {Promise<object>}
 */
export async function createMedication(payload) {
  const response = await medicationAxios.post('/api/medication/', payload);
  return response.data;
}

/**
 * Toggle the medication_status for a given medication.
 * Uses PATCH to only update the status field.
 * @param {string|number} id
 * @param {boolean} status
 * @returns {Promise<object>}
 */
export async function toggleMedicationStatus(id, status) {
  const response = await medicationAxios.patch(`/api/medication/${id}/`, {
    medication_status: status,
  });
  return response.data;
}
