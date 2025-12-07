import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { algorithmApi } from '../services/api';
import { BioAlgorithm } from '../types';
import { Search as SearchIcon, Filter, X, SlidersHorizontal, Tag, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '../components/Button';
import { AlgoCard } from '../components/Card';

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [algorithms, setAlgorithms] = useState<BioAlgorithm[]>([]);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [domain, setDomain] = useState<string>('all');
  const [type, setType] = useState<'all' | 'generated' | 'hybrid'>('all');
  const [minScore, setMinScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(100);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'relevance' | 'score' | 'newest' | 'oldest' | 'name'>('relevance');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');

  useEffect(() => {
    loadAlgorithms();
  }, []);

  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      setQuery(urlQuery);
    }
  }, [searchParams]);

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

  const allDomains = useMemo(() => {
    const domains = new Set<string>();
    algorithms.forEach(a => domains.add(a.domain));
    return Array.from(domains).sort();
  }, [algorithms]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    algorithms.forEach(a => a.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [algorithms]);

  const filteredAlgorithms = useMemo(() => {
    let results = algorithms;

    // Text search
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      results = results.filter(algo =>
        algo.name.toLowerCase().includes(searchLower) ||
        algo.description.toLowerCase().includes(searchLower) ||
        algo.domain.toLowerCase().includes(searchLower) ||
        algo.inspiration.toLowerCase().includes(searchLower) ||
        algo.principle.toLowerCase().includes(searchLower) ||
        algo.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        algo.steps.some(step => step.toLowerCase().includes(searchLower))
      );
    }

    // Domain filter
    if (domain !== 'all') {
      results = results.filter(algo => algo.domain === domain);
    }

    // Type filter
    if (type !== 'all') {
      results = results.filter(algo => algo.type === type);
    }

    // Score filter
    results = results.filter(algo => {
      const score = algo.analysis?.sanity?.score || 0;
      return score >= minScore && score <= maxScore;
    });

    // Tags filter
    if (selectedTags.length > 0) {
      results = results.filter(algo =>
        selectedTags.every(tag => algo.tags.includes(tag))
      );
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = Date.now();
      const ranges: Record<string, number> = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000
      };
      const rangeMs = ranges[dateRange];
      results = results.filter(algo => {
        const algoTime = algo.createdAt;
        return (now - algoTime) <= rangeMs;
      });
    }

    // Sort
    results = [...results].sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          // Simple relevance: prioritize name matches, then description
          if (query.trim()) {
            const aNameMatch = a.name.toLowerCase().includes(query.toLowerCase());
            const bNameMatch = b.name.toLowerCase().includes(query.toLowerCase());
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
          }
          return b.createdAt - a.createdAt;
        case 'score':
          const scoreA = a.analysis?.sanity?.score || 0;
          const scoreB = b.analysis?.sanity?.score || 0;
          return scoreB - scoreA;
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return results;
  }, [algorithms, query, domain, type, minScore, maxScore, selectedTags, sortBy, dateRange]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
    } else {
      setSearchParams({});
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setDomain('all');
    setType('all');
    setMinScore(0);
    setMaxScore(100);
    setSelectedTags([]);
    setSortBy('relevance');
    setDateRange('all');
  };

  const hasActiveFilters = domain !== 'all' || type !== 'all' || minScore > 0 || maxScore < 100 || selectedTags.length > 0 || dateRange !== 'all';

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
            <SearchIcon size={32} className="text-bio-400" />
            Advanced Search
          </h1>
          <p className="text-slate-400">Find algorithms with powerful filters and sorting</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search algorithms by name, description, domain, tags, steps..."
              className="w-full pl-12 pr-32 py-4 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-bio-500 text-lg"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                variant="ghost"
                className="flex items-center gap-2"
              >
                <SlidersHorizontal size={18} />
                Filters
              </Button>
              <Button type="submit" variant="primary">
                Search
              </Button>
            </div>
          </div>
        </form>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Filter size={20} className="text-bio-400" />
                Filters
              </h3>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="ghost" className="text-sm">
                  <X size={16} /> Clear All
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Domain Filter */}
              <div>
                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Domain</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-bio-500"
                >
                  <option value="all">All Domains</option>
                  {allDomains.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-bio-500"
                >
                  <option value="all">All Types</option>
                  <option value="generated">Generated</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              {/* Score Range */}
              <div>
                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Score Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={minScore}
                    onChange={(e) => setMinScore(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                    min="0"
                    max="100"
                    className="w-20 px-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-bio-500"
                  />
                  <span className="text-slate-500">-</span>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={(e) => setMaxScore(Math.max(0, Math.min(100, parseInt(e.target.value) || 100)))}
                    min="0"
                    max="100"
                    className="w-20 px-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-bio-500"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-bio-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>
            </div>

            {/* Tags Filter */}
            <div className="mt-4">
              <label className="text-sm font-bold text-slate-400 uppercase mb-2 block flex items-center gap-2">
                <Tag size={16} />
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-bio-500/20 border-bio-500 text-bio-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div className="mt-4">
              <label className="text-sm font-bold text-slate-400 uppercase mb-2 block flex items-center gap-2">
                <TrendingUp size={16} />
                Sort By
              </label>
              <div className="flex flex-wrap gap-2">
                {(['relevance', 'score', 'newest', 'oldest', 'name'] as const).map(option => (
                  <button
                    key={option}
                    onClick={() => setSortBy(option)}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                      sortBy === option
                        ? 'bg-bio-500/20 border-bio-500 text-bio-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-slate-400">
            Found <span className="text-white font-bold">{filteredAlgorithms.length}</span> algorithm{filteredAlgorithms.length !== 1 ? 's' : ''}
          </div>
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Filter size={14} />
              <span>Filters active</span>
            </div>
          )}
        </div>

        {filteredAlgorithms.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <SearchIcon size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No algorithms found</p>
            <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAlgorithms.map(algo => (
              <AlgoCard
                key={algo.id}
                algorithm={algo}
                onClick={() => navigate(`/algorithm/${algo.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;

