import { BioAlgorithm } from '../types';

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  algorithms: BioAlgorithm[];
}

export const importFromJSON = async (file: File): Promise<ImportResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        const algorithms = Array.isArray(data) ? data : [data];
        const imported: BioAlgorithm[] = [];
        const errors: string[] = [];
        
        algorithms.forEach((algo, index) => {
          try {
            // Validate required fields
            if (!algo.name || !algo.description || !algo.domain) {
              throw new Error(`Algorithm ${index + 1}: Missing required fields`);
            }
            
            // Transform to BioAlgorithm format
            const transformed: BioAlgorithm = {
              id: algo.id?.toString() || '',
              name: algo.name,
              inspiration: algo.inspiration || '',
              domain: algo.domain,
              description: algo.description,
              principle: algo.principle || '',
              steps: Array.isArray(algo.steps) ? algo.steps : 
                     typeof algo.steps === 'string' ? algo.steps.split('\n') : [],
              applications: Array.isArray(algo.applications) ? algo.applications : 
                           typeof algo.applications === 'string' ? algo.applications.split(',') : [],
              pseudoCode: algo.pseudoCode || algo.pseudocode || '',
              tags: Array.isArray(algo.tags) ? algo.tags : 
                    typeof algo.tags === 'string' ? algo.tags.split(',').map(t => t.trim()) : [],
              type: algo.type || 'generated',
              parents: algo.parents || algo.parentIds || [],
              createdAt: algo.createdAt || Date.now(),
              analysis: algo.analysis
            };
            
            imported.push(transformed);
          } catch (error) {
            errors.push(`Algorithm ${index + 1}: ${error instanceof Error ? error.message : 'Invalid format'}`);
          }
        });
        
        resolve({
          success: imported.length > 0,
          imported: imported.length,
          failed: errors.length,
          errors,
          algorithms: imported
        });
      } catch (error) {
        resolve({
          success: false,
          imported: 0,
          failed: 1,
          errors: [error instanceof Error ? error.message : 'Failed to parse JSON'],
          algorithms: []
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        imported: 0,
        failed: 1,
        errors: ['Failed to read file'],
        algorithms: []
      });
    };
    
    reader.readAsText(file);
  });
};

export const importFromCSV = async (file: File): Promise<ImportResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          resolve({
            success: false,
            imported: 0,
            failed: 0,
            errors: ['CSV file must have at least a header and one data row'],
            algorithms: []
          });
          return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const algorithms: BioAlgorithm[] = [];
        const errors: string[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          try {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const algo: any = {};
            
            headers.forEach((header, index) => {
              algo[header.toLowerCase().replace(/\s+/g, '_')] = values[index] || '';
            });
            
            if (!algo.name || !algo.description || !algo.domain) {
              throw new Error(`Row ${i + 1}: Missing required fields`);
            }
            
            const transformed: BioAlgorithm = {
              id: '',
              name: algo.name,
              inspiration: algo.inspiration || '',
              domain: algo.domain,
              description: algo.description,
              principle: algo.principle || '',
              steps: algo.steps ? algo.steps.split(';').map((s: string) => s.trim()) : [],
              applications: algo.applications ? algo.applications.split(';').map((a: string) => a.trim()) : [],
              pseudoCode: algo.pseudocode || algo.pseudo_code || '',
              tags: algo.tags ? algo.tags.split(';').map((t: string) => t.trim()) : [],
              type: algo.type || 'generated',
              parents: [],
              createdAt: Date.now()
            };
            
            algorithms.push(transformed);
          } catch (error) {
            errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Invalid format'}`);
          }
        }
        
        resolve({
          success: algorithms.length > 0,
          imported: algorithms.length,
          failed: errors.length,
          errors,
          algorithms
        });
      } catch (error) {
        resolve({
          success: false,
          imported: 0,
          failed: 1,
          errors: [error instanceof Error ? error.message : 'Failed to parse CSV'],
          algorithms: []
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        imported: 0,
        failed: 1,
        errors: ['Failed to read file'],
        algorithms: []
      });
    };
    
    reader.readAsText(file);
  });
};

export const validateAlgorithm = (algo: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!algo.name || typeof algo.name !== 'string') {
    errors.push('Name is required and must be a string');
  }
  
  if (!algo.description || typeof algo.description !== 'string') {
    errors.push('Description is required and must be a string');
  }
  
  if (!algo.domain || typeof algo.domain !== 'string') {
    errors.push('Domain is required and must be a string');
  }
  
  if (algo.steps && !Array.isArray(algo.steps) && typeof algo.steps !== 'string') {
    errors.push('Steps must be an array or string');
  }
  
  if (algo.applications && !Array.isArray(algo.applications) && typeof algo.applications !== 'string') {
    errors.push('Applications must be an array or string');
  }
  
  if (algo.tags && !Array.isArray(algo.tags) && typeof algo.tags !== 'string') {
    errors.push('Tags must be an array or string');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

