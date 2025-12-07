import React from 'react';
import { Trash2, Download, Share2, Archive, Copy, CheckSquare, Square } from 'lucide-react';
import { Button } from './Button';

interface BulkActionsProps<T> {
  selectedItems: T[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: (items: T[]) => void;
  onExport?: (items: T[]) => void;
  onShare?: (items: T[]) => void;
  onArchive?: (items: T[]) => void;
  onCopy?: (items: T[]) => void;
  totalItems: number;
  getItemId: (item: T) => string | number;
  itemLabel?: string;
}

export function BulkActions<T>({
  selectedItems,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onExport,
  onShare,
  onArchive,
  onCopy,
  totalItems,
  getItemId,
  itemLabel = 'items'
}: BulkActionsProps<T>) {
  const allSelected = selectedItems.length === totalItems && totalItems > 0;
  const someSelected = selectedItems.length > 0 && selectedItems.length < totalItems;

  if (selectedItems.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 bg-slate-900 border border-slate-800 rounded-lg">
        <button
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          title={allSelected ? 'Deselect all' : 'Select all'}
        >
          {allSelected ? (
            <CheckSquare size={20} className="text-bio-400" />
          ) : (
            <Square size={20} className="text-slate-500" />
          )}
        </button>
        <span className="text-sm text-slate-400">
          {totalItems} {itemLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-bio-500/10 border border-bio-500/20 rounded-lg">
      <div className="flex items-center gap-4">
        <button
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          title={allSelected ? 'Deselect all' : 'Select all'}
        >
          {allSelected ? (
            <CheckSquare size={20} className="text-bio-400" />
          ) : someSelected ? (
            <div className="w-5 h-5 border-2 border-bio-400 rounded bg-bio-400/20 flex items-center justify-center">
              <div className="w-2 h-2 bg-bio-400 rounded" />
            </div>
          ) : (
            <Square size={20} className="text-slate-500" />
          )}
        </button>
        <span className="text-sm font-medium text-white">
          {selectedItems.length} of {totalItems} {itemLabel} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onCopy && (
          <Button
            variant="ghost"
            onClick={() => onCopy(selectedItems)}
            className="text-slate-300 hover:text-white"
          >
            <Copy size={16} /> Copy
          </Button>
        )}
        {onExport && (
          <Button
            variant="ghost"
            onClick={() => onExport(selectedItems)}
            className="text-slate-300 hover:text-white"
          >
            <Download size={16} /> Export
          </Button>
        )}
        {onShare && (
          <Button
            variant="ghost"
            onClick={() => onShare(selectedItems)}
            className="text-slate-300 hover:text-white"
          >
            <Share2 size={16} /> Share
          </Button>
        )}
        {onArchive && (
          <Button
            variant="ghost"
            onClick={() => onArchive(selectedItems)}
            className="text-slate-300 hover:text-white"
          >
            <Archive size={16} /> Archive
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => onDelete(selectedItems)}
          className="text-red-400 hover:text-red-300"
        >
          <Trash2 size={16} /> Delete
        </Button>
        <Button
          variant="ghost"
          onClick={onDeselectAll}
          className="text-slate-400 hover:text-white"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

