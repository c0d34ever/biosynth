import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi, algorithmApi } from '../services/api';
import { Button } from '../components/Button';
import { Table, Column } from '../components/Table';
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { BarChart, LineChart, PieChart } from '../components/Chart';

const Analytics: React.FC = () => {
  const [algorithms, setAlgorithms] = useState<any[]>([]);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreForm, setScoreForm] = useState({
    feasibilityScore: 50,
    efficiencyScore: 50,
    innovationScore: 50,
    scalabilityScore: 50,
    robustnessScore: 50,
    notes: '',
  });

  useEffect(() => {
    loadAlgorithms();
  }, []);

  useEffect(() => {
    if (selectedAlgorithm) {
      loadAnalytics();
    }
  }, [selectedAlgorithm]);

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

  const loadAnalytics = async () => {
    if (!selectedAlgorithm) return;
    try {
      setLoading(true);
      const data = await analyticsApi.getComprehensive(selectedAlgorithm);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlgorithm) return;
    try {
      await analyticsApi.createScore(selectedAlgorithm, scoreForm);
      setShowScoreModal(false);
      setScoreForm({
        feasibilityScore: 50,
        efficiencyScore: 50,
        innovationScore: 50,
        scalabilityScore: 50,
        robustnessScore: 50,
        notes: '',
      });
      loadAnalytics();
    } catch (error: any) {
      alert('Failed to submit score: ' + error.message);
    }
  };

  const ScoreBar = ({ label, value, max = 100 }: { label: string; value: number; max?: number }) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-medium">{value}/{max}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-bio-500 to-bio-400 transition-all duration-500"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="text-bio-400" /> Algorithm Analytics
          </h1>
          <p className="text-slate-400">
            Analyze algorithm performance, gaps, strengths, and weaknesses
          </p>
        </div>
        {selectedAlgorithm && (
          <Button onClick={() => setShowScoreModal(true)}>
            Add Score
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

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading analytics...</div>
      ) : !selectedAlgorithm ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
          <BarChart3 className="mx-auto mb-4 text-slate-600" size={48} />
          <p className="text-slate-500">Select an algorithm to view analytics</p>
        </div>
      ) : analytics ? (
        <div className="space-y-6">
          {/* Overall Scores */}
          {analytics.scores && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Overall Scores</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-bio-400 mb-2">
                      {analytics.scores.avg_score ? Math.round(analytics.scores.avg_score) : 'N/A'}
                    </div>
                    <div className="text-sm text-slate-500">Average Score ({analytics.scores.score_count || 0} ratings)</div>
                  </div>
                </div>
                {analytics.scores.individual_scores && analytics.scores.individual_scores.length > 0 && (
                  <BarChart
                    data={[
                      { label: 'Feasibility', value: analytics.scores.individual_scores[0]?.feasibility_score || 0 },
                      { label: 'Efficiency', value: analytics.scores.individual_scores[0]?.efficiency_score || 0 },
                      { label: 'Innovation', value: analytics.scores.individual_scores[0]?.innovation_score || 0 },
                      { label: 'Scalability', value: analytics.scores.individual_scores[0]?.scalability_score || 0 },
                      { label: 'Robustness', value: analytics.scores.individual_scores[0]?.robustness_score || 0 },
                    ]}
                    title="Score Breakdown"
                    height={200}
                  />
                )}
              </div>
            </div>
          )}

          {/* Gaps */}
          {analytics.gaps && analytics.gaps.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="text-yellow-400" size={20} />
                Identified Gaps
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {analytics.gaps.map((gap: any, idx: number) => (
                    <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-white">{gap.gap_type}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          gap.severity === 'high' ? 'bg-red-500/10 text-red-400' :
                          gap.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {gap.severity}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">Count: {gap.count}</div>
                    </div>
                  ))}
                </div>
                <PieChart
                  data={analytics.gaps.map((gap: any) => ({
                    label: gap.gap_type,
                    value: gap.count || 0,
                    color: gap.severity === 'high' ? '#ef4444' :
                           gap.severity === 'medium' ? '#f59e0b' : '#3b82f6'
                  }))}
                  title="Gaps Distribution"
                />
              </div>
            </div>
          )}

          {/* Strengths */}
          {analytics.strengths && analytics.strengths.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-400" size={20} />
                Strengths
              </h2>
              <div className="space-y-3">
                {analytics.strengths.map((strength: any, idx: number) => (
                  <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-white">{strength.strength_type}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        strength.impact_level === 'high' ? 'bg-green-500/10 text-green-400' :
                        strength.impact_level === 'medium' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-slate-500/10 text-slate-400'
                      }`}>
                        {strength.impact_level} impact
                      </span>
                    </div>
                    <div className="text-sm text-slate-400">Count: {strength.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weaknesses */}
          {analytics.weaknesses && analytics.weaknesses.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingDown className="text-red-400" size={20} />
                Weaknesses
              </h2>
              <div className="space-y-3">
                {analytics.weaknesses.map((weakness: any, idx: number) => (
                  <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-white">{weakness.weakness_type}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        weakness.severity === 'high' ? 'bg-red-500/10 text-red-400' :
                        weakness.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {weakness.severity}
                      </span>
                    </div>
                    <div className="text-sm text-slate-400">Count: {weakness.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metrics */}
          {analytics.metrics && analytics.metrics.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Performance Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analytics.metrics.map((metric: any, idx: number) => (
                  <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">{metric.metric_type}</div>
                    <div className="text-lg font-semibold text-white">
                      Avg: {metric.avg_value ? Math.round(metric.avg_value * 100) / 100 : 'N/A'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Range: {metric.min_value || 'N/A'} - {metric.max_value || 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
          <p className="text-slate-500">No analytics data available</p>
        </div>
      )}

      {/* Score Modal */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1120] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Add Algorithm Score</h2>
              <button onClick={() => setShowScoreModal(false)} className="text-slate-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmitScore} className="flex-1 overflow-y-auto p-6 space-y-6">
              <ScoreBar label="Feasibility" value={scoreForm.feasibilityScore} />
              <input
                type="range"
                min="0"
                max="100"
                value={scoreForm.feasibilityScore}
                onChange={(e) => setScoreForm({ ...scoreForm, feasibilityScore: parseInt(e.target.value) })}
                className="w-full"
              />
              <ScoreBar label="Efficiency" value={scoreForm.efficiencyScore} />
              <input
                type="range"
                min="0"
                max="100"
                value={scoreForm.efficiencyScore}
                onChange={(e) => setScoreForm({ ...scoreForm, efficiencyScore: parseInt(e.target.value) })}
                className="w-full"
              />
              <ScoreBar label="Innovation" value={scoreForm.innovationScore} />
              <input
                type="range"
                min="0"
                max="100"
                value={scoreForm.innovationScore}
                onChange={(e) => setScoreForm({ ...scoreForm, innovationScore: parseInt(e.target.value) })}
                className="w-full"
              />
              <ScoreBar label="Scalability" value={scoreForm.scalabilityScore} />
              <input
                type="range"
                min="0"
                max="100"
                value={scoreForm.scalabilityScore}
                onChange={(e) => setScoreForm({ ...scoreForm, scalabilityScore: parseInt(e.target.value) })}
                className="w-full"
              />
              <ScoreBar label="Robustness" value={scoreForm.robustnessScore} />
              <input
                type="range"
                min="0"
                max="100"
                value={scoreForm.robustnessScore}
                onChange={(e) => setScoreForm({ ...scoreForm, robustnessScore: parseInt(e.target.value) })}
                className="w-full"
              />
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">Notes (Optional)</label>
                <textarea
                  value={scoreForm.notes}
                  onChange={(e) => setScoreForm({ ...scoreForm, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-bio-500 outline-none min-h-[100px]"
                  placeholder="Additional notes about this scoring..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setShowScoreModal(false)}>Cancel</Button>
                <Button type="submit">Submit Score</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;

