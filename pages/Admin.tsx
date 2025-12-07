import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { request, adminApi, automationApi } from '../services/api';
import { activityLogsApi } from '../services/api';
import { 
  Users, Database, Activity, TrendingUp, Shield, Trash2, Edit2, Search, 
  Filter, Settings, FileText, AlertCircle, CheckCircle, XCircle, Clock,
  BarChart3, Server, HardDrive, Cpu, Zap, Eye, Ban, RefreshCw, Download, Network, Wrench
} from 'lucide-react';
import { Button } from '../components/Button';
import { Table } from '../components/Table';
import { UserModal, AlgorithmModal } from '../components/AdminModals';
import { Input } from '../components/Input';
import { FileUpload } from '../components/FileUpload';
import { importFromJSON } from '../utils/import';
import { toast } from '../components/Toast';
import { UserPlus, Upload, CheckSquare, Square, X } from 'lucide-react';

interface Stats {
  totalUsers?: number;
  adminUsers?: number;
  newUsersLast7Days?: number;
  totalAlgorithms?: number;
  generatedAlgorithms?: number;
  hybridAlgorithms?: number;
  newAlgorithmsLast7Days?: number;
  totalJobs?: number;
  pendingJobs?: number;
  processingJobs?: number;
  completedJobs?: number;
  failedJobs?: number;
  totalCodeGenerations?: number;
  totalExecutions?: number;
  totalExports?: number;
  systemHealth?: 'healthy' | 'warning' | 'critical';
}

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  algorithm_count?: number;
  job_count?: number;
}

interface Algorithm {
  id: number;
  name: string;
  type: string;
  createdAt: string;
  userEmail: string;
  userName: string;
  score?: number;
}

interface Job {
  id: number;
  jobType: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  userEmail?: string;
}

