import { BioAlgorithm, GenerationRequest, SynthesisRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = localStorage.getItem('auth_token');
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - clear token and provide helpful message
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        const error = await response.json().catch(() => ({ 
          error: 'Unauthorized',
          message: 'Please log in again. Your session may have expired.'
        }));
        throw new ApiError(
          response.status, 
          error.message || error.error || 'Authentication required. Please log in again.'
        );
      }

      // Try to parse error response
      const error = await response.json().catch(() => ({ 
        error: response.statusText || 'Request failed',
        message: `Server returned ${response.status}: ${response.statusText}`
      }));
      
      throw new ApiError(
        response.status, 
        error.message || error.error || `Request failed with status ${response.status}`
      );
    }

    return response.json();
  } catch (error) {
    // Handle network errors (connection refused, timeout, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        0,
        `Cannot connect to server at ${API_BASE_URL}. Please ensure the backend server is running on port 3001.`
      );
    }
    
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle other errors
    throw new ApiError(0, error instanceof Error ? error.message : 'An unexpected error occurred');
  }
};

export const authApi = {
  register: async (email: string, password: string, name?: string) => {
    const data = await request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }
    return data;
  },

  login: async (email: string, password: string) => {
    try {
      const data = await request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      return data;
    } catch (error: any) {
      // Provide more helpful error messages for login
      if (error.status === 401) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }
      if (error.status === 0) {
        throw new Error('Cannot connect to server. Please ensure the backend is running.');
      }
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
  },

  getCurrentUser: async () => {
    return request<any>('/auth/me');
  },
};

