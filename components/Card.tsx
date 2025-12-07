import React, { useState, useEffect } from 'react';
import { BioAlgorithm, SanityCheckResult, BlindSpotResult, ExtensionResult, AlgoVersion } from '../types';
import { jobApi, algorithmApi, codeApi } from '../services/api';
import { Network, Dna, Code2, Cpu, Copy, Check, Edit2, AlertTriangle, ShieldAlert, Lightbulb, Activity, History, GitCommit, ArrowLeft, Save, Wrench, Sparkles, X, Play, Download, FileCode } from 'lucide-react';
import { Flowchart, MiniFlowchart } from './Flowchart';
import { Button } from './Button';
import { TextArea } from './Input';

interface AlgoCardProps {
  algorithm: BioAlgorithm;
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  selected?: boolean;
}

export const AlgoCard: React.FC<AlgoCardProps> = ({ algorithm, onClick, onEdit, selected }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(algorithm.pseudoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      onClick={onClick}
      className={`
        relative group cursor-pointer p-6 rounded-xl border transition-all duration-300 overflow-hidden flex flex-col h-full
        ${selected 
          ? 'bg-bio-900/20 border-bio-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
          : 'bg-slate-800/40 border-slate-700 hover:border-bio-500/50 hover:bg-slate-800/60'
        }
      `}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <div className="h-3 w-3 bg-bio-400 rounded-full shadow-[0_0_10px_#34d399]"></div>
        </div>
      )}
      
      {/* Header Actions */}
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-700/50 text-bio-400">
          {algorithm.type === 'hybrid' ? <Network size={20} /> : <Dna size={20} />}
        </div>
        
        <div className="flex items-center gap-1">
           {onEdit && (
            <button 
              onClick={onEdit}
              className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Edit Algorithm"
            >
              <Edit2 size={16} />
            </button>
          )}
          <button 
            onClick={handleCopy}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors relative"
            title="Copy Pseudocode"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div className="flex justify-between items-start">
         <div className="flex-1 min-w-0">
           <h3 className="text-lg font-bold text-slate-100 mb-1 group-hover:text-bio-400 transition-colors truncate">
            {algorithm.name}
           </h3>
           <p className="text-xs text-bio-500 font-mono mb-3 truncate">{algorithm.domain}</p>
         </div>
         <span className="text-[10px] font-mono text-slate-600 pt-1.5 flex-shrink-0 ml-2">
           {new Date(algorithm.createdAt).toLocaleDateString()}
         </span>
      </div>

      <p className="text-sm text-slate-400 line-clamp-3 mb-4 min-h-[60px]">
        {algorithm.description}
      </p>

      {/* Mini Flowchart Visualizer */}
      <div className="mt-auto pt-4 border-t border-slate-800/50">
        <MiniFlowchart steps={algorithm.steps} />
      </div>
      
      {algorithm.analysis?.sanity && (
         <div className="mt-3 flex items-center gap-2">
            <div className={`h-1.5 rounded-full flex-1 ${algorithm.analysis.sanity.score > 70 ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                <div className={`h-full rounded-full ${algorithm.analysis.sanity.score > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${algorithm.analysis.sanity.score}%` }}></div>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
               Feasibility: {algorithm.analysis.sanity.score}%
            </span>
         </div>
      )}
    </div>
  );
};

export const AlgoDetail: React.FC<{ 
  algorithm: BioAlgorithm; 
  onClose: () => void;
  onUpdate?: (algo: BioAlgorithm) => void;
}> = ({ algorithm, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'flow' | 'analysis' | 'history' | 'code'>('overview');
  
  // Analysis State
  const [sanityResult, setSanityResult] = useState<SanityCheckResult | null>(algorithm.analysis?.sanity || null);
  const [blindSpots, setBlindSpots] = useState<BlindSpotResult | null>(algorithm.analysis?.blindSpots || null);
  const [extensions, setExtensions] = useState<ExtensionResult | null>(algorithm.analysis?.extensions || null);
  
  const [loadingSanity, setLoadingSanity] = useState(false);
  const [loadingBlindSpots, setLoadingBlindSpots] = useState(false);
  const [loadingExtensions, setLoadingExtensions] = useState(false);
  const [fixingIssue, setFixingIssue] = useState<string | null>(null);

  // Manual Improve State
  const [showImproveModal, setShowImproveModal] = useState(false);
  const [improvePrompt, setImprovePrompt] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  
  // Track fixed/implemented items to remove from lists
  const [fixedGaps, setFixedGaps] = useState<Set<string>>(new Set());
  const [fixedRisks, setFixedRisks] = useState<Set<string>>(new Set());
  const [implementedExtensions, setImplementedExtensions] = useState<Set<string>>(new Set());
  
  // Success/Error notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Code Generation State
  const [codeGenerations, setCodeGenerations] = useState<any[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<any | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  
  const supportedLanguages = [
    { value: 'python', label: 'Python', icon: '🐍' },
    { value: 'javascript', label: 'JavaScript', icon: '📜' },
    { value: 'typescript', label: 'TypeScript', icon: '📘' },
    { value: 'java', label: 'Java', icon: '☕' },
    { value: 'cpp', label: 'C++', icon: '⚡' },
    { value: 'go', label: 'Go', icon: '🐹' },
    { value: 'rust', label: 'Rust', icon: '🦀' }
  ];

  // When props change, update state
  useEffect(() => {
    // Only update analysis results if they actually changed (not just undefined)
    if (algorithm.analysis?.sanity) {
      setSanityResult(algorithm.analysis.sanity);
    }
    if (algorithm.analysis?.blindSpots) {
      setBlindSpots(algorithm.analysis.blindSpots);
    }
    if (algorithm.analysis?.extensions) {
      setExtensions(algorithm.analysis.extensions);
    }
    // Don't reset fixed items - they should persist across updates
  }, [algorithm.analysis?.sanity, algorithm.analysis?.blindSpots, algorithm.analysis?.extensions]);
  
  const loadCodeGenerations = async () => {
    try {
      const generations = await codeApi.getGenerations(parseInt(algorithm.id));
      setCodeGenerations(generations);
      if (generations.length > 0 && !selectedGeneration) {
        // Load details of first generation
        const details = await codeApi.getGeneration(generations[0].id);
        setSelectedGeneration(details);
      }
    } catch (error) {
      console.error('Failed to load code generations:', error);
    }
  };
  
  // Load code generations when code tab is active
  useEffect(() => {
    if (activeTab === 'code') {
      loadCodeGenerations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, algorithm.id]);
  
  const handleGenerateCode = async () => {
    if (generatingCode) return;
    
    setGeneratingCode(true);
    try {
      const result = await codeApi.generate(parseInt(algorithm.id), selectedLanguage);
      setNotification({ 
        type: 'success', 
        message: `${supportedLanguages.find(l => l.value === selectedLanguage)?.label} code generated successfully!` 
      });
      setTimeout(() => setNotification(null), 5000);
      
      // Reload generations
      await loadCodeGenerations();
      
      // Load and display the new generation
      const details = await codeApi.getGeneration(result.id);
      setSelectedGeneration(details);
    } catch (error: any) {
      setNotification({ 
        type: 'error', 
        message: `Failed to generate code: ${error.message || 'Unknown error'}` 
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setGeneratingCode(false);
    }
  };
  
  const handleSelectGeneration = async (generationId: number) => {
    try {
      const details = await codeApi.getGeneration(generationId);
      setSelectedGeneration(details);
    } catch (error) {
      console.error('Failed to load generation details:', error);
    }
  };
  
  const handleCopyCode = () => {
    if (selectedGeneration?.code) {
      navigator.clipboard.writeText(selectedGeneration.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };
  
  const handleDownloadCode = () => {
    if (selectedGeneration?.code) {
      const extension = selectedGeneration.language === 'python' ? 'py' :
                       selectedGeneration.language === 'javascript' ? 'js' :
                       selectedGeneration.language === 'typescript' ? 'ts' :
                       selectedGeneration.language === 'java' ? 'java' :
                       selectedGeneration.language === 'cpp' ? 'cpp' :
                       selectedGeneration.language === 'go' ? 'go' :
                       selectedGeneration.language === 'rust' ? 'rs' : 'txt';
      const blob = new Blob([selectedGeneration.code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${algorithm.name.replace(/\s+/g, '_')}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const saveAnalysis = (
    newSanity: SanityCheckResult | null, 
    newBlind: BlindSpotResult | null, 
    newExt: ExtensionResult | null
  ) => {
     if (!onUpdate) return;
     
     onUpdate({
       ...algorithm,
       analysis: {
         sanity: newSanity || sanityResult || undefined,
         blindSpots: newBlind || blindSpots || undefined,
         extensions: newExt || extensions || undefined,
         lastRun: Date.now()
       }
     });
  };

  const runSanity = async () => {
    setLoadingSanity(true);
    try {
      const job = await jobApi.create('analyze', {
        algorithmId: parseInt(algorithm.id),
        analysisType: 'sanity'
      });
      
      // Poll for result
      const pollInterval = setInterval(async () => {
        try {
          const jobStatus = await jobApi.getById(job.id);
          if (jobStatus.status === 'completed') {
            const res = jobStatus.resultData;
            setSanityResult(res);
            saveAnalysis(res, null, null);
            clearInterval(pollInterval);
            setLoadingSanity(false);
          } else if (jobStatus.status === 'failed') {
            console.error('Analysis failed:', jobStatus.errorMessage);
            clearInterval(pollInterval);
            setLoadingSanity(false);
          }
        } catch (e) {
          console.error('Failed to check job status:', e);
          clearInterval(pollInterval);
          setLoadingSanity(false);
        }
      }, 2000);
    } catch (e) { 
      console.error(e);
      setLoadingSanity(false);
    }
  };

  const runBlindSpots = async () => {
    setLoadingBlindSpots(true);
    try {
      const job = await jobApi.create('analyze', {
        algorithmId: parseInt(algorithm.id),
        analysisType: 'blind_spot'
      });
      
      const pollInterval = setInterval(async () => {
        try {
          const jobStatus = await jobApi.getById(job.id);
          if (jobStatus.status === 'completed') {
            const res = jobStatus.resultData;
            setBlindSpots(res);
            saveAnalysis(null, res, null);
            clearInterval(pollInterval);
            setLoadingBlindSpots(false);
          } else if (jobStatus.status === 'failed') {
            console.error('Analysis failed:', jobStatus.errorMessage);
            clearInterval(pollInterval);
            setLoadingBlindSpots(false);
          }
        } catch (e) {
          console.error('Failed to check job status:', e);
          clearInterval(pollInterval);
          setLoadingBlindSpots(false);
        }
      }, 2000);
    } catch (e) { 
      console.error(e);
      setLoadingBlindSpots(false);
    }
  };

  const runExtensions = async () => {
    setLoadingExtensions(true);
    try {
      const job = await jobApi.create('analyze', {
        algorithmId: parseInt(algorithm.id),
        analysisType: 'extension'
      });
      
      const pollInterval = setInterval(async () => {
        try {
          const jobStatus = await jobApi.getById(job.id);
          if (jobStatus.status === 'completed') {
            const res = jobStatus.resultData;
            setExtensions(res);
            saveAnalysis(null, null, res);
            clearInterval(pollInterval);
            setLoadingExtensions(false);
          } else if (jobStatus.status === 'failed') {
            console.error('Analysis failed:', jobStatus.errorMessage);
            clearInterval(pollInterval);
            setLoadingExtensions(false);
          }
        } catch (e) {
          console.error('Failed to check job status:', e);
          clearInterval(pollInterval);
          setLoadingExtensions(false);
        }
      }, 2000);
    } catch (e) { 
      console.error(e);
      setLoadingExtensions(false);
    }
  };

  const applyImprovement = async (issue: string, type: string): Promise<void> => {
     if (!onUpdate) {
       console.error('[applyImprovement] onUpdate is not provided, cannot update algorithm');
       alert('Cannot improve algorithm: Update handler not available');
       return Promise.reject(new Error('onUpdate not provided'));
     }
     
     return new Promise(async (resolve, reject) => {
       try {
        console.log(`[applyImprovement] Starting improvement for: ${type} - ${issue.substring(0, 50)}...`);
        
        // Determine improvement type based on the issue type
        let improvementType = 'optimization';
        if (type.includes('Gap') || type.includes('Risk')) {
          improvementType = 'bug_fix';
        } else if (type.includes('Extension') || type.includes('Implement')) {
          improvementType = 'feature_add';
        }
        
        // Create improve job
        const job = await jobApi.create('improve', {
          algorithmId: parseInt(algorithm.id),
          improvementDescription: issue,
          improvementType: improvementType
        });
        
        console.log(`[applyImprovement] Created improve job: ${job.id}`);
        
        // Poll for result
        const pollInterval = setInterval(async () => {
          try {
            const jobStatus = await jobApi.getById(job.id);
            
            if (jobStatus.status === 'completed') {
              clearInterval(pollInterval);
              setFixingIssue(null);
              
              const improvedAlgo = jobStatus.resultData;
              console.log('[applyImprovement] ✅ Received improved algorithm:', improvedAlgo);
              
              if (improvedAlgo && improvedAlgo.name) {
                // Mark the issue as fixed/implemented BEFORE updating
                if (type.includes('Gap')) {
                  setFixedGaps(prev => new Set([...prev, issue]));
                  console.log('[applyImprovement] Marked gap as fixed:', issue.substring(0, 50));
                } else if (type.includes('Risk')) {
                  setFixedRisks(prev => new Set([...prev, issue]));
                  console.log('[applyImprovement] Marked risk as fixed:', issue.substring(0, 50));
                } else if (type.includes('Extension') || type.includes('Implement')) {
                  setImplementedExtensions(prev => new Set([...prev, issue]));
                  console.log('[applyImprovement] Marked extension as implemented:', issue.substring(0, 50));
                }
                
                // Update the algorithm with the improved version
                // Keep existing analysis until new one arrives
                const updatedAlgo: BioAlgorithm = {
                  ...algorithm,
                  name: improvedAlgo.name,
                  description: improvedAlgo.description,
                  principle: improvedAlgo.principle,
                  steps: improvedAlgo.steps,
                  applications: improvedAlgo.applications,
                  pseudoCode: improvedAlgo.pseudoCode,
                  tags: improvedAlgo.tags,
                  // Keep existing analysis - don't clear it yet
                  analysis: algorithm.analysis
                };
                
                // Save to backend
                await algorithmApi.update(parseInt(algorithm.id), updatedAlgo);
                
                // Update local state - this will trigger parent re-render
                onUpdate(updatedAlgo);
                
                // Auto-re-run sanity check to get updated score
                console.log('[applyImprovement] Auto-running sanity check for updated score...');
                setLoadingSanity(true);
                try {
                  const sanityJob = await jobApi.create('analyze', {
                    algorithmId: parseInt(algorithm.id),
                    analysisType: 'sanity'
                  });
                  
                  // Poll for sanity result
                  const sanityPollInterval = setInterval(async () => {
                    try {
                      const sanityJobStatus = await jobApi.getById(sanityJob.id);
                      if (sanityJobStatus.status === 'completed') {
                        clearInterval(sanityPollInterval);
                        const newSanityResult = sanityJobStatus.resultData;
                        setSanityResult(newSanityResult);
                        // Update parent with new analysis
                        const algoWithNewAnalysis: BioAlgorithm = {
                          ...updatedAlgo,
                          analysis: {
                            ...updatedAlgo.analysis,
                            sanity: newSanityResult,
                            lastRun: Date.now()
                          }
                        };
                        saveAnalysis(newSanityResult, null, null);
                        onUpdate(algoWithNewAnalysis);
                        setLoadingSanity(false);
                        console.log('[applyImprovement] ✅ Sanity check completed, new score:', newSanityResult.score);
                      } else if (sanityJobStatus.status === 'failed') {
                        clearInterval(sanityPollInterval);
                        setLoadingSanity(false);
                        console.error('[applyImprovement] Sanity check failed:', sanityJobStatus.errorMessage);
                      }
                    } catch (e) {
                      console.error('[applyImprovement] Failed to check sanity job status:', e);
                      clearInterval(sanityPollInterval);
                      setLoadingSanity(false);
                    }
                  }, 2000);
                } catch (e) {
                  console.error('[applyImprovement] Failed to start sanity check:', e);
                  setLoadingSanity(false);
                }
                
                // Switch to analysis tab to see updated score
                setTimeout(() => {
                  setActiveTab('analysis');
                }, 100);
                
                console.log('[applyImprovement] ✅ Algorithm updated successfully');
                resolve();
              } else {
                console.error('[applyImprovement] ❌ Invalid improved algorithm data');
                setFixingIssue(null);
                const error = 'Failed to improve algorithm: Invalid response from server';
                setNotification({ type: 'error', message: error });
                setTimeout(() => setNotification(null), 5000);
                reject(new Error(error));
              }
            } else if (jobStatus.status === 'failed') {
              clearInterval(pollInterval);
              setFixingIssue(null);
              console.error('[applyImprovement] ❌ Improvement job failed:', jobStatus.errorMessage);
              const error = `Failed to improve algorithm: ${jobStatus.errorMessage || 'Unknown error'}`;
              setNotification({ type: 'error', message: error });
              setTimeout(() => setNotification(null), 5000);
              reject(new Error(error));
            }
          } catch (e) {
            console.error('[applyImprovement] Failed to check job status:', e);
            clearInterval(pollInterval);
            setFixingIssue(null);
            const error = 'Failed to check improvement status. Please try again.';
            setNotification({ type: 'error', message: error });
            setTimeout(() => setNotification(null), 5000);
            reject(e);
          }
        }, 2000); // Poll every 2 seconds
        
      } catch (e) {
        console.error("[applyImprovement] Failed to start improvement:", e);
        setFixingIssue(null);
        const error = `Failed to start improvement: ${e instanceof Error ? e.message : 'Unknown error'}`;
        setNotification({ type: 'error', message: error });
        setTimeout(() => setNotification(null), 5000);
        reject(e);
      }
    });
  };

  const handleFix = async (issue: string, type: string) => {
    console.log('[handleFix] Called with:', { issue: issue.substring(0, 50), type, fixingIssue, isImproving });
    
    if (fixingIssue) {
      console.log('[handleFix] Already fixing an issue, returning');
      return;
    }
    
    if (isImproving) {
      console.log('[handleFix] Manual improvement in progress, returning');
      return;
    }
    
    console.log('[handleFix] Setting fixingIssue and starting improvement...');
    setFixingIssue(issue);
    
    try {
      const actionType = (type === 'Gap' || type === 'Risk') ? `Auto-fix ${type}` : type;
      console.log('[handleFix] Calling applyImprovement with:', { issue: issue.substring(0, 50), actionType });
      
      // applyImprovement manages fixingIssue state internally
      await applyImprovement(issue, actionType);
      console.log('[handleFix] Improvement completed successfully');
    } catch (error) {
      console.error('[handleFix] Error caught:', error);
      // Error is already handled and displayed in applyImprovement
      // Just ensure fixingIssue is cleared
      setFixingIssue(null);
    }
  };

  const handleManualImprove = async () => {
    if (!improvePrompt.trim() || isImproving) return;
    setIsImproving(true);
    try {
      await applyImprovement(improvePrompt, 'Manual Improvement');
      // Only close modal and clear prompt if improvement succeeded
      setShowImproveModal(false);
      setImprovePrompt('');
    } catch (error) {
      // Keep modal open on error so user can retry
      console.error('[handleManualImprove] Error:', error);
    } finally {
      setIsImproving(false);
    }
  };

  const handleRevert = (version: AlgoVersion) => {
    if(!onUpdate) return;
    if(!confirm("Are you sure you want to revert to this version? Current changes will be saved to history.")) return;
    
    // Create history entry for current state before reverting
    const historyEntry: AlgoVersion = {
        timestamp: Date.now(),
        name: algorithm.name,
        description: algorithm.description,
        steps: algorithm.steps,
        pseudoCode: algorithm.pseudoCode,
        changeNote: `Reverted to version from ${new Date(version.timestamp).toLocaleDateString()}`
    };

    const restored: BioAlgorithm = {
      ...algorithm,
      name: version.name,
      description: version.description,
      steps: version.steps,
      pseudoCode: version.pseudoCode,
      history: [historyEntry, ...(algorithm.history || [])]
    };
    onUpdate(restored);
  };

  return (
    <>
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[70] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right ${
          notification.type === 'success' 
            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {notification.type === 'success' ? (
            <Check size={18} className="text-emerald-400" />
          ) : (
            <AlertTriangle size={18} className="text-red-400" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={(e) => {
      // Close modal when clicking outside (but not during operations)
      if (e.target === e.currentTarget && !fixingIssue && !isImproving && !loadingSanity && !loadingBlindSpots && !loadingExtensions) {
        onClose();
      }
    }}>
      <div className="bg-[#0b1120] border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2 py-1 text-xs rounded border ${algorithm.type === 'hybrid' ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' : 'border-bio-500/30 text-bio-400 bg-bio-500/10'}`}>
                {algorithm.type === 'hybrid' ? 'Hybrid System' : 'Bio-Algorithm'}
              </span>
              <span className="text-slate-500 text-xs font-mono">ID: {algorithm.id.slice(0,8)}</span>
              {algorithm.history && algorithm.history.length > 0 && (
                 <span className="text-slate-500 text-xs flex items-center gap-1">
                   <GitCommit size={12} /> v{algorithm.history.length + 1}.0
                 </span>
              )}
            </div>
            <h2 className="text-3xl font-bold text-white mb-1">{algorithm.name}</h2>
            <p className="text-lg text-slate-400">{algorithm.inspiration} → {algorithm.domain}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowImproveModal(true)}
              className="px-3 py-2 text-sm"
              disabled={isImproving || !!fixingIssue}
            >
              <Sparkles size={16} /> Improve
            </Button>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/30 px-6 overflow-x-auto scrollbar-hide relative z-10">
           {[
             { id: 'overview', label: 'Overview', icon: Dna },
             { id: 'flow', label: 'Interactive Flow', icon: Network },
             { id: 'analysis', label: 'Feasibility & Risks', icon: Activity },
             { id: 'code', label: 'Code', icon: Code2 },
             { id: 'history', label: 'Version History', icon: History }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 relative z-10 ${activeTab === tab.id ? 'border-bio-500 text-bio-400 bg-bio-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
             >
               <tab.icon size={16} /> {tab.label}
             </button>
           ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-950/30 relative z-0">
          
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in">
              <section>
                <h3 className="text-sm font-bold text-bio-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Cpu size={16} /> Core Principle
                </h3>
                <p className="text-slate-300 text-lg leading-relaxed border-l-2 border-bio-500/30 pl-4">
                  {algorithm.principle}
                </p>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Steps</h3>
                   <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                      <ol className="list-decimal list-inside space-y-2 text-slate-300">
                        {algorithm.steps.map((step, i) => (
                          <li key={i} className="pl-2">{step}</li>
                        ))}
                      </ol>
                   </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Applications</h3>
                  <div className="flex flex-wrap gap-2">
                    {algorithm.applications.map((app, i) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 w-full text-sm text-slate-300 hover:border-slate-600 transition-colors">
                        {app}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="bg-slate-950 rounded-xl border border-slate-800 p-6 font-mono text-sm overflow-x-auto relative group">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Code2 className="text-slate-600" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Pseudocode Representation</h3>
                <pre className="text-tech-400 whitespace-pre-wrap">
                  {algorithm.pseudoCode}
                </pre>
              </section>
              
               <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2 self-center">Tags:</span>
                  {algorithm.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 text-xs rounded-full border border-slate-700 text-slate-400 bg-slate-900/50">
                      {tag}
                    </span>
                  ))}
                </div>
            </div>
          )}

          {activeTab === 'flow' && (
             <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-900/20 rounded-xl border border-slate-800 p-8 animate-in fade-in">
                <Flowchart steps={algorithm.steps} interactive />
             </div>
          )}

          {activeTab === 'analysis' && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
                {/* Sanity */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-200 flex items-center gap-2">
                       <Activity size={18} className="text-blue-400" /> Feasibility
                    </h4>
                    <button 
                      onClick={runSanity} 
                      disabled={loadingSanity || !!fixingIssue || isImproving}
                      className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full hover:bg-blue-500/20 disabled:opacity-50"
                    >
                      {loadingSanity ? 'Running...' : sanityResult ? 'Re-run' : 'Run Analysis'}
                    </button>
                  </div>
                  {sanityResult ? (
                    <div className="space-y-4">
                       <div className="flex items-center gap-3">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl border-4 ${sanityResult.score > 70 ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : sanityResult.score > 40 ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'}`}>
                             {sanityResult.score}
                          </div>
                          <div>
                             <div className="text-xs text-slate-500 uppercase">Verdict</div>
                             <div className="font-bold text-white">{sanityResult.verdict}</div>
                          </div>
                       </div>
                       <p className="text-sm text-slate-400">{sanityResult.analysis}</p>
                       
                       {sanityResult.gaps && sanityResult.gaps.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-800">
                             <div className="text-xs font-bold text-slate-500 uppercase mb-2">
                               Identified Gaps
                               {fixedGaps.size > 0 && (
                                 <span className="ml-2 text-emerald-400">({fixedGaps.size} fixed)</span>
                               )}
                             </div>
                             {sanityResult.gaps.filter(gap => !fixedGaps.has(gap)).length > 0 ? (
                               <ul className="space-y-2">
                                 {sanityResult.gaps.filter(gap => !fixedGaps.has(gap)).map((gap, i) => (
                                   <li key={i} className="flex justify-between items-start gap-2 text-xs bg-slate-950 p-2 rounded border border-slate-800">
                                      <span className="text-slate-300">{gap}</span>
                                      <button 
                                        onClick={() => handleFix(gap, 'Gap')}
                                        disabled={!!fixingIssue || isImproving}
                                        className="text-[10px] bg-blue-900 text-blue-300 px-2 py-1 rounded hover:bg-blue-800 flex-shrink-0 flex items-center gap-1 disabled:opacity-50"
                                      >
                                         {fixingIssue === gap ? <div className="animate-spin w-3 h-3 border-2 border-current rounded-full border-t-transparent"></div> : <Wrench size={10} />} Fix
                                      </button>
                                   </li>
                                 ))}
                               </ul>
                             ) : (
                               <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-2 flex items-center gap-2">
                                 <Check size={12} /> All gaps have been addressed!
                               </div>
                             )}
                          </div>
                       )}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm italic">
                       Run feasibility check to score this algorithm.
                    </div>
                  )}
                </div>

                {/* Blind Spots */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col h-full">
                   <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-200 flex items-center gap-2">
                       <ShieldAlert size={18} className="text-red-400" /> Risks & Gaps
                    </h4>
                    <button 
                      onClick={runBlindSpots} 
                      disabled={loadingBlindSpots || !!fixingIssue || isImproving}
                      className="text-xs bg-red-500/10 text-red-400 px-3 py-1 rounded-full hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {loadingBlindSpots ? 'Scanning...' : blindSpots ? 'Re-scan' : 'Scan Risks'}
                    </button>
                  </div>
                  {blindSpots ? (
                     <>
                        {blindSpots.risks.filter(risk => !fixedRisks.has(risk.risk)).length > 0 ? (
                          <ul className="space-y-3">
                             {blindSpots.risks.filter(risk => !fixedRisks.has(risk.risk)).map((risk, i) => (
                                <li key={i} className="text-sm bg-slate-950 p-3 rounded border border-slate-800">
                                   <div className="flex items-center justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-2">
                                         <span className={`w-2 h-2 rounded-full ${risk.severity === 'High' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                                         <span className="font-bold text-slate-300">{risk.risk}</span>
                                      </div>
                                      <button 
                                           onClick={() => handleFix(risk.risk, 'Risk')}
                                           disabled={!!fixingIssue || isImproving}
                                           className="text-[10px] bg-red-900 text-red-300 px-2 py-1 rounded hover:bg-red-800 flex-shrink-0 flex items-center gap-1 disabled:opacity-50"
                                         >
                                            {fixingIssue === risk.risk ? <div className="animate-spin w-3 h-3 border-2 border-current rounded-full border-t-transparent"></div> : <Wrench size={10} />} Fix
                                         </button>
                                   </div>
                                   <p className="text-xs text-slate-500">{risk.explanation}</p>
                                </li>
                             ))}
                          </ul>
                        ) : (
                          <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-3 flex items-center gap-2">
                            <Check size={12} /> All risks have been addressed!
                          </div>
                        )}
                        {fixedRisks.size > 0 && blindSpots.risks.filter(risk => !fixedRisks.has(risk.risk)).length > 0 && (
                          <div className="mt-2 text-xs text-slate-500 text-center">
                            {fixedRisks.size} risk{fixedRisks.size > 1 ? 's' : ''} fixed
                          </div>
                        )}
                     </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm italic">
                       Identify potential failure modes.
                    </div>
                  )}
                </div>

                {/* Extensions */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col h-full">
                   <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-200 flex items-center gap-2">
                       <Lightbulb size={18} className="text-purple-400" /> Evolution
                    </h4>
                    <button 
                      onClick={runExtensions} 
                      disabled={loadingExtensions}
                      className="text-xs bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full hover:bg-purple-500/20 disabled:opacity-50"
                    >
                      {loadingExtensions ? 'Thinking...' : extensions ? 'Ideate' : 'Ideate'}
                    </button>
                  </div>
                  {extensions ? (
                     <>
                        {extensions.ideas.filter(idea => !implementedExtensions.has(idea.description)).length > 0 ? (
                          <ul className="space-y-3">
                             {extensions.ideas.filter(idea => !implementedExtensions.has(idea.description)).map((idea, i) => (
                                <li key={i} className="text-sm bg-slate-950 p-3 rounded border border-slate-800">
                                   <div className="flex justify-between items-start gap-2 mb-1">
                                     <div className="font-bold text-slate-300">{idea.name}</div>
                                     <button 
                                           onClick={() => handleFix(idea.description, `Implement Extension: ${idea.name}`)}
                                           disabled={!!fixingIssue || isImproving}
                                           className="text-[10px] bg-purple-900 text-purple-300 px-2 py-1 rounded hover:bg-purple-800 flex-shrink-0 flex items-center gap-1 disabled:opacity-50"
                                         >
                                            {fixingIssue === idea.description ? <div className="animate-spin w-3 h-3 border-2 border-current rounded-full border-t-transparent"></div> : <Sparkles size={10} />} Implement
                                     </button>
                                   </div>
                                   <p className="text-xs text-slate-500">{idea.description}</p>
                                </li>
                             ))}
                          </ul>
                        ) : (
                          <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-3 flex items-center gap-2">
                            <Check size={12} /> All extensions have been implemented!
                          </div>
                        )}
                        {implementedExtensions.size > 0 && extensions.ideas.filter(idea => !implementedExtensions.has(idea.description)).length > 0 && (
                          <div className="mt-2 text-xs text-slate-500 text-center">
                            {implementedExtensions.size} extension{implementedExtensions.size > 1 ? 's' : ''} implemented
                          </div>
                        )}
                     </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm italic">
                       Generate ideas for future iterations.
                    </div>
                  )}
                </div>
             </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Code Generation Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <FileCode size={20} className="text-bio-400" /> Generate Code
                  </h3>
                  <p className="text-sm text-slate-400">
                    Generate implementation code for this algorithm in your preferred language
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-bio-500"
                    disabled={generatingCode}
                  >
                    {supportedLanguages.map(lang => (
                      <option key={lang.value} value={lang.value}>
                        {lang.icon} {lang.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleGenerateCode}
                    disabled={generatingCode}
                    isLoading={generatingCode}
                  >
                    <Code2 size={16} /> Generate
                  </Button>
                </div>
              </div>

              {/* Code Generations List */}
              {codeGenerations.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">Generated Versions</h4>
                    <div className="space-y-2">
                      {codeGenerations.map((gen) => (
                        <button
                          key={gen.id}
                          onClick={() => handleSelectGeneration(gen.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedGeneration?.id === gen.id
                              ? 'bg-bio-500/20 border-bio-500 text-bio-400'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">
                                {supportedLanguages.find(l => l.value === gen.language)?.icon} {gen.language}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                v{gen.version || '1.0.0'}
                              </div>
                            </div>
                            {selectedGeneration?.id === gen.id && (
                              <Check size={16} className="text-bio-400" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Code Display */}
                  <div className="md:col-span-2">
                    {selectedGeneration ? (
                      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
                          <div className="flex items-center gap-3">
                            <FileCode size={18} className="text-bio-400" />
                            <div>
                              <div className="font-medium text-white">
                                {supportedLanguages.find(l => l.value === selectedGeneration.language)?.label} Implementation
                              </div>
                              <div className="text-xs text-slate-500">
                                Version {selectedGeneration.version || '1.0.0'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleCopyCode}
                              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                              title="Copy code"
                            >
                              {codeCopied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                            </button>
                            <button
                              onClick={handleDownloadCode}
                              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                              title="Download code"
                            >
                              <Download size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="p-4 overflow-x-auto">
                          <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                            <code>{selectedGeneration.code}</code>
                          </pre>
                        </div>
                        {selectedGeneration.explanation && (
                          <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Explanation</div>
                            <p className="text-sm text-slate-400">{selectedGeneration.explanation}</p>
                          </div>
                        )}
                        {selectedGeneration.dependencies && selectedGeneration.dependencies.length > 0 && (
                          <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Dependencies</div>
                            <div className="flex flex-wrap gap-2">
                              {selectedGeneration.dependencies.map((dep: string, i: number) => (
                                <span key={i} className="px-2 py-1 text-xs bg-slate-800 text-slate-300 rounded border border-slate-700">
                                  {dep}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 bg-slate-900 rounded-xl border border-slate-800 text-slate-500">
                        Select a code generation to view
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {codeGenerations.length === 0 && !generatingCode && (
                <div className="flex flex-col items-center justify-center py-16 bg-slate-900 rounded-xl border border-slate-800">
                  <Code2 size={48} className="text-slate-600 mb-4" />
                  <p className="text-slate-400 mb-4">No code generated yet</p>
                  <p className="text-sm text-slate-500 text-center max-w-md">
                    Select a language and click "Generate" to create an implementation of this algorithm
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
             <div className="space-y-4 animate-in fade-in">
                {(!algorithm.history || algorithm.history.length === 0) ? (
                   <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No version history available. Edits will appear here.
                   </div>
                ) : (
                   <div className="relative border-l border-slate-800 ml-4 space-y-8">
                      {algorithm.history.map((version, i) => (
                         <div key={i} className="relative pl-8">
                            <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-700 border border-slate-900"></div>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                               <div className="flex justify-between items-start mb-2">
                                  <div>
                                     <h4 className="font-bold text-slate-200">{version.name}</h4>
                                     <div className="text-xs text-slate-500 font-mono">
                                        {new Date(version.timestamp).toLocaleString()} • {version.changeNote || 'Update'}
                                     </div>
                                  </div>
                                  <button 
                                    onClick={() => handleRevert(version)}
                                    className="text-xs text-bio-400 hover:text-white px-3 py-1 bg-bio-500/10 rounded-full hover:bg-bio-500/20"
                                  >
                                    Revert
                                  </button>
                               </div>
                               <p className="text-sm text-slate-400 line-clamp-2">{version.description}</p>
                            </div>
                         </div>
                      ))}
                      {/* Current head */}
                       <div className="relative pl-8">
                            <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-bio-500 border border-slate-900 shadow-[0_0_8px_#10b981]"></div>
                            <div className="text-sm text-bio-400 font-medium pt-0.5">Current Version</div>
                       </div>
                   </div>
                )}
             </div>
          )}
        </div>
        
        {/* Improve Modal */}
        {showImproveModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={(e) => {
            // Don't close during operations
            if (e.target === e.currentTarget && !isImproving && !fixingIssue) {
              setShowImproveModal(false);
            }
          }}>
             <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="text-bio-400" /> Improve Algorithm
                  </h3>
                  <button onClick={() => setShowImproveModal(false)} className="text-slate-500 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                
                <p className="text-sm text-slate-400 mb-4">
                  Describe how you want to enhance or fix this algorithm. The AI will generate a new version based on your request.
                </p>

                <TextArea 
                  placeholder="e.g. Optimize for low-latency environments, or add a security layer inspired by turtle shells..."
                  value={improvePrompt}
                  onChange={(e) => setImprovePrompt(e.target.value)}
                  className="mb-4"
                />

                <div className="flex justify-end gap-3">
                   <Button variant="ghost" onClick={() => setShowImproveModal(false)}>Cancel</Button>
                   <Button onClick={handleManualImprove} isLoading={isImproving} disabled={!improvePrompt.trim()}>
                     Generate Improvements
                   </Button>
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
    </>
  );
};