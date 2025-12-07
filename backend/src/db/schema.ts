import mysql from 'mysql2/promise';

export const createTables = async (pool: mysql.Pool): Promise<void> => {
  // Users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      role ENUM('user', 'admin') DEFAULT 'user',
      gemini_api_key VARCHAR(500) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  
  // Add gemini_api_key column if it doesn't exist (for existing databases)
  // MySQL doesn't support IF NOT EXISTS for ALTER TABLE, so we check first
  try {
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'gemini_api_key'
    `) as any[];
    
    if (columns.length === 0) {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN gemini_api_key VARCHAR(500) NULL
      `);
      console.log('[Schema] Added gemini_api_key column to users table');
    }
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      // Column already exists, ignore
    } else {
      console.warn('[Schema] Could not add gemini_api_key column:', error.message);
    }
  }

  // Algorithms table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS algorithms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      inspiration VARCHAR(255) NOT NULL,
      domain VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      principle TEXT NOT NULL,
      steps JSON NOT NULL,
      applications JSON NOT NULL,
      pseudo_code TEXT NOT NULL,
      tags JSON NOT NULL,
      type ENUM('generated', 'hybrid') NOT NULL,
      parent_ids JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_type (type),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Algorithm versions (history)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS algorithm_versions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      steps JSON NOT NULL,
      pseudo_code TEXT NOT NULL,
      change_note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      INDEX idx_algorithm_id (algorithm_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Algorithm analysis
  await pool.query(`
    CREATE TABLE IF NOT EXISTS algorithm_analysis (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      analysis_type ENUM('sanity', 'blind_spot', 'extension') NOT NULL,
      result JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_analysis_type (analysis_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Jobs table (for async AI generation tasks)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      job_type ENUM('generate', 'synthesize', 'analyze', 'improve', 'automation') NOT NULL,
      status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
      input_data JSON NOT NULL,
      result_data JSON,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_job_type (job_type),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Sessions (for JWT blacklisting if needed)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Projects - Organize algorithms into projects
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      color VARCHAR(7) DEFAULT '#10b981',
      is_archived BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_is_archived (is_archived)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Project algorithms - Many-to-many relationship
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_algorithms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      algorithm_id INT NOT NULL,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      UNIQUE KEY unique_project_algorithm (project_id, algorithm_id),
      INDEX idx_project_id (project_id),
      INDEX idx_algorithm_id (algorithm_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Collections - User-created collections
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      is_public BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_is_public (is_public)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Collection algorithms
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collection_algorithms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      collection_id INT NOT NULL,
      algorithm_id INT NOT NULL,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      UNIQUE KEY unique_collection_algorithm (collection_id, algorithm_id),
      INDEX idx_collection_id (collection_id),
      INDEX idx_algorithm_id (algorithm_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Comments - Comments on algorithms
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      user_id INT NOT NULL,
      parent_id INT NULL,
      content TEXT NOT NULL,
      is_edited BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_user_id (user_id),
      INDEX idx_parent_id (parent_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Favorites - User favorites/bookmarks
  await pool.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      algorithm_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_algorithm (user_id, algorithm_id),
      INDEX idx_user_id (user_id),
      INDEX idx_algorithm_id (algorithm_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Sharing - Share algorithms with other users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shares (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      shared_by_user_id INT NOT NULL,
      shared_with_user_id INT NULL,
      share_token VARCHAR(255) UNIQUE,
      permission ENUM('view', 'edit', 'comment') DEFAULT 'view',
      expires_at TIMESTAMP NULL,
      is_public BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_shared_by_user_id (shared_by_user_id),
      INDEX idx_shared_with_user_id (shared_with_user_id),
      INDEX idx_share_token (share_token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Notifications
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type ENUM('comment', 'share', 'mention', 'system') NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      related_algorithm_id INT NULL,
      related_user_id INT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (related_algorithm_id) REFERENCES algorithms(id) ON DELETE SET NULL,
      FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_is_read (is_read),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Exports - Track export history
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      algorithm_id INT NULL,
      export_type ENUM('json', 'pdf', 'markdown', 'collection') NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500),
      file_size INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE SET NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Templates - Reusable algorithm templates
  await pool.query(`
    CREATE TABLE IF NOT EXISTS templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      inspiration VARCHAR(255),
      domain VARCHAR(255),
      principle TEXT,
      steps_template JSON,
      is_public BOOLEAN DEFAULT FALSE,
      usage_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_is_public (is_public)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // User profiles - Extended user information
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      bio TEXT,
      avatar_url VARCHAR(500),
      website VARCHAR(255),
      location VARCHAR(255),
      preferences JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Global settings - Application-wide configuration
  await pool.query(`
    CREATE TABLE IF NOT EXISTS global_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(255) UNIQUE NOT NULL,
      setting_value TEXT,
      description TEXT,
      updated_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_setting_key (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  
  // Initialize default global settings if they don't exist
  try {
    const [existing] = await pool.query(
      'SELECT id FROM global_settings WHERE setting_key = ?',
      ['gemini_api_key']
    ) as any[];
    
    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO global_settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
        [
          'gemini_api_key',
          'AIzaSyBq34MoOQ3NBHhJ1TQZD-vxeLSJM86Dog4',
          'Default Gemini API key for the application. Used as fallback when user-specific keys are not set.'
        ]
      );
      console.log('[Schema] Initialized default global Gemini API key');
    }
  } catch (error: any) {
    console.warn('[Schema] Could not initialize global settings:', error.message);
  }

  // Activity log - Track user actions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      action_type ENUM('create', 'update', 'delete', 'share', 'export', 'analyze') NOT NULL,
      entity_type ENUM('algorithm', 'project', 'collection', 'comment') NOT NULL,
      entity_id INT NOT NULL,
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_action_type (action_type),
      INDEX idx_entity_type (entity_type),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Add visibility columns to algorithms if they don't exist
  try {
    await pool.query(`
      ALTER TABLE algorithms 
      ADD COLUMN visibility ENUM('private', 'public', 'unlisted') DEFAULT 'private',
      ADD COLUMN view_count INT DEFAULT 0,
      ADD COLUMN like_count INT DEFAULT 0;
    `);
  } catch (error: any) {
    // Column might already exist, ignore error
    if (!error.message.includes('Duplicate column name')) {
      throw error;
    }
  }

  // Algorithm likes
  await pool.query(`
    CREATE TABLE IF NOT EXISTS algorithm_likes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_algorithm_user_like (algorithm_id, user_id),
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Problems - Real-world problems/issues to solve
  await pool.query(`
    CREATE TABLE IF NOT EXISTS problems (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100),
      domain VARCHAR(255),
      complexity ENUM('simple', 'moderate', 'complex', 'very_complex') DEFAULT 'moderate',
      status ENUM('draft', 'active', 'solved', 'archived') DEFAULT 'draft',
      priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      solved_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_category (category),
      INDEX idx_priority (priority)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Problem algorithms - Algorithms used to solve problems
  await pool.query(`
    CREATE TABLE IF NOT EXISTS problem_algorithms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      problem_id INT NOT NULL,
      algorithm_id INT NOT NULL,
      role ENUM('primary', 'supporting', 'optimization', 'validation') DEFAULT 'primary',
      sequence_order INT DEFAULT 0,
      effectiveness_score DECIMAL(5,2),
      notes TEXT,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      INDEX idx_problem_id (problem_id),
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_sequence_order (sequence_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Algorithm improvements - Track improvements and suggestions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS algorithm_improvements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      user_id INT NOT NULL,
      improvement_type ENUM('optimization', 'bug_fix', 'feature_add', 'refactor', 'performance') NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      current_state TEXT,
      proposed_change TEXT NOT NULL,
      expected_benefit TEXT,
      priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
      status ENUM('suggested', 'in_progress', 'completed', 'rejected') DEFAULT 'suggested',
      implementation_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_improvement_type (improvement_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Algorithm scores - Comprehensive scoring system
  await pool.query(`
    CREATE TABLE IF NOT EXISTS algorithm_scores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      user_id INT NULL,
      overall_score DECIMAL(5,2),
      feasibility_score DECIMAL(5,2),
      efficiency_score DECIMAL(5,2),
      innovation_score DECIMAL(5,2),
      applicability_score DECIMAL(5,2),
      robustness_score DECIMAL(5,2),
      scalability_score DECIMAL(5,2),
      maintainability_score DECIMAL(5,2),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE KEY unique_algorithm_user_score (algorithm_id, user_id),
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_overall_score (overall_score)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Algorithm gaps - Gap analysis
  await pool.query(`
    CREATE TABLE IF NOT EXISTS algorithm_gaps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      user_id INT NULL,
      gap_type ENUM('functionality', 'performance', 'scalability', 'security', 'usability', 'documentation', 'testing') NOT NULL,
      description TEXT NOT NULL,
      severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
      impact TEXT,
      suggested_solution TEXT,
      status ENUM('identified', 'addressed', 'resolved') DEFAULT 'identified',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP NULL,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_gap_type (gap_type),
      INDEX idx_severity (severity),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Algorithm strengths - Strength analysis
  await pool.query(`
    CREATE TABLE IF NOT EXISTS algorithm_strengths (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      user_id INT NULL,
      strength_type ENUM('performance', 'innovation', 'simplicity', 'scalability', 'robustness', 'flexibility', 'efficiency') NOT NULL,
      description TEXT NOT NULL,
      evidence TEXT,
      impact_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_strength_type (strength_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Algorithm weaknesses - Weakness analysis
  await pool.query(`
    CREATE TABLE IF NOT EXISTS algorithm_weaknesses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      user_id INT NULL,
      weakness_type ENUM('performance', 'complexity', 'scalability', 'robustness', 'maintainability', 'documentation', 'testing') NOT NULL,
      description TEXT NOT NULL,
      impact TEXT,
      severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
      mitigation_strategy TEXT,
      status ENUM('identified', 'mitigating', 'mitigated') DEFAULT 'identified',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_weakness_type (weakness_type),
      INDEX idx_severity (severity)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Algorithm metrics - Performance and usage metrics
  await pool.query(`
    CREATE TABLE IF NOT EXISTS algorithm_metrics (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      metric_type ENUM('execution_time', 'memory_usage', 'accuracy', 'precision', 'recall', 'throughput', 'error_rate', 'success_rate') NOT NULL,
      metric_value DECIMAL(10,4),
      unit VARCHAR(50),
      context TEXT,
      test_environment VARCHAR(255),
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_metric_type (metric_type),
      INDEX idx_recorded_at (recorded_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Algorithm combinations - Recommended algorithm combinations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS algorithm_combinations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      use_case TEXT,
      effectiveness_score DECIMAL(5,2),
      popularity_score INT DEFAULT 0,
      is_recommended BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_effectiveness_score (effectiveness_score),
      INDEX idx_is_recommended (is_recommended)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Combination algorithms - Algorithms in a combination
  await pool.query(`
    CREATE TABLE IF NOT EXISTS combination_algorithms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      combination_id INT NOT NULL,
      algorithm_id INT NOT NULL,
      role VARCHAR(100),
      weight DECIMAL(3,2) DEFAULT 1.00,
      sequence_order INT DEFAULT 0,
      FOREIGN KEY (combination_id) REFERENCES algorithm_combinations(id) ON DELETE CASCADE,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      INDEX idx_combination_id (combination_id),
      INDEX idx_algorithm_id (algorithm_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Problem solutions - Track solution attempts and results
  await pool.query(`
    CREATE TABLE IF NOT EXISTS problem_solutions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      problem_id INT NOT NULL,
      solution_name VARCHAR(255) NOT NULL,
      description TEXT,
      algorithm_combination_id INT NULL,
      success_rate DECIMAL(5,2),
      performance_rating ENUM('poor', 'fair', 'good', 'excellent') DEFAULT 'fair',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
      FOREIGN KEY (algorithm_combination_id) REFERENCES algorithm_combinations(id) ON DELETE SET NULL,
      INDEX idx_problem_id (problem_id),
      INDEX idx_success_rate (success_rate)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Automation logs - Track automation activities
  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_type ENUM('daily_generation', 'auto_synthesis', 'algorithm_improvement', 'system_optimization') NOT NULL,
      status ENUM('success', 'failed', 'partial', 'analysis_complete') NOT NULL,
      details JSON,
      algorithm_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE SET NULL,
      INDEX idx_task_type (task_type),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at),
      INDEX idx_algorithm_id (algorithm_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Code generations - Generated code implementations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS code_generations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      user_id INT NOT NULL,
      language ENUM('python', 'javascript', 'java', 'cpp', 'typescript', 'go', 'rust') NOT NULL,
      code TEXT NOT NULL,
      version VARCHAR(50),
      is_validated BOOLEAN DEFAULT FALSE,
      validation_errors TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_user_id (user_id),
      INDEX idx_language (language)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Code executions - Execution results
  await pool.query(`
    CREATE TABLE IF NOT EXISTS code_executions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code_generation_id INT NOT NULL,
      user_id INT NOT NULL,
      status ENUM('pending', 'running', 'completed', 'failed', 'timeout') DEFAULT 'pending',
      input_data JSON,
      output_data TEXT,
      error_message TEXT,
      execution_time_ms INT,
      memory_usage_mb DECIMAL(10,2),
      exit_code INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (code_generation_id) REFERENCES code_generations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_code_generation_id (code_generation_id),
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Code analysis - Code quality analysis results
  await pool.query(`
    CREATE TABLE IF NOT EXISTS code_analysis (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code_generation_id INT NOT NULL,
      user_id INT NOT NULL,
      analysis_result JSON NOT NULL,
      score DECIMAL(5,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (code_generation_id) REFERENCES code_generations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_code_generation_id (code_generation_id),
      INDEX idx_user_id (user_id),
      INDEX idx_score (score),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Algorithm tests - Test definitions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS algorithm_tests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      user_id INT NOT NULL,
      test_name VARCHAR(255) NOT NULL,
      test_type ENUM('unit', 'integration', 'performance', 'regression') NOT NULL,
      test_code TEXT,
      expected_result JSON,
      test_data JSON,
      is_auto_generated BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_user_id (user_id),
      INDEX idx_test_type (test_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Test results - Test execution results
  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      test_id INT NOT NULL,
      code_generation_id INT NULL,
      status ENUM('passed', 'failed', 'error', 'skipped') NOT NULL,
      execution_time_ms INT,
      actual_result JSON,
      error_message TEXT,
      assertion_details JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES algorithm_tests(id) ON DELETE CASCADE,
      FOREIGN KEY (code_generation_id) REFERENCES code_generations(id) ON DELETE SET NULL,
      INDEX idx_test_id (test_id),
      INDEX idx_code_generation_id (code_generation_id),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Algorithm branches - Version control branches
  await pool.query(`
    CREATE TABLE IF NOT EXISTS algorithm_branches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      user_id INT NOT NULL,
      branch_name VARCHAR(255) NOT NULL,
      parent_branch_id INT NULL,
      parent_version_id INT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      is_merged BOOLEAN DEFAULT FALSE,
      merged_into_branch_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_branch_id) REFERENCES algorithm_branches(id) ON DELETE SET NULL,
      FOREIGN KEY (parent_version_id) REFERENCES algorithm_versions(id) ON DELETE SET NULL,
      FOREIGN KEY (merged_into_branch_id) REFERENCES algorithm_branches(id) ON DELETE SET NULL,
      UNIQUE KEY unique_algorithm_branch (algorithm_id, branch_name),
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_user_id (user_id),
      INDEX idx_branch_name (branch_name),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Branch versions - Versions within branches
  await pool.query(`
    CREATE TABLE IF NOT EXISTS branch_versions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      branch_id INT NOT NULL,
      version_number INT NOT NULL,
      name VARCHAR(255),
      description TEXT,
      steps JSON NOT NULL,
      pseudo_code TEXT NOT NULL,
      change_note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES algorithm_branches(id) ON DELETE CASCADE,
      UNIQUE KEY unique_branch_version (branch_id, version_number),
      INDEX idx_branch_id (branch_id),
      INDEX idx_version_number (version_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Collaboration sessions - Real-time collaboration
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collaboration_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      created_by_user_id INT NOT NULL,
      session_token VARCHAR(255) UNIQUE NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      expires_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_session_token (session_token),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Collaboration presence - Track who's viewing/editing
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collaboration_presence (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id INT NOT NULL,
      user_id INT NOT NULL,
      cursor_position JSON,
      last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_session_user (session_id, user_id),
      INDEX idx_session_id (session_id),
      INDEX idx_user_id (user_id),
      INDEX idx_last_activity (last_activity)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Analytics predictions - Predictive analytics
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_predictions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NOT NULL,
      prediction_type ENUM('performance', 'adoption', 'success_rate', 'optimization_potential') NOT NULL,
      predicted_value DECIMAL(10,4),
      confidence_score DECIMAL(5,2),
      prediction_model VARCHAR(100),
      input_features JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_prediction_type (prediction_type),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Analytics trends - Trend analysis
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_trends (
      id INT AUTO_INCREMENT PRIMARY KEY,
      algorithm_id INT NULL,
      trend_type ENUM('performance', 'usage', 'popularity', 'score') NOT NULL,
      period_start TIMESTAMP NOT NULL,
      period_end TIMESTAMP NOT NULL,
      trend_direction ENUM('increasing', 'decreasing', 'stable') NOT NULL,
      change_percentage DECIMAL(5,2),
      data_points JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_trend_type (trend_type),
      INDEX idx_period_start (period_start)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Algorithm recommendations - AI-powered recommendations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS algorithm_recommendations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      algorithm_id INT NULL,
      problem_id INT NULL,
      recommendation_type ENUM('algorithm_suggestion', 'optimization', 'combination', 'similar_algorithm') NOT NULL,
      recommended_algorithm_id INT NULL,
      recommended_combination_id INT NULL,
      confidence_score DECIMAL(5,2),
      reason TEXT,
      context JSON,
      is_viewed BOOLEAN DEFAULT FALSE,
      is_accepted BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
      FOREIGN KEY (recommended_algorithm_id) REFERENCES algorithms(id) ON DELETE CASCADE,
      FOREIGN KEY (recommended_combination_id) REFERENCES algorithm_combinations(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_algorithm_id (algorithm_id),
      INDEX idx_problem_id (problem_id),
      INDEX idx_recommendation_type (recommendation_type),
      INDEX idx_is_viewed (is_viewed)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

