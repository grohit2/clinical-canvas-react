// Dashboard Service - handles dashboard data management
import { apiService, fetchWithFallback } from './api';
import { API_CONFIG, FEATURE_FLAGS } from '@/config/api';

// Mock KPI data
const mockKPIData = {
  totalPatients: 47,
  tasksDue: 12,
  urgentAlerts: 3,
  completedToday: 28
};

// Mock upcoming procedures
const mockUpcomingProcedures = [
  { id: '1', patient: 'John Smith', procedure: 'Appendectomy', time: '14:30', surgeon: 'Dr. Wilson' },
  { id: '2', patient: 'Maria Garcia', procedure: 'Knee Replacement', time: '16:00', surgeon: 'Dr. Chen' },
  { id: '3', patient: 'David Johnson', procedure: 'Cardiac Stent', time: '09:15', surgeon: 'Dr. Patel' }
];

// Mock stage heat map
const mockStageHeatMap = [
  { stage: 'Pre-Op', count: 8, variant: 'caution' as const },
  { stage: 'Surgery', count: 3, variant: 'urgent' as const },
  { stage: 'Post-Op', count: 12, variant: 'stable' as const },
  { stage: 'Recovery', count: 15, variant: 'default' as const },
  { stage: 'Discharge', count: 9, variant: 'stable' as const }
];

export interface KPIData {
  totalPatients: number;
  tasksDue: number;
  urgentAlerts: number;
  completedToday: number;
}

export interface UpcomingProcedure {
  id: string;
  patient: string;
  procedure: string;
  time: string;
  surgeon: string;
}

export interface StageHeatMapItem {
  stage: string;
  count: number;
  variant: 'caution' | 'urgent' | 'stable' | 'default';
}

export const dashboardService = {
  async getKPIData(): Promise<KPIData> {
    return fetchWithFallback(
      () => apiService.get<KPIData>(API_CONFIG.DASHBOARD.KPI_DATA),
      mockKPIData,
      FEATURE_FLAGS.ENABLE_DASHBOARD_API
    );
  },

  async getUpcomingProcedures(): Promise<UpcomingProcedure[]> {
    return fetchWithFallback(
      () => apiService.get<UpcomingProcedure[]>(API_CONFIG.DASHBOARD.UPCOMING_PROCEDURES),
      mockUpcomingProcedures,
      FEATURE_FLAGS.ENABLE_DASHBOARD_API
    );
  },

  async getStageHeatMap(): Promise<StageHeatMapItem[]> {
    return fetchWithFallback(
      () => apiService.get<StageHeatMapItem[]>(API_CONFIG.DASHBOARD.STAGE_HEATMAP),
      mockStageHeatMap,
      FEATURE_FLAGS.ENABLE_DASHBOARD_API
    );
  },
};