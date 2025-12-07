import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Column } from '../components/Table';
import { Button } from '../components/Button';
import { statisticsApi } from '../services/api';
import { Clock, CheckCircle, XCircle, Loader, Filter, RefreshCw } from 'lucide-react';

interface Job {
  id: number;
  job_type: string;
  status: string;
  input_data: any;
  result_data: any;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

const Jobs: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    loadJobs();
  }, [filterStatus, filterType, page]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await statisticsApi.getJobs({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        jobType: filterType !== 'all' ? filterType : undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize
      });
      setJobs(data.jobs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-emerald-400" />;
      case 'failed':
        return <XCircle size={16} className="text-red-400" />;
      case 'processing':
        return <Loader size={16} className="text-blue-400 animate-spin" />;
      default:
        return <Clock size={16} className="text-slate-400" />;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const columns: Column<Job>[] = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      width: '80px',
      render: (job) => <span className="font-mono text-xs">{job.id}</span>
    },
    {
      key: 'job_type',
      header: 'Type',
      sortable: true,
      render: (job) => (
        <span className="px-2 py-1 text-xs rounded-full bg-slate-800 text-slate-300 capitalize">
          {job.job_type}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (job) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(job.status)}
          <span className="capitalize">{job.status}</span>
        </div>
      )
    },
    {
      key: 'input_data',
      header: 'Input',
      render: (job) => {
        const input = job.input_data;
        if (input?.algorithmId) {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/algorithm/${input.algorithmId}`);
              }}
              className="text-bio-400 hover:text-bio-300 text-xs"
            >
              Algorithm #{input.algorithmId}
            </button>
          );
        }
        return <span className="text-xs text-slate-500">—</span>;
      }
    },
    {
      key: 'duration_seconds',
      header: 'Duration',
      sortable: true,
      render: (job) => (
        <span className="text-xs text-slate-400">{formatDuration(job.duration_seconds)}</span>
      )
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (job) => (
        <span className="text-xs text-slate-400">
          {new Date(job.created_at).toLocaleString()}
        </span>
      )
    },
    {
      key: 'error_message',
      header: 'Error',
      render: (job) => (
        job.error_message ? (
          <span className="text-xs text-red-400 truncate max-w-xs" title={job.error_message}>
            {job.error_message}
          </span>
        ) : <span className="text-slate-600">—</span>
      )
    }
  ];

  const sortedJobs = [...jobs].sort((a, b) => {
    let aVal = a[sortColumn as keyof Job];
    let bVal = b[sortColumn as keyof Job];

    if (sortColumn === 'created_at' || sortColumn === 'updated_at' || sortColumn === 'completed_at') {
      aVal = new Date(aVal as string).getTime();
      bVal = new Date(bVal as string).getTime();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Job Queue</h1>
          <p className="text-slate-400">Monitor and manage background jobs</p>
        </div>
        <Button onClick={loadJobs} variant="secondary">
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <span className="text-sm text-slate-400">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-bio-500 outline-none"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Type:</span>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-bio-500 outline-none"
          >
            <option value="all">All</option>
            <option value="generate">Generate</option>
            <option value="synthesize">Synthesize</option>
            <option value="analyze">Analyze</option>
            <option value="improve">Improve</option>
            <option value="automation">Automation</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-slate-400">
          Total: {total} jobs
        </div>
      </div>

      {/* Table */}
      <Table
        data={sortedJobs}
        columns={columns}
        loading={loading}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        emptyMessage="No jobs found"
      />

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-400">
            Page {page} of {Math.ceil(total / pageSize)}
          </span>
          <Button
            variant="ghost"
            onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
            disabled={page >= Math.ceil(total / pageSize)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default Jobs;

