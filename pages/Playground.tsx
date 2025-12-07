import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { algorithmApi, codeApi } from '../services/api';
import { BioAlgorithm } from '../types';
import { Play, Code2, Zap, TestTube, TrendingUp, Clock, Cpu, FileCode, Download, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';

const Playground: React.FC = () => {
  const navigate = useNavigate();
  const [algorithms, setAlgorithms] = useState<BioAlgorithm[]>([]);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<BioAlgorithm | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>('');
  const [inputData, setInputData] = useState<string>('{}');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [executing, setExecuting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const supportedLanguages = [
    { value: 'python', label: 'Python', icon: '🐍' },
    { value: 'javascript', label: 'JavaScript', icon: '📜' },
    { value: 'typescript', label: 'TypeScript', icon: '📘' },
    { value: 'java', label: 'Java', icon: '☕' },
    { value: 'cpp', label: 'C++', icon: '⚡' },
    { value: 'go', label: 'Go', icon: '🐹' },
    { value: 'rust', label: 'Rust', icon: '🦀' }
  ];

  useEffect(() => {
    loadAlgorithms();
  }, []);

  useEffect(() => {
    if (selectedAlgorithm) {
      generateCode();
    }
  }, [selectedAlgorithm, selectedLanguage]);

  const loadAlgorithms = async () => {
    try {
      const data = await algorithmApi.getAll();
      setAlgorithms(data);
      if (data.length > 0) {
        setSelectedAlgorithm(data[0]);
      }
    } catch (error) {
      console.error('Failed to load algorithms:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    if (!selectedAlgorithm) return;
    
    try {
      const result = await codeApi.generate(parseInt(selectedAlgorithm.id), selectedLanguage);
      const details = await codeApi.getGeneration(result.id);
      setCode(details.code);
      setOutput('');
      setError('');
      setAnalysisResult(null);
    } catch (error: any) {
      setError(`Failed to generate code: ${error.message}`);
    }
  };

  const executeCode = async () => {
    if (!code || executing) return;
    
    setExecuting(true);
    setOutput('');
    setError('');
    setExecutionTime(null);
    
    try {
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(inputData);
      } catch {
        // If not valid JSON, use as string
        parsedInput = { input: inputData };
      }

      // Get or create code generation
      let generationId: number;
      if (selectedAlgorithm) {
        const generations = await codeApi.getGenerations(parseInt(selectedAlgorithm.id));
        const existing = generations.find((g: any) => g.language === selectedLanguage);
        if (existing) {
          generationId = existing.id;
          // Update with current code
          await codeApi.updateGeneration(existing.id, { code });
        } else {
          const result = await codeApi.generate(parseInt(selectedAlgorithm.id), selectedLanguage);
          generationId = result.id;
          await codeApi.updateGeneration(result.id, { code });
        }
      } else {
        // For standalone code, we'd need a different approach
        setError('Please select an algorithm first');
        setExecuting(false);
        return;
      }

      const startTime = Date.now();
      const result = await codeApi.execute(generationId, parsedInput);
      const endTime = Date.now();
      
      setExecutionTime(endTime - startTime);
      
      if (result.status === 'completed') {
        setOutput(result.output || 'Execution completed successfully');
      } else {
        setError(result.error || 'Execution failed');
      }
    } catch (error: any) {
      setError(`Execution error: ${error.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const analyzeCode = async () => {
    if (!code || analyzing) return;
    
    setAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      if (selectedAlgorithm) {
        const generations = await codeApi.getGenerations(parseInt(selectedAlgorithm.id));
        const existing = generations.find((g: any) => g.language === selectedLanguage);
        
        if (existing) {
          // Update code first
          await codeApi.updateGeneration(existing.id, { code });
          // Then analyze
          const result = await codeApi.analyze(existing.id, { includeExecution: false });
          setAnalysisResult(result);
        } else {
          setError('Please generate code first');
        }
      }
    } catch (error: any) {
      setError(`Analysis error: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadCode = () => {
    const extension = selectedLanguage === 'python' ? 'py' :
                     selectedLanguage === 'javascript' ? 'js' :
                     selectedLanguage === 'typescript' ? 'ts' :
                     selectedLanguage === 'java' ? 'java' :
                     selectedLanguage === 'cpp' ? 'cpp' :
                     selectedLanguage === 'go' ? 'go' :
                     selectedLanguage === 'rust' ? 'rs' : 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedAlgorithm?.name.replace(/\s+/g, '_') || 'code'}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Play size={32} className="text-bio-400" />
            Algorithm Playground
          </h1>
          <p className="text-slate-400">Interactive testing environment for algorithms</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Algorithm Selection & Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Select Algorithm</label>
              <select
                value={selectedAlgorithm?.id || ''}
                onChange={(e) => {
                  const algo = algorithms.find(a => a.id === e.target.value);
                  setSelectedAlgorithm(algo || null);
                }}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-bio-500"
              >
                {algorithms.map(algo => (
                  <option key={algo.id} value={algo.id}>{algo.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-bio-500"
              >
                {supportedLanguages.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.icon} {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Input Data (JSON)</label>
              <textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-bio-500 min-h-[100px]"
                placeholder='{"key": "value"}'
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={generateCode}
                variant="primary"
                className="w-full"
              >
                <Code2 size={16} /> Generate Code
              </Button>
              <Button
                onClick={executeCode}
                disabled={!code || executing}
                isLoading={executing}
                variant="secondary"
                className="w-full"
              >
                <Play size={16} /> Execute
              </Button>
              <Button
                onClick={analyzeCode}
                disabled={!code || analyzing}
                isLoading={analyzing}
                variant="secondary"
                className="w-full"
              >
                <TestTube size={16} /> Analyze Code
              </Button>
              <Button
                onClick={downloadCode}
                disabled={!code}
                variant="ghost"
                className="w-full"
              >
                <Download size={16} /> Download Code
              </Button>
            </div>

            {/* Execution Stats */}
            {executionTime !== null && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-sm font-bold text-slate-400 uppercase mb-2">Execution Stats</div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock size={16} className="text-bio-400" />
                  <span>Time: {executionTime}ms</span>
                </div>
              </div>
            )}

            {/* Analysis Score */}
            {analysisResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-sm font-bold text-slate-400 uppercase mb-2">Code Quality</div>
                <div className={`text-2xl font-bold ${
                  analysisResult.score >= 80 ? 'text-emerald-400' :
                  analysisResult.score >= 60 ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {analysisResult.score}/100
                </div>
                {analysisResult.issues && analysisResult.issues.length > 0 && (
                  <div className="mt-2 text-xs text-slate-400">
                    {analysisResult.issues.length} issue(s) found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Code Editor & Output */}
          <div className="lg:col-span-2 space-y-4">
            {/* Code Editor */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
                <div className="flex items-center gap-2">
                  <FileCode size={18} className="text-bio-400" />
                  <span className="text-sm font-medium text-white">Code Editor</span>
                </div>
                <div className="text-xs text-slate-500">
                  {supportedLanguages.find(l => l.value === selectedLanguage)?.label}
                </div>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-96 px-4 py-3 bg-slate-950 text-slate-100 font-mono text-sm focus:outline-none resize-none"
                placeholder="Code will appear here after generation..."
              />
            </div>

            {/* Output */}
            {output && (
              <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400 uppercase">Output</span>
                </div>
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono bg-slate-950 p-3 rounded border border-slate-800">
                  {output}
                </pre>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-slate-900 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className="text-red-400" />
                  <span className="text-sm font-bold text-red-400 uppercase">Error</span>
                </div>
                <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono bg-slate-950 p-3 rounded border border-slate-800">
                  {error}
                </pre>
              </div>
            )}

            {/* Analysis Results */}
            {analysisResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TestTube size={16} className="text-purple-400" />
                  <span className="text-sm font-bold text-purple-400 uppercase">Analysis Results</span>
                </div>
                
                {analysisResult.summary && (
                  <p className="text-sm text-slate-300 mb-4">{analysisResult.summary}</p>
                )}

                {analysisResult.issues && analysisResult.issues.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">
                      Issues ({analysisResult.issues.length})
                    </div>
                    {analysisResult.issues.slice(0, 5).map((issue: any, i: number) => (
                      <div key={i} className={`p-2 rounded text-xs ${
                        issue.severity === 'critical' ? 'bg-red-500/10 border-l-4 border-red-500' :
                        issue.severity === 'high' ? 'bg-orange-500/10 border-l-4 border-orange-500' :
                        'bg-yellow-500/10 border-l-4 border-yellow-500'
                      }`}>
                        <div className="font-medium text-slate-300">{issue.message}</div>
                        <div className="text-slate-500 mt-1">{issue.description}</div>
                      </div>
                    ))}
                    {analysisResult.issues.length > 5 && (
                      <div className="text-xs text-slate-500">
                        +{analysisResult.issues.length - 5} more issues
                      </div>
                    )}
                  </div>
                )}

                {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">Recommendations</div>
                    <ul className="space-y-1">
                      {analysisResult.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                          <span className="text-bio-400 mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playground;

