export interface BioAlgorithm {
  id: string;
  name: string;
  inspiration: string;
  domain: string;
  description: string;
  principle: string;
  steps: string[];
  applications: string[];
  pseudoCode: string;
  tags: string[];
  type: 'generated' | 'hybrid';
  parents?: string[]; // IDs of parent algorithms if hybrid
  createdAt: number;
  history?: AlgoVersion[];
  analysis?: AlgoAnalysis;
}

export interface AlgoVersion {
  timestamp: number;
  name: string;
  description: string;
  steps: string[];
  pseudoCode: string;
  changeNote?: string;
}

export interface AlgoAnalysis {
  sanity?: SanityCheckResult;
  blindSpots?: BlindSpotResult;
  extensions?: ExtensionResult;
  lastRun: number;
}

export interface GenerationRequest {
  inspiration: string;
  domain: string;
}

export interface SynthesisRequest {
  algorithms: BioAlgorithm[];
  focus?: string;
}

export type ViewState = 'home' | 'generate' | 'synthesize' | 'library' | 'admin' | 'problems' | 'analytics' | 'jobs' | 'improvements' | 'combinations' | 'compare' | 'templates' | 'playground' | 'benchmark' | 'search' | 'recommendations' | 'settings' | 'help' | 'profile' | 'import';

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface SanityCheckResult {
  score: number;
  verdict: string;
  analysis: string;
  gaps: string[];
}

export interface BlindSpotResult {
  risks: {
    risk: string;
    explanation: string;
    severity: 'High' | 'Medium' | 'Low';
  }[];
}

export interface ExtensionResult {
  ideas: {
    name: string;
    description: string;
    benefit: string;
  }[];
}

// Problem Solving Features
export interface Problem {
  id: number;
  title: string;
  description: string;
  category?: string;
  domain?: string;
  complexity?: 'simple' | 'moderate' | 'complex' | 'very_complex';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'open' | 'in_progress' | 'solved' | 'archived';
  algorithm_count?: number;
  solution_count?: number;
  algorithms?: any[];
  solutions?: any[];
  created_at?: string;
  updated_at?: string;
}

export interface AlgorithmImprovement {
  id: number;
  algorithm_id: number;
  improvement_type: 'optimization' | 'bug_fix' | 'feature_add' | 'refactor' | 'performance';
  title: string;
  description: string;
  current_state?: string;
  proposed_change: string;
  expected_benefit?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  implementation_notes?: string;
  suggested_by_name?: string;
  created_at?: string;
  completed_at?: string;
}

export interface AlgorithmScore {
  id: number;
  algorithm_id: number;
  feasibility_score: number;
  efficiency_score: number;
  innovation_score: number;
  scalability_score: number;
  robustness_score: number;
  overall_score: number;
  notes?: string;
  created_at?: string;
}

export interface AlgorithmGap {
  id: number;
  algorithm_id: number;
  gap_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  status: 'identified' | 'in_progress' | 'resolved';
  created_at?: string;
}

export interface AlgorithmStrength {
  id: number;
  algorithm_id: number;
  strength_type: string;
  description: string;
  impact_level: 'low' | 'medium' | 'high';
  created_at?: string;
}

export interface AlgorithmWeakness {
  id: number;
  algorithm_id: number;
  weakness_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  status: 'identified' | 'mitigated';
  created_at?: string;
}

export interface AlgorithmCombination {
  id: number;
  name: string;
  description?: string;
  use_case?: string;
  algorithm_count?: number;
  effectiveness_score?: number;
  popularity_score?: number;
  is_recommended?: boolean;
  algorithms?: any[];
  created_at?: string;
}

export interface AlgorithmMetric {
  id: number;
  algorithm_id: number;
  metric_type: string;
  metric_value: number;
  context?: string;
  recorded_at?: string;
}