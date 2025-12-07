import React from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  emptyMessage = 'No data available',
  loading = false,
  className = ''
}: TableProps<T>) {
  const handleSort = (column: string) => {
    if (onSort) {
      onSort(column);
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (!sortColumn || sortColumn !== columnKey) {
      return <ArrowUpDown size={14} className="text-slate-500" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} className="text-bio-400" />
      : <ChevronDown size={14} className="text-bio-400" />;
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-bio-400"></div>
        <p className="mt-4 text-slate-400">Loading data...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-950/50 border-b border-slate-800">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-slate-800/50 select-none' : ''
                  }`}
                  style={{ 
                    width: column.width,
                    textAlign: column.align || 'left'
                  }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.map((item, index) => (
              <tr
                key={index}
                onClick={() => onRowClick && onRowClick(item)}
                className={`
                  transition-colors
                  ${onRowClick ? 'cursor-pointer hover:bg-slate-800/30' : ''}
                  ${index % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}
                `}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-4 py-3 text-sm text-slate-300"
                    style={{ textAlign: column.align || 'left' }}
                  >
                    {column.render 
                      ? column.render(item)
                      : item[column.key] !== undefined && item[column.key] !== null
                        ? String(item[column.key])
                        : '—'
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

