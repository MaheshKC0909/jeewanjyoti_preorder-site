# JeewanJyoti Care - Visual Documentation & Charts

## Table of Contents
1. [System Architecture Diagram](#system-architecture-diagram)
2. [User Flow Charts](#user-flow-charts)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Component Architecture](#component-architecture)
5. [Database Schema](#database-schema)
6. [API Endpoints Structure](#api-endpoints-structure)
7. [Security Architecture](#security-architecture)
8. [Deployment Architecture](#deployment-architecture)

---

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Browser] --> B[React Application]
        B --> C[Tailwind CSS UI]
        B --> D[Lucide Icons]
    end
    
    subgraph "Authentication Layer"
        E[Firebase Auth]
        F[Google OAuth]
        G[Email/Password Auth]
    end
    
    subgraph "Application Layer"
        H[React Router]
        I[State Management]
        J[API Client]
        K[Token Manager]
    end
    
    subgraph "Backend Services"
        L[Django REST API]
        M[User Management]
        N[Health Data Processing]
        O[Appointment System]
        P[Chat Service]
        Q[Payment Gateway]
    end
    
    subgraph "External Services"
        R[Khalti Payment]
        S[Health Device APIs]
        T[Email Service]
        U[File Storage]
    end
    
    subgraph "Data Layer"
        V[PostgreSQL Database]
        W[Redis Cache]
        X[File Storage]
    end
    
    B --> E
    B --> F
    B --> G
    B --> H
    B --> I
    B --> J
    J --> K
    J --> L
    L --> M
    L --> N
    L --> O
    L --> P
    L --> Q
    Q --> R
    N --> S
    L --> T
    L --> U
    L --> V
    L --> W
    L --> X
```

---

## User Flow Charts

### Registration Flow

```mermaid
flowchart TD
    A[Start] --> B{User Type?}
    B -->|Individual| C[Individual Registration Form]
    B -->|Institutional| D[Institutional Registration Form]
    C --> E[Personal Information]
    C --> F[Health Profile]
    D --> G[Institution Details]
    D --> H[Admin Contact]
    E --> I[Email Verification]
    F --> I
    G --> J[Document Upload]
    H --> J
    I --> K[Account Created]
    J --> L[Admin Approval]
    L --> M[Account Activated]
    K --> N[Login Dashboard]
    M --> N
```

### Login Flow

```mermaid
flowchart TD
    A[Start Login] --> B{Login Method}
    B -->|Email/Password| C[Enter Credentials]
    B -->|Google OAuth| D[Google Authentication]
    C --> E[Validate Credentials]
    D --> F[Get Google Token]
    E --> G{Valid?}
    F --> H[Exchange Token]
    G -->|Yes| I[Generate Session]
    G -->|No| J[Show Error]
    H --> K[Backend Validation]
    I --> L[Store Tokens]
    K --> M{Valid?}
    L --> N[Redirect to Dashboard]
    M -->|Yes| L
    M -->|No| J
    J --> C
```

### Appointment Booking Flow

```mermaid
flowchart TD
    A[Select Appointments] --> B[Search Doctors]
    B --> C[Filter by Specialty]
    C --> D[View Doctor Profiles]
    D --> E[Select Doctor]
    E --> F[View Availability]
    F --> G[Select Time Slot]
    G --> H[Fill Consultation Details]
    H --> I[Upload Reports]
    I --> J[Payment Processing]
    J --> K{Payment Success?}
    K -->|Yes| L[Confirm Appointment]
    K -->|No| M[Payment Error]
    L --> N[Send Confirmation]
    M --> O[Retry Payment]
    N --> P[Update Calendar]
    O --> J
```

---

## Data Flow Diagrams

### Health Data Collection Flow

```mermaid
flowchart LR
    A[Health Devices] --> B[Device APIs]
    B --> C[Data Validation]
    C --> D[Data Processing]
    D --> E[Store in Database]
    E --> F[Real-time Updates]
    F --> G[Dashboard Display]
    E --> H[Analytics Engine]
    H --> I[Health Insights]
    I --> G
    E --> J[Alert System]
    J --> K[Notifications]
```

### Chat Message Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API Gateway
    participant C as Chat Service
    participant D as Database
    participant N as Notification Service
    
    U->>F: Send Message
    F->>A: POST /api/chat/send
    A->>C: Forward Message
    C->>D: Store Message
    C->>N: Trigger Notification
    N->>A: Send Push Notification
    A->>F: Message Confirmation
    F->>U: Update Chat UI
    N->>U: Push Notification
```

---

## Component Architecture

### React Component Hierarchy

```mermaid
graph TD
    A[App.jsx] --> B[Router Setup]
    B --> C[JeewanJyotiLanding]
    B --> D[Login]
    B --> E[Register]
    B --> F[Dashboard]
    
    F --> G[Dashboard Layout]
    G --> H[Sidebar Navigation]
    G --> I[Header]
    G --> J[Main Content]
    
    J --> K[Home Tab]
    J --> L[Appointments Tab]
    J --> M[Chat Tab]
    J --> N[Profile Tab]
    J --> O[Settings Tab]
    J --> P[User Mapping Tab]
    
    K --> Q[Health Metrics]
    K --> R[Charts Components]
    K --> S[Data Cards]
    
    L --> T[Doctor List]
    L --> U[Booking Form]
    L --> V[Calendar View]
    
    M --> W[Chat Interface]
    M --> X[Message List]
    M --> Y[File Upload]
```

### Component Dependencies

```mermaid
graph LR
    subgraph "UI Components"
        A[Button]
        B[Card]
        C[Modal]
        D[Form]
        E[Chart]
    end
    
    subgraph "Business Components"
        F[HealthData]
        G[Appointment]
        H[Chat]
        I[Profile]
        J[Payment]
    end
    
    subgraph "Utility Components"
        K[ErrorBoundary]
        L[Loading]
        M[Notification]
        N[AuthGuard]
    end
    
    A --> F
    B --> G
    C --> H
    D --> I
    E --> F
    K --> F
    L --> G
    M --> H
    N --> I
```

---

## Database Schema

### User Management Schema

```mermaid
erDiagram
    User {
        int id PK
        string email UK
        string username UK
        string password_hash
        string first_name
        string last_name
        string phone
        string role
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    
    UserProfile {
        int id PK
        int user_id FK
        date date_of_birth
        string gender
        string address
        string emergency_contact
        text medical_history
        text allergies
        datetime created_at
        datetime updated_at
    }
    
    UserMapping {
        int id PK
        int primary_user_id FK
        int mapped_user_id FK
        string relationship
        string permissions
        datetime created_at
    }
    
    User ||--o{ UserProfile : has
    User ||--o{ UserMapping : maps
    User ||--o{ UserMapping : mapped_by
```

### Health Data Schema

```mermaid
erDiagram
    HealthData {
        int id PK
        int user_id FK
        string metric_type
        decimal value
        string unit
        datetime recorded_at
        json metadata
        datetime created_at
    }
    
    SleepData {
        int id PK
        int user_id FK
        date sleep_date
        decimal duration_hours
        decimal deep_sleep_percentage
        decimal light_sleep_percentage
        decimal rem_sleep_percentage
        int sleep_score
        datetime created_at
    }
    
    HeartRateData {
        int id PK
        int user_id FK
        datetime recorded_at
        int bpm
        decimal hrv
        string activity_type
        datetime created_at
    }
    
    User ||--o{ HealthData : generates
    User ||--o{ SleepData : tracks
    User ||--o{ HeartRateData : monitors
```

### Appointment System Schema

```mermaid
erDiagram
    Doctor {
        int id PK
        int user_id FK
        string specialization
        string license_number
        decimal rating
        string bio
        boolean is_available
        datetime created_at
    }
    
    Appointment {
        int id PK
        int patient_id FK
        int doctor_id FK
        datetime appointment_date
        string time_slot
        string status
        text consultation_notes
        decimal fee
        string payment_status
        datetime created_at
        datetime updated_at
    }
    
    DoctorAvailability {
        int id PK
        int doctor_id FK
        date available_date
        time start_time
        time end_time
        int interval_minutes
        boolean is_available
        datetime created_at
    }
    
    User ||--o{ Doctor : is
    User ||--o{ Appointment : books
    Doctor ||--o{ Appointment : conducts
    Doctor ||--o{ DoctorAvailability : sets
```

---

## API Endpoints Structure

### Authentication Endpoints

```mermaid
flowchart TD
    A[Authentication API] --> B[POST /api/register/]
    A --> C[POST /api/login/]
    A --> D[POST /api/ins/login/]
    A --> E[POST /api/firebase-login/]
    A --> F[POST /api/ins/firebase-login/]
    A --> G[POST /api/logout/]
    A --> H[POST /api/refresh-token/]
    A --> I[POST /api/forgot-password/]
    A --> J[POST /api/reset-password/]
    
    B --> K[User Registration]
    C --> L[Individual Login]
    D --> M[Institutional Login]
    E --> N[Google OAuth Individual]
    F --> O[Google OAuth Institutional]
    G --> P[Logout User]
    H --> Q[Token Refresh]
    I --> R[Password Reset Request]
    J --> S[Password Reset Confirm]
```

### Health Data Endpoints

```mermaid
flowchart TD
    A[Health Data API] --> B[GET /api/health-data/]
    A --> C[POST /api/health-data/]
    A --> D[GET /api/health-data/{id}/]
    A --> E[PUT /api/health-data/{id}/]
    A --> F[DELETE /api/health-data/{id}/]
    
    A --> G[GET /api/sleep-data/]
    A --> H[POST /api/sleep-data/]
    A --> I[GET /api/heart-rate/]
    A --> J[POST /api/heart-rate/]
    A --> K[GET /api/spo2-data/]
    A --> L[POST /api/spo2-data/]
    
    B --> M[Get All Health Data]
    C --> N[Create Health Data]
    D --> O[Get Specific Health Data]
    E --> P[Update Health Data]
    F --> Q[Delete Health Data]
```

### Appointment Endpoints

```mermaid
flowchart TD
    A[Appointment API] --> B[GET /api/doctors/]
    A --> C[GET /api/doctors/{id}/]
    A --> D[GET /api/appointments/]
    A --> E[POST /api/appointments/]
    A --> F[GET /api/appointments/{id}/]
    A --> G[PUT /api/appointments/{id}/]
    A --> H[DELETE /api/appointments/{id}/]
    
    A --> I[GET /api/doctor-availability/]
    A --> J[POST /api/doctor-availability/]
    A --> K[GET /api/available-slots/]
    
    B --> L[List All Doctors]
    C --> M[Get Doctor Details]
    D --> N[Get User Appointments]
    E --> O[Book Appointment]
    F --> P[Get Appointment Details]
    G --> Q[Update Appointment]
    H --> R[Cancel Appointment]
```

---

## Security Architecture

### Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Auth Service
    participant T as Token Manager
    participant API as Backend API
    participant DB as Database
    
    U->>F: Login Request
    F->>A: Authenticate User
    A->>DB: Validate Credentials
    DB-->>A: User Data
    A-->>F: Auth Success + Tokens
    F->>T: Store Tokens
    F->>API: API Request + Token
    API->>T: Validate Token
    T-->>API: Token Valid
    API->>DB: Process Request
    DB-->>API: Response Data
    API-->>F: API Response
    F-->>U: Display Result
```

### Data Encryption Flow

```mermaid
flowchart LR
    A[User Data] --> B[Client Encryption]
    B --> C[SSL/TLS Transmission]
    C --> D[Server Decryption]
    D --> E[Database Encryption]
    E --> F[Encrypted Storage]
    
    G[Health Data] --> H[AES-256 Encryption]
    H --> I[Secure Transmission]
    I --> J[Server Processing]
    J --> K[Encrypted Database Storage]
    
    L[Payment Data] --> M[PCI Compliance]
    M --> N[Tokenization]
    N --> O[Secure Gateway]
    O --> P[Bank Processing]
```

---

## Deployment Architecture

### Production Deployment

```mermaid
graph TB
    subgraph "CDN Layer"
        A[CloudFlare CDN]
    end
    
    subgraph "Load Balancer"
        B[Nginx Load Balancer]
    end
    
    subgraph "Web Servers"
        C[Web Server 1]
        D[Web Server 2]
        E[Web Server 3]
    end
    
    subgraph "Application Servers"
        F[Django App 1]
        G[Django App 2]
        H[Django App 3]
    end
    
    subgraph "Database Cluster"
        I[PostgreSQL Master]
        J[PostgreSQL Replica 1]
        K[PostgreSQL Replica 2]
    end
    
    subgraph "Cache Layer"
        L[Redis Cluster]
    end
    
    subgraph "File Storage"
        M[AWS S3]
    end
    
    subgraph "Monitoring"
        N[Prometheus]
        O[Grafana]
        P[ELK Stack]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    C --> F
    D --> G
    E --> H
    F --> I
    G --> I
    H --> I
    I --> J
    I --> K
    F --> L
    G --> L
    H --> L
    F --> M
    G --> M
    H --> M
    F --> N
    G --> N
    H --> N
    N --> O
    N --> P
```

### Development Environment

```mermaid
graph LR
    subgraph "Local Development"
        A[React Dev Server]
        B[Django Dev Server]
        C[Local PostgreSQL]
        D[Local Redis]
    end
    
    subgraph "Version Control"
        E[Git Repository]
        F[GitHub Actions]
    end
    
    subgraph "Testing"
        G[Jest Tests]
        H[Cypress E2E]
        I[Postman API Tests]
    end
    
    subgraph "Staging"
        J[Staging Server]
        K[Staging Database]
        L[Test Environment]
    end
    
    A --> E
    B --> E
    E --> F
    F --> J
    G --> F
    H --> F
    I --> F
    J --> K
    J --> L
```

---

## Performance Metrics Dashboard

### System Performance Indicators

```mermaid
graph TD
    A[Performance Dashboard] --> B[Response Time]
    A --> C[Throughput]
    A --> D[Error Rate]
    A --> E[Resource Usage]
    
    B --> F[API Response Time]
    B --> G[Page Load Time]
    B --> H[Database Query Time]
    
    C --> I[Requests per Second]
    C --> J[Concurrent Users]
    C --> K[Data Volume]
    
    D --> L[HTTP Errors]
    D --> M[Database Errors]
    D --> N[Authentication Failures]
    
    E --> O[CPU Usage]
    E --> P[Memory Usage]
    E --> Q[Disk I/O]
    E --> R[Network Bandwidth]
```

---

## Integration Points

### Third-Party Integrations

```mermaid
graph LR
    subgraph "Payment Integrations"
        A[Khalti Payment Gateway]
        B[Bank APIs]
        C[Mobile Banking]
    end
    
    subgraph "Health Integrations"
        D[Fitness Trackers]
        E[Smart Watches]
        F[Medical Devices]
        G[Health APIs]
    end
    
    subgraph "Communication"
        H[Email Service]
        I[SMS Gateway]
        J[Push Notifications]
        K[Video Calling]
    end
    
    subgraph "Storage & CDN"
        L[AWS S3]
        M[CloudFlare]
        N[Image Optimization]
    end
    
    A --> JeewanJyoti
    B --> JeewanJyoti
    C --> JeewanJyoti
    D --> JeewanJyoti
    E --> JeewanJyoti
    F --> JeewanJyoti
    G --> JeewanJyoti
    H --> JeewanJyoti
    I --> JeewanJyoti
    J --> JeewanJyoti
    K --> JeewanJyoti
    L --> JeewanJyoti
    M --> JeewanJyoti
    N --> JeewanJyoti
```

---

## Monitoring & Alerting

### System Monitoring Architecture

```mermaid
sequenceDiagram
    participant S as System
    participant M as Monitoring
    participant A as Alert Manager
    participant N as Notifications
    participant T as Team
    
    S->>M: Metrics Data
    M->>M: Process Metrics
    M->>A: Alert Conditions
    A->>A: Evaluate Rules
    A->>N: Trigger Alert
    N->>T: Send Notification
    T->>S: Investigate Issue
    T->>M: Check Dashboard
    S->>M: Resolution Data
```

---

## Data Analytics Pipeline

### Health Data Analytics

```mermaid
flowchart TD
    A[Raw Health Data] --> B[Data Validation]
    B --> C[Data Cleaning]
    C --> D[Data Transformation]
    D --> E[Feature Engineering]
    E --> F[Statistical Analysis]
    F --> G[Machine Learning Models]
    G --> H[Health Insights]
    H --> I[Recommendations]
    I --> J[User Dashboard]
    
    K[Historical Data] --> L[Trend Analysis]
    L --> M[Predictive Models]
    M --> N[Risk Assessment]
    N --> O[Early Warnings]
    O --> J
```

---

## Mobile App Architecture (Future)

### React Native Structure

```mermaid
graph TD
    A[React Native App] --> B[Navigation]
    A --> C[State Management]
    A --> D[API Integration]
    A --> E[Local Storage]
    
    B --> F[Stack Navigator]
    B --> G[Tab Navigator]
    B --> H[Modal Navigator]
    
    C --> I[Redux Store]
    C --> J[Middleware]
    C --> K[Reducers]
    
    D --> L[Axios Client]
    D --> M[Authentication]
    D --> N[Real-time Updates]
    
    E --> O[AsyncStorage]
    E --> P[SQLite]
    E --> Q[Secure Storage]
```

---

*This visual documentation complements the USER_MANUAL.md with detailed charts, diagrams, and architectural visualizations to help understand the system's technical implementation and user flows.*
