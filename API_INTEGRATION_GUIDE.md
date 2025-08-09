# API Integration Guide

This guide explains how the application has been updated to fetch data from API endpoints with automatic fallback to mock data when endpoints are unavailable.

## Overview

The application now includes a comprehensive service layer that handles API calls with intelligent fallback to mock data. This allows for seamless development and deployment whether you have a backend API ready or not.

For the full HMS Patients API specification, see [HMS_PATIENTS_API.md](./HMS_PATIENTS_API.md).

## Key Features

- **Automatic Fallback**: If API calls fail, the app automatically falls back to mock data
- **Configurable URLs**: All API endpoints are centrally managed and easily configurable
- **Feature Flags**: Individual API endpoints can be enabled/disabled via environment variables
- **TypeScript Support**: Full type safety for all API responses
- **Error Handling**: Comprehensive error handling with logging
- **Loading States**: Built-in loading state management

## Quick Start

### 1. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Configure your environment variables in `.env`:
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_REAL_API=false

# Individual API endpoint flags
VITE_ENABLE_AUTH_API=false
VITE_ENABLE_PATIENTS_API=false
VITE_ENABLE_TASKS_API=false
VITE_ENABLE_DASHBOARD_API=false
```

### 2. Enable API Integration

To start using real API endpoints:

1. Set `VITE_USE_REAL_API=true` in your `.env` file
2. Update `VITE_API_BASE_URL` to point to your backend API
3. Optionally enable individual API groups by setting their flags to `true`

### 3. Backend API Requirements

Your backend API should implement the following endpoints:

#### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout  
- `GET /auth/me` - Get current user

#### Patient Endpoints
- `GET /patients` - List all patients
- `GET /patients/:id` - Get patient details
- `POST /patients` - Create new patient
- `PUT /patients/:id` - Update patient
- `DELETE /patients/:id` - Delete patient
- `GET /patients/:id/qr` - Get patient QR code data
- `GET /patients/:id/timeline` - Get patient timeline
- `GET /patients/assignments` - Get patient assignments

#### Task Endpoints
- `GET /tasks` - List all tasks
- `POST /tasks` - Create new task
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `GET /tasks/patient/:patientId` - Get tasks for specific patient
- `GET /tasks/due-today` - Get tasks due today
- `GET /tasks/completed-today` - Get completed tasks
- `GET /tasks/urgent-alerts` - Get urgent alerts

#### Dashboard Endpoints
- `GET /dashboard/kpi` - Get KPI data
- `GET /dashboard/procedures/upcoming` - Get upcoming procedures
- `GET /dashboard/stage-heatmap` - Get stage heat map data

#### Doctor Endpoints
- `GET /doctors` - List all doctors
- `GET /doctors/:id` - Get doctor profile
- `PUT /doctors/:id` - Update doctor profile

## Service Layer Architecture

### Core Services

1. **apiService** (`src/services/api.ts`)
   - Low-level HTTP client with timeout handling
   - Configurable HTTP headers
   - Error handling and logging

2. **patientService** (`src/services/patientService.ts`)
   - Patient CRUD operations
   - QR code data and timeline management

3. **taskService** (`src/services/taskService.ts`)
   - Task management and status updates
   - Urgent alerts and due date tracking

4. **dashboardService** (`src/services/dashboardService.ts`)
   - KPI data and dashboard metrics
   - Upcoming procedures and heat maps

### Configuration Files

1. **API Config** (`src/config/api.ts`)
   - Centralized endpoint URL management
   - Feature flags for enabling/disabling APIs
   - Helper functions for URL building

2. **Environment Variables** (`.env`)
   - Runtime configuration
   - Base URL and feature flag overrides

## Usage Examples

### Using Services in Components

```typescript
import { useState, useEffect } from 'react';
import { patientService } from '@/services';

