// API Configuration - centralized endpoint management
// Update these URLs to match your backend endpoints

export const API_CONFIG = {
  // Base URL for the backend API
  BASE_URL: import.meta.env.VITE_API_BASE_URL || "/api",

  // Patient-related endpoints
  PATIENTS: {
    LIST: "/patients",
    DETAIL: "/patients/:id",
    CREATE: "/patients",
    UPDATE: "/patients/:id",
    DELETE: "/patients/:id",
    // QR_DATA temporarily disabled
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

  // NEW: Media endpoints
  MEDIA: {
    PRESIGN: "/media/presign-upload",
    FINALIZE: "/media/finalize",
    LIST_FOR_PATIENT: "/media/patients/:mrn/images",
    VIEW_URL: "/media/view-url",
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
  params?: Record<string, string | number | boolean>,
): string => {
  const base = `${API_CONFIG.BASE_URL}${endpoint}`;

  // Identify path params in endpoint
  const pathParamKeys = new Set<string>();
  const regex = /:([A-Za-z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(endpoint)) !== null) {
    pathParamKeys.add(match[1]);
  }

  // Replace URL parameters (e.g., :id with actual values)
  let url = base;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (pathParamKeys.has(key)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }

  // Append remaining params as query string
  const queryEntries: [string, string][] = [];
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (!pathParamKeys.has(key)) {
        queryEntries.push([key, String(value)]);
      }
    });
  }
  if (queryEntries.length > 0) {
    const qs = queryEntries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    url += (url.includes("?") ? "&" : "?") + qs;
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
  USE_REAL_API: import.meta.env.VITE_USE_REAL_API === "true",
  ENABLE_PATIENTS_API: import.meta.env.VITE_ENABLE_PATIENTS_API !== "false",
  ENABLE_TASKS_API: import.meta.env.VITE_ENABLE_TASKS_API !== "false",
  ENABLE_DASHBOARD_API: import.meta.env.VITE_ENABLE_DASHBOARD_API !== "false",
  ENABLE_MEDIA: import.meta.env.VITE_ENABLE_MEDIA !== "false",
};
