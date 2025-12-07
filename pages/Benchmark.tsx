import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { algorithmApi, codeApi } from '../services/api';
import { BioAlgorithm } from '../types';
import { TrendingUp, Play, BarChart3, Clock, Cpu, Zap, Activity } from 'lucide-react';
import { Button } from '../components/Button';

interface BenchmarkResult {
  algorithmId: string;
  algorithmName: string;
  language: string;
  executionTime: number;
  status: 'success' | 'failed';
  error?: string;
  score?: number;
}

const Benchmark: React.FC = () => {
  const navigate = useNavigate();
  const [algorithms, setAlgorithms] = useState<BioAlgorithm[]>([]);
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [inputData, setInputData] = useState<string>('{}');
  const [iterations, setIterations] = useState<number>(5);

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

  const loadAlgorithms = async () => {
    try {
      const data = await algorithmApi.getAll();
      setAlgorithms(data);
    } catch (error) {
      console.error('Failed to load algorithms:', error);
    }
  };

  const runBenchmark = async () => {
    if (selectedAlgorithms.length === 0 || running) return;

    setRunning(true);
    setBenchmarkResults([]);

    try {
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(inputData);
      } catch {
        parsedInput = { input: inputData };
      }

      const results: BenchmarkResult[] = [];

      for (const algoId of selectedAlgorithms) {
        const algorithm = algorithms.find(a => a.id === algoId);
        if (!algorithm) continue;

        try {
          // Get or generate code
          let generationId: number;
          const generations = await codeApi.getGenerations(parseInt(algoId));
          let existing = generations.find((g: any) => g.language === selectedLanguage);
          
          if (!existing) {
            const result = await codeApi.generate(parseInt(algoId), selectedLanguage);
            generationId = result.id;
          } else {
            generationId = existing.id;
          }

          // Run multiple iterations
          const executionTimes: number[] = [];
          let successCount = 0;

          for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            const execResult = await codeApi.execute(generationId, parsedInput);
            const endTime = Date.now();
            
            if (execResult.status === 'completed') {
              executionTimes.push(endTime - startTime);
              successCount++;
            }
          }

          // Get code analysis for quality score
          let score = 0;
          try {
            const analysis = await codeApi.getLatestAnalysis(generationId);
            if (analysis) {
              score = analysis.score;
            }
          } catch {
            // Analysis not available, skip
          }

          const avgTime = executionTimes.length > 0
            ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
            : 0;

          results.push({
            algorithmId: algoId,
            algorithmName: algorithm.name,
            language: selectedLanguage,
            executionTime: avgTime,
            status: successCount > 0 ? 'success' : 'failed',
            score
          });
        } catch (error: any) {
          results.push({
            algorithmId: algoId,
            algorithmName: algorithm.name,
            language: selectedLanguage,
            executionTime: 0,
            status: 'failed',
            error: error.message
          });
        }
      }

      setBenchmarkResults(results);
    } catch (error: any) {
      console.error('Benchmark error:', error);
    } finally {
      setRunning(false);
    }
  };

  const toggleAlgorithm = (algoId: string) => {
    setSelectedAlgorithms(prev =>
      prev.includes(algoId)
        ? prev.filter(id => id !== algoId)
        : [...prev, algoId]
    );
  };

  const sortedResults = [...benchmarkResults].sort((a, b) => {
    if (a.status === 'failed' && b.status !== 'failed') return 1;
    if (a.status !== 'failed' && b.status === 'failed') return -1;
    return a.executionTime - b.executionTime;
  });

  const fastest = sortedResults.length > 0 && sortedResults[0].status === 'success' ? sortedResults[0] : null;
  const slowest = sortedResults.length > 0 && sortedResults[sortedResults.length - 1].status === 'success' 
    ? sortedResults[sortedResults.length - 1] 
    : null;

  return (
    <div className="min-h-screen bg-[#020617] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <TrendingUp size={32} className="text-bio-400" />
            Performance Benchmark
          </h1>
          <p className="text-slate-400">Compare algorithm performance across implementations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Select Algorithms</label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {algorithms.map(algo => (
                  <label key={algo.id} className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAlgorithms.includes(algo.id)}
                      onChange={() => toggleAlgorithm(algo.id)}
                      className="w-4 h-4 text-bio-500 bg-slate-800 border-slate-700 rounded focus:ring-bio-500"
                    />
                    <span className="text-sm text-slate-300">{algo.name}</span>
                  </label>
                ))}
              </div>
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
              <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Iterations</label>
              <input
                type="number"
                value={iterations}
                onChange={(e) => setIterations(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="20"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-bio-500"
              />
              <p className="text-xs text-slate-500 mt-1">Number of runs per algorithm</p>
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

            <Button
              onClick={runBenchmark}
              disabled={selectedAlgorithms.length === 0 || running}
              isLoading={running}
              variant="primary"
              className="w-full"
            >
              <Play size={16} /> Run Benchmark
            </Button>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2 space-y-4">
            {benchmarkResults.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                <BarChart3 size={48} className="text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Select algorithms and run benchmark to see results</p>
              </div>
            ) : (
              <>
                {/* Summary Stats */}
                {fastest && slowest && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                      <div className="text-xs font-bold text-emerald-400 uppercase mb-1">Fastest</div>
                      <div className="text-lg font-bold text-white">{fastest.algorithmName}</div>
                      <div className="text-sm text-emerald-300 mt-1">
                        {fastest.executionTime.toFixed(2)}ms
                      </div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                      <div className="text-xs font-bold text-amber-400 uppercase mb-1">Average</div>
                      <div className="text-lg font-bold text-white">
                        {(benchmarkResults.reduce((sum, r) => sum + r.executionTime, 0) / benchmarkResults.length).toFixed(2)}ms
                      </div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <div className="text-xs font-bold text-red-400 uppercase mb-1">Slowest</div>
                      <div className="text-lg font-bold text-white">{slowest.algorithmName}</div>
                      <div className="text-sm text-red-300 mt-1">
                        {slowest.executionTime.toFixed(2)}ms
                      </div>
                    </div>
                  </div>
                )}

                {/* Results Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-slate-800 bg-slate-950">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Activity size={20} className="text-bio-400" />
                      Benchmark Results
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-950 border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Algorithm</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Language</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Time (ms)</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Quality</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {sortedResults.map((result, index) => (
                          <tr key={result.algorithmId} className="hover:bg-slate-950/50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {index === 0 && result.status === 'success' && (
                                  <Zap size={16} className="text-emerald-400" />
                                )}
                                <span className="text-sm font-medium text-white">{result.algorithmName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400">
                              {supportedLanguages.find(l => l.value === result.language)?.label}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-slate-500" />
                                <span className={`text-sm font-medium ${
                                  result.status === 'success' ? 'text-slate-300' : 'text-red-400'
                                }`}>
                                  {result.status === 'success' ? result.executionTime.toFixed(2) : 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {result.score !== undefined ? (
                                <span className={`text-sm font-bold ${
                                  result.score >= 80 ? 'text-emerald-400' :
                                  result.score >= 60 ? 'text-amber-400' :
                                  'text-red-400'
                                }`}>
                                  {result.score}/100
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs rounded font-medium ${
                                result.status === 'success'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}>
                                {result.status === 'success' ? 'Success' : 'Failed'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Performance Chart Visualization */}
                {benchmarkResults.filter(r => r.status === 'success').length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <BarChart3 size={20} className="text-bio-400" />
                      Performance Comparison
                    </h3>
                    <div className="space-y-3">
                      {sortedResults
                        .filter(r => r.status === 'success')
                        .map((result) => {
                          const maxTime = Math.max(...sortedResults.filter(r => r.status === 'success').map(r => r.executionTime));
                          const percentage = (result.executionTime / maxTime) * 100;
                          return (
                            <div key={result.algorithmId}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-slate-300">{result.algorithmName}</span>
                                <span className="text-sm text-slate-400">{result.executionTime.toFixed(2)}ms</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-3">
                                <div
                                  className={`h-3 rounded-full transition-all ${
                                    result === fastest
                                      ? 'bg-emerald-500'
                                      : result === slowest
                                      ? 'bg-red-500'
                                      : 'bg-bio-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Benchmark;

