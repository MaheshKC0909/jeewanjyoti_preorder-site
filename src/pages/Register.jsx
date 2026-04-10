import { useForm } from 'react-hook-form'
import axios from 'axios'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Building2, Mail, Lock, Phone, MapPin, Globe, FileText, Heart, Stethoscope, UserCheck, Briefcase, GraduationCap, Calendar, Upload, Eye, EyeOff, X, Shield } from 'lucide-react'
import jjlogo from '../assets/jjlogo.png'
import { storeTokens } from '../lib/tokenManager'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { API_BASE_URL, getUserEmailProfile } from '../lib/api'

// Custom CSS for range sliders
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 24px;
    width: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #8b5cf6, #a855f7);
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    transition: all 0.2s ease;
  }
  
  .slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.6);
  }
  
  .slider::-moz-range-thumb {
    height: 24px;
    width: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #8b5cf6, #a855f7);
    cursor: pointer;
    border: none;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  }
`

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

function Register() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const navigate = useNavigate()

  // Handle profile verification after login
  const handleProfileVerification = async () => {
    try {
      console.log('🔍 Checking user profile after registration...')
      const profileData = await getUserEmailProfile()
      console.log('📋 Profile data received:', profileData)
      
      // Extract and save role information
      if (profileData.role) {
        console.log('👤 User role detected:', profileData.role)
        // Update stored user data with role
        const currentUserData = JSON.parse(localStorage.getItem('user_data') || '{}')
        const updatedUserData = { ...currentUserData, role: profileData.role }
        localStorage.setItem('user_data', JSON.stringify(updatedUserData))
        console.log('✅ Role saved to user data')
      }
      
      // Check for missing required fields
      const requiredFields = ['first_name', 'last_name', 'birthdate', 'gender', 'height', 'weight', 'blood_group']
      const missingFields = requiredFields.filter(field => !profileData[field] || profileData[field] === '' || profileData[field] === '0.00')
      
      console.log('🔍 Required fields check:')
      console.log('- Required fields:', requiredFields)
      console.log('- Missing fields:', missingFields)
      
      if (missingFields.length > 0) {
        console.log(`⚠️ Profile incomplete: ${missingFields.length} fields missing`)
        localStorage.setItem('show_profile_form_on_dashboard', 'true')
        localStorage.removeItem('profile_form_skipped')
      } else {
        console.log('✅ Profile complete')
        localStorage.removeItem('show_profile_form_on_dashboard')
        localStorage.removeItem('profile_form_skipped')
      }
    } catch (error) {
      console.error('❌ Error verifying profile:', error)
      // If API call fails, fallback to checking stored user data
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}')
      if (userData) {
        const requiredFields = ['first_name', 'last_name', 'birthdate', 'gender', 'height', 'weight', 'blood_group']
        const missingFields = requiredFields.filter(field => !userData[field] || userData[field] === '' || userData[field] === '0.00')
        
        if (missingFields.length > 3) {
          localStorage.setItem('show_profile_form_on_dashboard', 'true')
          localStorage.removeItem('profile_form_skipped')
        }
      }
    }
  }


  const [type, setType] = useState('individual')
  const [role, setRole] = useState('USER')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // OTP related states
  const [showOtpPopup, setShowOtpPopup] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  const onSubmit = async (data) => {
    setIsLoading(true)
    
    try {
      const url = type === 'individual' ? '/api/register/' : '/api/ins/register/'
      
      console.log('Form data:', data)

      let formData = new FormData()
      let payload = {}

      if (type === 'individual') {
        // Prepare individual user data
        payload = {
          email: data.email,
          password: data.password,
          confirm_password: data.confirm_password,
          role: role,
          first_name: data.first_name,
          last_name: data.last_name,
          birthdate: data.birthdate,
          gender: data.gender,
          phone_number: data.phone_number,
          specialization: data.specialization,
          license_number: data.license_number,
          hospital_name: data.hospital_name,
          experience: data.experience,
          education: data.education,
          description: data.description
        }

        // Add health info for USER role
        if (role === 'USER') {
          payload.height = data.height
          payload.weight = data.weight
          payload.blood_group = data.blood_group
        }

        // Remove fields that are not required for the current role
        if (role === 'USER') {
          delete payload.phone_number
          delete payload.specialization
          delete payload.license_number
          delete payload.hospital_name
          delete payload.experience
          delete payload.education
          delete payload.description
        } else if (role === 'NURSE') {
          delete payload.specialization
        }

        // Handle file upload
        if (data.profile_image && data.profile_image[0]) {
          formData.append('profile_image', data.profile_image[0])
        }

        // Add all other fields to formData
        Object.keys(payload).forEach(key => {
          if (payload[key] !== null && payload[key] !== undefined) {
            formData.append(key, payload[key])
          }
        })
      } else {
        // Institution registration
        Object.entries(data).forEach(([key, value]) => {
          if (key === 'logo' && value && value[0]) {
            formData.append('logo', value[0])
          } else if (value !== undefined && value !== null) {
            formData.append(key, value)
          }
        })
      }

      const response = await api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      console.log('Registration successful:', response.data)
      
      // Always show OTP popup after successful registration
      setRegisteredEmail(data.email)
      setShowOtpPopup(true)
      
    } catch (error) {
      console.error('Full error:', error)
      
      let errorMessage = 'Registration failed'
      
      if (error.response) {
        // Server responded with error status
        console.error('Server error response:', error.response.data)
        
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail
        } else if (typeof error.response.data === 'object') {
          // Handle field errors
          const fieldErrors = Object.entries(error.response.data)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n')
          errorMessage = fieldErrors
        } else {
          errorMessage = error.response.data
        }
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received:', error.request)
        errorMessage = 'Cannot connect to server. Please make sure the backend is running.'
      } else {
        // Other errors
        console.error('Error message:', error.message)
        errorMessage = error.message
      }
      
      alert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    
    if (!otp || otp.length !== 6) {
      alert('Please enter a valid 6-digit OTP')
      return
    }

    setOtpLoading(true)

    try {
      const url = type === 'individual' ? '/api/otpVerification/' : '/api/ins/otpVerification/'
      
      const payload = {
        email: registeredEmail,
        email_otp: otp
      }

      const response = await api.post(url, payload)

      console.log('OTP verification successful:', response.data)
      alert('Account verified successfully!')
      
      // Store tokens and user data if provided after OTP verification
      if (response.data.access && response.data.refresh) {
        storeTokens(response.data.access, response.data.refresh, response.data.user)
        
        // Check if profile is incomplete
        if (response.data.user) {
          const requiredFields = ['first_name', 'last_name', 'birthdate', 'gender', 'height', 'weight', 'blood_group'];
          const missingFields = requiredFields.filter(field => !response.data.user[field] || response.data.user[field] === '');
          
          // If more than half the fields are missing, set flag to show profile form
          if (missingFields.length > 3) {
            localStorage.setItem('show_profile_form_on_dashboard', 'true');
            localStorage.removeItem('profile_form_skipped'); // Clear skip flag if exists
          }
        }
      }
      
      // Close popup and optionally redirect to login
      setShowOtpPopup(false)
      setOtp('')
      
      navigate('/dashboard')
      
    } catch (error) {
      console.error('OTP verification failed:', error)
      
      let errorMessage = 'OTP verification failed'
      
      if (error.response && error.response.data) {
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail
        } else if (typeof error.response.data === 'object') {
          const fieldErrors = Object.entries(error.response.data)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n')
          errorMessage = fieldErrors
        } else {
          errorMessage = error.response.data
        }
      }
      
      alert(errorMessage)
    } finally {
      setOtpLoading(false)
    }
  }

  // Google Sign-In handler (same as login page)
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user
      
      // Get the ID token
      const idToken = await user.getIdToken()
      
      // Send to your backend (same as login page)
      const apiUrl = type === 'individual' 
        ? `${API_BASE_URL}/api/firebase-login/`
        : `${API_BASE_URL}/api/ins/firebase-login/`
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_token: idToken
        })
      })
      
      if (!response.ok) {
        throw new Error(`Google login failed with status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Google login successful:', data)
      
      // Store tokens and user data
      storeTokens(data.access, data.refresh, data.user)
      
      // Check if profile is incomplete
      if (data.user) {
        const requiredFields = ['first_name', 'last_name', 'birthdate', 'gender', 'height', 'weight', 'blood_group'];
        const missingFields = requiredFields.filter(field => !data.user[field] || data.user[field] === '');
        
        // If more than half the fields are missing, set flag to show profile form
        if (missingFields.length > 3) {
          localStorage.setItem('show_profile_form_on_dashboard', 'true');
          localStorage.removeItem('profile_form_skipped'); // Clear skip flag if exists
        }
      }
      
      navigate('/dashboard')
      
    } catch (error) {
      console.error('Google login error:', error)
      console.error('Error details:', error.message)
      console.error('Error code:', error.code)
      alert(`Google login failed: ${error.message}. Please check the console for more details.`)
    } finally {
      setGoogleLoading(false)
    }
  }

  const InputField = ({ icon: Icon, label, error, children, required = false }) => (
    <div className="group relative">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
        <Icon className="w-4 h-4 text-violet-600" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {children}
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-1 animate-pulse flex items-center gap-1">
          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
          This field is required
        </p>
      )}
    </div>
  )

  const PasswordField = ({ icon: Icon, label, error, register, name, required = false, showPassword, setShowPassword }) => (
    <InputField icon={Icon} label={label} error={error} required={required}>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          {...register(name, { required })}
          className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400 pr-12"
          placeholder="••••••••"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-violet-600"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </InputField>
  )

  return (
    <>
      <style>{sliderStyles}</style>
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-violet-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-400/20 to-violet-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-600/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        {/* OTP Popup */}
        {showOtpPopup && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative">
              {/* Close button */}
              <button
                onClick={() => setShowOtpPopup(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Email</h2>
                <p className="text-gray-600 text-sm">
                  We've sent a 6-digit verification code to
                </p>
                <p className="text-violet-600 font-semibold">{registeredEmail}</p>
              </div>

              {/* OTP Form */}
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Enter OTP Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setOtp(value)
                    }}
                    className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400 text-center text-2xl font-mono tracking-widest"
                    placeholder="000000"
                    maxLength="6"
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || otp.length !== 6}
                  className={`w-full py-4 px-8 rounded-2xl font-bold text-lg shadow-2xl transition-all duration-300 transform ${
                    otpLoading || otp.length !== 6
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-violet-600 hover:bg-violet-700 text-white hover:shadow-3xl hover:scale-105 active:scale-95'
                  }`}
                >
                  {otpLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      Verifying...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Shield className="w-5 h-5" />
                      Verify Account
                    </div>
                  )}
                </button>
              </form>

              {/* Resend OTP */}
              <div className="text-center mt-6">
                <p className="text-gray-500 text-sm">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    className="text-violet-600 hover:text-violet-800 font-semibold transition-colors"
                    onClick={() => {
                      // You can add resend OTP functionality here if your API supports it
                      alert('Resend functionality can be implemented here')
                    }}
                  >
                    Resend OTP
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 max-w-4xl mx-auto py-8 px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src={jjlogo} alt="JJ Logo" className="w-16 h-16" />
              <h1 className="text-4xl md:text-5xl font-bold text-blue-500 whitespace-nowrap truncate">
                DIGITAL CARE
              </h1>
            </div>
            <h2 className="text-3xl font-black text-violet-600 mb-2">
              Create Account
            </h2>
            <p className="text-gray-600 text-lg">Join our healthcare community</p>
          </div>

          {/* Main Form Container */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 hover:shadow-3xl transition-all duration-500">
            {/* Type Selector */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-100/80 backdrop-blur-sm p-1 rounded-2xl shadow-inner flex flex-row items-center gap-2 whitespace-nowrap">
                <button
                  type="button"
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    type === 'individual'
                      ? 'bg-violet-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setType('individual')}
                >
                  <User className="w-4 h-4" />
                  Individual
                </button>
                <button
                  type="button"
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    type === 'institution'
                      ? 'bg-violet-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setType('institution')}
                >
                  <Building2 className="w-4 h-4" />
                  Institution
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Individual Form */}
              {type === 'individual' && (
                <>
                  {/* Roles - centered buttons (no label) */}
                  <div className="mb-4">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setRole('USER')}
                        className={`px-4 py-2 rounded-2xl border transition-all duration-300 ${role === 'USER' ? 'bg-violet-600 text-white shadow-lg' : 'bg-white/80 border-gray-200 text-gray-700 hover:border-violet-300'}`}
                      >
                        <span className="mr-1">👤</span>
                        User
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('DOCTOR')}
                        className={`px-4 py-2 rounded-2xl border transition-all duration-300 ${role === 'DOCTOR' ? 'bg-violet-600 text-white shadow-lg' : 'bg-white/80 border-gray-200 text-gray-700 hover:border-violet-300'}`}
                      >
                        <span className="mr-1">👨‍⚕️</span>
                        Doctor
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('NURSE')}
                        className={`px-4 py-2 rounded-2xl border transition-all duration-300 ${role === 'NURSE' ? 'bg-violet-600 text-white shadow-lg' : 'bg-white/80 border-gray-200 text-gray-700 hover:border-violet-300'}`}
                      >
                        <span className="mr-1">👩‍⚕️</span>
                        Nurse
                      </button>
                    </div>
                    <input type="hidden" value={role} {...register('role')} readOnly />
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField icon={User} label="First Name" error={errors.first_name} required>
                      <input
                        {...register('first_name', { required: true })}
                        className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                        placeholder="Enter your first name"
                      />
                    </InputField>
                    <InputField icon={User} label="Last Name" error={errors.last_name} required>
                      <input
                        {...register('last_name', { required: true })}
                        className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                        placeholder="Enter your last name"
                      />
                    </InputField>
                  </div>

                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputField icon={Calendar} label="Birthdate">
                      <input
                        type="date"
                        {...register('birthdate')}
                        min="1900-01-01"
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 bg-white/80 backdrop-blur-sm"
                      />
                    </InputField>
                    <InputField icon={User} label="Gender">
                      <select
                        {...register('gender')}
                        className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 bg-white/80 backdrop-blur-sm"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </InputField>
                    <InputField icon={Upload} label="Profile Image">
                      <input
                        type="file"
                        {...register('profile_image')}
                        className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 bg-white/80 backdrop-blur-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                      />
                    </InputField>
                  </div>

                  {/* Email & Password */}
                  <div className="space-y-6">
                    <InputField icon={Mail} label="Email Address" error={errors.email} required>
                      <input
                        type="email"
                        {...register('email', { required: true })}
                        className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                        placeholder="your.email@example.com"
                      />
                    </InputField>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <PasswordField
                        icon={Lock}
                        label="Password"
                        error={errors.password}
                        register={register}
                        name="password"
                        required={true}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                      />
                      <PasswordField
                        icon={Lock}
                        label="Confirm Password"
                        error={errors.confirm_password}
                        register={register}
                        name="confirm_password"
                        required={true}
                        showPassword={showConfirmPassword}
                        setShowPassword={setShowConfirmPassword}
                      />
                    </div>
                  </div>

                  {/* Role-specific fields */}
                  {role === 'USER' && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-red-500" />
                        Health Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputField icon={User} label="Height (cm)" required>
                          <input
                            type="number"
                            step="0.01"
                            {...register('height', { required: role === 'USER' })}
                            className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                            placeholder="170"
                          />
                        </InputField>
                        <InputField icon={User} label="Weight (kg)" required>
                          <input
                            type="number"
                            step="0.01"
                            {...register('weight', { required: role === 'USER' })}
                            className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                            placeholder="65"
                          />
                        </InputField>
                        <InputField icon={Heart} label="Blood Group" required>
                          <input
                            {...register('blood_group', { required: role === 'USER' })}
                            className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                            placeholder="A+"
                          />
                        </InputField>
                      </div>
                    </div>
                  )}

                  {(role === 'DOCTOR' || role === 'NURSE') && (
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-6 border border-green-100">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-green-600" />
                        Professional Information
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InputField icon={FileText} label="License Number" error={errors.license_number} required>
                            <input
                              {...register('license_number', { required: role === 'DOCTOR' || role === 'NURSE' })}
                              className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                              placeholder="LIC123456"
                            />
                          </InputField>
                          <InputField icon={Building2} label="Hospital Name" error={errors.hospital_name} required>
                            <input
                              {...register('hospital_name', { required: role === 'DOCTOR' || role === 'NURSE' })}
                              className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                              placeholder="City Hospital"
                            />
                          </InputField>
                          <InputField icon={Calendar} label="Experience (years)" error={errors.experience} required>
                            <input
                              type="number"
                              {...register('experience', { required: role === 'DOCTOR' || role === 'NURSE' })}
                              className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                              placeholder="5"
                            />
                          </InputField>
                          <InputField icon={Phone} label="Phone Number" error={errors.phone_number} required>
                            <input
                              {...register('phone_number', { required: role === 'DOCTOR' || role === 'NURSE' })}
                              className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                              placeholder="+977-98xxxxxxxx"
                            />
                          </InputField>
                        </div>

                        {role === 'DOCTOR' && (
                          <div className="space-y-4">
                            <InputField icon={Stethoscope} label="Specialization" error={errors.specialization} required>
                              <input
                                {...register('specialization', { required: role === 'DOCTOR' })}
                                className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                                placeholder="Cardiology"
                              />
                            </InputField>
                            <InputField icon={GraduationCap} label="Education">
                              <textarea
                                {...register('education')}
                                className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400 resize-none"
                                rows="3"
                                placeholder="MBBS, MD - Cardiology"
                              />
                            </InputField>
                          </div>
                        )}

                        <InputField icon={FileText} label="Description" error={errors.description} required>
                          <textarea
                            {...register('description', { required: role === 'DOCTOR' || role === 'NURSE' })}
                            className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400 resize-none"
                            rows="4"
                            placeholder="Tell us about yourself and your professional background..."
                          />
                        </InputField>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Institution Form */}
              {type === 'institution' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                      Institution Details
                    </h3>
                    
                    <div className="space-y-4">
                      <InputField icon={Mail} label="Email Address" error={errors.email} required>
                        <input
                          type="email"
                          {...register('email', { required: true })}
                          className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                          placeholder="contact@institution.com"
                        />
                      </InputField>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PasswordField
                          icon={Lock}
                          label="Password"
                          error={errors.password}
                          register={register}
                          name="password"
                          required={true}
                          showPassword={showPassword}
                          setShowPassword={setShowPassword}
                        />
                        <PasswordField
                          icon={Lock}
                          label="Confirm Password"
                          error={errors.confirm_password}
                          register={register}
                          name="confirm_password"
                          required={true}
                          showPassword={showConfirmPassword}
                          setShowPassword={setShowConfirmPassword}
                        />
                      </div>

                      <InputField icon={Building2} label="Institution Name" error={errors.name} required>
                        <input
                          {...register('name', { required: true })}
                          className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                          placeholder="City General Hospital"
                        />
                      </InputField>

                      <InputField icon={Briefcase} label="Institution Type" required>
                        <select
                          {...register('institution_type')}
                          className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 bg-white/80 backdrop-blur-sm"
                        >
                          <option value="hospital">🏥 Hospital</option>
                          <option value="clinic">🏥 Clinic</option>
                          <option value="school">🏫 School</option>
                          <option value="ngo">🤝 NGO</option>
                          <option value="university">🎓 University</option>
                          <option value="government">🏛️ Government Office</option>
                          <option value="company">🏢 Company</option>
                          <option value="other">📋 Other</option>
                        </select>
                      </InputField>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField icon={MapPin} label="Address" error={errors.address} required>
                          <input
                            {...register('address', { required: true })}
                            className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                            placeholder="123 Main Street, City"
                          />
                        </InputField>
                        <InputField icon={Phone} label="Phone Number">
                          <input
                            {...register('phone')}
                            className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                            placeholder="+977-1-4xxxxxx"
                          />
                        </InputField>
                      </div>

                      <InputField icon={Globe} label="Website">
                        <input
                          {...register('website')}
                          className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                          placeholder="https://www.institution.com"
                        />
                      </InputField>

                      <InputField icon={FileText} label="Description">
                        <textarea
                          {...register('description')}
                          className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400 resize-none"
                          rows="4"
                          placeholder="Describe your institution and services..."
                        />
                      </InputField>

                      <InputField icon={Upload} label="Logo">
                        <input
                          type="file"
                          {...register('logo')}
                          className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 bg-white/80 backdrop-blur-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                      </InputField>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 px-8 rounded-2xl font-bold text-lg shadow-2xl transition-all duration-300 transform ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-violet-600 hover:bg-violet-700 text-white hover:shadow-3xl hover:scale-105 active:scale-95'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating your account...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Heart className="w-5 h-5" />
                    Register
                  </div>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-4 text-gray-500 text-sm font-medium bg-white rounded-full">or continue with</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Social login buttons */}
            <div className="flex justify-center gap-4">
              <button 
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className={`flex items-center justify-center w-12 h-12 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 ${
                  googleLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">G</span>
                </div>
              </button>
              
              <button className="flex items-center justify-center w-12 h-12 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300">
                <div className="w-6 h-6 bg-blue-700 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">f</span>
                </div>
              </button>

              <button className="flex items-center justify-center w-12 h-12 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300">
                <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">in</span>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-gray-500 text-sm">
              <p>Already have an account? <a href="/login" className="text-violet-600 hover:text-violet-800 font-semibold transition-colors">Sign in</a></p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Register