import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BioAlgorithm, SanityCheckResult, BlindSpotResult, ExtensionResult, AlgoVersion } from '../types';
import { algorithmApi, jobApi, codeApi } from '../services/api';
import { Network, Dna, Code2, Cpu, Copy, Check, Edit2, AlertTriangle, ShieldAlert, Lightbulb, Activity, History, GitCommit, ArrowLeft, Save, Wrench, Sparkles, X, FileCode, Download, Play, Bug, Zap, RefreshCw, TestTube, Printer } from 'lucide-react';
import { Flowchart } from '../components/Flowchart';
import { Button } from '../components/Button';
import { TextArea } from '../components/Input';
import { useRecentItems } from '../components/RecentItems';

const AlgorithmDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addRecentAlgorithm } = useRecentItems();
  
  const [algorithm, setAlgorithm] = useState<BioAlgorithm | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'flow' | 'analysis' | 'code' | 'history'>('overview');
  
  // Analysis State
  const [sanityResult, setSanityResult] = useState<SanityCheckResult | null>(null);
  const [blindSpots, setBlindSpots] = useState<BlindSpotResult | null>(null);
  const [extensions, setExtensions] = useState<ExtensionResult | null>(null);
  
  const [loadingSanity, setLoadingSanity] = useState(false);
  const [loadingBlindSpots, setLoadingBlindSpots] = useState(false);
  const [loadingExtensions, setLoadingExtensions] = useState(false);
  const [fixingIssue, setFixingIssue] = useState<string | null>(null);

  // Manual Improve State
  const [showImproveModal, setShowImproveModal] = useState(false);
  const [improvePrompt, setImprovePrompt] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  
  // Track fixed/implemented items
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
  
  // Code Execution & Analysis State
  const [executingCode, setExecutingCode] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [analyzingCode, setAnalyzingCode] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [fixingCode, setFixingCode] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  
  const supportedLanguages = [
    { value: 'python', label: 'Python', icon: '🐍' },
    { value: 'javascript', label: 'JavaScript', icon: '📜' },
    { value: 'typescript', label: 'TypeScript', icon: '📘' },
    { value: 'java', label: 'Java', icon: '☕' },
    { value: 'cpp', label: 'C++', icon: '⚡' },
    { value: 'go', label: 'Go', icon: '🐹' },
    { value: 'rust', label: 'Rust', icon: '🦀' }
  ];

  // Load algorithm
  useEffect(() => {
    const loadAlgorithm = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const algo = await algorithmApi.getById(parseInt(id));
        setAlgorithm(algo);
        setSanityResult(algo.analysis?.sanity || null);
        setBlindSpots(algo.analysis?.blindSpots || null);
        setExtensions(algo.analysis?.extensions || null);
      } catch (error) {
        console.error('Failed to load algorithm:', error);
        setNotification({ type: 'error', message: 'Failed to load algorithm' });
        setTimeout(() => setNotification(null), 5000);
      } finally {
        setLoading(false);
      }
    };
    
    loadAlgorithm();
  }, [id]);

  // Add to recent items when algorithm is loaded
  useEffect(() => {
    if (algorithm && algorithm.id) {
      addRecentAlgorithm(parseInt(algorithm.id), algorithm.name);
    }
  }, [algorithm, addRecentAlgorithm]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close modals
      if (e.key === 'Escape') {
        if (showImproveModal) {
          setShowImproveModal(false);
        }
      }
      
      // Ctrl/Cmd + K to focus search (when on library page)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // This would focus search if we were on library page
      }
      
      // Number keys 1-5 to switch tabs
      if (e.key >= '1' && e.key <= '5' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const tabIndex = parseInt(e.key) - 1;
        const tabs = ['overview', 'flow', 'analysis', 'code', 'history'];
        if (tabs[tabIndex]) {
          setActiveTab(tabs[tabIndex] as any);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showImproveModal]);

  // Load code generations when code tab is active
  useEffect(() => {
    const loadCodeGenerations = async () => {
      if (!algorithm || activeTab !== 'code') return;
      try {
        const generations = await codeApi.getGenerations(parseInt(algorithm.id));
        setCodeGenerations(generations);
        if (generations.length > 0 && !selectedGeneration) {
          const details = await codeApi.getGeneration(generations[0].id);
          setSelectedGeneration(details);
        }
      } catch (error) {
        console.error('Failed to load code generations:', error);
      }
    };
    
    loadCodeGenerations();
  }, [activeTab, algorithm?.id]);

  const updateAlgorithm = async (updated: BioAlgorithm) => {
    try {
      const saved = await algorithmApi.update(parseInt(updated.id), updated);
      setAlgorithm(saved);
      return saved;
    } catch (error) {
      console.error('Failed to update algorithm:', error);
      throw error;
    }
  };

  const saveAnalysis = (
    newSanity: SanityCheckResult | null, 
    newBlind: BlindSpotResult | null, 
    newExt: ExtensionResult | null
  ) => {
    if (!algorithm) return;
    
    const updated: BioAlgorithm = {
      ...algorithm,
      analysis: {
        sanity: newSanity || sanityResult || undefined,
        blindSpots: newBlind || blindSpots || undefined,
        extensions: newExt || extensions || undefined,
        lastRun: Date.now()
      }
    };
    
    updateAlgorithm(updated);
  };

  const runSanity = async () => {
    if (!algorithm) return;
    setLoadingSanity(true);
    try {
      const job = await jobApi.create('analyze', {
        algorithmId: parseInt(algorithm.id),
        analysisType: 'sanity'
      });
      
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
    if (!algorithm) return;
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
    if (!algorithm) return;
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
    if (!algorithm) {
      return Promise.reject(new Error('Algorithm not loaded'));
    }
    
    return new Promise(async (resolve, reject) => {
      try {
        let improvementType = 'optimization';
        if (type.includes('Gap') || type.includes('Risk')) {
          improvementType = 'bug_fix';
        } else if (type.includes('Extension') || type.includes('Implement')) {
          improvementType = 'feature_add';
        }
        
        const job = await jobApi.create('improve', {
          algorithmId: parseInt(algorithm.id),
          improvementDescription: issue,
          improvementType: improvementType
        });
        
        const pollInterval = setInterval(async () => {
          try {
            const jobStatus = await jobApi.getById(job.id);
            
            if (jobStatus.status === 'completed') {
              clearInterval(pollInterval);
              setFixingIssue(null);
              
              const improvedAlgo = jobStatus.resultData;
              
              if (improvedAlgo && improvedAlgo.name) {
                if (type.includes('Gap')) {
                  setFixedGaps(prev => new Set([...prev, issue]));
                } else if (type.includes('Risk')) {
                  setFixedRisks(prev => new Set([...prev, issue]));
                } else if (type.includes('Extension') || type.includes('Implement')) {
                  setImplementedExtensions(prev => new Set([...prev, issue]));
                }
                
                const updatedAlgo: BioAlgorithm = {
                  ...algorithm,
                  name: improvedAlgo.name,
                  description: improvedAlgo.description,
                  principle: improvedAlgo.principle,
                  steps: improvedAlgo.steps,
                  applications: improvedAlgo.applications,
                  pseudoCode: improvedAlgo.pseudoCode,
                  tags: improvedAlgo.tags,
                  analysis: algorithm.analysis
                };
                
                await updateAlgorithm(updatedAlgo);
                
                setLoadingSanity(true);
                try {
                  const sanityJob = await jobApi.create('analyze', {
                    algorithmId: parseInt(algorithm.id),
                    analysisType: 'sanity'
                  });
                  
                  const sanityPollInterval = setInterval(async () => {
                    try {
                      const sanityJobStatus = await jobApi.getById(sanityJob.id);
                      if (sanityJobStatus.status === 'completed') {
                        clearInterval(sanityPollInterval);
                        const newSanityResult = sanityJobStatus.resultData;
                        setSanityResult(newSanityResult);
                        const algoWithNewAnalysis: BioAlgorithm = {
                          ...updatedAlgo,
                          analysis: {
                            ...updatedAlgo.analysis,
                            sanity: newSanityResult,
                            lastRun: Date.now()
                          }
                        };
                        saveAnalysis(newSanityResult, null, null);
                        await updateAlgorithm(algoWithNewAnalysis);
                        setLoadingSanity(false);
                      } else if (sanityJobStatus.status === 'failed') {
                        clearInterval(sanityPollInterval);
                        setLoadingSanity(false);
                      }
                    } catch (e) {
                      clearInterval(sanityPollInterval);
                      setLoadingSanity(false);
                    }
                  }, 2000);
                } catch (e) {
                  setLoadingSanity(false);
                }
                
                setTimeout(() => {
                  setActiveTab('analysis');
                }, 100);
                
                setNotification({ 
                  type: 'success', 
                  message: type.includes('Extension') || type.includes('Implement') 
                    ? 'Extension implemented successfully! Re-running analysis...' 
                    : 'Issue fixed successfully! Re-running analysis...' 
                });
                setTimeout(() => setNotification(null), 5000);
                
                resolve();
              } else {
                setFixingIssue(null);
                const error = 'Failed to improve algorithm: Invalid response from server';
                setNotification({ type: 'error', message: error });
                setTimeout(() => setNotification(null), 5000);
                reject(new Error(error));
              }
            } else if (jobStatus.status === 'failed') {
              clearInterval(pollInterval);
              setFixingIssue(null);
              const error = `Failed to improve algorithm: ${jobStatus.errorMessage || 'Unknown error'}`;
              setNotification({ type: 'error', message: error });
              setTimeout(() => setNotification(null), 5000);
              reject(new Error(error));
            }
          } catch (e) {
            clearInterval(pollInterval);
            setFixingIssue(null);
            const error = 'Failed to check improvement status. Please try again.';
            setNotification({ type: 'error', message: error });
            setTimeout(() => setNotification(null), 5000);
            reject(e);
          }
        }, 2000);
        
      } catch (e) {
        setFixingIssue(null);
        const error = `Failed to start improvement: ${e instanceof Error ? e.message : 'Unknown error'}`;
        setNotification({ type: 'error', message: error });
        setTimeout(() => setNotification(null), 5000);
        reject(e);
      }
    });
  };

  const handleFix = async (issue: string, type: string) => {
    if (fixingIssue || isImproving) return;
    setFixingIssue(issue);
    
    try {
      const actionType = (type === 'Gap' || type === 'Risk') ? `Auto-fix ${type}` : type;
      await applyImprovement(issue, actionType);
    } catch (error) {
      setFixingIssue(null);
    }
  };

  const handleManualImprove = async () => {
    if (!improvePrompt.trim() || isImproving || !algorithm) return;
    setIsImproving(true);
    try {
      await applyImprovement(improvePrompt, 'Manual Improvement');
      setShowImproveModal(false);
      setImprovePrompt('');
    } catch (error) {
      console.error('[handleManualImprove] Error:', error);
    } finally {
      setIsImproving(false);
    }
  };

  const handleGenerateCode = async () => {
    if (generatingCode || !algorithm) return;
    
    setGeneratingCode(true);
    try {
      const result = await codeApi.generate(parseInt(algorithm.id), selectedLanguage);
      setNotification({ 
        type: 'success', 
        message: `${supportedLanguages.find(l => l.value === selectedLanguage)?.label} code generated successfully!` 
      });
      setTimeout(() => setNotification(null), 5000);
      
      const generations = await codeApi.getGenerations(parseInt(algorithm.id));
      setCodeGenerations(generations);
      
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
    if (selectedGeneration?.code && algorithm) {
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

  const handleExecuteCode = async () => {
    if (!selectedGeneration || executingCode) return;
    
    setExecutingCode(true);
    setExecutionResult(null);
    
    try {
      const result = await codeApi.execute(selectedGeneration.id);
      setExecutionResult(result);
      
      // Reload execution history
      if (selectedGeneration.id) {
        const history = await codeApi.getExecutions(selectedGeneration.id, 10);
        setExecutionHistory(history);
      }
      
      setNotification({ 
        type: result.status === 'completed' ? 'success' : 'error',
        message: result.status === 'completed' 
          ? 'Code executed successfully!' 
          : `Execution failed: ${result.error || 'Unknown error'}`
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (error: any) {
      setNotification({ 
        type: 'error', 
        message: `Failed to execute code: ${error.message || 'Unknown error'}` 
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setExecutingCode(false);
    }
  };

  const handleAnalyzeCode = async (autoFix: boolean = false) => {
    if (!selectedGeneration || analyzingCode || fixingCode) return;
    
    if (autoFix) {
      setFixingCode(true);
    } else {
      setAnalyzingCode(true);
    }
    setAnalysisResult(null);
    
    try {
      const result = await codeApi.analyze(selectedGeneration.id, {
        includeExecution: true,
        fixIssues: autoFix
      });
      
      setAnalysisResult(result);
      
      // If auto-fix was applied, reload the generation
      if (autoFix && result.fixedCode) {
        const updated = await codeApi.getGeneration(selectedGeneration.id);
        setSelectedGeneration(updated);
        setCodeGenerations(prev => prev.map(g => 
          g.id === selectedGeneration.id ? updated : g
        ));
      }
      
      setNotification({ 
        type: 'success',
        message: autoFix 
          ? 'Code analyzed and fixed automatically!' 
          : 'Code analysis completed!'
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (error: any) {
      setNotification({ 
        type: 'error', 
        message: `Failed to analyze code: ${error.message || 'Unknown error'}` 
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setAnalyzingCode(false);
      setFixingCode(false);
    }
  };

  // Load analysis when generation is selected
  useEffect(() => {
    const loadAnalysis = async () => {
      if (selectedGeneration?.id) {
        try {
          const latest = await codeApi.getLatestAnalysis(selectedGeneration.id);
          if (latest) {
            setAnalysisResult(latest);
          }
        } catch (error) {
          // No analysis yet, that's okay
        }
        
        // Load execution history
        try {
          const history = await codeApi.getExecutions(selectedGeneration.id, 10);
          setExecutionHistory(history);
        } catch (error) {
          console.error('Failed to load execution history:', error);
        }
      }
    };
    
    loadAnalysis();
  }, [selectedGeneration?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-slate-400">Loading algorithm...</div>
      </div>
    );
  }

  if (!algorithm) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Algorithm not found</p>
          <Button onClick={() => navigate('/library')}>Back to Library</Button>
        </div>
      </div>
    );
  }

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

      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => navigate('/library')} className="hover:text-bio-400 transition-colors">
            Library
          </button>
          <span>/</span>
          <span className="text-slate-400">{algorithm.name}</span>
        </div>

        {/* Header */}
        <div className="bg-[#0b1120] border border-slate-700 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
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
              <h1 className="text-3xl font-bold text-white mb-1">{algorithm.name}</h1>
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
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => navigate('/library')} className="px-3 py-2 text-sm">
                  <ArrowLeft size={16} /> Back
                </Button>
                {algorithm && (
                  <>
                    <Button 
                      variant="ghost" 
                      onClick={() => printAlgorithm(algorithm)}
                      className="px-3 py-2 text-sm"
                      title="Print algorithm"
                    >
                      <Printer size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={async () => {
                        exportToMarkdown(algorithm, `${algorithm.name.replace(/\s+/g, '_')}.md`);
                        toast.success('Algorithm exported to Markdown');
                      }}
                      className="px-3 py-2 text-sm"
                      title="Export to Markdown"
                    >
                      <Download size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={async () => {
                        const success = await copyToClipboard(algorithm.pseudoCode);
                        if (success) {
                          toast.success('Pseudocode copied to clipboard');
                        } else {
                          toast.error('Failed to copy to clipboard');
                        }
                      }}
                      className="px-3 py-2 text-sm"
                      title="Copy pseudocode"
                    >
                      <Copy size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={async () => {
                        const success = await shareAlgorithm(algorithm);
                        if (success) {
                          toast.success('Shared successfully');
                        } else {
                          const link = `${window.location.origin}/algorithm/${algorithm.id}`;
                          await copyToClipboard(link);
                          toast.info('Link copied to clipboard');
                        }
                      }}
                      className="px-3 py-2 text-sm"
                      title="Share algorithm"
                    >
                      <Sparkles size={16} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/30 px-6 overflow-x-auto scrollbar-hide relative z-10 rounded-t-xl" role="tablist" aria-label="Algorithm detail tabs">
          {[
            { id: 'overview', label: 'Overview', icon: Dna, shortcut: '1' },
            { id: 'flow', label: 'Interactive Flow', icon: Network, shortcut: '2' },
            { id: 'analysis', label: 'Feasibility & Risks', icon: Activity, shortcut: '3' },
            { id: 'code', label: 'Code', icon: Code2, shortcut: '4' },
            { id: 'history', label: 'Version History', icon: History, shortcut: '5' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 relative z-10 focus:outline-none focus:ring-2 focus:ring-bio-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                activeTab === tab.id 
                  ? 'border-bio-500 text-bio-400 bg-bio-500/5' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <tab.icon size={16} aria-hidden="true" /> 
              <span>{tab.label}</span>
              <span className="text-xs opacity-50 ml-1" aria-label={`Shortcut: ${tab.shortcut}`}>({tab.shortcut})</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div 
          className="bg-[#0b1120] border border-slate-700 rounded-b-2xl p-8 space-y-8 min-h-[600px]"
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === 'overview' && (
            <div className="space-y-8">
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
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <ul className="space-y-2 text-slate-300">
                      {algorithm.applications.map((app, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-bio-400 mt-1">•</span>
                          <span>{app}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              </div>

              <section>
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Pseudocode Representation</h3>
                <pre className="text-tech-400 whitespace-pre-wrap bg-slate-900/50 p-4 rounded-xl border border-slate-800">
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
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-900/20 rounded-xl border border-slate-800 p-8">
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
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-bold text-slate-500 uppercase">
                            Identified Gaps
                            {fixedGaps.size > 0 && (
                              <span className="ml-2 text-emerald-400">({fixedGaps.size} fixed)</span>
                            )}
                          </div>
                          {sanityResult.gaps.filter(gap => !fixedGaps.has(gap)).length > 0 && (
                            <button
                              onClick={async () => {
                                const unfixedGaps = sanityResult.gaps.filter((gap: string) => !fixedGaps.has(gap));
                                for (const gap of unfixedGaps) {
                                  await handleFix(gap, 'Gap');
                                }
                              }}
                              disabled={!!fixingIssue || isImproving}
                              className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-1 rounded hover:bg-blue-900 flex-shrink-0 flex items-center gap-1 disabled:opacity-50"
                              title="Fix all gaps"
                            >
                              <Wrench size={10} /> Fix All
                            </button>
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
                    {blindSpots.risks.filter(risk => !fixedRisks.has(risk.risk)).length > 0 && (
                      <div className="mb-3 flex justify-end">
                        <button
                          onClick={async () => {
                            const unfixedRisks = blindSpots.risks.filter((risk: any) => !fixedRisks.has(risk.risk));
                            for (const risk of unfixedRisks) {
                              await handleFix(risk.risk, 'Risk');
                            }
                          }}
                          disabled={!!fixingIssue || isImproving}
                          className="text-[10px] bg-red-900/50 text-red-300 px-2 py-1 rounded hover:bg-red-900 flex-shrink-0 flex items-center gap-1 disabled:opacity-50"
                          title="Fix all risks"
                        >
                          <Wrench size={10} /> Fix All Risks
                        </button>
                      </div>
                    )}
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
                    {extensions.ideas.filter(idea => !implementedExtensions.has(idea.description)).length > 0 && (
                      <div className="mb-3 flex justify-end">
                        <button
                          onClick={async () => {
                            const unimplementedExtensions = extensions.ideas.filter((idea: any) => !implementedExtensions.has(idea.description));
                            for (const idea of unimplementedExtensions) {
                              await handleFix(idea.description, `Implement Extension: ${idea.name}`);
                            }
                          }}
                          disabled={!!fixingIssue || isImproving}
                          className="text-[10px] bg-purple-900/50 text-purple-300 px-2 py-1 rounded hover:bg-purple-900 flex-shrink-0 flex items-center gap-1 disabled:opacity-50"
                          title="Implement all extensions"
                        >
                          <Sparkles size={10} /> Implement All
                        </button>
                      </div>
                    )}
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
                                {analysisResult && (
                                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${
                                    analysisResult.score >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                                    analysisResult.score >= 60 ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}>
                                    Score: {analysisResult.score}/100
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleAnalyzeCode(false)}
                              disabled={analyzingCode || fixingCode}
                              isLoading={analyzingCode}
                              variant="secondary"
                              className="px-3 py-1.5 text-xs"
                            >
                              <Bug size={14} /> Analyze
                            </Button>
                            <Button
                              onClick={() => handleAnalyzeCode(true)}
                              disabled={analyzingCode || fixingCode}
                              isLoading={fixingCode}
                              variant="secondary"
                              className="px-3 py-1.5 text-xs"
                            >
                              <Zap size={14} /> Auto-Fix
                            </Button>
                            <button
                              onClick={handleExecuteCode}
                              disabled={executingCode}
                              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                              title="Execute code"
                            >
                              {executingCode ? (
                                <div className="animate-spin w-4 h-4 border-2 border-current rounded-full border-t-transparent"></div>
                              ) : (
                                <Play size={18} />
                              )}
                            </button>
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
                        
                        {/* Execution Result */}
                        {executionResult && (
                          <div className={`p-4 border-t border-slate-800 ${
                            executionResult.status === 'completed' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              <TestTube size={16} className={executionResult.status === 'completed' ? 'text-emerald-400' : 'text-red-400'} />
                              <div className="text-xs font-semibold text-slate-300 uppercase">
                                Execution Result: {executionResult.status}
                              </div>
                            </div>
                            {executionResult.output && (
                              <div className="mb-2">
                                <div className="text-xs text-slate-500 mb-1">Output:</div>
                                <pre className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-800 overflow-x-auto">
                                  {executionResult.output}
                                </pre>
                              </div>
                            )}
                            {executionResult.error && (
                              <div>
                                <div className="text-xs text-red-400 mb-1">Error:</div>
                                <pre className="text-xs text-red-300 bg-slate-900/50 p-2 rounded border border-red-800/50 overflow-x-auto">
                                  {executionResult.error}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Analysis Result */}
                        {analysisResult && (
                          <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <Bug size={16} className="text-purple-400" />
                                <div className="text-xs font-semibold text-slate-300 uppercase">Code Analysis</div>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                analysisResult.score >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                                analysisResult.score >= 60 ? 'bg-amber-500/20 text-amber-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                Score: {analysisResult.score}/100
                              </div>
                            </div>
                            
                            {analysisResult.summary && (
                              <p className="text-sm text-slate-400 mb-4">{analysisResult.summary}</p>
                            )}

                            {analysisResult.issues && analysisResult.issues.length > 0 && (
                              <div className="space-y-2 mb-4">
                                <div className="text-xs font-semibold text-slate-500 uppercase mb-2">
                                  Issues Found ({analysisResult.issues.length})
                                </div>
                                {analysisResult.issues.map((issue: any, i: number) => (
                                  <div key={i} className={`p-3 rounded-lg border ${
                                    issue.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                                    issue.severity === 'high' ? 'bg-orange-500/10 border-orange-500/30' :
                                    issue.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                    'bg-blue-500/10 border-blue-500/30'
                                  }`}>
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 text-[10px] rounded font-bold uppercase ${
                                          issue.type === 'error' ? 'bg-red-500/20 text-red-400' :
                                          issue.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                          issue.type === 'security' ? 'bg-purple-500/20 text-purple-400' :
                                          issue.type === 'performance' ? 'bg-orange-500/20 text-orange-400' :
                                          'bg-blue-500/20 text-blue-400'
                                        }`}>
                                          {issue.type}
                                        </span>
                                        <span className="text-xs font-medium text-slate-300">{issue.message}</span>
                                      </div>
                                      {issue.line && (
                                        <span className="text-xs text-slate-500">Line {issue.line}</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-400 mb-1">{issue.description}</p>
                                    {issue.suggestion && (
                                      <div className="text-xs text-slate-500 mt-1">
                                        <span className="font-semibold">Fix:</span> {issue.suggestion}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                              <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Recommendations</div>
                                <ul className="space-y-1">
                                  {analysisResult.recommendations.map((rec: string, i: number) => (
                                    <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                                      <span className="text-bio-400 mt-0.5">•</span>
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

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
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Version History</h3>
                {algorithm.history && algorithm.history.length > 0 && (
                  <Button
                    onClick={() => navigate(`/algorithm/${id}/diff`)}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <GitCommit size={16} /> Compare Versions
                  </Button>
                )}
              </div>
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
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-2">{version.description}</p>
                      </div>
                    </div>
                  ))}
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
    </>
  );
};

export default AlgorithmDetail;

