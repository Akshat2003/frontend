# Frontend-Backend Integration Guide

## Setup and Testing

### Prerequisites
- Node.js installed
- MongoDB Atlas connection configured

### Running the Application

1. **Start Backend Server:**
   ```bash
   cd backend
   npm install  # if not already done
   node server.js
   ```
   Server runs on: http://localhost:5001

2. **Start Frontend Server:**
   ```bash
   cd . # from root directory
   npm install  # if not already done
   npm run dev
   ```
   Frontend runs on: http://localhost:5173

### Test Authentication Flow

#### 1. Login Test
- **URL:** http://localhost:5173
- **Test Credentials:**
  - Operator ID: `OP099`
  - Password: `Test@123`

#### 2. API Endpoints Integrated

| Feature | Frontend Component | Backend API | Status |
|---------|-------------------|-------------|---------|
| Login | `Login.jsx` | `POST /api/auth/login` | ✅ Integrated |
| Logout | `AuthWrapper.jsx` | `POST /api/auth/logout` | ✅ Integrated |
| Token Validation | `AuthWrapper.jsx` | `GET /api/auth/validate` | ✅ Integrated |
| Forgot Password | `ForgotPassword.jsx` | `POST /api/auth/forgot-password` | ✅ Integrated |
| Reset Password | `ForgotPassword.jsx` | `POST /api/auth/reset-password` | ✅ Integrated |

#### 3. Key Integration Features

- **Real-time API calls**: No more mock data
- **Proper error handling**: Backend validation errors displayed in UI
- **Token management**: JWT tokens stored and managed automatically
- **CORS configured**: Frontend and backend communicate seamlessly
- **Environment variables**: API URL configurable via `.env`

#### 4. Error Handling

The integration includes comprehensive error handling:
- Network errors
- Validation errors (field-specific)
- Authentication errors
- Server errors

#### 5. Storage

- Access tokens: `localStorage.getItem('accessToken')`
- User data: `localStorage.getItem('parkingOperator')`
- Auto-cleanup on logout

### Forgot Password Testing

1. Go to login page
2. Click "Forgot password?"
3. Enter credentials:
   - Operator ID: `OP099`  
   - Email: `testlogout@example.com`
4. In development mode, the API returns the OTP and reset token for testing
5. Complete the reset flow with the returned values

### Next Steps

The authentication system is fully integrated. Ready for:
- Booking management API integration
- Customer management API integration  
- Analytics API integration
- Settings and profile management