export const algorithmApi = {
  getAll: async (): Promise<BioAlgorithm[]> => {
    const data = await request<any[]>('/algorithms');
    return data.map(transformAlgorithm);
  },

  getById: async (id: number): Promise<BioAlgorithm> => {
    const data = await request<any>(`/algorithms/${id}`);
    return transformAlgorithm(data);
  },

  create: async (algorithm: Omit<BioAlgorithm, 'id' | 'createdAt'>): Promise<BioAlgorithm> => {
    const data = await request<any>('/algorithms', {
      method: 'POST',
      body: JSON.stringify({
        ...algorithm,
        pseudoCode: algorithm.pseudoCode,
        parentIds: algorithm.parents?.map(p => parseInt(p)) || undefined,
      }),
    });
    return transformAlgorithm(data);
  },

  update: async (id: number, updates: Partial<BioAlgorithm>): Promise<BioAlgorithm> => {
    const data = await request<any>(`/algorithms/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updates,
        pseudoCode: updates.pseudoCode,
        parentIds: updates.parents?.map(p => parseInt(p)) || undefined,
      }),
    });
    return transformAlgorithm(data);
  },

  delete: async (id: number): Promise<void> => {
    await request(`/algorithms/${id}`, {
      method: 'DELETE',
    });
  },
};

export const jobApi = {
  create: async (jobType: 'generate' | 'synthesize' | 'analyze' | 'improve', inputData: any) => {
    try {
      return await request<{ id: number; status: string; jobType: string }>('/jobs', {
        method: 'POST',
        body: JSON.stringify({ jobType, inputData }),
      });
    } catch (error: any) {
      // Provide helpful error messages for job creation
      if (error.status === 401) {
        throw new Error('You must be logged in to create jobs. Please log in and try again.');
      }
      if (error.status === 0) {
        throw new Error('Cannot connect to server. Please ensure the backend is running on port 3001.');
      }
      throw error;
    }
  },

  getAll: async () => {
    return request<any[]>('/jobs');
  },

  getById: async (id: number) => {
    return request<any>(`/jobs/${id}`);
  },
};

// Code Generation & Execution API
export const statisticsApi = {
  getOverview: async (): Promise<any> => {
    return request('/statistics/overview');
  },
  getAlgorithms: async (): Promise<any[]> => {
    return request('/statistics/algorithms');
  },
  getJobs: async (params?: { status?: string; jobType?: string; limit?: number; offset?: number }): Promise<any> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.jobType) query.append('jobType', params.jobType);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    return request(`/statistics/jobs?${query.toString()}`);
  },
  getTrends: async (days: number = 30): Promise<any> => {
    return request(`/statistics/trends?days=${days}`);
  }
};

export const codeApi = {
  generate: async (algorithmId: number, language: string, version?: string) => {
    return request<any>(`/code/generate/${algorithmId}`, {
      method: 'POST',
      body: JSON.stringify({ language, version }),
    });
  },

  getGenerations: async (algorithmId: number) => {
    return request<any[]>(`/code/generations/${algorithmId}`);
  },

  getGeneration: async (generationId: number) => {
    return request<any>(`/code/generations/${generationId}/details`);
  },

  updateGeneration: async (generationId: number, updates: { code?: string; version?: string }) => {
    return request<any>(`/code/generations/${generationId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteGeneration: async (generationId: number) => {
    return request(`/code/generations/${generationId}`, {
      method: 'DELETE',
    });
  },

  execute: async (generationId: number, inputData?: any, options?: { timeout?: number; language?: string }) => {
    return request<any>(`/code/execute/${generationId}`, {
      method: 'POST',
      body: JSON.stringify({ inputData, ...options }),
    });
  },

  getExecutions: async (generationId: number, limit: number = 50) => {
    return request<any[]>(`/code/executions/${generationId}?limit=${limit}`);
  },

  getExecution: async (executionId: number) => {
    return request<any>(`/code/executions/${executionId}/details`);
  },

  analyze: async (generationId: number, options?: { includeExecution?: boolean; fixIssues?: boolean }) => {
    return request<any>(`/code/analyze/${generationId}`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  },

  getAnalysisHistory: async (generationId: number, limit: number = 10) => {
    return request<any[]>(`/code/analysis/${generationId}?limit=${limit}`);
  },

  getLatestAnalysis: async (generationId: number) => {
    return request<any>(`/code/analysis/${generationId}/latest`);
  },
};

// Testing API
export const testingApi = {
  generateTests: async (algorithmId: number, testType: 'unit' | 'integration' | 'performance' | 'regression' = 'unit') => {
    return request<any[]>(`/testing/generate/${algorithmId}`, {
      method: 'POST',
      body: JSON.stringify({ testType }),
    });
  },

  getTests: async (algorithmId: number) => {
    return request<any[]>(`/testing/${algorithmId}`);
  },

  runTests: async (testIds: number[], codeGenerationId?: number | null) => {
    return request<any[]>(`/testing/run`, {
      method: 'POST',
      body: JSON.stringify({ testIds, codeGenerationId: codeGenerationId || null }),
    });
  },

  getTestResults: async (testId: number, limit: number = 50) => {
    return request<any[]>(`/testing/results/${testId}?limit=${limit}`);
  },
};

// Version Control API
export const versionControlApi = {
  createBranch: async (algorithmId: number, branchName: string, options?: { parentBranchId?: number; parentVersionId?: number; description?: string }) => {
    return request<any>(`/version-control/branches/${algorithmId}`, {
      method: 'POST',
      body: JSON.stringify({ branchName, ...options }),
    });
  },

  getBranches: async (algorithmId: number) => {
    return request<any[]>(`/version-control/branches/${algorithmId}`);
  },

  getBranch: async (branchId: number) => {
    return request<any>(`/version-control/branches/${branchId}/details`);
  },

  createVersion: async (branchId: number, versionData: { name?: string; description?: string; steps?: any; pseudoCode?: string; changeNote?: string }) => {
    return request<any>(`/version-control/branches/${branchId}/versions`, {
      method: 'POST',
      body: JSON.stringify(versionData),
    });
  },

  mergeBranch: async (sourceBranchId: number, targetBranchId: number, strategy?: 'fast-forward' | 'merge' | 'squash') => {
    return request<any>(`/version-control/branches/${sourceBranchId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ targetBranchId, strategy }),
    });
  },

  compareVersions: async (versionId1: number, versionId2: number) => {
    return request<any>(`/version-control/compare/${versionId1}/${versionId2}`);
  },
};

// Collaboration API
export const collaborationApi = {
  createSession: async (algorithmId: number, expiresInHours?: number) => {
    return request<{ id: number; sessionToken: string }>(`/collaboration/sessions/${algorithmId}`, {
      method: 'POST',
      body: JSON.stringify({ expiresInHours }),
    });
  },

  joinSession: async (sessionToken: string) => {
    return request<any>(`/collaboration/sessions/join/${sessionToken}`, {
      method: 'POST',
    });
  },

  updatePresence: async (sessionId: number, cursorPosition: { line: number; column: number }) => {
    return request(`/collaboration/presence/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify({ cursorPosition }),
    });
  },

  getActiveUsers: async (sessionId: number) => {
    return request<any[]>(`/collaboration/presence/${sessionId}`);
  },

  leaveSession: async (sessionId: number) => {
    return request(`/collaboration/sessions/${sessionId}/leave`, {
      method: 'DELETE',
    });
  },

  endSession: async (sessionId: number) => {
    return request(`/collaboration/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  getSession: async (sessionToken: string) => {
    return request<any>(`/collaboration/sessions/${sessionToken}`);
  },
};

// Advanced Analytics API
export const advancedAnalyticsApi = {
  predictPerformance: async (algorithmId: number) => {
    return request<{ predictedValue: number; confidenceScore: number }>(`/advanced-analytics/predict/${algorithmId}`, {
      method: 'POST',
    });
  },

  analyzeTrends: async (algorithmId: number | null, options?: { periodDays?: number; trendType?: 'performance' | 'usage' | 'popularity' | 'score' }) => {
    const params = new URLSearchParams();
    if (options?.periodDays) params.append('periodDays', options.periodDays.toString());
    if (options?.trendType) params.append('trendType', options.trendType);
    
    const endpoint = algorithmId 
      ? `/advanced-analytics/trends/${algorithmId}?${params.toString()}`
      : `/advanced-analytics/trends?${params.toString()}`;
    
    return request<any[]>(endpoint);
  },

  forecastPerformance: async (algorithmId: number, forecastDays: number = 30) => {
    return request<any[]>(`/advanced-analytics/forecast/${algorithmId}`, {
      method: 'POST',
      body: JSON.stringify({ forecastDays }),
    });
  },
};

// Recommendations API
export const recommendationsApi = {
  getProblemRecommendations: async (problemId: number, limit: number = 5) => {
    return request<any[]>(`/recommendations/problem/${problemId}?limit=${limit}`);
  },

  getOptimizations: async (algorithmId: number) => {
    return request<any[]>(`/recommendations/optimizations/${algorithmId}`);
  },

  findSimilar: async (algorithmId: number, limit: number = 5) => {
    return request<any[]>(`/recommendations/similar/${algorithmId}?limit=${limit}`);
  },

  getUserRecommendations: async (limit: number = 10) => {
    return request<any[]>(`/recommendations/user?limit=${limit}`);
  },

  markViewed: async (recommendationId: number) => {
    return request(`/recommendations/${recommendationId}/viewed`, {
      method: 'PATCH',
    });
  },

  accept: async (recommendationId: number) => {
    return request(`/recommendations/${recommendationId}/accept`, {
      method: 'PATCH',
    });
  },
};

// Problems API
export const problemsApi = {
  getAll: async (filters?: { status?: string; category?: string; priority?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.priority) params.append('priority', filters.priority);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<any[]>(`/problems${query}`);
  },

  getById: async (id: number) => {
    return request<any>(`/problems/${id}`);
  },

  create: async (problem: { title: string; description: string; category?: string; domain?: string; complexity?: string; priority?: string }) => {
    return request<any>('/problems', {
      method: 'POST',
      body: JSON.stringify(problem),
    });
  },

  update: async (id: number, updates: Partial<any>) => {
    return request<any>(`/problems/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  addAlgorithm: async (problemId: number, algorithmId: number, role?: string, notes?: string) => {
    return request<any>(`/problems/${problemId}/algorithms`, {
      method: 'POST',
      body: JSON.stringify({ algorithmId, role, notes }),
    });
  },
};

// Improvements API
export const improvementsApi = {
  getByAlgorithm: async (algorithmId: number, filters?: { status?: string; improvementType?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.improvementType) params.append('improvementType', filters.improvementType);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<any[]>(`/improvements/algorithm/${algorithmId}${query}`);
  },

  create: async (algorithmId: number, improvement: {
    improvementType: string;
    title: string;
    description: string;
    currentState?: string;
    proposedChange: string;
    expectedBenefit?: string;
    priority?: string;
  }) => {
    return request<any>(`/improvements/algorithm/${algorithmId}`, {
      method: 'POST',
      body: JSON.stringify(improvement),
    });
  },

  update: async (id: number, updates: { status: string; implementationNotes?: string }) => {
    return request<any>(`/improvements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  getMySuggestions: async () => {
    return request<any[]>('/improvements/my-suggestions');
  },
};

// Analytics API
export const analyticsApi = {
  getScores: async (algorithmId: number) => {
    return request<any[]>(`/analytics/${algorithmId}/scores`);
  },

  createScore: async (algorithmId: number, scores: {
    feasibilityScore: number;
    efficiencyScore: number;
    innovationScore: number;
    scalabilityScore: number;
    robustnessScore: number;
    notes?: string;
  }) => {
    return request<any>(`/analytics/${algorithmId}/scores`, {
      method: 'POST',
      body: JSON.stringify(scores),
    });
  },

  getGaps: async (algorithmId: number) => {
    return request<any[]>(`/analytics/${algorithmId}/gaps`);
  },

  getStrengths: async (algorithmId: number) => {
    return request<any[]>(`/analytics/${algorithmId}/strengths`);
  },

  getWeaknesses: async (algorithmId: number) => {
    return request<any[]>(`/analytics/${algorithmId}/weaknesses`);
  },

  getComprehensive: async (algorithmId: number) => {
    return request<any>(`/analytics/${algorithmId}/analytics`);
  },
};

// Combinations API
export const combinationsApi = {
  getAll: async (recommended?: boolean) => {
    const query = recommended ? '?recommended=true' : '';
    return request<any[]>(`/combinations${query}`);
  },

  getById: async (id: number) => {
    return request<any>(`/combinations/${id}`);
  },

  create: async (combination: {
    name: string;
    description?: string;
    useCase?: string;
    algorithmIds: number[];
    roles?: string[];
    weights?: number[];
  }) => {
    return request<any>('/combinations', {
      method: 'POST',
      body: JSON.stringify(combination),
    });
  },
};

// Metrics API
export const metricsApi = {
  getByAlgorithm: async (algorithmId: number, metricType?: string) => {
    const query = metricType ? `?metricType=${metricType}` : '';
    return request<any[]>(`/metrics/algorithm/${algorithmId}${query}`);
  },

  create: async (algorithmId: number, metric: {
    metricType: string;
    metricValue: number;
    context?: string;
  }) => {
    return request<any>('/metrics', {
      method: 'POST',
      body: JSON.stringify({ algorithmId, ...metric }),
    });
  },
};

// Admin API
export const adminApi = {
  getUsers: async (params?: { page?: number; limit?: number; search?: string; role?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.role) query.append('role', params.role);
    return request<{ users: any[]; total: number; page: number; limit: number }>(`/admin/users?${query.toString()}`);
  },
  
  getStats: async (type: 'users' | 'algorithms' | 'jobs' | 'system') => {
    return request<any>(`/admin/stats/${type}`);
  },
  
  getAlgorithms: async () => {
    return request<any[]>('/admin/algorithms');
  },
  
  getJobs: async () => {
    return request<any[]>('/admin/jobs');
  },
  
  updateUserRole: async (userId: number, role: string) => {
    return request(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
  
  deleteUser: async (userId: number) => {
    return request(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },
  
  deleteAlgorithm: async (algorithmId: number) => {
    return request(`/admin/algorithms/${algorithmId}`, {
      method: 'DELETE',
    });
  },
  
  cancelJob: async (jobId: number) => {
    return request(`/admin/jobs/${jobId}/cancel`, {
      method: 'POST',
    });
  },
  
  retryJob: async (jobId: number) => {
    return request(`/admin/jobs/${jobId}/retry`, {
      method: 'POST',
    });
  },
  
  deleteJob: async (jobId: number) => {
    return request(`/admin/jobs/${jobId}`, {
      method: 'DELETE',
    });
  },
  
  exportData: async (type: 'users' | 'algorithms' | 'jobs') => {
    const response = await fetch(`${API_BASE_URL}/admin/export/${type}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    return response.blob();
  },
  
  createUser: async (userData: { email: string; name: string; password: string; role?: string }) => {
    return request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  updateUser: async (userId: number, userData: { email?: string; name?: string; password?: string; role?: string }) => {
    return request(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
  
  getUser: async (userId: number) => {
    return request(`/admin/users/${userId}`);
  },
  
  getAlgorithm: async (algorithmId: number) => {
    return request(`/admin/algorithms/${algorithmId}`);
  },
  
  updateAlgorithm: async (algorithmId: number, algorithmData: any) => {
    return request(`/admin/algorithms/${algorithmId}`, {
      method: 'PUT',
      body: JSON.stringify(algorithmData),
    });
  },
  
  getJob: async (jobId: number) => {
    return request(`/admin/jobs/${jobId}`);
  },
  
  bulkDeleteUsers: async (userIds: number[]) => {
    return request('/admin/users/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  },
  
  bulkDeleteAlgorithms: async (algorithmIds: number[]) => {
    return request('/admin/algorithms/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ algorithmIds }),
    });
  },
  
  bulkDeleteJobs: async (jobIds: number[]) => {
    return request('/admin/jobs/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ jobIds }),
    });
  }
};

// Automation API
export const automationApi = {
  getStatus: async () => {
    return request('/automation/status');
  },
  
  getSchedulerStatus: async () => {
    return request('/automation/scheduler/status');
  },
  
  triggerAutomation: async (task?: 'generate' | 'synthesize' | 'improve' | 'all') => {
    return request('/automation/trigger', {
      method: 'POST',
      body: JSON.stringify({ task: task || 'all' }),
    });
  },
  
  getLogs: async (params?: { 
    taskType?: string; 
    status?: string; 
    limit?: number; 
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.taskType) query.append('taskType', params.taskType);
    if (params?.status) query.append('status', params.status);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    return request(`/automation/logs?${query.toString()}`);
  }
};

// Activity Logs API
export const activityLogsApi = {
  getLogs: async (params?: { 
    page?: number; 
    limit?: number; 
    userId?: number; 
    actionType?: string; 
    startDate?: string; 
    endDate?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.userId) query.append('userId', params.userId.toString());
    if (params?.actionType) query.append('actionType', params.actionType);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.search) query.append('search', params.search);
    return request<{ logs: any[]; total: number; page: number; limit: number }>(`/admin/activity-logs?${query.toString()}`);
  },
  
  getStats: async () => {
    return request<any>('/admin/activity-logs/stats');
  },
  
  clearOldLogs: async (days: number = 90) => {
    return request<{ message: string; deletedCount: number }>(`/admin/activity-logs/old?days=${days}`, {
      method: 'DELETE',
    });
  }
};

const transformAlgorithm = (data: any): BioAlgorithm => {
  return {
    id: data.id.toString(),
    name: data.name,
    inspiration: data.inspiration,
    domain: data.domain,
    description: data.description,
    principle: data.principle,
    steps: data.steps,
    applications: data.applications,
    pseudoCode: data.pseudoCode,
    tags: data.tags,
    type: data.type,
    parents: data.parentIds?.map((id: number) => id.toString()),
    createdAt: new Date(data.createdAt).getTime(),
    analysis: data.analysis, // Include analysis results from database
  };
};

