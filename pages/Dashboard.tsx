import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { statisticsApi, algorithmApi } from '../services/api';
import { Table, Column } from '../components/Table';
import { BarChart3, TrendingUp, Activity, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

interface AlgorithmStat {
  id: number;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
  score: number;
  verdict: string;
  version_count: number;
  comment_count: number;
  like_count: number;
  favorite_count: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<any>(null);
  const [algorithms, setAlgorithms] = useState<AlgorithmStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewData, algorithmsData] = await Promise.all([
        statisticsApi.getOverview(),
        statisticsApi.getAlgorithms()
      ]);
      setOverview(overviewData);
      setAlgorithms(algorithmsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const algorithmColumns: Column<AlgorithmStat>[] = [
    {
      key: 'name',
      header: 'Algorithm',
      sortable: true,
      render: (algo) => (
        <button
          onClick={() => navigate(`/algorithm/${algo.id}`)}
          className="text-bio-400 hover:text-bio-300 font-medium text-left"
        >
          {algo.name}
        </button>
      )
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (algo) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          algo.type === 'hybrid' 
            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' 
            : 'bg-bio-500/10 text-bio-400 border border-bio-500/30'
        }`}>
          {algo.type}
        </span>
      )
    },
    {
      key: 'score',
      header: 'Score',
      sortable: true,
      render: (algo) => (
        <div className="flex items-center gap-2">
          {algo.score > 0 ? (
            <>
              <span className={`font-bold ${
                algo.score > 70 ? 'text-emerald-400' :
                algo.score > 40 ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {Math.round(algo.score)}
              </span>
              <span className="text-xs text-slate-500">/100</span>
            </>
          ) : (
            <span className="text-slate-500 text-xs">Not analyzed</span>
          )}
        </div>
      )
    },
    {
      key: 'version_count',
      header: 'Versions',
      sortable: true,
      render: (algo) => <span className="text-slate-400">{algo.version_count || 0}</span>
    },
    {
      key: 'like_count',
      header: 'Likes',
      sortable: true,
      render: (algo) => <span className="text-slate-400">{algo.like_count || 0}</span>
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (algo) => (
        <span className="text-xs text-slate-500">
          {new Date(algo.created_at).toLocaleDateString()}
        </span>
      )
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Overview of your algorithms and activity</p>
      </div>

      {/* Stats Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Total Algorithms</span>
              <Activity className="text-bio-400" size={20} />
            </div>
            <div className="text-3xl font-bold text-white">{overview.algorithms?.total || 0}</div>
            <div className="text-xs text-slate-500 mt-1">
              {overview.algorithms?.byType?.generated || 0} generated, {overview.algorithms?.byType?.hybrid || 0} hybrid
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Total Jobs</span>
              <Clock className="text-blue-400" size={20} />
            </div>
            <div className="text-3xl font-bold text-white">{overview.jobs?.total || 0}</div>
            <div className="text-xs text-slate-500 mt-1">
              {overview.jobs?.successRate || '0.0'}% success rate
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Avg Score</span>
              <BarChart3 className="text-purple-400" size={20} />
            </div>
            <div className="text-3xl font-bold text-white">
              {overview.scores?.average || 'N/A'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Algorithm quality</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Success Rate</span>
              <CheckCircle className="text-emerald-400" size={20} />
            </div>
            <div className="text-3xl font-bold text-white">
              {overview.jobs?.successful || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {overview.jobs?.failed || 0} failed
            </div>
          </div>
        </div>
      )}

      {/* Top Tags */}
      {overview?.topTags && overview.topTags.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top Tags</h2>
          <div className="flex flex-wrap gap-2">
            {overview.topTags.map((tag: any, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1 text-sm rounded-full bg-bio-500/10 text-bio-400 border border-bio-500/30"
              >
                #{tag.tag} ({tag.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Algorithms Table */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Algorithms</h2>
          <button
            onClick={() => navigate('/library')}
            className="text-sm text-bio-400 hover:text-bio-300 flex items-center gap-1"
          >
            View All <ArrowRight size={16} />
          </button>
        </div>
        <Table
          data={algorithms.slice(0, 10)}
          columns={algorithmColumns}
          onRowClick={(algo) => navigate(`/algorithm/${algo.id}`)}
          emptyMessage="No algorithms yet. Create your first one!"
        />
      </div>
    </div>
  );
};

export default Dashboard;

