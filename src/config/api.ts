// API Configuration - centralized endpoint management
// Update these URLs to match your backend endpoints

export const API_CONFIG = {
  // Base URL for the backend API
  BASE_URL: process.env.VITE_API_BASE_URL || "http://localhost:3001/api",

  // Patient-related endpoints
  PATIENTS: {
    LIST: "/patients",
    DETAIL: "/patients/:id",
    CREATE: "/patients",
    UPDATE: "/patients/:id",
    DELETE: "/patients/:id",
    QR_DATA: "/patients/:id/qr",
    TIMELINE: "/patients/:id/timeline",
    ASSIGNMENTS: "/patients/assignments",
  },

  // Task-related endpoints
  TASKS: {
    LIST: "/tasks",
    CREATE: "/tasks",
    UPDATE: "/tasks/:id",
    DELETE: "/tasks/:id",
    BY_PATIENT: "/tasks/patient/:patientId",
    DUE_TODAY: "/tasks/due-today",
    COMPLETED_TODAY: "/tasks/completed-today",
    URGENT_ALERTS: "/tasks/urgent-alerts",
  },

  // Dashboard endpoints
  DASHBOARD: {
    KPI_DATA: "/dashboard/kpi",
    UPCOMING_PROCEDURES: "/dashboard/procedures/upcoming",
    STAGE_HEATMAP: "/dashboard/stage-heatmap",
  },

  // Doctor/Staff endpoints
  DOCTORS: {
    LIST: "/doctors",
    PROFILE: "/doctors/:id",
    UPDATE_PROFILE: "/doctors/:id",
  },

  // Settings and configuration
  SETTINGS: {
    NOTIFICATIONS: "/settings/notifications",
    SECURITY: "/settings/security",
  },
};

// Helper function to build complete URLs
export const buildUrl = (
  endpoint: string,
  params?: Record<string, string>,
): string => {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;

  // Replace URL parameters (e.g., :id with actual values)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
  }

  return url;
};

// API timeout configuration
export const API_TIMEOUT = {
  DEFAULT: 10000, // 10 seconds
  UPLOAD: 30000, // 30 seconds for file uploads
  LONG_RUNNING: 60000, // 1 minute for long-running operations
};

  // Feature flags for enabling/disabling API calls vs mock data
export const FEATURE_FLAGS = {
  USE_REAL_API: process.env.VITE_USE_REAL_API === "true",
  ENABLE_PATIENTS_API: process.env.VITE_ENABLE_PATIENTS_API !== "false",
  ENABLE_TASKS_API: process.env.VITE_ENABLE_TASKS_API !== "false",
  ENABLE_DASHBOARD_API: process.env.VITE_ENABLE_DASHBOARD_API !== "false",
};
