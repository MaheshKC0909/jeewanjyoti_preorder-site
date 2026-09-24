# Token Management System

This document explains how the JWT token management system works in your Digital Care application.

## Overview

The application now automatically stores and manages JWT tokens (access and refresh tokens) from your backend API responses. This enables:

- **Persistent Authentication**: Users stay logged in across browser sessions
- **Automatic Token Refresh**: Access tokens are automatically refreshed when they expire
- **Secure API Requests**: All API calls include the proper authorization headers
- **Centralized Token Management**: All token operations are handled through utility functions

## How It Works

### 1. Token Storage

When users log in or register successfully, the backend returns a response like this:

```json
{
    "message": "User logged in successfully",
    "user": {
        "email": "kcmahesh027@gmail.com",
        "birthdate": "2025-05-04",
        "first_name": "Renasa",
        "last_name": "Maharjan",
        "gender": "Female",
        "height": 162.0,
        "weight": 50.0,
        "blood_group": "A+",
        "is_superuser": false
    },
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

The system automatically stores:
- `access` token → `localStorage.access_token`
- `refresh` token → `localStorage.refresh_token`
- `user` data → `localStorage.user_data`

### 2. Automatic Token Management

#### Token Refresh
- When an API request returns a 401 (Unauthorized) error, the system automatically attempts to refresh the access token using the refresh token
- If refresh succeeds, the original request is retried with the new token
- If refresh fails, the user is redirected to the login page

#### Token Expiration
- The system checks token expiration before making requests
- Expired tokens are automatically refreshed

### 3. API Integration

All API requests now use the `authenticatedFetch` function which:
- Automatically includes the `Authorization: Bearer <token>` header
- Handles token refresh on 401 errors
- Redirects to login if authentication fails

## Files Modified

### 1. `src/lib/tokenManager.js` (NEW)
Core token management utilities:
- `storeTokens()` - Store tokens and user data
- `getAccessToken()` - Get current access token
- `getRefreshToken()` - Get current refresh token
- `getUserData()` - Get stored user data
- `isAuthenticated()` - Check if user has valid tokens
- `clearTokens()` - Clear all stored tokens
- `refreshAccessToken()` - Refresh expired access token
- `authenticatedFetch()` - Make authenticated API requests

### 2. `src/lib/api.js` (UPDATED)
Enhanced API utilities:
- `apiRequest()` - Make authenticated API requests
- `loginUser()` - Login with credentials
- `getUserProfile()` - Get user profile
- `updateUserProfile()` - Update user profile
- `getAppointments()` - Get user appointments
- `createAppointment()` - Create new appointment
- `logoutUser()` - Logout and clear tokens

### 3. `src/pages/Login.jsx` (UPDATED)
- Now stores tokens from successful login responses
- Works for both regular login and Google OAuth

### 4. `src/pages/Register.jsx` (UPDATED)
- Stores tokens from successful registration responses
- Handles token storage after OTP verification

### 5. `src/pages/Dashboard.jsx` (UPDATED)
- Checks for stored tokens on load
- Falls back to Firebase auth if no tokens
- Enhanced logout functionality that clears all tokens

### 6. `src/contexts/AuthContext.jsx` (NEW)
React context for global authentication state management

### 7. `src/components/TokenExample.jsx` (NEW)
Example component demonstrating token management usage

## Usage Examples

### Making Authenticated API Requests

```javascript
import { apiRequest } from '../lib/api';

// Simple GET request
const response = await apiRequest('/api/profile/');
const data = await response.json();

// POST request with data
const response = await apiRequest('/api/appointments/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    doctor_id: 1,
    date: '2024-01-15',
    time: '10:00'
  })
});
```

### Checking Authentication Status

```javascript
import { isAuthenticated, getUserData } from '../lib/tokenManager';

if (isAuthenticated()) {
  const user = getUserData();
  console.log('User is logged in:', user.first_name);
} else {
  console.log('User needs to login');
}
```

### Manual Token Management

```javascript
import { 
  storeTokens, 
  getAccessToken, 
  clearTokens 
} from '../lib/tokenManager';

// Store tokens after login
storeTokens(accessToken, refreshToken, userData);

// Get current access token
const token = getAccessToken();

// Clear all tokens (logout)
clearTokens();
```

## Security Features

1. **Automatic Token Refresh**: Prevents users from being logged out due to expired access tokens
2. **Secure Storage**: Tokens are stored in localStorage (consider using httpOnly cookies for production)
3. **Error Handling**: Graceful handling of authentication failures
4. **Token Validation**: Checks token expiration before making requests

## Backend Requirements

Your backend should support:

1. **Token Refresh Endpoint**: `POST /api/token/refresh/`
   ```json
   {
     "refresh": "your_refresh_token"
   }
   ```

2. **Login/Register Response Format**:
   ```json
   {
     "access": "access_token",
     "refresh": "refresh_token",
     "user": { /* user data */ }
   }
   ```

3. **401 Response**: Return 401 status code when access token is invalid/expired

## Testing

Use the `TokenExample` component to test the token management system:

1. Login to your application
2. Navigate to a page that includes the `TokenExample` component
3. Test the "Test API Call" button to verify authenticated requests work
4. Use "Clear Tokens" to simulate logout

## Troubleshooting

### Common Issues

1. **Tokens not being stored**: Check that your backend returns the correct response format
2. **API calls failing**: Verify the backend supports the token refresh endpoint
3. **Infinite redirect loops**: Ensure the login page doesn't require authentication

### Debug Information

The system logs important events to the console:
- Token storage/retrieval
- Token refresh attempts
- Authentication failures

Check the browser console for debugging information.

## Future Enhancements

Consider implementing:

1. **HttpOnly Cookies**: For better security in production
2. **Token Rotation**: Implement refresh token rotation
3. **Offline Support**: Cache API responses when offline
4. **Multi-tab Sync**: Sync authentication state across browser tabs
