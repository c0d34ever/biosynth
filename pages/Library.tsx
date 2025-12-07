import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BioAlgorithm, AlgoVersion } from '../types';
import { AlgoCard } from '../components/Card';
import { Button } from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { Library as LibraryIcon, Search, Filter, Hash, Save, X, Edit2, Download, FileText, Grid, List } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { useDebounce } from '../hooks/useDebounce';
import { AdvancedFilter, FilterCondition } from '../components/AdvancedFilter';

interface LibraryProps {
  algorithms: BioAlgorithm[];
  onUpdate?: (algo: BioAlgorithm) => void;
}

const Library: React.FC<LibraryProps> = ({ algorithms, onUpdate }) => {
  const navigate = useNavigate();
  const [editingAlgo, setEditingAlgo] = useState<BioAlgorithm | null>(null);
  const [editNote, setEditNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterType, setFilterType] = useState<'all' | 'generated' | 'hybrid'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'score'>('newest');
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    algorithms.forEach(a => a.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [algorithms]);

  const filtered = useMemo(() => {
    let result = algorithms.filter(algo => {
      const matchesSearch = algo.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
                            algo.domain.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                            algo.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                            algo.inspiration.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesType = filterType === 'all' || algo.type === filterType;
      const matchesTag = selectedTag === 'all' || algo.tags.includes(selectedTag);
      
      // Apply advanced filters
      const matchesAdvancedFilters = filterConditions.every(condition => {
        const fieldValue = (algo as any)[condition.field];
        if (fieldValue === undefined || fieldValue === null) return false;
        
        switch (condition.operator) {
          case 'equals':
            return String(fieldValue).toLowerCase() === String(condition.value).toLowerCase();
          case 'contains':
            return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
          case 'startsWith':
            return String(fieldValue).toLowerCase().startsWith(String(condition.value).toLowerCase());
          case 'endsWith':
            return String(fieldValue).toLowerCase().endsWith(String(condition.value).toLowerCase());
          case 'greaterThan':
            return Number(fieldValue) > Number(condition.value);
          case 'lessThan':
            return Number(fieldValue) < Number(condition.value);
          case 'between':
            if (Array.isArray(condition.value) && condition.value.length === 2) {
              const num = Number(fieldValue);
              return num >= Number(condition.value[0]) && num <= Number(condition.value[1]);
            }
            return false;
          case 'in':
            if (Array.isArray(condition.value)) {
              return condition.value.some(v => String(fieldValue).toLowerCase() === String(v).toLowerCase());
            }
            return false;
          default:
            return true;
        }
      });
      
      return matchesSearch && matchesType && matchesTag && matchesAdvancedFilters;
    });

    // Sort results
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'score':
          const scoreA = a.analysis?.sanity?.score || 0;
          const scoreB = b.analysis?.sanity?.score || 0;
          return scoreB - scoreA;
        default:
          return 0;
      }
    });

    return result;
  }, [algorithms, debouncedSearchTerm, filterType, selectedTag, sortBy, filterConditions]);

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAlgo && onUpdate) {
      // Find original to snapshot it
      const original = algorithms.find(a => a.id === editingAlgo.id);
      let updated = { ...editingAlgo };

      if (original) {
        // Create history entry
        const version: AlgoVersion = {
          timestamp: Date.now(),
          name: original.name,
          description: original.description,
          steps: original.steps,
          pseudoCode: original.pseudoCode,
          changeNote: editNote || 'Manual Update'
        };

        updated.history = [version, ...(original.history || [])];
      }

      onUpdate(updated);
      setEditingAlgo(null);
      setEditNote('');
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <LibraryIcon className="text-slate-400" /> Algorithm Bank
          </h1>
          <p className="text-slate-400">
            A repository of your saved biomimetic designs.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
           {/* Search */}
           <div className="relative w-full md:w-auto">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} aria-hidden="true" />
             <input 
               type="text" 
               placeholder="Search algorithms..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-bio-500 outline-none w-full md:w-64"
               aria-label="Search algorithms"
               title="Press Ctrl+K to focus (when available)"
             />
           </div>

           {/* Type Filter */}
           <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700 flex-shrink-0">
              {(['all', 'generated', 'hybrid'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${filterType === f ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {f}
                </button>
              ))}
           </div>

           {/* Tag Filter */}
           <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-hide">
             <Filter size={14} className="text-slate-500 flex-shrink-0" />
             <button
                onClick={() => setSelectedTag('all')}
                className={`px-2 py-1 rounded-md text-xs whitespace-nowrap border transition-colors ${selectedTag === 'all' ? 'bg-bio-900/30 border-bio-500 text-bio-400' : 'bg-transparent border-slate-700 text-slate-500 hover:text-slate-300'}`}
             >
               All Tags
             </button>
             {allTags.map(tag => (
               <button
                 key={tag}
                 onClick={() => setSelectedTag(tag)}
                 className={`px-2 py-1 rounded-md text-xs whitespace-nowrap border transition-colors ${selectedTag === tag ? 'bg-bio-900/30 border-bio-500 text-bio-400' : 'bg-transparent border-slate-700 text-slate-500 hover:text-slate-300'}`}
               >
                 #{tag}
               </button>
             ))}
           </div>

           {/* Sort & View Controls */}
           <div className="flex items-center gap-2 ml-auto">
             <select
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value as any)}
               className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-bio-500 outline-none"
             >
               <option value="newest">Newest First</option>
               <option value="oldest">Oldest First</option>
               <option value="name">Name (A-Z)</option>
               <option value="score">Score (High-Low)</option>
             </select>
             
             <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
               <button
                 onClick={() => setViewMode('grid')}
                 className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                 title="Grid view"
               >
                 <Grid size={16} />
               </button>
               <button
                 onClick={() => setViewMode('list')}
                 className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                 title="List view"
               >
                 <List size={16} />
               </button>
             </div>

            <AdvancedFilter
              fields={[
                { value: 'name', label: 'Name', type: 'text' },
                { value: 'domain', label: 'Domain', type: 'text' },
                { value: 'type', label: 'Type', type: 'select' },
                { value: 'inspiration', label: 'Inspiration', type: 'text' }
              ]}
              conditions={filterConditions}
              onChange={setFilterConditions}
              onApply={() => {}}
              onClear={() => setFilterConditions([])}
            />
            <Button
              variant="ghost"
              onClick={() => {
                const dataStr = JSON.stringify(filtered, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `algorithms-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-2 text-sm"
              title="Export filtered algorithms"
            >
              <Download size={16} /> Export
            </Button>
           </div>
        </div>
      </header>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(algo => (
            <AlgoCard 
              key={algo.id} 
              algorithm={algo} 
              onClick={() => navigate(`/algorithm/${algo.id}`)}
              onEdit={(e) => {
                e.stopPropagation();
                setEditingAlgo(algo);
              }} 
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                icon={LibraryIcon}
                title={algorithms.length === 0 ? "No Algorithms Yet" : "No Results Found"}
                description={
                  algorithms.length === 0
                    ? "Get started by generating your first algorithm or synthesizing existing ones."
                    : "Try adjusting your search or filter criteria to find what you're looking for."
                }
                action={
                  algorithms.length === 0
                    ? {
                        label: "Generate Algorithm",
                        onClick: () => navigate('/generate')
                      }
                    : undefined
                }
                secondaryAction={
                  algorithms.length === 0
                    ? {
                        label: "Synthesize Algorithm",
                        onClick: () => navigate('/synthesize')
                      }
                    : undefined
                }
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(algo => (
            <div
              key={algo.id}
              onClick={() => navigate(`/algorithm/${algo.id}`)}
              className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">{algo.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded border ${algo.type === 'hybrid' ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' : 'border-bio-500/30 text-bio-400 bg-bio-500/10'}`}>
                      {algo.type}
                    </span>
                    {algo.analysis?.sanity && (
                      <span className={`px-2 py-0.5 text-xs rounded font-bold ${
                        algo.analysis.sanity.score > 70 ? 'bg-emerald-500/20 text-emerald-400' :
                        algo.analysis.sanity.score > 40 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        Score: {algo.analysis.sanity.score}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{algo.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-slate-500">{algo.inspiration} → {algo.domain}</span>
                    {algo.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs rounded-full border border-slate-700 text-slate-400 bg-slate-800/50">
                        #{tag}
                      </span>
                    ))}
                    {algo.tags.length > 3 && (
                      <span className="text-xs text-slate-500">+{algo.tags.length - 3} more</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingAlgo(algo);
                  }}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Edit algorithm"
                >
                  <Edit2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              No algorithms found matching your criteria.
            </div>
          )}
        </div>
      )}


      {/* Edit Modal */}
      {editingAlgo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-[#0b1120] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
              <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                   <Edit2 size={20} className="text-bio-400" /> Edit Algorithm
                 </h2>
                 <button onClick={() => setEditingAlgo(null)} className="text-slate-500 hover:text-white">
                   <X size={24} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-900/50 text-sm text-blue-200">
                    <p>Saving changes will create a new version entry in history.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                      label="Algorithm Name" 
                      value={editingAlgo.name} 
                      onChange={(e) => setEditingAlgo({...editingAlgo, name: e.target.value})}
                    />
                    <Input 
                      label="Domain" 
                      value={editingAlgo.domain} 
                      onChange={(e) => setEditingAlgo({...editingAlgo, domain: e.target.value})}
                    />
                 </div>
                 
                 <TextArea 
                    label="Description"
                    value={editingAlgo.description}
                    onChange={(e) => setEditingAlgo({...editingAlgo, description: e.target.value})}
                 />

                 <TextArea 
                    label="Core Principle"
                    value={editingAlgo.principle}
                    onChange={(e) => setEditingAlgo({...editingAlgo, principle: e.target.value})}
                 />

                 <div>
                    <label className="text-sm font-medium text-slate-400 mb-2 block">Steps (One per line)</label>
                    <textarea 
                       className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-bio-500 focus:border-transparent min-h-[150px] font-mono text-sm"
                       value={editingAlgo.steps.join('\n')}
                       onChange={(e) => setEditingAlgo({...editingAlgo, steps: e.target.value.split('\n')})}
                    />
                 </div>

                 <TextArea 
                    label="Pseudocode"
                    className="font-mono text-sm min-h-[200px]"
                    value={editingAlgo.pseudoCode}
                    onChange={(e) => setEditingAlgo({...editingAlgo, pseudoCode: e.target.value})}
                 />
                 
                 <Input 
                   label="Change Note (Optional)"
                   placeholder="e.g. Optimized step 3 logic..."
                   value={editNote}
                   onChange={(e) => setEditNote(e.target.value)}
                 />
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                 <Button variant="ghost" onClick={() => setEditingAlgo(null)}>Cancel</Button>
                 <Button onClick={handleEditSave}>
                   <Save size={18} /> Save & Version
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Library;