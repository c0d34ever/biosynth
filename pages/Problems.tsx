import React, { useState, useEffect } from 'react';
import { Problem } from '../types';
import { problemsApi, algorithmApi } from '../services/api';
import { Button } from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { Target, Plus, Search, Filter, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const Problems: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [algorithms, setAlgorithms] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    domain: '',
    complexity: 'moderate' as const,
    priority: 'medium' as const,
  });

  useEffect(() => {
    loadProblems();
    loadAlgorithms();
  }, [statusFilter, priorityFilter]);

  const loadProblems = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (priorityFilter !== 'all') filters.priority = priorityFilter;
      const data = await problemsApi.getAll(filters);
      setProblems(data);
    } catch (error: any) {
      console.error('Failed to load problems:', error);
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
    try {
      await problemsApi.create(formData);
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        category: '',
        domain: '',
        complexity: 'moderate',
        priority: 'medium',
      });
      loadProblems();
    } catch (error: any) {
      alert('Failed to create problem: ' + error.message);
    }
  };

  const handleViewDetails = async (id: number) => {
    try {
      const problem = await problemsApi.getById(id);
      setSelectedProblem(problem);
    } catch (error: any) {
      alert('Failed to load problem details: ' + error.message);
    }
  };

  const filteredProblems = problems.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'solved': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'in_progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'archived': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Target className="text-bio-400" /> Problem Solving
          </h1>
          <p className="text-slate-400">
            Define real-world problems and find algorithm solutions
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> New Problem
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search problems..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-bio-500 outline-none w-full"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-bio-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="solved">Solved</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-bio-500 outline-none"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Problems Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading problems...</div>
      ) : filteredProblems.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
          <Target className="mx-auto mb-4 text-slate-600" size={48} />
          <p className="text-slate-500 mb-4">No problems found</p>
          <Button variant="secondary" onClick={() => setShowCreateModal(true)}>
            Create Your First Problem
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProblems.map(problem => (
            <div
              key={problem.id}
              className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 hover:border-bio-500/50 transition-colors cursor-pointer"
              onClick={() => handleViewDetails(problem.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{problem.title}</h3>
                <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(problem.status)}`}>
                  {problem.status || 'open'}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-4 line-clamp-2">{problem.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className={getPriorityColor(problem.priority)}>
                  {problem.priority || 'medium'} priority
                </span>
                <div className="flex items-center gap-4 text-slate-500">
                  <span>{problem.algorithm_count || 0} algorithms</span>
                  <span>{problem.solution_count || 0} solutions</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1120] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Create New Problem</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-4">
              <Input
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <TextArea
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
                <Input
                  label="Domain"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-400 mb-2 block">Complexity</label>
                  <select
                    value={formData.complexity}
                    onChange={(e) => setFormData({ ...formData, complexity: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-bio-500 outline-none"
                  >
                    <option value="simple">Simple</option>
                    <option value="moderate">Moderate</option>
                    <option value="complex">Complex</option>
                    <option value="very_complex">Very Complex</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400 mb-2 block">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-bio-500 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit">Create Problem</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedProblem && (
        <>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0b1120] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">{selectedProblem.title}</h2>
                <button onClick={() => setSelectedProblem(null)} className="text-slate-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <p className="text-slate-300 mb-4">{selectedProblem.description}</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-slate-500">Category: <span className="text-slate-300">{selectedProblem.category || 'N/A'}</span></span>
                    <span className="text-slate-500">Domain: <span className="text-slate-300">{selectedProblem.domain || 'N/A'}</span></span>
                    <span className="text-slate-500">Complexity: <span className="text-slate-300">{selectedProblem.complexity || 'N/A'}</span></span>
                  </div>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">Linked Algorithms</h3>
                  <Button
                    variant="secondary"
                    className="text-sm"
                    onClick={async () => {
                      await handleViewDetails(selectedProblem.id);
                      const modal = document.getElementById('add-algorithm-modal');
                      if (modal) {
                        (modal as any).style.display = 'flex';
                      }
                    }}
                  >
                    <Plus size={16} /> Add Algorithm
                  </Button>
                </div>
                {selectedProblem.algorithms && selectedProblem.algorithms.length > 0 ? (
                  <div className="space-y-2">
                    {selectedProblem.algorithms.map((algo: any) => (
                      <div key={algo.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-white">{algo.name}</h4>
                            <p className="text-sm text-slate-400">{algo.description}</p>
                          </div>
                          {algo.role && (
                            <span className="px-2 py-1 bg-bio-500/10 text-bio-400 rounded text-xs">
                              {algo.role}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-900/30 rounded-lg border border-dashed border-slate-700">
                    <p className="text-slate-500 text-sm">No algorithms linked yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add Algorithm Modal */}
          <div
            id="add-algorithm-modal"
            className="fixed inset-0 z-[60] hidden items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                (e.currentTarget as any).style.display = 'none';
              }
            }}
          >
            <div className="bg-[#0b1120] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Add Algorithm to Problem</h2>
                <button
                  onClick={() => {
                    const modal = document.getElementById('add-algorithm-modal');
                    if (modal) (modal as any).style.display = 'none';
                  }}
                  className="text-slate-500 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-400 mb-2 block">Select Algorithm</label>
                  <select
                    id="algorithm-select"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-bio-500 outline-none"
                  >
                    <option value="">Choose an algorithm...</option>
                    {algorithms.map(algo => (
                      <option key={algo.id} value={algo.id}>
                        {algo.name} - {algo.domain}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400 mb-2 block">Role (Optional)</label>
                  <input
                    id="algorithm-role"
                    type="text"
                    placeholder="e.g. primary, secondary, optimizer"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-bio-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400 mb-2 block">Notes (Optional)</label>
                  <textarea
                    id="algorithm-notes"
                    placeholder="Additional notes about this algorithm's role in solving the problem..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-bio-500 outline-none min-h-[100px]"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const modal = document.getElementById('add-algorithm-modal');
                      if (modal) (modal as any).style.display = 'none';
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      const select = document.getElementById('algorithm-select') as HTMLSelectElement;
                      const roleInput = document.getElementById('algorithm-role') as HTMLInputElement;
                      const notesInput = document.getElementById('algorithm-notes') as HTMLTextAreaElement;
                      
                      if (!select.value) {
                        alert('Please select an algorithm');
                        return;
                      }

                      try {
                        await problemsApi.addAlgorithm(
                          selectedProblem.id,
                          parseInt(select.value),
                          roleInput.value || undefined,
                          notesInput.value || undefined
                        );
                        await handleViewDetails(selectedProblem.id);
                        const modal = document.getElementById('add-algorithm-modal');
                        if (modal) (modal as any).style.display = 'none';
                        select.value = '';
                        roleInput.value = '';
                        notesInput.value = '';
                      } catch (error: any) {
                        alert('Failed to add algorithm: ' + error.message);
                      }
                    }}
                  >
                    Add Algorithm
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Problems;

