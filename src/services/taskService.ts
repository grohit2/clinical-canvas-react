// Task Service - handles task data management
import { apiService, fetchWithFallback } from "./api";
import { API_CONFIG, FEATURE_FLAGS } from "@/config/api";
import { Task } from "@/types/models";

// Mock task data
const mockTasks: Task[] = [
  {
    taskId: "task1",
    patientId: "27e8d1ad",
    title: "Review CBC results",
    type: "lab",
    due: "2025-07-19T15:00:00Z",
    assigneeId: "doctor1",
    status: "open",
    priority: "high",
    recurring: false,
  },
  {
    taskId: "task2",
    patientId: "3b9f2c1e",
    title: "Administer medication",
    type: "medication",
    due: "2025-07-19T16:30:00Z",
    assigneeId: "nurse1",
    status: "in-progress",
    priority: "urgent",
    recurring: true,
  },
  {
    taskId: "task3",
    patientId: "8c4d5e2f",
    title: "Pre-op assessment",
    type: "assessment",
    due: "2025-07-20T09:00:00Z",
    assigneeId: "doctor2",
    status: "open",
    priority: "medium",
    recurring: false,
  },
];

// Mock urgent alerts data
const mockUrgentAlerts = [
  {
    taskId: "urgent1",
    patientId: "3b9f2c1e",
    title: "Critical medication due",
    type: "medication",
    due: "2025-07-19T17:00:00Z",
    assigneeId: "nurse1",
    status: "open",
    priority: "urgent",
    recurring: false,
    patientName: "John Smith",
    room: "ICU-05",
    timeRemaining: "8 min",
  },
  {
    taskId: "urgent2",
    patientId: "27e8d1ad",
    title: "Post-op vitals check",
    type: "assessment",
    due: "2025-07-19T17:05:00Z",
    assigneeId: "nurse2",
    status: "open",
    priority: "urgent",
    recurring: false,
    patientName: "Jane Doe",
    room: "Room 302",
    timeRemaining: "3 min",
  },
];

// Mock completed tasks for today
const mockCompletedTasks = [
  {
    taskId: "completed1",
    patientId: "8c4d5e2f",
    title: "Morning medication round",
    type: "medication",
    completedAt: "2025-07-19T08:30:00Z",
    completedBy: "Dr. Sarah Wilson",
    patientName: "Maria Garcia",
    priority: "medium",
  },
  {
    taskId: "completed2",
    patientId: "9d6e7f3g",
    title: "Pre-operative consultation",
    type: "assessment",
    completedAt: "2025-07-19T10:15:00Z",
    completedBy: "Dr. Sarah Wilson",
    patientName: "Robert Wilson",
    priority: "high",
  },
];

// Mock tasks due today
const mockTasksDue = [
  {
    taskId: "due1",
    patientId: "27e8d1ad",
    title: "Wound dressing change",
    type: "procedure",
    due: "2025-07-19T20:00:00Z",
    assigneeId: "nurse1",
    status: "open",
    priority: "medium",
    recurring: false,
    patientName: "Jane Doe",
    room: "Room 302",
  },
  {
    taskId: "due2",
    patientId: "8c4d5e2f",
    title: "Evening medication",
    type: "medication",
    due: "2025-07-19T21:30:00Z",
    assigneeId: "nurse2",
    status: "open",
    priority: "high",
    recurring: true,
    patientName: "Maria Garcia",
    room: "Room 205",
  },
];

export const taskService = {
  async getTasks(): Promise<Task[]> {
    return fetchWithFallback(
      () => apiService.get<Task[]>(API_CONFIG.TASKS.LIST),
      mockTasks,
      FEATURE_FLAGS.ENABLE_TASKS_API,
    );
  },

  async getTasksByPatient(patientId: string): Promise<Task[]> {
    const mockPatientTasks = mockTasks.filter(
      (task) => task.patientId === patientId,
    );

    return fetchWithFallback(
      () => apiService.get<Task[]>(API_CONFIG.TASKS.BY_PATIENT, { patientId }),
      mockPatientTasks,
      FEATURE_FLAGS.ENABLE_TASKS_API,
    );
  },

  async getTasksDueToday(): Promise<any[]> {
    return fetchWithFallback(
      () => apiService.get<any[]>(API_CONFIG.TASKS.DUE_TODAY),
      mockTasksDue,
      FEATURE_FLAGS.ENABLE_TASKS_API,
    );
  },

  async getCompletedTasksToday(): Promise<any[]> {
    return fetchWithFallback(
      () => apiService.get<any[]>(API_CONFIG.TASKS.COMPLETED_TODAY),
      mockCompletedTasks,
      FEATURE_FLAGS.ENABLE_TASKS_API,
    );
  },

  async getUrgentAlerts(): Promise<any[]> {
    return fetchWithFallback(
      () => apiService.get<any[]>(API_CONFIG.TASKS.URGENT_ALERTS),
      mockUrgentAlerts,
      FEATURE_FLAGS.ENABLE_TASKS_API,
    );
  },

  async createTask(taskData: Omit<Task, "taskId">): Promise<Task> {
    const newTask: Task = {
      ...taskData,
      taskId: `task_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    };

    return fetchWithFallback(
      () => apiService.post<Task>(API_CONFIG.TASKS.CREATE, taskData),
      newTask,
      FEATURE_FLAGS.ENABLE_TASKS_API,
    );
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const mockUpdatedTask = {
      ...mockTasks.find((t) => t.taskId === taskId)!,
      ...updates,
    };

    return fetchWithFallback(
      () =>
        apiService.put<Task>(API_CONFIG.TASKS.UPDATE, updates, { id: taskId }),
      mockUpdatedTask,
      FEATURE_FLAGS.ENABLE_TASKS_API,
    );
  },

  async deleteTask(taskId: string): Promise<void> {
    return fetchWithFallback(
      () => apiService.delete<void>(API_CONFIG.TASKS.DELETE, { id: taskId }),
      undefined,
      FEATURE_FLAGS.ENABLE_TASKS_API,
    );
  },

  async updateTaskStatus(
    taskId: string,
    status: Task["status"],
  ): Promise<Task> {
    return this.updateTask(taskId, { status });
  },
};
