import React, { useState, useEffect } from 'react';
import { BioAlgorithm, ViewState, LoadingState } from '../types';
import { jobApi, algorithmApi } from '../services/api';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Atom, Sparkles, Dice5, RefreshCw } from 'lucide-react';

// Predefined lists for random generation
const INSPIRATIONS = [
  "Mycelium Network nutrient transport",
  "Ant Colony stigmergy",
  "Quantum Entanglement",
  "Black Hole Event Horizon information paradox",
  "Slime Mold spatial optimization",
  "Firefly bioluminescent synchronization",
  "Spider Silk tensile structure",
  "Starling Murmuration aerodynamics",
  "Human Immune System adaptive response",
  "Tectonic Plate stress accumulation",
  "Neural Plasticity and pruning",
  "Photosynthesis quantum efficiency",
  "Coral Reef symbiotic exchange",
  "Viral Mutation vectors",
  "Atmospheric Convection currents",
  "DNA Replication error correction",
  "Crystallization lattice formation",
  "Octopus Chromatophore camouflage",
  "Geothermal Vent energy extraction",
  "Supernova Shockwave propagation"
];

const DOMAINS = [
  "Distributed Cloud Storage",
  "Cybersecurity Intrusion Detection",
  "Urban Traffic Flow Optimization",
  "Global Supply Chain Logistics",
  "Renewable Energy Grid Balancing",
  "Social Media Disinformation Tracking",
  "High Frequency Trading Algorithms",
  "Autonomous Drone Swarm Control",
  "Lossless Data Compression",
  "Blockchain Consensus Mechanisms",
  "Disaster Relief Resource Allocation",
  "Targeted Cancer Drug Delivery",
  "Climate Change Predictive Modeling",
  "Smart City Waste Management",
  "Privacy-Preserving Data Analytics",
  "Deep Space Network Communication",
  "IoT Device Mesh Networking",
  "Genomic Sequence Assembly",
  "Personalized Content Recommendation",
  "Homomorphic Encryption"
];

const generateId = () => Math.random().toString(36).substr(2, 9);

interface GeneratorProps {
  onSave: (algo: BioAlgorithm) => void;
  onNavigate: (view: ViewState) => void;
}

