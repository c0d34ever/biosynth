import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { algorithmApi } from '../services/api';
import { BioAlgorithm, AlgoVersion } from '../types';
import { GitBranch, ArrowLeft, FileDiff, Plus, Minus, Code2 } from 'lucide-react';
import { Button } from '../components/Button';

const VersionDiff: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [algorithm, setAlgorithm] = useState<BioAlgorithm | null>(null);
  const [selectedVersion1, setSelectedVersion1] = useState<AlgoVersion | null>(null);
  const [selectedVersion2, setSelectedVersion2] = useState<AlgoVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadAlgorithm();
    }
  }, [id]);

  const loadAlgorithm = async () => {
    try {
      const algo = await algorithmApi.getById(parseInt(id!));
      setAlgorithm(algo);
      if (algo.history && algo.history.length > 0) {
        setSelectedVersion1(algo.history[0]);
        if (algo.history.length > 1) {
          setSelectedVersion2(algo.history[1]);
        }
      }
    } catch (error) {
      console.error('Failed to load algorithm:', error);
    } finally {
      setLoading(false);
    }
  };

  const diffText = (oldText: string, newText: string): { type: 'added' | 'removed' | 'unchanged'; text: string }[] => {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const result: { type: 'added' | 'removed' | 'unchanged'; text: string }[] = [];
    
    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine === newLine) {
        result.push({ type: 'unchanged', text: oldLine });
      } else {
        if (oldLine) {
          result.push({ type: 'removed', text: oldLine });
        }
        if (newLine) {
          result.push({ type: 'added', text: newLine });
        }
      }
    }
    
    return result;
  };

  const diffArrays = (oldArr: string[], newArr: string[]): { type: 'added' | 'removed' | 'unchanged'; text: string }[] => {
    const result: { type: 'added' | 'removed' | 'unchanged'; text: string }[] = [];
    const oldSet = new Set(oldArr);
    const newSet = new Set(newArr);
    
    // Find removed items
    oldArr.forEach(item => {
      if (!newSet.has(item)) {
        result.push({ type: 'removed', text: item });
      }
    });
    
    // Find added items
    newArr.forEach(item => {
      if (!oldSet.has(item)) {
        result.push({ type: 'added', text: item });
      }
    });
    
    // Find unchanged items
    oldArr.forEach(item => {
      if (newSet.has(item)) {
        result.push({ type: 'unchanged', text: item });
      }
    });
    
    return result;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!algorithm) {
    return (
      <div className="min-h-screen bg-[#020617] p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-slate-400">Algorithm not found</p>
          <Button onClick={() => navigate('/library')} variant="secondary" className="mt-4">
            <ArrowLeft size={16} /> Back to Library
          </Button>
        </div>
      </div>
    );
  }

  const currentVersion: AlgoVersion = {
    timestamp: algorithm.createdAt,
    name: algorithm.name,
    description: algorithm.description,
    steps: algorithm.steps,
    pseudoCode: algorithm.pseudoCode,
    changeNote: 'Current Version'
  };

  const allVersions = algorithm.history ? [currentVersion, ...algorithm.history] : [currentVersion];

  if (!selectedVersion1) {
    return (
      <div className="min-h-screen bg-[#020617] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button onClick={() => navigate(`/algorithm/${id}`)} variant="ghost" className="mb-4">
              <ArrowLeft size={16} /> Back to Algorithm
            </Button>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
              <FileDiff size={32} className="text-bio-400" />
              Version History
            </h1>
            <p className="text-slate-400">{algorithm.name}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <GitBranch size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No version history available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button onClick={() => navigate(`/algorithm/${id}`)} variant="ghost" className="mb-4">
            <ArrowLeft size={16} /> Back to Algorithm
          </Button>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <FileDiff size={32} className="text-bio-400" />
            Version Comparison
          </h1>
          <p className="text-slate-400">{algorithm.name}</p>
        </div>

        {/* Version Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Version 1</label>
            <select
              value={allVersions.findIndex(v => v.timestamp === selectedVersion1.timestamp)}
              onChange={(e) => setSelectedVersion1(allVersions[parseInt(e.target.value)])}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-bio-500"
            >
              {allVersions.map((version, index) => (
                <option key={index} value={index}>
                  {version.name} - {new Date(version.timestamp).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Version 2</label>
            <select
              value={selectedVersion2 ? allVersions.findIndex(v => v.timestamp === selectedVersion2.timestamp) : -1}
              onChange={(e) => {
                const idx = parseInt(e.target.value);
                if (idx >= 0) {
                  setSelectedVersion2(allVersions[idx]);
                }
              }}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-bio-500"
            >
              <option value={-1}>Select version...</option>
              {allVersions.map((version, index) => (
                <option key={index} value={index}>
                  {version.name} - {new Date(version.timestamp).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Diff Display */}
        {selectedVersion1 && selectedVersion2 && (
          <div className="space-y-6">
            {/* Description Diff */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Code2 size={20} className="text-bio-400" /> Description
              </h3>
              <div className="space-y-2">
                {diffText(selectedVersion1.description, selectedVersion2.description).map((line, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded ${
                      line.type === 'added' ? 'bg-emerald-500/10 border-l-4 border-emerald-500' :
                      line.type === 'removed' ? 'bg-red-500/10 border-l-4 border-red-500' :
                      'bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {line.type === 'added' && <Plus size={16} className="text-emerald-400 mt-0.5" />}
                      {line.type === 'removed' && <Minus size={16} className="text-red-400 mt-0.5" />}
                      <span className={`text-sm ${
                        line.type === 'added' ? 'text-emerald-300' :
                        line.type === 'removed' ? 'text-red-300' :
                        'text-slate-300'
                      }`}>
                        {line.text || '\u00A0'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps Diff */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Code2 size={20} className="text-bio-400" /> Steps
              </h3>
              <div className="space-y-2">
                {diffArrays(selectedVersion1.steps, selectedVersion2.steps).map((step, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded ${
                      step.type === 'added' ? 'bg-emerald-500/10 border-l-4 border-emerald-500' :
                      step.type === 'removed' ? 'bg-red-500/10 border-l-4 border-red-500' :
                      'bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {step.type === 'added' && <Plus size={16} className="text-emerald-400 mt-0.5" />}
                      {step.type === 'removed' && <Minus size={16} className="text-red-400 mt-0.5" />}
                      <span className={`text-sm ${
                        step.type === 'added' ? 'text-emerald-300' :
                        step.type === 'removed' ? 'text-red-300' :
                        'text-slate-300'
                      }`}>
                        {step.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pseudocode Diff */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Code2 size={20} className="text-bio-400" /> Pseudocode
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {diffText(selectedVersion1.pseudoCode, selectedVersion2.pseudoCode).map((line, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded font-mono text-xs ${
                      line.type === 'added' ? 'bg-emerald-500/10 border-l-4 border-emerald-500' :
                      line.type === 'removed' ? 'bg-red-500/10 border-l-4 border-red-500' :
                      'bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {line.type === 'added' && <Plus size={14} className="text-emerald-400 mt-0.5" />}
                      {line.type === 'removed' && <Minus size={14} className="text-red-400 mt-0.5" />}
                      <span className={`${
                        line.type === 'added' ? 'text-emerald-300' :
                        line.type === 'removed' ? 'text-red-300' :
                        'text-slate-300'
                      }`}>
                        {line.text || '\u00A0'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Version 1 Info</div>
                <div className="text-sm text-slate-300">
                  <div>Name: {selectedVersion1.name}</div>
                  <div className="mt-1">Date: {new Date(selectedVersion1.timestamp).toLocaleString()}</div>
                  {selectedVersion1.changeNote && (
                    <div className="mt-1 text-slate-400">Note: {selectedVersion1.changeNote}</div>
                  )}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Version 2 Info</div>
                <div className="text-sm text-slate-300">
                  <div>Name: {selectedVersion2.name}</div>
                  <div className="mt-1">Date: {new Date(selectedVersion2.timestamp).toLocaleString()}</div>
                  {selectedVersion2.changeNote && (
                    <div className="mt-1 text-slate-400">Note: {selectedVersion2.changeNote}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedVersion1 && !selectedVersion2 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <FileDiff size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Select a second version to compare</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionDiff;

