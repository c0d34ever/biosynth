import React, { useState, useEffect } from 'react';
import { AlgorithmCombination } from '../types';
import { combinationsApi, algorithmApi } from '../services/api';
import { Button } from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { GitBranch, Plus, Search, X, Star, TrendingUp } from 'lucide-react';

const Combinations: React.FC = () => {
  const [combinations, setCombinations] = useState<AlgorithmCombination[]>([]);
  const [algorithms, setAlgorithms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCombination, setSelectedCombination] = useState<AlgorithmCombination | null>(null);
  const [showRecommended, setShowRecommended] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    useCase: '',
    algorithmIds: [] as number[],
  });

  useEffect(() => {
    loadCombinations();
    loadAlgorithms();
  }, [showRecommended]);

  const loadCombinations = async () => {
    try {
      setLoading(true);
      const data = await combinationsApi.getAll(showRecommended);
      setCombinations(data);
    } catch (error) {
      console.error('Failed to load combinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlgorithms = async () => {
    try {
      const data = await algorithmApi.getAll();
      setAlgorithms(data);
    } catch (error) {
      console.error('Failed to load algorithms:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.algorithmIds.length < 2) {
      alert('Please select at least 2 algorithms');
      return;
    }
    try {
      await combinationsApi.create(formData);
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        useCase: '',
        algorithmIds: [],
      });
      loadCombinations();
    } catch (error: any) {
      alert('Failed to create combination: ' + error.message);
    }
  };

  const handleViewDetails = async (id: number) => {
    try {
      const combination = await combinationsApi.getById(id);
      setSelectedCombination(combination);
    } catch (error: any) {
      alert('Failed to load combination details: ' + error.message);
    }
  };

  const toggleAlgorithm = (id: number) => {
    setFormData(prev => ({
      ...prev,
      algorithmIds: prev.algorithmIds.includes(id)
        ? prev.algorithmIds.filter(aid => aid !== id)
        : [...prev.algorithmIds, id]
    }));
  };

  const filteredCombinations = combinations.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <GitBranch className="text-bio-400" /> Algorithm Combinations
          </h1>
          <p className="text-slate-400">
            Combine multiple algorithms to solve complex problems
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> New Combination
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search combinations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-bio-500 outline-none w-full"
          />
        </div>
        <Button
          variant={showRecommended ? "default" : "secondary"}
          onClick={() => setShowRecommended(!showRecommended)}
        >
          {showRecommended ? <Star size={18} className="fill-current" /> : <Star size={18} />}
          {showRecommended ? 'Showing Recommended' : 'Show Recommended'}
        </Button>
      </div>

      {/* Combinations Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading combinations...</div>
      ) : filteredCombinations.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
          <GitBranch className="mx-auto mb-4 text-slate-600" size={48} />
          <p className="text-slate-500 mb-4">No combinations found</p>
          <Button variant="secondary" onClick={() => setShowCreateModal(true)}>
            Create Your First Combination
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCombinations.map(combination => (
            <div
              key={combination.id}
              className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 hover:border-bio-500/50 transition-colors cursor-pointer"
              onClick={() => handleViewDetails(combination.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex-1">{combination.name}</h3>
                {combination.is_recommended && (
                  <Star className="text-yellow-400 fill-current" size={20} />
                )}
              </div>
              <p className="text-slate-400 text-sm mb-4 line-clamp-2">{combination.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {combination.algorithm_count || 0} algorithms
                </span>
                {combination.effectiveness_score && (
                  <div className="flex items-center gap-1 text-bio-400">
                    <TrendingUp size={14} />
                    <span>{Math.round(combination.effectiveness_score)}% effective</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1120] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Create New Combination</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-4">
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <TextArea
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <TextArea
                label="Use Case"
                value={formData.useCase}
                onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
              />
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">
                  Select Algorithms (at least 2)
                </label>
                <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-700 rounded-lg p-4 bg-slate-900/50">
                  {algorithms.map(algo => (
                    <label
                      key={algo.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.algorithmIds.includes(parseInt(algo.id))}
                        onChange={() => toggleAlgorithm(parseInt(algo.id))}
                        className="w-4 h-4 text-bio-500 bg-slate-800 border-slate-600 rounded focus:ring-bio-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-white">{algo.name}</div>
                        <div className="text-xs text-slate-400">{algo.domain}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  Selected: {formData.algorithmIds.length} algorithm(s)
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" disabled={formData.algorithmIds.length < 2}>
                  Create Combination
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedCombination && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1120] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{selectedCombination.name}</h2>
              <button onClick={() => setSelectedCombination(null)} className="text-slate-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedCombination.description && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Description</h3>
                  <p className="text-slate-300">{selectedCombination.description}</p>
                </div>
              )}
              {selectedCombination.use_case && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Use Case</h3>
                  <p className="text-slate-300">{selectedCombination.use_case}</p>
                </div>
              )}
              {selectedCombination.algorithms && selectedCombination.algorithms.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-4">Algorithms in Combination</h3>
                  <div className="space-y-3">
                    {selectedCombination.algorithms.map((algo: any) => (
                      <div key={algo.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                        <h4 className="font-medium text-white mb-1">{algo.name}</h4>
                        <p className="text-sm text-slate-400">{algo.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {selectedCombination.effectiveness_score && (
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Effectiveness Score</div>
                    <div className="text-2xl font-bold text-bio-400">
                      {Math.round(selectedCombination.effectiveness_score)}%
                    </div>
                  </div>
                )}
                {selectedCombination.popularity_score && (
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Popularity Score</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {Math.round(selectedCombination.popularity_score)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Combinations;

