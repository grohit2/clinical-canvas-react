// API Testing Utility - helps verify API endpoints are working correctly
import { apiService } from "@/services/api";
import { API_CONFIG } from "@/config/api";

export interface ApiTestResult {
  endpoint: string;
  success: boolean;
  responseTime: number;
  error?: string;
  data?: any;
}

class ApiTester {
  async testEndpoint(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    data?: any,
  ): Promise<ApiTestResult> {
    const startTime = Date.now();

    try {
      let response;
      switch (method) {
        case "GET":
          response = await apiService.get(endpoint);
          break;
        case "POST":
          response = await apiService.post(endpoint, data);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      return {
        endpoint,
        success: true,
        responseTime: Date.now() - startTime,
        data: response.data,
      };
    } catch (error) {
      return {
        endpoint,
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async testAllEndpoints(): Promise<ApiTestResult[]> {
    const endpoints = [
      // Authentication endpoints
      { endpoint: API_CONFIG.AUTH.CURRENT_USER, method: "GET" as const },

      // Patient endpoints
      { endpoint: API_CONFIG.PATIENTS.LIST, method: "GET" as const },
      { endpoint: API_CONFIG.PATIENTS.ASSIGNMENTS, method: "GET" as const },

      // Task endpoints
      { endpoint: API_CONFIG.TASKS.LIST, method: "GET" as const },
      { endpoint: API_CONFIG.TASKS.DUE_TODAY, method: "GET" as const },
      { endpoint: API_CONFIG.TASKS.COMPLETED_TODAY, method: "GET" as const },
      { endpoint: API_CONFIG.TASKS.URGENT_ALERTS, method: "GET" as const },

      // Dashboard endpoints
      { endpoint: API_CONFIG.DASHBOARD.KPI_DATA, method: "GET" as const },
      {
        endpoint: API_CONFIG.DASHBOARD.UPCOMING_PROCEDURES,
        method: "GET" as const,
      },
      { endpoint: API_CONFIG.DASHBOARD.STAGE_HEATMAP, method: "GET" as const },

      // Doctor endpoints
      { endpoint: API_CONFIG.DOCTORS.LIST, method: "GET" as const },
    ];

    const results: ApiTestResult[] = [];

    for (const { endpoint, method } of endpoints) {
      console.log(`Testing ${method} ${endpoint}...`);
      const result = await this.testEndpoint(endpoint, method);
      results.push(result);

      // Add a small delay between requests to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  generateReport(results: ApiTestResult[]): string {
    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;
    const avgResponseTime =
      results.reduce((sum, r) => sum + r.responseTime, 0) / totalCount;

    let report = `\n=== API Test Report ===\n`;
    report += `Total Endpoints: ${totalCount}\n`;
    report += `Successful: ${successCount}\n`;
    report += `Failed: ${totalCount - successCount}\n`;
    report += `Average Response Time: ${avgResponseTime.toFixed(2)}ms\n\n`;

    results.forEach((result) => {
      const status = result.success ? "✅" : "❌";
      report += `${status} ${result.endpoint} (${result.responseTime}ms)\n`;
      if (!result.success && result.error) {
        report += `   Error: ${result.error}\n`;
      }
    });

    return report;
  }

  async runTests(): Promise<void> {
    console.log("Starting API endpoint tests...");
    const results = await this.testAllEndpoints();
    const report = this.generateReport(results);
    console.log(report);

    // Also log to a JSON format for programmatic use
    console.log("Detailed results:", JSON.stringify(results, null, 2));
  }
}

export const apiTester = new ApiTester();

// Convenience function to run tests from browser console
// Usage: window.testAPI()
if (typeof window !== "undefined") {
  (window as any).testAPI = () => apiTester.runTests();
}
