// client/src/api/types.ts

/**
 * Shared DTO Types for RediForge API
 * All types use camelCase for frontend consistency
 */

// ============================================
// AUTHENTICATION & USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface MfaVerifyPayload {
  email: string;
  token: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ============================================
// PROGRAM & HIERARCHY TYPES
// ============================================

export interface Program {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface CreateProgramPayload {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status?: string;
}

export interface UpdateProgramPayload {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

// ============================================
// MOCK CYCLE TYPES
// ============================================

export interface MockCycle {
  id: string;
  programId: string;
  name: string;
  description?: string;
  cycleNumber: number;
  startDate: string;
  endDate: string;
  status: 'planned' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateMockCyclePayload {
  programId: string;
  name: string;
  description?: string;
  cycleNumber: number;
  startDate: string;
  endDate: string;
  status?: string;
}

export interface UpdateMockCyclePayload {
  name?: string;
  description?: string;
  cycleNumber?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}

// ============================================
// PROJECT TYPES
// ============================================

export interface Project {
  id: string;
  mockCycleId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: 'planned' | 'active' | 'completed' | 'on_hold';
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  mockCycleId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

// ============================================
// GLOBAL OBJECT TYPES
// ============================================

export interface GlobalObject {
  id: string;
  objectId: string;
  name: string;
  description?: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGlobalObjectPayload {
  objectId: string;
  name: string;
  description?: string;
  category: string;
}

export interface UpdateGlobalObjectPayload {
  name?: string;
  description?: string;
  category?: string;
}

// ============================================
// PROJECT OBJECT TYPES
// ============================================

export interface ProjectObject {
  id: string;
  projectId: string;
  globalObjectId?: string;
  objectId: string;
  description?: string;
  processArea: string;
  complexity: 'low' | 'medium' | 'high';
  buildType: 'purchase' | 'build' | 'enhance';
  deploymentDisposition: 'deploy' | 'configure' | 'maintain';
  startDate: string;
  endDate: string;
  status: 'not_started' | 'in_progress' | 'blocked' | 'complete';
  draUserId?: string;
  developerUserId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectObjectPayload {
  projectId: string;
  globalObjectId?: string;
  objectId: string;
  description?: string;
  processArea: string;
  complexity: string;
  buildType: string;
  deploymentDisposition?: string;
  startDate: string;
  endDate: string;
  status?: string;
  draUserId?: string;
  developerUserId?: string;
  notes?: string;
}

export interface UpdateProjectObjectPayload {
  description?: string;
  processArea?: string;
  complexity?: string;
  buildType?: string;
  deploymentDisposition?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  draUserId?: string;
  developerUserId?: string;
  notes?: string;
}

export interface ProjectObjectFilters {
  status?: string;
  draUserId?: string;
  developerUserId?: string;
  processArea?: string;
  complexity?: string;
}

// ============================================
// OBJECT DEPENDENCY TYPES
// ============================================

export interface ObjectDependency {
  id: string;
  sourceObjectId: string;
  targetObjectId: string;
  dependencyType: 'blocks' | 'blocked_by' | 'related_to';
  description?: string;
  createdAt: string;
}

export interface CreateDependencyPayload {
  sourceObjectId: string;
  targetObjectId: string;
  dependencyType: string;
  description?: string;
}

// ============================================
// TASK GROUP TYPES
// ============================================

export interface TaskGroup {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: 'not_started' | 'in_progress' | 'blocked' | 'complete';
  taskCount?: number;
  completedCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskGroupPayload {
  projectId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status?: string;
}

export interface UpdateTaskGroupPayload {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

// ============================================
// TASK TYPES
// ============================================

export interface Task {
  id: string;
  projectId: string;
  taskGroupId?: string;
  projectObjectId?: string;
  taskName: string;
  taskType: 'extract' | 'transform' | 'preload_validation' | 'load' | 'postload_validation' | 'custom';
  description?: string;
  status: 'not_started' | 'in_progress' | 'blocked' | 'complete';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string;
  estimatedHours?: number;
  actualHours?: number;
  draUserId?: string;
  developerUserId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  projectId: string;
  taskGroupId?: string;
  projectObjectId?: string;
  taskName: string;
  taskType: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate: string;
  estimatedHours?: number;
  draUserId?: string;
  developerUserId?: string;
  notes?: string;
}

export interface UpdateTaskPayload {
  taskName?: string;
  taskType?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  draUserId?: string;
  developerUserId?: string;
  notes?: string;
}

export interface TaskFilters {
  status?: string;
  taskType?: string;
  priority?: string;
  draUserId?: string;
  developerUserId?: string;
  projectObjectId?: string;
  taskGroupId?: string;
}

// ============================================
// PRIORITY & ANALYTICS TYPES
// ============================================

export interface PriorityTask extends Task {
  daysOverdue?: number;
  daysUntilDue?: number;
}

export interface PrioritizedTasks {
  late: PriorityTask[];
  inProgress: PriorityTask[];
  dueThisWeek: PriorityTask[];
  onTrack: PriorityTask[];
}

export interface ProjectStatus {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  notStartedTasks: number;
  completionPercentage: number;
  overdueTasks: number;
}

// ============================================
// SCHEDULE TYPES
// ============================================

export interface ScheduleItem {
  id: string;
  projectId: string;
  taskId: string;
  taskName?: string;
  taskStatus?: string;
  taskType?: string;
  projectObjectId?: string;
  objectId?: string;
  scheduledDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleItemPayload {
  projectId: string;
  taskId: string;
  scheduledDate: string;
}

export interface UpdateScheduleItemPayload {
  scheduledDate?: string;
}

// ============================================
// AUDIT LOG TYPES
// ============================================

export interface AuditLog {
  id: string;
  userId: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, any>;
  beforeData?: Record<string, any>;
  afterData?: Record<string, any>;
  timestamp: string;
  createdAt: string;
}

export interface AuditLogFilters {
  userId?: string;
  entityType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================
// PAGINATION & LIST TYPES
// ============================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  limit?: number;
  offset?: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: Record<string, any>;
  code?: string;
}
