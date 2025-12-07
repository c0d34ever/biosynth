import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BioAlgorithm, ViewState } from '../types';
import { Activity, Zap, Database, ArrowRight } from 'lucide-react';
import { Button } from '../components/Button';
import { AlgoCard } from '../components/Card';
import { algorithmApi } from '../services/api';

interface HomeProps {
  algorithms: BioAlgorithm[];
  onNavigate: (view: ViewState) => void;
}

const Home: React.FC<HomeProps> = ({ algorithms, onNavigate }) => {
  const navigate = useNavigate();
  
  const recentAlgos = algorithms.slice(0, 3);
  const hybridCount = algorithms.filter(a => a.type === 'hybrid').length;
  const generatedCount = algorithms.length - hybridCount;

  const handleAlgoClick = (algo: BioAlgorithm) => {
    navigate(`/algorithm/${algo.id}`);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-bio-900/20 to-slate-900 border border-slate-800 p-8 md:p-12">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Design the Unimaginable
          </h1>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed">
            Harness the power of biomimicry and AI to synthesize novel algorithms inspired by the complexity of nature and physics.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => onNavigate('generate')}>
              Start Generating <Zap size={18} />
            </Button>
            <Button variant="secondary" onClick={() => onNavigate('library')}>
              View Bank
            </Button>
          </div>
        </div>
        
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
           <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full animate-pulse-slow">
            <path fill="#10b981" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.3C93.5,8.6,82.2,21.5,70.6,32.3C59,43.1,47.1,51.8,35,59.5C22.9,67.2,10.5,73.9,-1.1,75.8C-12.7,77.7,-23.5,74.8,-34.8,68.8C-46.1,62.8,-57.9,53.7,-67.2,42.2C-76.5,30.7,-83.3,16.8,-83.1,3.1C-82.9,-10.6,-75.7,-24.1,-65.8,-34.9C-55.9,-45.7,-43.3,-53.8,-30.7,-61.7C-18.1,-69.6,-5.5,-77.3,7.9,-91" transform="translate(100 100)" />
          </svg>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-bio-500/10 rounded-lg text-bio-400">
            <Database size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{algorithms.length}</div>
            <div className="text-sm text-slate-500">Total Systems</div>
          </div>
        </div>
        <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{generatedCount}</div>
            <div className="text-sm text-slate-500">Bio-Algorithms</div>
          </div>
        </div>
        <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
            <Zap size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{hybridCount}</div>
            <div className="text-sm text-slate-500">Hybrid Syntheses</div>
          </div>
        </div>
      </div>

      {/* Recent */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Recent Generations</h2>
          {algorithms.length > 0 && (
            <button 
              onClick={() => onNavigate('library')}
              className="text-sm text-bio-400 hover:text-bio-300 flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          )}
        </div>
        
        {algorithms.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
            <p className="text-slate-500 mb-4">No algorithms generated yet.</p>
            <Button variant="secondary" onClick={() => onNavigate('generate')}>Create First Algorithm</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentAlgos.map(algo => (
              <AlgoCard key={algo.id} algorithm={algo} onClick={() => handleAlgoClick(algo)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;