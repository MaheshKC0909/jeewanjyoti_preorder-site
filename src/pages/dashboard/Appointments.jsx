import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Video, Phone, MapPin, X, Search, Star, GraduationCap, Building, Mail, User, CreditCard } from 'lucide-react';
import { getDoctorList, API_BASE_URL, getUserEmailProfile } from '../../lib/api';

const AppointmentsTab = ({ darkMode }) => {
  console.log('AppointmentsTab component rendering...', { darkMode });
  
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [bookingData, setBookingData] = useState({
    appointment_date: '',
    appointment_time: '',
    problem_description: '',
    is_immediate: false,
    user_report: null
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availabilityData, setAvailabilityData] = useState({
  available_date: '',
  start_time: '',
  end_time: '',
  interval_minutes: 15
});

  // Determine if current user is a doctor based on role from API
  // Role is normalized to uppercase in state, so check uppercase variants
  const isDoctor = userRole && (
    userRole === 'DOCTOR' || 
    userRole === 'DR' ||
    userRole === 'DR.'
  );

  // API base URL - use environment variable or fallback to the API_BASE_URL from api.js
  // In dev mode, use proxy '/api', in production use the full API URL
  // If API_BASE_URL doesn't include '/api', we need to add it for the endpoints
  const getApiBase = () => {
    if (import.meta.env.DEV) {
      return '/api';
    }
    const base = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;
    // If base doesn't end with /api, add it
    return base.includes('/api') ? base : `${base}/api`;
  };
  const API_BASE = getApiBase();

  // Fetch user role from API on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        setLoadingRole(true);
        console.log('Fetching user role from API...');
        const profileData = await getUserEmailProfile();
        console.log('User profile data received:', profileData);
        console.log('Profile data keys:', profileData ? Object.keys(profileData) : 'No data');
        
        // Check for role in different possible locations
        let role = null;
        if (profileData) {
          // Check direct role field
          if (profileData.role) {
            role = profileData.role;
          }
          // Check if role is nested in user object
          else if (profileData.user && profileData.user.role) {
            role = profileData.user.role;
          }
          // Check if it's in a nested data structure
          else if (profileData.data && profileData.data.role) {
            role = profileData.data.role;
          }
        }
        
        if (role) {
          const normalizedRole = typeof role === 'string' ? role.toUpperCase().trim() : String(role).toUpperCase().trim();
          setUserRole(normalizedRole);
          console.log('User role set to:', normalizedRole);
          console.log('Is doctor:', normalizedRole === 'DOCTOR');
          
          // Update localStorage for consistency (but API is the source of truth)
          const currentUserData = JSON.parse(localStorage.getItem('user_data') || '{}');
          const updatedUserData = { ...currentUserData, role: role };
          localStorage.setItem('user_data', JSON.stringify(updatedUserData));
          console.log('Role saved to localStorage:', role);
        } else {
          console.warn('No role found in profile data. Available keys:', profileData ? Object.keys(profileData) : 'No profile data');
          console.warn('Profile data full object:', profileData);
          setUserRole(null);
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        console.error('Error details:', err.message, err.stack);
        // Fallback to localStorage if API fails
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (userData && userData.role) {
          const fallbackRole = typeof userData.role === 'string' ? userData.role.toUpperCase().trim() : String(userData.role).toUpperCase().trim();
          setUserRole(fallbackRole);
          console.log('Using role from localStorage as fallback:', fallbackRole);
        } else {
          console.warn('No role found in localStorage either');
          setUserRole(null);
        }
      } finally {
        setLoadingRole(false);
      }
    };

    fetchUserRole();
  }, []);

  // Fetch appointments on component mount
  useEffect(() => {
    try {
      console.log('AppointmentsTab useEffect - fetching appointments...');
      fetchAppointments();
    } catch (error) {
      console.error('Error in AppointmentsTab useEffect:', error);
      setError('Failed to load appointments');
      setLoadingAppointments(false);
    }
  }, []);

  // Fetch doctors when modal opens
  useEffect(() => {
    if (showDoctorModal) {
      fetchDoctors();
    }
  }, [showDoctorModal]);
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableSlots(selectedDoctor.id, selectedDate);
    }
  }, [selectedDoctor, selectedDate]);
  // Filter doctors based on search term and filter type
  useEffect(() => {
    if (searchTerm) {
      const filtered = doctors.filter(doctor => {
        const searchLower = searchTerm.toLowerCase();
        
        switch (searchFilter) {
          case 'name':
            return doctor.first_name.toLowerCase().includes(searchLower) ||
                   doctor.last_name.toLowerCase().includes(searchLower);
          case 'specialization':
            return doctor.specialization.toLowerCase().includes(searchLower);
          case 'hospital':
            return doctor.hospital_name.toLowerCase().includes(searchLower);
          case 'all':
          default:
            return doctor.first_name.toLowerCase().includes(searchLower) ||
                   doctor.last_name.toLowerCase().includes(searchLower) ||
                   doctor.specialization.toLowerCase().includes(searchLower) ||
                   doctor.hospital_name.toLowerCase().includes(searchLower);
        }
      });
      setFilteredDoctors(filtered);
    } else {
      setFilteredDoctors(doctors);
    }
  }, [searchTerm, searchFilter, doctors]);

  // Fetch appointments from backend
  const fetchAppointments = async () => {
    try {
      console.log('Fetching appointments...');
      setLoadingAppointments(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      console.log('Token available:', !!token);
      
      if (!token) {
        setError('Please log in to view appointments');
        setLoadingAppointments(false);
        return;
      }
      
      // Construct the full URL
      // API_BASE should already include '/api' (either as /api or https://domain.com/api)
      const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
      const endpoint = 'appointment_list/';
      const url = `${base}/${endpoint}`;
      
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Appointments response status:', response.status);
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `Failed to fetch appointments (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
          
          // Handle authentication errors
          if (response.status === 401 || response.status === 403) {
            errorMessage = 'Session expired. Please log in again.';
            // Optionally redirect to login
            // window.location.href = '/login';
          }
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
        }
        
        setError(errorMessage);
        setAppointments([]);
        console.error('Failed to fetch appointments:', response.status, errorMessage);
        return;
      }
      
      const data = await response.json();
      console.log('Appointments data:', data);
      
      // Handle different response formats
      if (Array.isArray(data)) {
        setAppointments(data);
      } else if (data.results && Array.isArray(data.results)) {
        // Paginated response
        setAppointments(data.results);
      } else if (data.appointments && Array.isArray(data.appointments)) {
        // Nested appointments object
        setAppointments(data.appointments);
      } else if (data.data && Array.isArray(data.data)) {
        // Nested data object
        setAppointments(data.data);
      } else {
        console.warn('Unexpected appointments response format:', data);
        setAppointments([]);
        setError('Received unexpected data format from server');
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      const errorMessage = err.message || 'Network error. Please check your connection and try again.';
      setError(errorMessage);
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  // Fetch doctors from backend
  const fetchDoctors = async () => {
    setLoading(true);
    setError(null);
    try {
      const doctorList = await getDoctorList();
      setDoctors(doctorList);
      setFilteredDoctors(doctorList);
    } catch (err) {
      setError('Failed to fetch doctors. Please try again.');
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };
  const fetchAvailableSlots = async (doctorId, date) => {
    setLoadingSlots(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
      const url = `${base}/get_doctor_availability/${doctorId}/?date=${date}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.slots || []);
      } else {
        setError('Failed to fetch available slots');
        setAvailableSlots([]);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      setError('Failed to load available slots');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };
  const initializePayment = async (invoiceNo) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError('Please log in to proceed with payment');
        return;
      }
      
      const amount = 100; // You can make this dynamic (doctor.fee or so)
      
      // Construct the full URL
      const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
      const endpoint = 'initialize_payment/';
      const url = `${base}/${endpoint}`;
      
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invoice_no: invoiceNo, amount }),
      });
      
      if (!res.ok) {
        let errorMessage = "Payment initialization failed";
        try {
          const errorData = await res.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Payment failed with status ${res.status}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      if (!data.pidx) {
        throw new Error("Invalid payment response from server");
      }
      
      // Redirect to Khalti test payment page
      window.location.href = `https://test-pay.khalti.com/wallet?pidx=${data.pidx}`;
    } catch (err) {
      console.error("Payment init error:", err);
      setError(err.message || "Failed to initialize payment. Please try again.");
      alert(err.message || "Failed to initialize payment. Please try again.");
    }
  };
  
  // Handle doctor selection for booking
  const handleSelectDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setShowDoctorModal(false);
    setShowBookingModal(true);
  };

  // Handle booking form input changes
  const handleBookingInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setBookingData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value
    }));
  };

  // Submit booking form
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    
    if (!bookingData.problem_description.trim()) {
      setError('Please provide a problem description');
      return;
    }
    
    if (!bookingData.appointment_date || !bookingData.appointment_time) {
      setError('Please select appointment date and time');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('access_token');
      const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
      const url = `${base}/book_appointment/`;
      
      const requestBody = {
        doctor_id: selectedDoctor.id,
        appointment_date: bookingData.appointment_date,
        appointment_time: bookingData.appointment_time,
        problem_description: bookingData.problem_description
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        setShowBookingModal(false);
        setSelectedDoctor(null);
        
        if (data.invoice_no) {
          initializePayment(data.invoice_no);
        }
        
        setBookingData({
          appointment_date: '',
          appointment_time: '',
          problem_description: '',
          is_immediate: false,
          user_report: null
        });
      } else {
        // error handling...
      }
    } catch (err) {
      setError(`Failed to book appointment: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  // Handle availability form input changes
const handleAvailabilityInputChange = (e) => {
  const { name, value } = e.target;
  setAvailabilityData(prev => ({
    ...prev,
    [name]: value
  }));
};

// Submit availability form
const handleCreateAvailability = async (e) => {
  e.preventDefault();
  console.log('Creating availability with data:', availabilityData);
  
  // Validate required fields
  if (!availabilityData.available_date || !availabilityData.start_time || !availabilityData.end_time) {
    setError('Please fill in all required fields');
    return;
  }
  
  // Validate that end time is after start time
  if (availabilityData.start_time >= availabilityData.end_time) {
    setError('End time must be after start time');
    return;
  }
  
  setLoading(true);
  setError(null);
  
  try {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      setError('Please log in to create availability');
      return;
    }
    
    // Prepare request body
    const requestBody = {
      available_date: availabilityData.available_date,
      start_time: availabilityData.start_time,
      end_time: availabilityData.end_time,
      interval_minutes: parseInt(availabilityData.interval_minutes)
    };
    
    console.log('Sending availability data:', requestBody);
    
    // Construct the full URL
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const endpoint = 'create_doctor_availability/';
    const url = `${base}/${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Availability created successfully:', data);
      
      // Show success message
      alert('Availability created successfully!');
      
      // Close modal
      setShowAvailabilityModal(false);
      
      // Reset form
      setAvailabilityData({
        available_date: '',
        start_time: '',
        end_time: '',
        interval_minutes: 15
      });
      
      // Optionally refresh appointments list
      fetchAppointments();
    } else {
      let errorMessage = 'Failed to create availability';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
        
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          errorMessage = 'Session expired. Please log in again.';
        }
      } catch (parseError) {
        errorMessage = `Failed with status ${response.status}`;
      }
      console.error('Availability creation failed:', errorMessage);
      setError(errorMessage);
    }
  } catch (err) {
    console.error('Error creating availability:', err);
    setError(`Failed to create availability: ${err.message}. Please try again.`);
  } finally {
    setLoading(false);
  }
};
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Date not specified';
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return 'Time not specified';
    try {
      return new Date(`1970-01-01T${timeString}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid time';
    }
  };

  // Handle payment success
  const handlePaymentSuccess = () => {
    // This function is no longer needed as payment is handled by Khalti redirect
    alert('Payment successful! Your appointment has been confirmed.');
    fetchAppointments(); // Refresh appointments list
  };

  // Handle payment error
  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    setError('Payment failed. Please try again or contact support.');
  };

  // Handle payment cancellation
  const handlePaymentCancel = () => {
    // This function is no longer needed as payment is handled by Khalti redirect
    setError('Payment cancelled. Your appointment is still pending.');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Appointments</h2>
              <div className="flex gap-2">
                {!isDoctor ? (
                  // Patient sees "Book Appointment" button
                  <button 
                    onClick={() => setShowDoctorModal(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-sm md:text-base"
                  >
                    <Plus className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden md:inline">Book Appointment</span>
                  </button>
                ) : (
                  // Doctor sees "Add Available Date & Time" button
                  <button 
                    onClick={() => setShowAvailabilityModal(true)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-sm md:text-base"
                  >
                    <Plus className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden md:inline">Add Available Date & Time</span>
                  </button>
                )}
              </div>
            </div>

      {error && (
        <div className={`p-4 mb-4 rounded-lg ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">X</button>
        </div>
      )}

      {/* Loading State */}
      {loadingAppointments ? (
        <div className={`rounded-2xl p-8 md:p-12 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
          </div>
          <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Loading Appointments...
          </h3>
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Please wait while we fetch your appointments.
          </p>
        </div>
      ) : appointments.length > 0 ? (
        // Appointments list
        <div className="grid gap-4 md:gap-6">
          {appointments.map((appointment) => {
          // Add null checks for appointment data
          if (!appointment) {
            console.warn('Invalid appointment data:', appointment);
            return null;
          }
          
          // Handle new response format
          const doctorName = appointment.doctor_name || 'Doctor';
          const patientName = appointment.user_name || 'Patient';
          const specialization = appointment.doctor_specialization || 'General Practice';
          
          // Determine what to show based on user role
          const primaryName = isDoctor ? patientName : doctorName;
          const primaryInitials = isDoctor 
            ? (patientName !== 'Patient' ? patientName.split(' ').map(name => name[0]).join('').toUpperCase() : 'PT')
            : (doctorName !== 'Doctor' ? doctorName.split(' ').map(name => name[0]).join('').toUpperCase() : 'DR');
          
          return (
            <div key={appointment.appointment_id || Math.random()} className={`rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border hover:shadow-xl transition-all duration-300 ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                  {(!isDoctor ? appointment.doctor_profile_image : appointment.user_profile_image) ? (
                    <img
                      src={`${API_BASE_URL}${(!isDoctor ? appointment.doctor_profile_image : appointment.user_profile_image)}`}
                      alt={primaryName}
                      className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl">
                      {primaryInitials}
                    </div>
                  )}
                  <div>
                    <h3 className={`text-base md:text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {primaryName}
                    </h3>
                    {isDoctor ? (
                      <>
                        <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Doctor: {doctorName}
                        </p>
                        <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {specialization}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {specialization}
                        </p>
                        {appointment.user_name && (
                          <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Patient: {appointment.user_name}
                          </p>
                        )}
                      </>
                    )}
                    {appointment.invoice_no && (
                      <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Invoice: {appointment.invoice_no}
                      </p>
                    )}
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-2">
                    <div className={`flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                        <span className="text-xs md:text-sm">
                          {appointment.appointment_date ? formatDate(appointment.appointment_date) : appointment.is_immediate ? 'Immediate' : 'Date not set'}
                        </span>
                    </div>
                    {!appointment.is_immediate && (
                      <div className={`flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        <Clock className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="text-xs md:text-sm">
                            {appointment.appointment_time ? formatTime(appointment.appointment_time) : 'Time not set'}
                          </span>
                      </div>
                    )}
                    {appointment.is_immediate && (
                      <div className={`flex items-center gap-1 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                        <Clock className="w-3 h-3 md:w-4 md:h-4" />
                        <span className="text-xs md:text-sm font-medium">Immediate</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between md:justify-end gap-3">
                  <div className="flex flex-col items-center gap-2">
                  <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium ${
                      appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 
                      appointment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                  }`}>
                    {appointment.status || 'UNKNOWN'}
                  </span>
                  {/* Only show payment status if appointment is confirmed and paid, or if not confirmed */}
                  {appointment.status !== 'CONFIRMED' && (
                    <div className={`flex items-center gap-1 text-xs md:text-sm ${
                      appointment.is_paid 
                        ? (darkMode ? 'text-green-400' : 'text-green-600')
                        : (darkMode ? 'text-orange-400' : 'text-orange-600')
                    }`}>
                        {appointment.is_paid ? (
                          <>
                            <CreditCard className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="font-medium">Paid</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="font-medium">Payment Required</span>
                          </>
                        )}
                      </div>
                  )}
                  </div>
                </div>
              </div>
              {appointment.problem_description && (
                <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <strong>Reason: </strong>{appointment.problem_description}
                  </p>
                </div>
              )}
              
              {appointment.user_report_url && (
                <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-blue-900' : 'bg-blue-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                    <strong>Medical Report: </strong>
                    <a 
                      href={appointment.user_report_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:no-underline ml-1"
                    >
                      View Report
                    </a>
                  </p>
                </div>
              )}
            </div>
          );
        })}
        </div>
      ) : (
        // Empty state UI - Only shows when loading is complete and no appointments exist
        <div className={`rounded-2xl p-8 md:p-12 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          {/* Main Icon */}
          <div className="flex justify-center mb-6">
            <div className={`p-6 rounded-full ${darkMode ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gradient-to-r from-blue-50 to-purple-50'} border-2 ${darkMode ? 'border-blue-500' : 'border-blue-200'}`}>
              <Calendar className={`w-16 h-16 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
            </div>
          </div>
          
          {/* Main Heading */}
          <h3 className={`text-2xl md:text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            No Appointments Scheduled
          </h3>
          
          {/* Description */}
          <p className={`mb-8 max-w-lg mx-auto text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            You don't have any upcoming appointments at the moment. Book your first appointment with one of our qualified healthcare professionals to get started.
          </p>
          
          {/* Features List */}
          <div className={`mb-8 max-w-md mx-auto ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-6`}>
            <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Why choose our healthcare services?
            </h4>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Qualified and experienced doctors
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Flexible appointment scheduling
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Comprehensive medical care
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Easy online booking system
                </span>
              </div>
            </div>
          </div>
          
          {/* Call to Action Button - Only show for non-doctors */}
          {!isDoctor && (
            <button 
              onClick={() => setShowDoctorModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl flex items-center gap-3 transition-all duration-300 mx-auto shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-6 h-6" />
              <span className="text-lg font-semibold">Book Your First Appointment</span>
            </button>
          )}
          
          {/* Additional Info */}
          <p className={`mt-6 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {!isDoctor ? 'Need help? Contact our support team for assistance with booking.' : 'You have no appointments scheduled at the moment.'}
          </p>
        </div>
      )}

      {/* Doctor Selection Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Select a Doctor
              </h3>
              <button
                onClick={() => setShowDoctorModal(false)}
                className={`p-2 rounded-lg hover:bg-gray-100 ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                {/* Filter Options */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSearchFilter('all')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      searchFilter === 'all'
                        ? 'bg-blue-500 text-white'
                        : darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSearchFilter('name')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      searchFilter === 'name'
                        ? 'bg-blue-500 text-white'
                        : darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Name
                  </button>
                  <button
                    onClick={() => setSearchFilter('specialization')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      searchFilter === 'specialization'
                        ? 'bg-blue-500 text-white'
                        : darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Specialization
                  </button>
                  <button
                    onClick={() => setSearchFilter('hospital')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      searchFilter === 'hospital'
                        ? 'bg-blue-500 text-white'
                        : darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Hospital
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search doctors by ${searchFilter === 'all' ? 'name, specialization, or hospital' : searchFilter}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>
              </div>
            </div>

            {/* Doctor List */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className={`ml-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Loading doctors...
                  </span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className={`text-red-500 mb-4 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                    {error}
                  </p>
                  <button
                    onClick={fetchDoctors}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                  >
                    Try Again
                  </button>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {searchTerm ? 'No doctors found matching your search.' : 'No doctors available.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredDoctors.map((doctor) => (
                    <div
                      key={doctor.id}
                      className={`p-4 rounded-xl border hover:shadow-lg transition-all duration-300 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Doctor Avatar */}
                        {doctor.profile_image ? (
                          <img
                            src={`${API_BASE_URL}${doctor.profile_image}`}
                            alt={`Dr. ${doctor.first_name} ${doctor.last_name}`}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {doctor.first_name[0]}{doctor.last_name[0]}
                          </div>
                        )}

                        {/* Doctor Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                Dr. {doctor.first_name} {doctor.last_name}
                              </h4>
                              <p className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                                {doctor.specialization}
                              </p>
                            </div>
                            <button
                              onClick={() => handleSelectDoctor(doctor)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              Select
                            </button>
                          </div>

                          {/* Doctor Details */}
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-gray-400" />
                              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {doctor.hospital_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-gray-400" />
                              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {doctor.experience} years experience
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {doctor.email}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {doctor.phone_number}
                              </span>
                            </div>
                          </div>

                          {/* Education */}
                          {doctor.education && (
                            <div className="mt-2">
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <strong>Education:</strong> {doctor.education}
                              </p>
                            </div>
                          )}

                          {/* Description */}
                          {doctor.description && (
                            <div className="mt-2">
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {doctor.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'} flex items-center gap-3`}>
                {selectedDoctor.profile_image ? (
                  <img
                    src={`${API_BASE_URL}${selectedDoctor.profile_image}`}
                    alt={`Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : null}
                <span>Book Appointment with Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</span>
              </h3>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedDoctor(null);
                  setSelectedDate('');
                  setAvailableSlots([]);
                }}
                className={`p-2 rounded-lg hover:bg-gray-100 ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment}>
              <div className="space-y-4">
                {/* Step 1: Select Date */}
                <div>
                  <label htmlFor="appointment_date" className={`block mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Select Appointment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="appointment_date"
                    name="appointment_date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setBookingData(prev => ({ ...prev, appointment_date: e.target.value, appointment_time: '' }));
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    max="2100-12-31"
                    className={`w-full p-3 rounded-xl border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    required
                  />
                </div>

                {/* Step 2: Show Available Slots */}
                {selectedDate && (
                  <div>
                    <label className={`block mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Select Available Time Slot <span className="text-red-500">*</span>
                    </label>
                    
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className={`ml-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Loading available slots...
                        </span>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          No available slots for this date. Please select another date.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2">
                        {availableSlots.map((slot, index) => (
                          <button
                            key={index}
                            type="button"
                            disabled={slot.is_booked}
                            onClick={() => {
                              setBookingData(prev => ({ ...prev, appointment_time: slot.time }));
                            }}
                            className={`p-3 rounded-lg text-sm font-medium transition-all ${
                              slot.is_booked
                                ? darkMode
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : bookingData.appointment_time === slot.time
                                ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                                : darkMode
                                ? 'bg-gray-700 text-white hover:bg-gray-600'
                                : 'bg-white border border-gray-300 hover:bg-blue-50'
                            }`}
                          >
                            {slot.time}
                            {slot.is_booked && (
                              <div className="text-xs mt-1">Booked</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Problem Description */}
                {bookingData.appointment_time && (
                  <div>
                    <label htmlFor="problem_description" className={`block mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Problem Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="problem_description"
                      name="problem_description"
                      value={bookingData.problem_description}
                      onChange={handleBookingInputChange}
                      rows={4}
                      required
                      className={`w-full p-3 rounded-xl border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="Please describe your symptoms or reason for the appointment"
                    ></textarea>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookingModal(false);
                      setSelectedDoctor(null);
                      setSelectedDate('');
                      setAvailableSlots([]);
                      setBookingData({
                        appointment_date: '',
                        appointment_time: '',
                        problem_description: ''
                      });
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      darkMode 
                        ? 'bg-gray-700 text-white hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !bookingData.appointment_time || !bookingData.problem_description}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Doctor Availability Modal */}
    {showAvailabilityModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className={`w-full max-w-2xl rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Add Available Date & Time
            </h3>
            <button
              onClick={() => setShowAvailabilityModal(false)}
              className={`p-2 rounded-lg hover:bg-gray-100 ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleCreateAvailability}>
            <div className="space-y-4">
              {/* Available Date */}
              <div>
                <label htmlFor="available_date" className={`block mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Available Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="available_date"
                  name="available_date"
                  value={availabilityData.available_date}
                  onChange={handleAvailabilityInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  max="2100-12-31"
                  className={`w-full p-3 rounded-xl border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                  required
                />
              </div>

              {/* Start Time */}
              <div>
                <label htmlFor="start_time" className={`block mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  id="start_time"
                  name="start_time"
                  value={availabilityData.start_time}
                  onChange={handleAvailabilityInputChange}
                  className={`w-full p-3 rounded-xl border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                  required
                />
              </div>

              {/* End Time */}
              <div>
                <label htmlFor="end_time" className={`block mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  id="end_time"
                  name="end_time"
                  value={availabilityData.end_time}
                  onChange={handleAvailabilityInputChange}
                  className={`w-full p-3 rounded-xl border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                  required
                />
              </div>

              {/* Interval Minutes */}
              <div>
                <label htmlFor="interval_minutes" className={`block mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Appointment Interval (minutes) <span className="text-red-500">*</span>
                </label>
                <select
                  id="interval_minutes"
                  name="interval_minutes"
                  value={availabilityData.interval_minutes}
                  onChange={handleAvailabilityInputChange}
                  className={`w-full p-3 rounded-xl border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                  required
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
                <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  This will create appointment slots every {availabilityData.interval_minutes} minutes between your start and end time.
                </p>
              </div>

              {/* Preview */}
              {availabilityData.available_date && availabilityData.start_time && availabilityData.end_time && (
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                  <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Preview
                  </h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Available slots will be created on <strong>{formatDate(availabilityData.available_date)}</strong> from{' '}
                    <strong>{availabilityData.start_time}</strong> to <strong>{availabilityData.end_time}</strong> with{' '}
                    <strong>{availabilityData.interval_minutes} minute</strong> intervals.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAvailabilityModal(false);
                    setAvailabilityData({
                      available_date: '',
                      start_time: '',
                      end_time: '',
                      interval_minutes: 15
                    });
                  }}
                  className={`px-4 py-2 rounded-lg ${
                    darkMode 
                      ? 'bg-gray-700 text-white hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Availability
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    )}

    </div>
  );
};

export default AppointmentsTab;