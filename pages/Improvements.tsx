import React, { useState, useEffect } from 'react';
import { AlgorithmImprovement } from '../types';
import { improvementsApi, algorithmApi } from '../services/api';
import { Button } from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { Lightbulb, Plus, Search, Filter, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const Improvements: React.FC = () => {
  const [algorithms, setAlgorithms] = useState<any[]>([]);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<number | null>(null);
  const [improvements, setImprovements] = useState<AlgorithmImprovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    improvementType: 'optimization' as const,
    title: '',
    description: '',
    currentState: '',
    proposedChange: '',
    expectedBenefit: '',
    priority: 'medium' as const,
  });

  useEffect(() => {
    loadAlgorithms();
  }, []);

  useEffect(() => {
    if (selectedAlgorithm) {
      loadImprovements();
    }
  }, [selectedAlgorithm, statusFilter, typeFilter]);

  const loadAlgorithms = async () => {
    try {
      const data = await algorithmApi.getAll();
      setAlgorithms(data);
      if (data.length > 0 && !selectedAlgorithm) {
        setSelectedAlgorithm(parseInt(data[0].id));
      }
    } catch (error) {
      console.error('Failed to load algorithms:', error);
    }
  };

  const loadImprovements = async () => {
    if (!selectedAlgorithm) return;
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.improvementType = typeFilter;
      const data = await improvementsApi.getByAlgorithm(selectedAlgorithm, filters);
      setImprovements(data);
    } catch (error) {
      console.error('Failed to load improvements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlgorithm) return;
    try {
      await improvementsApi.create(selectedAlgorithm, formData);
      setShowCreateModal(false);
      setFormData({
        improvementType: 'optimization',
        title: '',
        description: '',
        currentState: '',
        proposedChange: '',
        expectedBenefit: '',
        priority: 'medium',
      });
      loadImprovements();
    } catch (error: any) {
      alert('Failed to create improvement: ' + error.message);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await improvementsApi.update(id, { status });
      loadImprovements();
    } catch (error: any) {
      alert('Failed to update status: ' + error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'in_progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'optimization': return 'bg-blue-500/10 text-blue-400';
      case 'bug_fix': return 'bg-red-500/10 text-red-400';
      case 'feature_add': return 'bg-green-500/10 text-green-400';
      case 'refactor': return 'bg-purple-500/10 text-purple-400';
      case 'performance': return 'bg-orange-500/10 text-orange-400';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Lightbulb className="text-bio-400" /> Algorithm Improvements
          </h1>
          <p className="text-slate-400">
            Track and manage improvement suggestions for algorithms
          </p>
        </div>
        {selectedAlgorithm && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> Suggest Improvement
          </Button>
        )}
      </header>

      {/* Algorithm Selector */}
      <div>
        <label className="text-sm font-medium text-slate-400 mb-2 block">Select Algorithm</label>
        <select
          value={selectedAlgorithm || ''}
          onChange={(e) => setSelectedAlgorithm(parseInt(e.target.value))}
          className="w-full md:w-64 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-bio-500 outline-none"
        >
          <option value="">Select an algorithm...</option>
          {algorithms.map(algo => (
            <option key={algo.id} value={algo.id}>
              {algo.name}
            </option>
          ))}
        </select>
      </div>

      {/* Filters */}
      {selectedAlgorithm && (
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-bio-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-bio-500 outline-none"
          >
            <option value="all">All Types</option>
            <option value="optimization">Optimization</option>
            <option value="bug_fix">Bug Fix</option>
            <option value="feature_add">Feature Add</option>
            <option value="refactor">Refactor</option>
            <option value="performance">Performance</option>
          </select>
        </div>
      )}

      {/* Improvements List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading improvements...</div>
      ) : !selectedAlgorithm ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
          <Lightbulb className="mx-auto mb-4 text-slate-600" size={48} />
          <p className="text-slate-500">Select an algorithm to view improvements</p>
        </div>
      ) : improvements.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
          <p className="text-slate-500 mb-4">No improvements found</p>
          <Button variant="secondary" onClick={() => setShowCreateModal(true)}>
            Suggest First Improvement
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {improvements.map(improvement => (
            <div
              key={improvement.id}
              className="bg-slate-900/50 border border-slate-700 rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{improvement.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(improvement.improvement_type)}`}>
                      {improvement.improvement_type.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(improvement.status)}`}>
                      {improvement.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-2">{improvement.description}</p>
                  {improvement.suggested_by_name && (
                    <p className="text-xs text-slate-500">Suggested by: {improvement.suggested_by_name}</p>
                  )}
                </div>
                <span className={`text-sm ${getPriorityColor(improvement.priority)}`}>
                  {improvement.priority} priority
                </span>
              </div>

              {improvement.current_state && (
                <div className="mb-3 p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">Current State:</div>
                  <div className="text-sm text-slate-300">{improvement.current_state}</div>
                </div>
              )}

              <div className="mb-3 p-3 bg-bio-900/20 border border-bio-500/20 rounded-lg">
                <div className="text-xs text-bio-400 mb-1">Proposed Change:</div>
                <div className="text-sm text-slate-300">{improvement.proposed_change}</div>
              </div>

              {improvement.expected_benefit && (
                <div className="mb-3 p-3 bg-green-900/20 border border-green-500/20 rounded-lg">
                  <div className="text-xs text-green-400 mb-1">Expected Benefit:</div>
                  <div className="text-sm text-slate-300">{improvement.expected_benefit}</div>
                </div>
              )}

              {improvement.implementation_notes && (
                <div className="mb-3 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
                  <div className="text-xs text-blue-400 mb-1">Implementation Notes:</div>
                  <div className="text-sm text-slate-300">{improvement.implementation_notes}</div>
                </div>
              )}

              {improvement.status === 'pending' && (
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="secondary"
                    className="text-sm px-3 py-1.5"
                    onClick={() => handleUpdateStatus(improvement.id, 'in_progress')}
                  >
                    Start
                  </Button>
                  <Button
                    variant="secondary"
                    className="text-sm px-3 py-1.5"
                    onClick={() => handleUpdateStatus(improvement.id, 'completed')}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-sm px-3 py-1.5"
                    onClick={() => handleUpdateStatus(improvement.id, 'rejected')}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1120] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Suggest Improvement</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">Improvement Type</label>
                <select
                  value={formData.improvementType}
                  onChange={(e) => setFormData({ ...formData, improvementType: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-bio-500 outline-none"
                >
                  <option value="optimization">Optimization</option>
                  <option value="bug_fix">Bug Fix</option>
                  <option value="feature_add">Feature Add</option>
                  <option value="refactor">Refactor</option>
                  <option value="performance">Performance</option>
                </select>
              </div>
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
              <TextArea
                label="Current State (Optional)"
                value={formData.currentState}
                onChange={(e) => setFormData({ ...formData, currentState: e.target.value })}
              />
              <TextArea
                label="Proposed Change"
                value={formData.proposedChange}
                onChange={(e) => setFormData({ ...formData, proposedChange: e.target.value })}
                required
              />
              <TextArea
                label="Expected Benefit (Optional)"
                value={formData.expectedBenefit}
                onChange={(e) => setFormData({ ...formData, expectedBenefit: e.target.value })}
              />
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
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit">Submit Improvement</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Improvements;

