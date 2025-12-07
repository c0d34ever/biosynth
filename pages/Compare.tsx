import React, { useState, useEffect } from 'react';
import { algorithmApi } from '../services/api';
import { BioAlgorithm } from '../types';
import { GitCompare, X, Plus, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertCircle, Activity } from 'lucide-react';
import { Button } from '../components/Button';

const Compare: React.FC = () => {
  const [algorithms, setAlgorithms] = useState<BioAlgorithm[]>([]);
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<BioAlgorithm[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    loadAlgorithms();
  }, []);

  const loadAlgorithms = async () => {
    try {
      const data = await algorithmApi.getAll();
      setAlgorithms(data);
    } catch (error) {
      console.error('Failed to load algorithms:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAlgorithm = (algo: BioAlgorithm) => {
    if (selectedAlgorithms.length >= 4) {
      alert('Maximum 4 algorithms can be compared at once');
      return;
    }
    if (!selectedAlgorithms.find(a => a.id === algo.id)) {
      setSelectedAlgorithms([...selectedAlgorithms, algo]);
      setShowSelector(false);
    }
  };

  const removeAlgorithm = (id: string) => {
    setSelectedAlgorithms(selectedAlgorithms.filter(a => a.id !== id));
  };

  const filteredAlgorithms = algorithms.filter(algo =>
    algo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    algo.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/30';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-red-500/10 border-red-500/30';
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
            <GitCompare size={32} className="text-bio-400" />
            Algorithm Comparison
          </h1>
          <p className="text-slate-400">Compare multiple algorithms side-by-side</p>
        </div>

        {/* Algorithm Selector */}
        <div className="mb-6 flex flex-wrap gap-3">
          {selectedAlgorithms.map((algo, index) => (
            <div
              key={algo.id}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2"
            >
              <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
              <span className="text-sm text-white">{algo.name}</span>
              <button
                onClick={() => removeAlgorithm(algo.id)}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {selectedAlgorithms.length < 4 && (
            <Button
              onClick={() => setShowSelector(!showSelector)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Plus size={16} /> Add Algorithm
            </Button>
          )}
        </div>

        {/* Search Modal */}
        {showSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Select Algorithm</h2>
                <button
                  onClick={() => setShowSelector(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Search algorithms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white mb-4 focus:outline-none focus:border-bio-500"
              />
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredAlgorithms
                  .filter(algo => !selectedAlgorithms.find(s => s.id === algo.id))
                  .map((algo) => (
                    <button
                      key={algo.id}
                      onClick={() => addAlgorithm(algo)}
                      className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                    >
                      <div className="font-medium text-white">{algo.name}</div>
                      <div className="text-sm text-slate-400 mt-1">{algo.description}</div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        {selectedAlgorithms.length > 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-950 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">Metric</th>
                    {selectedAlgorithms.map((algo, index) => (
                      <th key={algo.id} className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="text-bio-400">#{index + 1}</span>
                          <span className="text-white">{algo.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {/* Score */}
                  <tr className="hover:bg-slate-950/50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">Score</td>
                    {selectedAlgorithms.map((algo) => {
                      const score = algo.analysis?.sanity?.score || 0;
                      return (
                        <td key={algo.id} className="px-6 py-4">
                          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-4 font-bold text-xl ${getScoreBg(score)} ${getScoreColor(score)}`}>
                            {score}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Domain */}
                  <tr className="hover:bg-slate-950/50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">Domain</td>
                    {selectedAlgorithms.map((algo) => (
                      <td key={algo.id} className="px-6 py-4 text-sm text-slate-400">{algo.domain}</td>
                    ))}
                  </tr>

                  {/* Steps Count */}
                  <tr className="hover:bg-slate-950/50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">Steps</td>
                    {selectedAlgorithms.map((algo) => (
                      <td key={algo.id} className="px-6 py-4 text-sm text-slate-400">{algo.steps.length}</td>
                    ))}
                  </tr>

                  {/* Applications Count */}
                  <tr className="hover:bg-slate-950/50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">Applications</td>
                    {selectedAlgorithms.map((algo) => (
                      <td key={algo.id} className="px-6 py-4 text-sm text-slate-400">{algo.applications.length}</td>
                    ))}
                  </tr>

                  {/* Tags */}
                  <tr className="hover:bg-slate-950/50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">Tags</td>
                    {selectedAlgorithms.map((algo) => (
                      <td key={algo.id} className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {algo.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-2 py-1 text-xs bg-slate-800 text-slate-300 rounded border border-slate-700">
                              {tag}
                            </span>
                          ))}
                          {algo.tags.length > 3 && (
                            <span className="px-2 py-1 text-xs text-slate-500">+{algo.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Verdict */}
                  <tr className="hover:bg-slate-950/50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">Verdict</td>
                    {selectedAlgorithms.map((algo) => {
                      const verdict = algo.analysis?.sanity?.verdict || 'Not analyzed';
                      const isPositive = verdict.toLowerCase().includes('strong') || verdict.toLowerCase().includes('robust');
                      return (
                        <td key={algo.id} className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isPositive ? (
                              <CheckCircle2 size={16} className="text-emerald-400" />
                            ) : (
                              <AlertCircle size={16} className="text-amber-400" />
                            )}
                            <span className="text-sm text-slate-300">{verdict}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Gaps Count */}
                  <tr className="hover:bg-slate-950/50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">Gaps</td>
                    {selectedAlgorithms.map((algo) => {
                      const gaps = algo.analysis?.sanity?.gaps || [];
                      return (
                        <td key={algo.id} className="px-6 py-4">
                          <span className={`text-sm font-medium ${gaps.length === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {gaps.length}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Risks Count */}
                  <tr className="hover:bg-slate-950/50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">Risks</td>
                    {selectedAlgorithms.map((algo) => {
                      const risks = algo.analysis?.blindSpots?.risks || [];
                      return (
                        <td key={algo.id} className="px-6 py-4">
                          <span className={`text-sm font-medium ${risks.length === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {risks.length}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Extensions Count */}
                  <tr className="hover:bg-slate-950/50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">Extensions</td>
                    {selectedAlgorithms.map((algo) => {
                      const extensions = algo.analysis?.extensions?.ideas || [];
                      return (
                        <td key={algo.id} className="px-6 py-4">
                          <span className="text-sm font-medium text-purple-400">{extensions.length}</span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <GitCompare size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No algorithms selected for comparison</p>
            <Button onClick={() => setShowSelector(true)} variant="primary">
              <Plus size={16} /> Add Algorithm
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Compare;