type Tab = 'overview' | 'users' | 'algorithms' | 'jobs' | 'system' | 'logs';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats>({});
  const [users, setUsers] = useState<User[]>([]);
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [algoSearch, setAlgoSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
  
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm | null>(null);
  const [showAlgorithmModal, setShowAlgorithmModal] = useState(false);
  const [algorithmModalMode, setAlgorithmModalMode] = useState<'create' | 'edit'>('create');
  
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  
  // Bulk selection
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedAlgorithmIds, setSelectedAlgorithmIds] = useState<number[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);
  
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Automation state
  const [automationStatus, setAutomationStatus] = useState<any>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);
  const [automationLogs, setAutomationLogs] = useState<any[]>([]);
  const [runningAutomation, setRunningAutomation] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [activeTab, currentPage, userRoleFilter, jobStatusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'overview') {
        const [userStats, algoStats, jobStats, systemStats] = await Promise.all([
          adminApi.getStats('users'),
          adminApi.getStats('algorithms'),
          adminApi.getStats('jobs'),
          adminApi.getStats('system'),
        ]);
        setStats({ ...userStats, ...algoStats, ...jobStats, ...systemStats });
      } else if (activeTab === 'users') {
        const response = await adminApi.getUsers({
          page: currentPage,
          limit: 20,
          search: userSearch,
          role: userRoleFilter === 'all' ? undefined : userRoleFilter
        });
        setUsers(response.users);
        setTotalPages(Math.ceil(response.total / 20));
      } else if (activeTab === 'algorithms') {
        const response = await adminApi.getAlgorithms();
        setAlgorithms(response.filter(a => 
          !algoSearch || a.name.toLowerCase().includes(algoSearch.toLowerCase()) ||
          a.userEmail.toLowerCase().includes(algoSearch.toLowerCase())
        ));
      } else if (activeTab === 'jobs') {
        const response = await adminApi.getJobs();
        setJobs(response.filter(j =>
          jobStatusFilter === 'all' || j.status === jobStatusFilter
        ));
      } else if (activeTab === 'system') {
        const [status, scheduler, logs] = await Promise.all([
          automationApi.getStatus(),
          automationApi.getSchedulerStatus(),
          automationApi.getLogs({ limit: 50 })
        ]);
        setAutomationStatus(status);
        setSchedulerStatus(scheduler);
        setAutomationLogs(logs);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: number, role: string) => {
    try {
      await adminApi.updateUserRole(userId, role);
      loadData();
      toast.success('User role updated');
    } catch (error: any) {
      console.error('Failed to update user role:', error);
      toast.error(error.message || 'Failed to update user role');
    }
  };
  
  const handleCreateUser = () => {
    setUserModalMode('create');
    setSelectedUser(null);
    setShowUserModal(true);
  };
  
  const handleEditUser = (user: User) => {
    setUserModalMode('edit');
    setSelectedUser(user);
    setShowUserModal(true);
  };
  
  const handleSaveUser = async (userData: any) => {
    try {
      if (userModalMode === 'create') {
        await adminApi.createUser(userData);
        toast.success('User created successfully');
      } else if (selectedUser) {
        await adminApi.updateUser(selectedUser.id, userData);
        toast.success('User updated successfully');
      }
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save user');
      throw error;
    }
  };
  
  const handleCreateAlgorithm = () => {
    setAlgorithmModalMode('create');
    setSelectedAlgorithm(null);
    setShowAlgorithmModal(true);
  };
  
  const handleEditAlgorithm = (algorithm: Algorithm) => {
    setAlgorithmModalMode('edit');
    setSelectedAlgorithm(algorithm);
    setShowAlgorithmModal(true);
  };
  
  const handleSaveAlgorithm = async (algorithmData: any) => {
    try {
      if (algorithmModalMode === 'create') {
        const { algorithmApi } = await import('../services/api');
        await algorithmApi.create(algorithmData);
        toast.success('Algorithm created successfully');
      } else if (selectedAlgorithm) {
        await adminApi.updateAlgorithm(selectedAlgorithm.id, algorithmData);
        toast.success('Algorithm updated successfully');
      }
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save algorithm');
      throw error;
    }
  };
  
  const handleBulkDeleteUsers = async () => {
    if (selectedUserIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedUserIds.length} user(s)?`)) return;
    
    try {
      await adminApi.bulkDeleteUsers(selectedUserIds);
      toast.success(`${selectedUserIds.length} user(s) deleted`);
      setSelectedUserIds([]);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete users');
    }
  };
  
  const handleBulkDeleteAlgorithms = async () => {
    if (selectedAlgorithmIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedAlgorithmIds.length} algorithm(s)?`)) return;
    
    try {
      await adminApi.bulkDeleteAlgorithms(selectedAlgorithmIds);
      toast.success(`${selectedAlgorithmIds.length} algorithm(s) deleted`);
      setSelectedAlgorithmIds([]);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete algorithms');
    }
  };
  
  const handleBulkDeleteJobs = async () => {
    if (selectedJobIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedJobIds.length} job(s)?`)) return;
    
    try {
      await adminApi.bulkDeleteJobs(selectedJobIds);
      toast.success(`${selectedJobIds.length} job(s) deleted`);
      setSelectedJobIds([]);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete jobs');
    }
  };
  
  const handleImportAlgorithms = async (files: File[]) => {
    try {
      let importedCount = 0;
      for (const file of files) {
        const result = await importFromJSON(file);
        if (result.success && result.algorithms.length > 0) {
          const { algorithmApi } = await import('../services/api');
          for (const algo of result.algorithms) {
            try {
              await algorithmApi.create(algo);
              importedCount++;
            } catch (error) {
              console.error('Failed to import algorithm:', error);
            }
          }
        }
      }
      toast.success(`Imported ${importedCount} algorithm(s)`);
      setShowImportModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to import algorithms');
    }
  };
  
  const handleTriggerAutomation = async (task: 'generate' | 'synthesize' | 'improve' | 'all') => {
    setRunningAutomation(task);
    try {
      await automationApi.triggerAutomation(task);
      toast.success(`Automation task "${task}" completed successfully`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to trigger automation');
    } finally {
      setRunningAutomation(null);
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their algorithms and data.')) return;
    try {
      await adminApi.deleteUser(userId);
      toast.success('User deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const deleteAlgorithm = async (algorithmId: number) => {
    if (!confirm('Are you sure you want to delete this algorithm?')) return;
    try {
      await adminApi.deleteAlgorithm(algorithmId);
      toast.success('Algorithm deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Failed to delete algorithm:', error);
      toast.error(error.message || 'Failed to delete algorithm');
    }
  };

  const cancelJob = async (jobId: number) => {
    try {
      await adminApi.cancelJob(jobId);
      toast.success('Job cancelled');
      loadData();
    } catch (error: any) {
      console.error('Failed to cancel job:', error);
      toast.error(error.message || 'Failed to cancel job');
    }
  };

  const retryJob = async (jobId: number) => {
    try {
      await adminApi.retryJob(jobId);
      toast.success('Job queued for retry');
      loadData();
    } catch (error: any) {
      console.error('Failed to retry job:', error);
      toast.error(error.message || 'Failed to retry job');
    }
  };

  const deleteJob = async (jobId: number) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    try {
      await adminApi.deleteJob(jobId);
      toast.success('Job deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Failed to delete job:', error);
      toast.error(error.message || 'Failed to delete job');
    }
  };

  const exportData = async (type: 'users' | 'algorithms' | 'jobs') => {
    try {
      const blob = await adminApi.exportData(type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'algorithms', label: 'Algorithms', icon: Database },
    { id: 'jobs', label: 'Jobs', icon: Activity },
    { id: 'system', label: 'System', icon: Settings },
    { id: 'logs', label: 'Logs', icon: FileText },
  ];

  if (loading && activeTab === 'overview') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Shield className="text-yellow-500" /> Admin Panel
          </h1>
          <p className="text-slate-400">Full system control and monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'users' && (
            <>
              <Button onClick={handleCreateUser} variant="primary" className="flex items-center gap-2">
                <UserPlus size={16} /> Create User
              </Button>
              {selectedUserIds.length > 0 && (
                <Button onClick={handleBulkDeleteUsers} variant="secondary" className="flex items-center gap-2 text-red-400">
                  <Trash2 size={16} /> Delete Selected ({selectedUserIds.length})
                </Button>
              )}
              <Button onClick={() => exportData('users')} variant="secondary" className="flex items-center gap-2">
                <Download size={16} /> Export
              </Button>
            </>
          )}
          {activeTab === 'algorithms' && (
            <>
              <Button onClick={handleCreateAlgorithm} variant="primary" className="flex items-center gap-2">
                <UserPlus size={16} /> Create Algorithm
              </Button>
              <Button onClick={() => setShowImportModal(true)} variant="secondary" className="flex items-center gap-2">
                <Upload size={16} /> Import
              </Button>
              {selectedAlgorithmIds.length > 0 && (
                <Button onClick={handleBulkDeleteAlgorithms} variant="secondary" className="flex items-center gap-2 text-red-400">
                  <Trash2 size={16} /> Delete Selected ({selectedAlgorithmIds.length})
                </Button>
              )}
              <Button onClick={() => exportData('algorithms')} variant="secondary" className="flex items-center gap-2">
                <Download size={16} /> Export
              </Button>
            </>
          )}
          {activeTab === 'jobs' && (
            <>
              {selectedJobIds.length > 0 && (
                <Button onClick={handleBulkDeleteJobs} variant="secondary" className="flex items-center gap-2 text-red-400">
                  <Trash2 size={16} /> Delete Selected ({selectedJobIds.length})
                </Button>
              )}
              <Button onClick={() => exportData('jobs')} variant="secondary" className="flex items-center gap-2">
                <Download size={16} /> Export
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as Tab);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-bio-500 text-bio-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* System Health */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Server size={20} className="text-bio-400" />
              System Health
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${
                  stats.systemHealth === 'healthy' ? 'bg-emerald-500' :
                  stats.systemHealth === 'warning' ? 'bg-amber-500' :
                  'bg-red-500'
                } animate-pulse`}></div>
                <div>
                  <div className="text-sm text-slate-400">Status</div>
                  <div className="text-lg font-bold text-white capitalize">
                    {stats.systemHealth || 'healthy'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg">
                <Cpu size={20} className="text-blue-400" />
                <div>
                  <div className="text-sm text-slate-400">CPU Usage</div>
                  <div className="text-lg font-bold text-white">Normal</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg">
                <HardDrive size={20} className="text-purple-400" />
                <div>
                  <div className="text-sm text-slate-400">Database</div>
                  <div className="text-lg font-bold text-white">Connected</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                  <Users size={24} />
                </div>
                <span className="text-2xl font-bold text-white">{stats.totalUsers || 0}</span>
              </div>
              <div className="text-sm text-slate-500">Total Users</div>
              <div className="text-xs text-slate-600 mt-1">
                {stats.newUsersLast7Days || 0} new this week • {stats.adminUsers || 0} admins
              </div>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
                  <Database size={24} />
                </div>
                <span className="text-2xl font-bold text-white">{stats.totalAlgorithms || 0}</span>
              </div>
              <div className="text-sm text-slate-500">Total Algorithms</div>
              <div className="text-xs text-slate-600 mt-1">
                {stats.newAlgorithmsLast7Days || 0} new this week • {stats.generatedAlgorithms || 0} generated
              </div>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
                  <Activity size={24} />
                </div>
                <span className="text-2xl font-bold text-white">{stats.totalJobs || 0}</span>
              </div>
              <div className="text-sm text-slate-500">Total Jobs</div>
              <div className="text-xs text-slate-600 mt-1">
                {stats.completedJobs || 0} completed • {stats.failedJobs || 0} failed
              </div>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400">
                  <TrendingUp size={24} />
                </div>
                <span className="text-2xl font-bold text-white">{stats.pendingJobs || 0}</span>
              </div>
              <div className="text-sm text-slate-500">Pending Jobs</div>
              <div className="text-xs text-slate-600 mt-1">
                {stats.processingJobs || 0} processing
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-sm text-slate-500 mb-2">Code Generations</div>
              <div className="text-2xl font-bold text-white">{stats.totalCodeGenerations || 0}</div>
            </div>
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-sm text-slate-500 mb-2">Code Executions</div>
              <div className="text-2xl font-bold text-white">{stats.totalExecutions || 0}</div>
            </div>
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-sm text-slate-500 mb-2">Exports</div>
              <div className="text-2xl font-bold text-white">{stats.totalExports || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setCurrentPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    loadData();
                  }
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-bio-500"
              />
            </div>
            <select
              value={userRoleFilter}
              onChange={(e) => {
                setUserRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-bio-500"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <Button onClick={loadData} variant="secondary">
              <RefreshCw size={16} />
            </Button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <Table
              columns={[
                { 
                  key: 'email', 
                  header: 'Email', 
                  sortable: true,
                  render: (user) => <span className="text-slate-300">{user.email}</span>
                },
                { 
                  key: 'name', 
                  header: 'Name', 
                  sortable: true,
                  render: (user) => <span className="text-white">{user.name || 'N/A'}</span>
                },
                { 
                  key: 'role', 
                  header: 'Role',
                  render: (user) => (
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  )
                },
                { 
                  key: 'algorithm_count', 
                  header: 'Algorithms',
                  render: (user) => <span className="text-slate-300">{user.algorithm_count || 0}</span>
                },
                { 
                  key: 'job_count', 
                  header: 'Jobs',
                  render: (user) => <span className="text-slate-300">{user.job_count || 0}</span>
                },
                { 
                  key: 'createdAt', 
                  header: 'Joined',
                  render: (user) => (
                    <span className="text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  )
                },
                { 
                  key: 'select',
                  header: '',
                  render: (user) => (
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setSelectedUserIds([...selectedUserIds, user.id]);
                        } else {
                          setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-bio-500 focus:ring-bio-500"
                    />
                  )
                },
                { 
                  key: 'actions', 
                  header: 'Actions',
                  render: (user) => (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditUser(user);
                        }}
                        className="text-blue-400 hover:text-blue-300"
                        title="Edit User"
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteUser(user.id);
                        }}
                        className="text-red-400 hover:text-red-300"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )
                }
              ]}
              data={users || []}
              loading={loading}
              emptyMessage="No users found"
              pagination={totalPages > 1}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* Algorithms Tab */}
      {activeTab === 'algorithms' && (
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search algorithms..."
                value={algoSearch}
                onChange={(e) => setAlgoSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-bio-500"
              />
            </div>
            <Button onClick={loadData} variant="secondary">
              <RefreshCw size={16} />
            </Button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <Table
              columns={[
                { 
                  key: 'name', 
                  header: 'Algorithm', 
                  sortable: true,
                  render: (algo) => (
                    <span className="font-medium text-white">{algo.name}</span>
                  )
                },
                { 
                  key: 'type', 
                  header: 'Type',
                  render: (algo) => (
                    <span className={`px-2 py-1 text-xs rounded ${
                      algo.type === 'hybrid' ? 'bg-purple-500/20 text-purple-400' : 'bg-bio-500/20 text-bio-400'
                    }`}>
                      {algo.type}
                    </span>
                  )
                },
                { 
                  key: 'userEmail', 
                  header: 'Owner',
                  render: (algo) => (
                    <span className="text-slate-300">{algo.userEmail || 'N/A'}</span>
                  )
                },
                { 
                  key: 'score', 
                  header: 'Score',
                  render: (algo) => (
                    algo.score ? (
                      <span className={`font-bold ${
                        algo.score >= 80 ? 'text-emerald-400' :
                        algo.score >= 60 ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {algo.score}
                      </span>
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )
                  )
                },
                { 
                  key: 'createdAt', 
                  header: 'Created',
                  render: (algo) => (
                    <span className="text-slate-400">
                      {new Date(algo.createdAt).toLocaleDateString()}
                    </span>
                  )
                },
                { 
                  key: 'select',
                  header: '',
                  render: (algo) => (
                    <input
                      type="checkbox"
                      checked={selectedAlgorithmIds.includes(algo.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setSelectedAlgorithmIds([...selectedAlgorithmIds, algo.id]);
                        } else {
                          setSelectedAlgorithmIds(selectedAlgorithmIds.filter(id => id !== algo.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-bio-500 focus:ring-bio-500"
                    />
                  )
                },
                { 
                  key: 'actions', 
                  header: 'Actions',
                  render: (algo) => (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/algorithm/${algo.id}`);
                        }}
                        className="text-blue-400 hover:text-blue-300"
                        title="View Algorithm"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAlgorithm(algo);
                        }}
                        className="text-amber-400 hover:text-amber-300"
                        title="Edit Algorithm"
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAlgorithm(algo.id);
                        }}
                        className="text-red-400 hover:text-red-300"
                        title="Delete Algorithm"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )
                }
              ]}
              data={algorithms || []}
              loading={loading}
              emptyMessage="No algorithms found"
              onRowClick={(row) => navigate(`/algorithm/${row.id}`)}
            />
          </div>
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <select
              value={jobStatusFilter}
              onChange={(e) => {
                setJobStatusFilter(e.target.value);
                loadData();
              }}
              className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-bio-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <Button onClick={loadData} variant="secondary">
              <RefreshCw size={16} />
            </Button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <Table
              columns={[
                { 
                  key: 'id', 
                  header: 'ID',
                  render: (job) => (
                    <span className="font-mono text-xs text-slate-400">{job.id}</span>
                  )
                },
                { 
                  key: 'jobType', 
                  header: 'Type',
                  render: (job) => (
                    <span className="text-slate-300 capitalize">{job.jobType || 'N/A'}</span>
                  )
                },
                { 
                  key: 'status', 
                  header: 'Status',
                  render: (job) => (
                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                      job.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                      job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      job.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {job.status}
                    </span>
                  )
                },
                { 
                  key: 'userEmail', 
                  header: 'User',
                  render: (job) => (
                    <span className="text-slate-300">{job.userEmail || 'N/A'}</span>
                  )
                },
                { 
                  key: 'createdAt', 
                  header: 'Created',
                  render: (job) => (
                    <span className="text-slate-400">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  )
                },
                { 
                  key: 'completedAt', 
                  header: 'Completed',
                  render: (job) => (
                    <span className="text-slate-400">
                      {job.completedAt ? new Date(job.completedAt).toLocaleDateString() : '-'}
                    </span>
                  )
                },
                { 
                  key: 'select',
                  header: '',
                  render: (job) => (
                    <input
                      type="checkbox"
                      checked={selectedJobIds.includes(job.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setSelectedJobIds([...selectedJobIds, job.id]);
                        } else {
                          setSelectedJobIds(selectedJobIds.filter(id => id !== job.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-bio-500 focus:ring-bio-500"
                    />
                  )
                },
                { 
                  key: 'actions', 
                  header: 'Actions',
                  render: (job) => (
                    <div className="flex gap-2">
                      {job.status === 'pending' || job.status === 'processing' ? (
                        <Button
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelJob(job.id);
                          }}
                          className="text-amber-400 hover:text-amber-300"
                          title="Cancel Job"
                        >
                          <XCircle size={16} />
                        </Button>
                      ) : null}
                      {job.status === 'failed' && (
                        <Button
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            retryJob(job.id);
                          }}
                          className="text-blue-400 hover:text-blue-300"
                          title="Retry Job"
                        >
                          <RefreshCw size={16} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteJob(job.id);
                        }}
                        className="text-red-400 hover:text-red-300"
                        title="Delete Job"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )
                }
              ]}
              data={jobs || []}
              loading={loading}
              emptyMessage="No jobs found"
            />
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Automation Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap size={20} className="text-bio-400" />
              Automation Status
            </h2>
            
            {schedulerStatus && (
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${schedulerStatus.enabled ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
                  <div>
                    <div className="text-sm text-slate-400">Scheduler Status</div>
                    <div className="text-lg font-bold text-white">
                      {schedulerStatus.enabled ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">Full Automation</div>
                    <div className="text-sm font-mono text-bio-400">{schedulerStatus.schedules.daily}</div>
                    <div className="text-xs text-slate-500 mt-1">Daily at 2 AM UTC</div>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">Algorithm Generation</div>
                    <div className="text-sm font-mono text-bio-400">{schedulerStatus.schedules.generation}</div>
                    <div className="text-xs text-slate-500 mt-1">Daily at 3 AM UTC</div>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">Algorithm Synthesis</div>
                    <div className="text-sm font-mono text-bio-400">{schedulerStatus.schedules.synthesis}</div>
                    <div className="text-xs text-slate-500 mt-1">Daily at 4 AM UTC</div>
                  </div>
                </div>
              </div>
            )}
            
            {automationStatus && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Recent Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-800 rounded-lg text-center">
                    <div className="text-2xl font-bold text-bio-400 mb-1">
                      {automationStatus.systemGeneratedAlgorithms || 0}
                    </div>
                    <div className="text-xs text-slate-400">Generated (7 days)</div>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-400 mb-1">
                      {automationStatus.statistics?.filter((s: any) => s.task_type === 'daily_generation' && s.status === 'success').reduce((sum: number, s: any) => sum + (s.count || 0), 0) || 0}
                    </div>
                    <div className="text-xs text-slate-400">Generation Success</div>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg text-center">
                    <div className="text-2xl font-bold text-emerald-400 mb-1">
                      {automationStatus.statistics?.filter((s: any) => s.task_type === 'auto_synthesis' && s.status === 'success').reduce((sum: number, s: any) => sum + (s.count || 0), 0) || 0}
                    </div>
                    <div className="text-xs text-slate-400">Synthesis Success</div>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-400 mb-1">
                      {automationStatus.statistics?.filter((s: any) => s.status === 'failed').reduce((sum: number, s: any) => sum + (s.count || 0), 0) || 0}
                    </div>
                    <div className="text-xs text-slate-400">Failures (30 days)</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-lg font-semibold text-white mb-3">Manual Triggers</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  onClick={() => handleTriggerAutomation('generate')}
                  isLoading={runningAutomation === 'generate'}
                  disabled={!!runningAutomation}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Zap size={16} /> Generate
                </Button>
                <Button
                  onClick={() => handleTriggerAutomation('synthesize')}
                  isLoading={runningAutomation === 'synthesize'}
                  disabled={!!runningAutomation}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Network size={16} /> Synthesize
                </Button>
                <Button
                  onClick={() => handleTriggerAutomation('improve')}
                  isLoading={runningAutomation === 'improve'}
                  disabled={!!runningAutomation}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Wrench size={16} /> Improve
                </Button>
                <Button
                  onClick={() => handleTriggerAutomation('all')}
                  isLoading={runningAutomation === 'all'}
                  disabled={!!runningAutomation}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <RefreshCw size={16} /> Run All
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Automation Logs */}
          {automationLogs && automationLogs.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={20} className="text-bio-400" />
                Recent Automation Activity
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {automationLogs.slice(0, 20).map((log: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        log.status === 'success' ? 'bg-emerald-500' :
                        log.status === 'failed' ? 'bg-red-500' :
                        'bg-amber-500'
                      }`}></div>
                      <div>
                        <div className="text-sm font-medium text-white capitalize">
                          {log.task_type?.replace(/_/g, ' ') || 'Unknown'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs">
                      {log.algorithm_id && (
                        <button
                          onClick={() => navigate(`/algorithm/${log.algorithm_id}`)}
                          className="text-bio-400 hover:text-bio-300"
                        >
                          Algorithm #{log.algorithm_id}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Settings size={20} className="text-bio-400" />
              System Settings
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-800 rounded-lg">
                <div>
                  <div className="font-medium text-white">Email Notifications</div>
                  <div className="text-sm text-slate-400">Send email notifications to users</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bio-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bio-500"></div>
                </label>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-800 rounded-lg">
                <div>
                  <div className="font-medium text-white">Maintenance Mode</div>
                  <div className="text-sm text-slate-400">Put system in maintenance mode</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bio-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bio-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Database Operations */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Database size={20} className="text-bio-400" />
              Database Operations
            </h2>
            <div className="space-y-3">
              <Button variant="secondary" className="w-full justify-start">
                <Download size={16} /> Backup Database
              </Button>
              <Button variant="secondary" className="w-full justify-start">
                <RefreshCw size={16} /> Optimize Database
              </Button>
              <Button variant="secondary" className="w-full justify-start text-red-400 hover:text-red-300">
                <Trash2 size={16} /> Clear Old Logs
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search logs..."
                onChange={(e) => {
                  // Add search functionality
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-bio-500"
              />
            </div>
            <select 
              onChange={(e) => {
                // Add filter functionality
              }}
              className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-bio-500"
            >
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="share">Share</option>
              <option value="export">Export</option>
              <option value="analyze">Analyze</option>
            </select>
            <Button onClick={loadData} variant="secondary">
              <RefreshCw size={16} />
            </Button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText size={20} className="text-bio-400" />
                  Activity Logs
                </h2>
                <Button 
                  variant="ghost" 
                  className="text-red-400 hover:text-red-300"
                  onClick={async () => {
                    if (confirm('Are you sure you want to clear logs older than 90 days?')) {
                      try {
                        await activityLogsApi.clearOldLogs(90);
                        loadData();
                      } catch (error) {
                        alert('Failed to clear old logs');
                      }
                    }
                  }}
                >
                  <Trash2 size={16} /> Clear Old Logs
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="text-slate-400 text-sm mb-4">
                Activity logs provide an audit trail of all user actions in the system.
              </div>
              <Table
                columns={[
                  { key: 'createdAt', label: 'Date', sortable: true },
                  { key: 'userEmail', label: 'User' },
                  { key: 'actionType', label: 'Action' },
                  { key: 'entityType', label: 'Entity' },
                  { key: 'entityId', label: 'ID' },
                  { key: 'details', label: 'Details' }
                ]}
                data={[]}
                loading={loading}
                emptyMessage="No activity logs found. Activity logging will appear here once implemented."
              />
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">User Details</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-500 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">Email</label>
                <div className="text-white">{selectedUser.email}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Name</label>
                <input
                  type="text"
                  value={editingUser.name || selectedUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-bio-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Role</label>
                <select
                  value={editingUser.role || selectedUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-bio-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-400">Algorithms</label>
                  <div className="text-white">{selectedUser.algorithm_count || 0}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Jobs</label>
                  <div className="text-white">{selectedUser.job_count || 0}</div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowUserModal(false)}>Cancel</Button>
                <Button onClick={async () => {
                  if (editingUser.role) {
                    await updateUserRole(selectedUser.id, editingUser.role);
                  }
                  setShowUserModal(false);
                }}>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modals */}
      <UserModal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser || undefined}
        onSave={handleSaveUser}
        mode={userModalMode}
      />
      
      <AlgorithmModal
        isOpen={showAlgorithmModal}
        onClose={() => {
          setShowAlgorithmModal(false);
          setSelectedAlgorithm(null);
        }}
        algorithm={selectedAlgorithm || undefined}
        onSave={handleSaveAlgorithm}
        mode={algorithmModalMode}
      />
      
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Upload size={24} />
                Import Algorithms
              </h2>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <FileUpload
                accept=".json"
                multiple={true}
                onUpload={handleImportAlgorithms}
                maxSize={10}
                maxFiles={10}
                label="Import Algorithms from JSON"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
