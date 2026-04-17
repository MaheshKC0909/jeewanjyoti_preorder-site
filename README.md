# JeewanJyoti Care - Frontend Application

JeewanJyoti Care is a comprehensive digital healthcare platform built with React and Vite. It provides users with a dashboard to monitor their health metrics, book appointments with healthcare providers, chat with doctors, manage their medical profiles, and connect with family members for caregiver support.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [User Workflow & Features](#user-workflow--features)
4. [API Architecture & Endpoints](#api-architecture--endpoints)
5. [Getting Started](#getting-started)
6. [Available Scripts](#available-scripts)

---

## Project Overview

The application is structured to serve both **Individual Users** (patients) and **Institutional Users** (clinics, hospitals). It integrates real-time health data monitoring, telemedicine capabilities (chat and appointments), and secure sharing of medical data. 

---

## Tech Stack

- **Framework**: React.js 19.x with Vite
- **Styling**: Tailwind CSS + Lucide React Icons
- **Routing**: React Router DOM
- **Data Visualization**: Chart.js + Recharts
- **Maps**: Leaflet + React-Leaflet
- **Authentication**: Firebase Auth + JWT Base Custom Auth
- **Payment Gateway**: Khalti Checkout Web

---

## User Workflow & Features

1. **Authentication & Onboarding**
   - Users can register as an "Individual" or "Institutional" entity.
   - Login uses email/password or Google Sign-In via Firebase.
   - Initial onboarding requires users to complete their medical profile.

2. **Health Dashboard (Real-Time Monitoring)**
   - Displays real-time metrics including Heart Rate, Blood Pressure, SpO2, Sleep Analysis, Stress, HRV, and daily Step counts.
   - Data can be visualized across different time frames (Today, 7 days, 30 days) and custom date ranges.

3. **Appointments System**
   - Users can browse available doctors and their specialties.
   - Schedule Video, Phone, or In-Person consultations.
   - View history and manage upcoming bookings.

4. **Chat & Communication**
   - Integrated real-time messaging with doctors/healthcare providers.
   - Capabilities include typing, voice notes, file sharing (reports/images), and initiating video calls.

5. **User Mapping (Family & Caregiver)**
   - Users can link accounts with family members to share health data securely.
   - Configurable caregiver access constraints and emergency contact definitions.

6. **Profile & Settings**
   - Manage medical history, chronic conditions, and upload medical documents.
   - Control notification preferences, privacy, data sharing, and display themes.

7. **Payments**
   - Integrated with Khalti for secure online consultation and subscription payments.

---

## API Architecture & Endpoints

The frontend communicates with a comprehensive RESTful backend (`https://jeewanjyoti-backend.smart.org.np`). The core API client (`src/lib/api.js`) handles JWT injection, automatic token refresh, and pagination.

### Authentication & Profile APIs
- `POST /api/register/` - Register a new user
- `POST /api/login/` - Individual user login
- `POST /api/ins/login/` - Institutional user login
- `POST /api/logout/` - Invalidate session and clear tokens
- `GET /api/profile/` - Fetch the authenticated user's profile
- `PUT /api/profile/` - Full profile update
- `PATCH /api/profile-update/` - Partial profile updates (e.g., height, weight)
- `GET /api/useremailprofile/` - Fetch a specific generic user's profile (used for user mapping)

### Health Data APIs
*Note: Most health data endpoints support filtering via `user_id`, `from`, `to` (date ranges), and preset text ranges (e.g., `24h`, `7d`, `30d`). They are standard paginated APIs.*
- `GET /api/HeartRate_Data/` - Fetches heart rate logs and trends
- `GET /api/Spo2-data/` - Fetches blood oxygen saturation records
- `GET /api/BloodPressure_Data/` - Fetches systolic/diastolic blood pressure data
- `GET /api/sleep-data/` - Retrieves sleep quality, duration, and score
- `GET /api/Stress_Data/` - Fetches stress analysis metrics
- `GET /api/HRV_Iso_Data/` - Heart rate variability (HRV) logs
- `GET /api/Steps/` - Total daily steps logs
- `GET /api/Day_total_activity/` - Aggregated daily activity stats (calories, active minutes)

### Telemedicine & Appointments
- `GET /api/doctorlist/` - Retrieve available doctors for booking
- `GET /api/appointments/` - Fetch the authenticated user's scheduled appointments
- `POST /api/appointments/` - Create/book a new appointment

### Payment
- `POST /initialize_payment/` - Generate a Khalti payment session for an invoice

---

## Getting Started

### Prerequisites
Make sure you have Node.js (v18 or higher) and npm installed on your machine.

### Installation

1. **Clone the repository / open the directory**
   ```console
   cd jeewanjyoti-care
   ```

2. **Install dependencies**
   ```console
   npm install
   ```

3. **Configure Environment Variables**
   Ensure an `.env` file exists at the root of the project containing necessary Firebase and API credentials.
   ```env
   VITE_API_BASE_URL=https://jeewanjyoti-backend.smart.org.np
   # Other necessary keys...
   ```

## Available Scripts

In the project directory, you can run:

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Builds the app for production to the `dist` folder.
- `npm run lint`: Runs ESLint over the `src` directory to catch code quality issues.
- `npm run preview`: Previews the built production deployment locally.