const Generator: React.FC<GeneratorProps> = ({ onSave, onNavigate }) => {
  const [inspiration, setInspiration] = useState('');
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [result, setResult] = useState<BioAlgorithm | null>(null);
  const [error, setError] = useState('');

  const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  const handleRandomizeInput = (field: 'inspiration' | 'domain') => {
    if (field === 'inspiration') setInspiration(getRandom(INSPIRATIONS));
    if (field === 'domain') setDomain(getRandom(DOMAINS));
  };

  const [jobId, setJobId] = useState<number | null>(null);

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
              type: 'generated',
              createdAt: Date.now()
            };
            setResult(newAlgo);
            setStatus(LoadingState.SUCCESS);
            setJobId(null);
          } else if (job.status === 'failed') {
            setError(job.errorMessage || 'Generation failed');
            setStatus(LoadingState.ERROR);
            setJobId(null);
          }
        } catch (err: any) {
          console.error('Failed to check job status:', err);
          // Don't show error for connection issues during polling - just log it
          // The user will see the error when they try to create a new job
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [jobId]);

  const handleGenerate = async (forceRandom = false) => {
    setStatus(LoadingState.LOADING);
    setError('');
    
    let selectedInspiration = inspiration;
    let selectedDomain = domain;

    // Logic: If force random OR field is empty, pick a random value
    if (forceRandom || !selectedInspiration) {
      selectedInspiration = getRandom(INSPIRATIONS);
      setInspiration(selectedInspiration);
    }
    
    if (forceRandom || !selectedDomain) {
      selectedDomain = getRandom(DOMAINS);
      setDomain(selectedDomain);
    }

    try {
      const job = await jobApi.create('generate', {
        inspiration: selectedInspiration,
        domain: selectedDomain
      });
      setJobId(job.id);
    } catch (err: any) {
      console.error('Generation error:', err);
      // Provide user-friendly error messages
      let errorMessage = 'Failed to start generation. ';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.status === 401) {
        errorMessage = 'You must be logged in to generate algorithms. Please log in and try again.';
      } else if (err.status === 0) {
        errorMessage = 'Cannot connect to the server. Please ensure the backend is running on port 3001.';
      } else {
        errorMessage += 'Please check your connection and try again.';
      }
      
      setError(errorMessage);
      setStatus(LoadingState.ERROR);
    }
  };

  const handleSave = async () => {
    if (result) {
      try {
        await onSave(result);
        onNavigate('library');
      } catch (err: any) {
        setError(err.message || 'Failed to save algorithm');
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Atom className="text-bio-500" /> Algorithm Generator
        </h1>
        <p className="text-slate-400">
          Input a biological or physical phenomenon and a problem domain. Or let the AI surprise you.
        </p>
      </header>

      {/* Input Section */}
      <div className="glass-panel p-8 rounded-2xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Inspiration Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-400">Inspiration Source</label>
              <button 
                onClick={() => handleRandomizeInput('inspiration')}
                className="text-xs text-bio-400 hover:text-white flex items-center gap-1 transition-colors"
                title="Randomize Inspiration"
              >
                <RefreshCw size={12} /> Randomize
              </button>
            </div>
            <Input 
              placeholder="e.g. Spider Web, Black Holes..." 
              value={inspiration}
              onChange={(e) => setInspiration(e.target.value)}
            />
          </div>

          {/* Domain Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-400">Problem Domain</label>
              <button 
                onClick={() => handleRandomizeInput('domain')}
                className="text-xs text-bio-400 hover:text-white flex items-center gap-1 transition-colors"
                title="Randomize Domain"
              >
                <RefreshCw size={12} /> Randomize
              </button>
            </div>
            <Input 
              placeholder="e.g. Data Routing, Energy Grid..." 
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
        </div>
        
        <div className="pt-4 flex flex-col md:flex-row gap-4 justify-end items-center border-t border-slate-800/50">
          <span className="text-xs text-slate-500 hidden md:block mr-auto">
            Leave fields blank to auto-generate specific parameters.
          </span>
          
          <Button 
            variant="secondary"
            onClick={() => handleGenerate(true)} 
            isLoading={status === LoadingState.LOADING}
          >
            <Dice5 size={18} /> Surprise Me
          </Button>
          
          <Button 
            onClick={() => handleGenerate(false)} 
            isLoading={status === LoadingState.LOADING}
            className="w-full md:w-auto"
          >
            <Sparkles size={18} /> Synthesize Algorithm
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-900 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Result Section */}
      {status === LoadingState.SUCCESS && result && (
        <div className="glass-panel p-0 rounded-2xl overflow-hidden border-bio-500/30 border animate-in fade-in zoom-in-95">
          <div className="p-6 bg-bio-900/10 border-b border-bio-500/20 flex justify-between items-center">
             <div>
               <h2 className="text-xl font-bold text-white">{result.name}</h2>
               <p className="text-sm text-bio-400">Generation Successful</p>
             </div>
             <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStatus(LoadingState.IDLE)}>Discard</Button>
                <Button onClick={handleSave}>Save to Bank</Button>
             </div>
          </div>
          
          <div className="p-8 space-y-6">
             <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                  <p className="text-slate-200 leading-relaxed mt-1">{result.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Core Principle</label>
                    <p className="text-bio-400 mt-1">{result.principle}</p>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Applications</label>
                     <ul className="list-disc list-inside text-slate-300 mt-1 text-sm">
                       {result.applications.slice(0,3).map((a,i) => <li key={i}>{a}</li>)}
                     </ul>
                  </div>
                </div>

                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logic Preview</label>
                   <div className="mt-2 p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-400 overflow-x-auto">
                     {result.pseudoCode}
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {status === LoadingState.LOADING && (
        <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/30 animate-pulse space-y-4">
           <div className="h-8 bg-slate-800 rounded w-1/3"></div>
           <div className="h-4 bg-slate-800 rounded w-2/3"></div>
           <div className="h-32 bg-slate-800 rounded w-full mt-8"></div>
           <div className="h-24 bg-slate-800 rounded w-full"></div>
        </div>
      )}
    </div>
  );
};

export default Generator;