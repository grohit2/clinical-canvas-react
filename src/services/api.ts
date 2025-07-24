// API Service Layer - handles HTTP requests with fallback to mock data
import { buildUrl, API_TIMEOUT, FEATURE_FLAGS } from "@/config/api";

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

class ApiService {
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    timeout: number = API_TIMEOUT.DEFAULT,
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const defaultHeaders = {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      };

      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        data,
        success: true,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        console.warn(`API request failed: ${error.message}`);
        throw {
          message: error.message,
          status: error.name === "AbortError" ? 408 : undefined,
        } as ApiError;
      }

      throw {
        message: "Unknown error occurred",
      } as ApiError;
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const userData = localStorage.getItem("currentUser");
    if (userData) {
      try {
        const { token } = JSON.parse(userData);
        return {
          Authorization: `Bearer ${token}`,
        };
      } catch (error) {
        console.warn("Failed to parse user data from localStorage");
      }
    }
    return {};
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, params);
    return this.makeRequest<T>(url, { method: "GET" });
  }

  async post<T>(
    endpoint: string,
    data?: any,
    params?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, params);
    return this.makeRequest<T>(url, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    data?: any,
    params?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, params);
    return this.makeRequest<T>(url, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, params);
    return this.makeRequest<T>(url, { method: "DELETE" });
  }

  async patch<T>(
    endpoint: string,
    data?: any,
    params?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, params);
    return this.makeRequest<T>(url, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Singleton instance
export const apiService = new ApiService();

// Generic function to fetch data with automatic fallback to mock data
export async function fetchWithFallback<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  mockDataFallback: T,
  useApiFlag: boolean = FEATURE_FLAGS.USE_REAL_API,
): Promise<T> {
  // If API is disabled, return mock data immediately
  if (!useApiFlag) {
    console.log("Using mock data (API disabled by feature flag)");
    return mockDataFallback;
  }

  try {
    const response = await apiCall();
    console.log("Successfully fetched data from API");
    return response.data;
  } catch (error) {
    console.warn("API call failed, falling back to mock data:", error);
    return mockDataFallback;
  }
}

// Utility function for handling async operations with loading states
export function createAsyncHandler<T>(
  apiCall: () => Promise<T>,
  onSuccess?: (data: T) => void,
  onError?: (error: any) => void,
  onFinally?: () => void,
) {
  return async () => {
    try {
      const data = await apiCall();
      onSuccess?.(data);
      return data;
    } catch (error) {
      onError?.(error);
      throw error;
    } finally {
      onFinally?.();
    }
  };
}
