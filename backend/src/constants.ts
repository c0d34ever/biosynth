// Note: Problem generation is now dynamic using AI and database problems
// This allows the system to consider ALL types of problems, not just a fixed list

// Automation configuration
export const AUTOMATION_CONFIG = {
  DAILY_ALGORITHMS_MIN: parseInt(process.env.DAILY_ALGORITHMS_MIN || '3'),
  DAILY_ALGORITHMS_MAX: parseInt(process.env.DAILY_ALGORITHMS_MAX || '5'),
  DAILY_SYNTHESES_MIN: parseInt(process.env.DAILY_SYNTHESES_MIN || '2'),
  DAILY_SYNTHESES_MAX: parseInt(process.env.DAILY_SYNTHESES_MAX || '4'),
  TOP_ALGORITHMS_FOR_SYNTHESIS: parseInt(process.env.TOP_ALGORITHMS_FOR_SYNTHESIS || '15'),
  UNANALYZED_ALGORITHMS_LIMIT: parseInt(process.env.UNANALYZED_ALGORITHMS_LIMIT || '5'),
  ANALYSIS_INTERVAL_DAYS: parseInt(process.env.ANALYSIS_INTERVAL_DAYS || '7')
} as const;

// System user configuration
export const SYSTEM_USER = {
  EMAIL: 'system@biosynth.ai',
  NAME: 'BioSynth System',
  ROLE: 'admin'
} as const;

