import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { FileUpload } from '../components/FileUpload';
import { importFromJSON, importFromCSV, ImportResult } from '../utils/import';
import { algorithmApi } from '../services/api';
import { toast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';

const Import: React.FC = () => {
  const navigate = useNavigate();
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async (files: File[]) => {
    setImporting(true);
    setImportResult(null);

    try {
      const results: ImportResult[] = [];
      
      for (const file of files) {
        const result = file.name.endsWith('.json')
          ? await importFromJSON(file)
          : file.name.endsWith('.csv')
          ? await importFromCSV(file)
          : {
              success: false,
              imported: 0,
              failed: 1,
              errors: ['Unsupported file format'],
              algorithms: []
            };
        
        results.push(result);
      }

      // Combine results
      const combined: ImportResult = {
        success: results.some(r => r.success),
        imported: results.reduce((sum, r) => sum + r.imported, 0),
        failed: results.reduce((sum, r) => sum + r.failed, 0),
        errors: results.flatMap(r => r.errors),
        algorithms: results.flatMap(r => r.algorithms)
      };

      setImportResult(combined);

      // Import algorithms to database
      if (combined.algorithms.length > 0) {
        let importedCount = 0;
        let failedCount = 0;

        for (const algo of combined.algorithms) {
          try {
            await algorithmApi.create({
              name: algo.name,
              inspiration: algo.inspiration,
              domain: algo.domain,
              description: algo.description,
              principle: algo.principle,
              steps: algo.steps,
              applications: algo.applications,
              pseudoCode: algo.pseudoCode,
              tags: algo.tags,
              type: algo.type,
              parentIds: algo.parents?.map(p => parseInt(p)) || []
            });
            importedCount++;
          } catch (error) {
            failedCount++;
            console.error('Failed to import algorithm:', error);
          }
        }

        toast.success(`Imported ${importedCount} algorithm${importedCount !== 1 ? 's' : ''}`);
        if (failedCount > 0) {
          toast.warning(`${failedCount} algorithm${failedCount !== 1 ? 's' : ''} failed to import`);
        }

        if (importedCount > 0) {
          setTimeout(() => {
            navigate('/library');
          }, 2000);
        }
      }
    } catch (error) {
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Upload className="text-bio-400" size={32} />
          Import Algorithms
        </h1>
        <p className="text-slate-400">Import algorithms from JSON or CSV files</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Upload Files</h2>
          <FileUpload
            accept=".json,.csv"
            multiple={true}
            onUpload={handleImport}
            maxSize={10}
            maxFiles={10}
            label="Import Algorithms"
            disabled={importing}
          />
        </div>

        {/* Instructions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Import Format</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <FileText size={18} className="text-blue-400" />
                JSON Format
              </h3>
              <p className="text-sm text-slate-400 mb-2">
                Import a single algorithm object or an array of algorithms:
              </p>
              <pre className="text-xs bg-slate-800 p-3 rounded-lg overflow-x-auto text-slate-300">
{`{
  "name": "Algorithm Name",
  "domain": "Domain",
  "description": "Description",
  "steps": ["step1", "step2"],
  "pseudoCode": "code here",
  ...
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Database size={18} className="text-green-400" />
                CSV Format
              </h3>
              <p className="text-sm text-slate-400 mb-2">
                CSV with headers: name, domain, description, steps, applications, pseudocode, tags, type
              </p>
              <p className="text-xs text-slate-500">
                Steps and applications should be semicolon-separated
              </p>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-400 mb-2">Required Fields</h4>
              <ul className="text-xs text-slate-300 space-y-1">
                <li>• name</li>
                <li>• domain</li>
                <li>• description</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Import Results */}
      {importResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Import Results</h2>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-slate-800 rounded-lg text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {importResult.imported}
              </div>
              <div className="text-sm text-slate-400">Imported</div>
            </div>
            <div className="p-4 bg-slate-800 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-400 mb-1">
                {importResult.failed}
              </div>
              <div className="text-sm text-slate-400">Failed</div>
            </div>
            <div className="p-4 bg-slate-800 rounded-lg text-center">
              <div className="text-2xl font-bold text-bio-400 mb-1">
                {importResult.algorithms.length}
              </div>
              <div className="text-sm text-slate-400">Total</div>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-red-400 flex items-center gap-2">
                <AlertCircle size={18} />
                Errors
              </h3>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-h-48 overflow-y-auto">
                <ul className="text-sm text-red-300 space-y-1">
                  {importResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {importResult.imported > 0 && (
            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
              <CheckCircle size={20} className="text-emerald-400" />
              <span className="text-emerald-400">
                Successfully imported {importResult.imported} algorithm{importResult.imported !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Import;

