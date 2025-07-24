// Authentication Service - handles login, logout, and user management
import { apiService, fetchWithFallback } from "./api";
import { API_CONFIG, FEATURE_FLAGS } from "@/config/api";
import {
  Doctor,
  LoginCredentials,
  AuthUser,
  doctorsDatabase,
} from "@/data/authData";

// Mock authentication functions (existing logic)
const mockLoginUser = async (
  credentials: LoginCredentials,
): Promise<AuthUser | null> => {
  const doctor = doctorsDatabase.find(
    (doc) =>
      doc.email === credentials.email && doc.password === credentials.password,
  );

  if (doctor) {
    return {
      doctor,
      token: `token_${doctor.id}_${Date.now()}`,
    };
  }

  return null;
};

const mockGetCurrentUser = (): AuthUser | null => {
  const userData = localStorage.getItem("currentUser");
  return userData ? JSON.parse(userData) : null;
};

// API-based authentication functions
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthUser | null> {
    return fetchWithFallback(
      () => apiService.post<AuthUser>(API_CONFIG.AUTH.LOGIN, credentials),
      await mockLoginUser(credentials),
      FEATURE_FLAGS.ENABLE_AUTH_API,
    );
  },

  async logout(): Promise<void> {
    return fetchWithFallback(
      () => apiService.post<void>(API_CONFIG.AUTH.LOGOUT),
      undefined,
      FEATURE_FLAGS.ENABLE_AUTH_API,
    );
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    return fetchWithFallback(
      () => apiService.get<AuthUser>(API_CONFIG.AUTH.CURRENT_USER),
      mockGetCurrentUser(),
      FEATURE_FLAGS.ENABLE_AUTH_API,
    );
  },

  async getDoctors(): Promise<Doctor[]> {
    return fetchWithFallback(
      () => apiService.get<Doctor[]>(API_CONFIG.DOCTORS.LIST),
      doctorsDatabase,
      FEATURE_FLAGS.ENABLE_AUTH_API,
    );
  },

  async getDoctorProfile(doctorId: string): Promise<Doctor | null> {
    const mockDoctor =
      doctorsDatabase.find((doc) => doc.id === doctorId) || null;

    return fetchWithFallback(
      () =>
        apiService.get<Doctor>(API_CONFIG.DOCTORS.PROFILE, { id: doctorId }),
      mockDoctor,
      FEATURE_FLAGS.ENABLE_AUTH_API,
    );
  },

  async updateDoctorProfile(
    doctorId: string,
    updates: Partial<Doctor>,
  ): Promise<Doctor> {
    const mockUpdatedDoctor = {
      ...doctorsDatabase.find((doc) => doc.id === doctorId)!,
      ...updates,
    };

    return fetchWithFallback(
      () =>
        apiService.put<Doctor>(API_CONFIG.DOCTORS.UPDATE_PROFILE, updates, {
          id: doctorId,
        }),
      mockUpdatedDoctor,
      FEATURE_FLAGS.ENABLE_AUTH_API,
    );
  },
};

// Legacy exports for backward compatibility
export const loginUser = authService.login;
export const getCurrentUser = authService.getCurrentUser;
export const logoutUser = () => {
  localStorage.removeItem("currentUser");
  return authService.logout();
};
