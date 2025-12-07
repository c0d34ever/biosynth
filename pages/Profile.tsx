import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Database, Activity, TrendingUp, Award, Clock } from 'lucide-react';
import { authApi, algorithmApi, jobApi } from '../services/api';
import { CardSkeleton, ListSkeleton } from '../components/LoadingSkeleton';
import { toast } from '../components/Toast';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentAlgorithms, setRecentAlgorithms] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      
      // Get user's algorithms and jobs
      const algorithms = await algorithmApi.getAll().catch(() => []);
      const jobs = await jobApi.getAll().catch(() => []);
      
      // Calculate stats - algorithms are already filtered by user in the API
      const userAlgorithms = algorithms;
      const userJobs = jobs.filter((j: any) => j.userId === userData.id);
      const completedJobs = userJobs.filter((j: any) => j.status === 'completed');
      const failedJobs = userJobs.filter((j: any) => j.status === 'failed');
      
      setStats({
        totalAlgorithms: userAlgorithms.length,
        totalJobs: userJobs.length,
        completedJobs: completedJobs.length,
        failedJobs: failedJobs.length,
        successRate: userJobs.length > 0 
          ? Math.round((completedJobs.length / userJobs.length) * 100) 
          : 0
      });

      // Get recent algorithms
      setRecentAlgorithms(
        userAlgorithms
          .sort((a: any, b: any) => b.createdAt - a.createdAt)
          .slice(0, 5)
      );

      // Get recent jobs
      setRecentJobs(
        userJobs
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
      );
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <ListSkeleton items={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <User className="text-bio-400" size={32} />
            Profile
          </h1>
          <p className="text-slate-400">View your account information and activity</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-bio-500 to-bio-900 flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              {user?.name || 'User'}
            </h2>
            <div className="space-y-2 text-slate-400">
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>
                  Member since {user?.createdAt 
                    ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Award size={16} />
                <span className="capitalize">{user?.role || 'user'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
              <Database size={24} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {stats?.totalAlgorithms || 0}
          </div>
          <div className="text-sm text-slate-500">Total Algorithms</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
              <Activity size={24} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {stats?.totalJobs || 0}
          </div>
          <div className="text-sm text-slate-500">Total Jobs</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {stats?.successRate || 0}%
          </div>
          <div className="text-sm text-slate-500">Success Rate</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400">
              <Clock size={24} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {stats?.completedJobs || 0}
          </div>
          <div className="text-sm text-slate-500">Completed Jobs</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Algorithms */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Recent Algorithms</h3>
          {recentAlgorithms.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Database size={48} className="mx-auto mb-4 opacity-50" />
              <p>No algorithms yet</p>
              <button
                onClick={() => navigate('/generate')}
                className="mt-4 text-bio-400 hover:text-bio-300"
              >
                Create your first algorithm →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAlgorithms.map((algo) => (
                <div
                  key={algo.id}
                  onClick={() => navigate(`/algorithm/${algo.id}`)}
                  className="p-4 bg-slate-800 rounded-lg hover:bg-slate-800/80 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-white">{algo.name}</h4>
                    <span className="text-xs text-slate-500">
                      {new Date(algo.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">{algo.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Jobs */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Recent Jobs</h3>
          {recentJobs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Activity size={48} className="mx-auto mb-4 opacity-50" />
              <p>No jobs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 bg-slate-800 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-white capitalize">{job.jobType}</h4>
                      <span className={`text-xs px-2 py-1 rounded ${
                        job.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        job.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {job.errorMessage && (
                    <p className="text-xs text-red-400 mt-2 line-clamp-2">{job.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