function PatientsList() {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        setIsLoading(true);
        const data = await patientService.getPatients();
        setPatients(data);
      } catch (error) {
        console.error('Failed to load patients:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPatients();
  }, []);

  return (
    <div>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        patients.map(patient => (
          <div key={patient.id}>{patient.name}</div>
        ))
      )}
    </div>
  );
}
```

### Creating New Patients

```typescript
const handleCreatePatient = async (patientData) => {
  try {
    const newPatient = await patientService.createPatient(patientData);
    setPatients(prev => [...prev, newPatient]);
  } catch (error) {
    console.error('Failed to create patient:', error);
  }
};
```

### Updating Task Status

```typescript
const handleStatusChange = async (taskId, newStatus) => {
  try {
    await taskService.updateTaskStatus(taskId, newStatus);
    // Update local state
    setTasks(prev => prev.map(task => 
      task.taskId === taskId ? { ...task, status: newStatus } : task
    ));
  } catch (error) {
    console.error('Failed to update task:', error);
  }
};
```

## Configuration Options

### Feature Flags

Control which APIs are enabled:

```env
# Enable all APIs
VITE_USE_REAL_API=true

# Or enable individually
VITE_ENABLE_AUTH_API=true
VITE_ENABLE_PATIENTS_API=false  # Will use mock data
VITE_ENABLE_TASKS_API=true
VITE_ENABLE_DASHBOARD_API=true
```

### Changing API URLs

Update the base URL or individual endpoints:

```typescript
// In src/config/api.ts
export const API_CONFIG = {
  BASE_URL: 'https://your-api.com/v1',  // Change this
  
  PATIENTS: {
    LIST: '/patients',           // Or change individual endpoints
    DETAIL: '/patients/:id',
    // ...
  }
};
```

### Timeout Configuration

Adjust API timeouts:

```typescript
// In src/config/api.ts
export const API_TIMEOUT = {
  DEFAULT: 15000,    // 15 seconds
  UPLOAD: 60000,     // 1 minute
  LONG_RUNNING: 120000, // 2 minutes
};
```

## Development vs Production

### Development Setup
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_REAL_API=false  # Use mock data during development
```

### Staging Setup
```env
VITE_API_BASE_URL=https://staging-api.yourapp.com/api
VITE_USE_REAL_API=true
```

### Production Setup
```env
VITE_API_BASE_URL=https://api.yourapp.com/api
VITE_USE_REAL_API=true
```

## Error Handling

The service layer automatically handles common error scenarios:

1. **Network Failures**: Falls back to mock data
2. **Timeout**: Configurable timeout with fallback
3. **Authentication Errors**: Automatic token handling
4. **Server Errors**: Graceful degradation with logging

## Migration Guide

### From Mock Data to API

1. Implement your backend API endpoints
2. Update `.env` to point to your API
3. Set `VITE_USE_REAL_API=true`
4. Test each endpoint individually using feature flags
5. Enable all APIs once tested

### Gradual Migration

You can migrate one service at a time:

```env
VITE_USE_REAL_API=false
VITE_ENABLE_AUTH_API=true     # Only auth uses real API
VITE_ENABLE_PATIENTS_API=false # Still uses mock data
VITE_ENABLE_TASKS_API=false
VITE_ENABLE_DASHBOARD_API=false
```

## Best Practices

1. **Always handle loading states** in your components
2. **Use try-catch blocks** when calling services
3. **Provide user feedback** for failed operations
4. **Test with both mock and real data** during development
5. **Keep mock data up-to-date** with your API schema
6. **Use TypeScript interfaces** for type safety
7. **Monitor console logs** for API failures in production

## Troubleshooting

### Common Issues

1. **API calls always use mock data**
   - Check `VITE_USE_REAL_API` is set to `true`
   - Verify environment variables are loaded correctly

2. **Specific endpoint not working**
   - Check individual feature flags (e.g., `VITE_ENABLE_PATIENTS_API`)
   - Verify the endpoint URL in `src/config/api.ts`

3. **Authentication failures**
   - Ensure your API returns proper auth tokens
   - Check token storage in localStorage

4. **CORS errors**
   - Configure your backend to allow requests from your frontend domain
   - Ensure proper CORS headers are set

### Debug Mode

Enable detailed logging by checking the browser console. The service layer logs:
- API call attempts
- Fallback to mock data
- Error details
- Request/response information

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your API endpoints are responding correctly
3. Test with `VITE_USE_REAL_API=false` to isolate API issues
4. Review the service layer code in `src/services/` for customization needs