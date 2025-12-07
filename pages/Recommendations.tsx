import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { algorithmApi } from '../services/api';
import { BioAlgorithm } from '../types';
import { Sparkles, TrendingUp, Clock, Star, Zap, Target } from 'lucide-react';
import { AlgoCard } from '../components/Card';
import { Button } from '../components/Button';

interface Recommendation {
  algorithm: BioAlgorithm;
  reason: string;
  score: number;
  category: 'trending' | 'recent' | 'high_score' | 'similar' | 'popular';
}

const Recommendations: React.FC = () => {
  const navigate = useNavigate();
  const [algorithms, setAlgorithms] = useState<BioAlgorithm[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlgorithms();
  }, []);

  useEffect(() => {
    if (algorithms.length > 0) {
      generateRecommendations();
    }
  }, [algorithms]);

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

  const generateRecommendations = () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    const recs: Recommendation[] = [];

    // Trending: Recently created with high scores
    const trending = algorithms
      .filter(a => {
        const age = now - a.createdAt;
        return age < oneWeek && (a.analysis?.sanity?.score || 0) >= 70;
      })
      .sort((a, b) => {
        const scoreA = a.analysis?.sanity?.score || 0;
        const scoreB = b.analysis?.sanity?.score || 0;
        return scoreB - scoreA;
      })
      .slice(0, 5)
      .map(a => ({
        algorithm: a,
        reason: 'Recently created with high quality score',
        score: a.analysis?.sanity?.score || 0,
        category: 'trending' as const
      }));

    // Recent: Latest algorithms
    const recent = algorithms
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map(a => ({
        algorithm: a,
        reason: 'Recently added to your library',
        score: a.analysis?.sanity?.score || 0,
        category: 'recent' as const
      }));

    // High Score: Best performing algorithms
    const highScore = algorithms
      .filter(a => (a.analysis?.sanity?.score || 0) >= 80)
      .sort((a, b) => {
        const scoreA = a.analysis?.sanity?.score || 0;
        const scoreB = b.analysis?.sanity?.score || 0;
        return scoreB - scoreA;
      })
      .slice(0, 5)
      .map(a => ({
        algorithm: a,
        reason: 'High quality score and proven performance',
        score: a.analysis?.sanity?.score || 0,
        category: 'high_score' as const
      }));

    // Similar: Based on domain and tags
    const similar = algorithms
      .map(a => {
        // Find algorithms with similar domains or tags
        const similarCount = algorithms.filter(other => {
          if (other.id === a.id) return false;
          return other.domain === a.domain || 
                 other.tags.some(tag => a.tags.includes(tag));
        }).length;
        return { algorithm: a, similarCount };
      })
      .filter(item => item.similarCount > 0)
      .sort((a, b) => b.similarCount - a.similarCount)
      .slice(0, 5)
      .map(item => ({
        algorithm: item.algorithm,
        reason: `Similar to ${item.similarCount} other algorithm(s)`,
        score: item.algorithm.analysis?.sanity?.score || 0,
        category: 'similar' as const
      }));

    // Popular: Most viewed/liked (if we had that data)
    const popular = algorithms
      .filter(a => {
        const age = now - a.createdAt;
        return age < oneMonth;
      })
      .sort((a, b) => {
        // Sort by score as proxy for popularity
        const scoreA = a.analysis?.sanity?.score || 0;
        const scoreB = b.analysis?.sanity?.score || 0;
        return scoreB - scoreA;
      })
      .slice(0, 5)
      .map(a => ({
        algorithm: a,
        reason: 'Popular and well-rated algorithm',
        score: a.analysis?.sanity?.score || 0,
        category: 'popular' as const
      }));

    setRecommendations([...trending, ...recent, ...highScore, ...similar, ...popular]);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trending':
        return <TrendingUp size={16} className="text-orange-400" />;
      case 'recent':
        return <Clock size={16} className="text-blue-400" />;
      case 'high_score':
        return <Star size={16} className="text-emerald-400" />;
      case 'similar':
        return <Zap size={16} className="text-purple-400" />;
      case 'popular':
        return <Target size={16} className="text-pink-400" />;
      default:
        return <Sparkles size={16} className="text-bio-400" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'trending':
        return 'Trending';
      case 'recent':
        return 'Recent';
      case 'high_score':
        return 'High Score';
      case 'similar':
        return 'Similar';
      case 'popular':
        return 'Popular';
      default:
        return 'All';
    }
  };

  const filteredRecs = selectedCategory === 'all'
    ? recommendations
    : recommendations.filter(r => r.category === selectedCategory);

  const categories = ['all', 'trending', 'recent', 'high_score', 'similar', 'popular'];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-slate-400">Loading recommendations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Sparkles size={32} className="text-bio-400" />
            Algorithm Recommendations
          </h1>
          <p className="text-slate-400">Discover algorithms tailored to your interests</p>
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedCategory === cat
                  ? 'bg-bio-500 text-white'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {getCategoryIcon(cat)}
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Recommendations Grid */}
        {filteredRecs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <Sparkles size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No recommendations available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRecs.map((rec, index) => (
              <div key={`${rec.algorithm.id}-${index}`} className="relative">
                <div className="absolute -top-2 -right-2 z-10">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 flex items-center gap-1 text-xs">
                    {getCategoryIcon(rec.category)}
                    <span className="text-slate-400">{getCategoryLabel(rec.category)}</span>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-bio-500/50 transition-colors">
                  <AlgoCard
                    algorithm={rec.algorithm}
                    onClick={() => navigate(`/algorithm/${rec.algorithm.id}`)}
                  />
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">Recommendation Score</span>
                      <span className={`text-xs font-bold ${
                        rec.score >= 80 ? 'text-emerald-400' :
                        rec.score >= 60 ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {rec.score}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{rec.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {recommendations.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">Total Recommendations</div>
              <div className="text-2xl font-bold text-white">{recommendations.length}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">Average Score</div>
              <div className="text-2xl font-bold text-emerald-400">
                {Math.round(recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length)}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">Categories</div>
              <div className="text-2xl font-bold text-white">{categories.length - 1}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">High Quality</div>
              <div className="text-2xl font-bold text-bio-400">
                {recommendations.filter(r => r.score >= 80).length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;

