import React, { useState, useEffect } from 'react';
import { BioAlgorithm, ViewState, LoadingState } from '../types';
import { jobApi } from '../services/api';
import { Button } from '../components/Button';
import { AlgoCard } from '../components/Card';
import { Network, Plus, Shuffle } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface SynthesizerProps {
  algorithms: BioAlgorithm[];
  onSave: (algo: BioAlgorithm) => void;
  onNavigate: (view: ViewState) => void;
}

const Synthesizer: React.FC<SynthesizerProps> = ({ algorithms, onSave, onNavigate }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [result, setResult] = useState<BioAlgorithm | null>(null);
  const [focus, setFocus] = useState('');
  const [jobId, setJobId] = useState<number | null>(null);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else {
      if (next.size >= 3) return; // Limit to 3 for simplicity
      next.add(id);
    }
    setSelectedIds(next);
  };

  useEffect(() => {
    if (jobId) {
      const interval = setInterval(async () => {
        try {
          const job = await jobApi.getById(jobId);
          if (job.status === 'completed') {
            const algoData = job.resultData;
            const newAlgo: BioAlgorithm = {
              ...algoData,
              id: generateId(),
              type: 'hybrid',
              parents: Array.from(selectedIds),
              createdAt: Date.now()
            };
            setResult(newAlgo);
            setStatus(LoadingState.SUCCESS);
            setJobId(null);
          } else if (job.status === 'failed') {
            setStatus(LoadingState.ERROR);
            setJobId(null);
          }
        } catch (err) {
          console.error('Failed to check job status:', err);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [jobId, selectedIds]);

  const handleSynthesize = async () => {
    if (selectedIds.size < 2) return;
    
    setStatus(LoadingState.LOADING);
    
    try {
      const selectedAlgos = algorithms.filter(a => selectedIds.has(a.id));
      const job = await jobApi.create('synthesize', {
        algorithms: selectedAlgos,
        focus
      });
      setJobId(job.id);
    } catch (err) {
      console.error(err);
      setStatus(LoadingState.ERROR);
    }
  };

  const handleSave = async () => {
    if (result) {
      try {
        await onSave(result);
        onNavigate('library');
      } catch (err: any) {
        console.error('Failed to save:', err);
      }
    }
  };

  if (status === LoadingState.SUCCESS && result) {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => { setStatus(LoadingState.IDLE); setResult(null); }} className="text-slate-400 hover:text-white">← Back</button>
          <h1 className="text-2xl font-bold text-white">Hybrid System Synthesized</h1>
        </div>
        
        <div className="glass-panel border-purple-500/30 p-8 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-purple-600/10 blur-[100px] rounded-full"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="inline-block px-2 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold rounded mb-2">HYBRID SYSTEM</span>
                <h2 className="text-3xl font-bold text-white mb-2">{result.name}</h2>
                <p className="text-slate-300 max-w-2xl">{result.description}</p>
              </div>
              <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-500 shadow-purple-500/20">Save System</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
               <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-700">
                 <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Emergent Principle</h3>
                 <p className="text-slate-200">{result.principle}</p>
               </div>
               <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-700">
                 <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Input Algorithms</h3>
                 <div className="flex flex-col gap-2">
                   {result.parents?.map(pid => {
                     const parent = algorithms.find(a => a.id === pid);
                     return (
                       <div key={pid} className="text-sm text-slate-300 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-bio-400"></div>
                         {parent?.name || 'Unknown Algorithm'}
                       </div>
                     )
                   })}
                 </div>
               </div>
            </div>

            <div className="mt-8">
               <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Synergy Flow</h3>
               <div className="space-y-2">
                 {result.steps.map((step, i) => (
                   <div key={i} className="flex gap-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                      <span className="font-mono text-purple-400 opacity-70">0{i+1}</span>
                      <p className="text-slate-300 text-sm">{step}</p>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Network className="text-purple-500" /> System Synthesizer
        </h1>
        <p className="text-slate-400">
          Select 2-3 existing algorithms to merge into a complex hybrid system.
        </p>
      </header>

      {/* Selection Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
           <span className="text-sm text-slate-400">Selected: {selectedIds.size} / 3</span>
           <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Specific focus (optional)..." 
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none w-64"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
              />
              <Button 
                onClick={handleSynthesize} 
                disabled={selectedIds.size < 2}
                isLoading={status === LoadingState.LOADING}
                className="bg-purple-600 hover:bg-purple-500"
              >
                <Shuffle size={16} /> Merge
              </Button>
           </div>
        </div>

        {algorithms.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-700 rounded-2xl">
            <p className="text-slate-500">No algorithms available to synthesize.</p>
            <button onClick={() => onNavigate('generate')} className="text-bio-400 underline mt-2">Generate some first</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {algorithms.map(algo => (
              <div key={algo.id} className="relative">
                <AlgoCard 
                  algorithm={algo} 
                  selected={selectedIds.has(algo.id)}
                  onClick={() => toggleSelection(algo.id)}
                />
                {selectedIds.has(algo.id) && (
                   <div className="absolute -top-1 -right-1 bg-purple-600 text-white rounded-full p-1 shadow-lg z-10">
                     <Plus size={12} />
                   </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Synthesizer;