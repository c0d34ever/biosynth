import React, { useState } from 'react';
import { Filter, X, Plus, Minus } from 'lucide-react';
import { Button } from './Button';

export interface FilterCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: string | number | string[];
  label?: string;
}

interface AdvancedFilterProps {
  fields: { value: string; label: string; type: 'text' | 'number' | 'date' | 'select' }[];
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
  onApply: () => void;
  onClear: () => void;
}

export const AdvancedFilter: React.FC<AdvancedFilterProps> = ({
  fields,
  conditions,
  onChange,
  onApply,
  onClear
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const addCondition = () => {
    const newCondition: FilterCondition = {
      field: fields[0]?.value || '',
      operator: 'equals',
      value: ''
    };
    onChange([...conditions, newCondition]);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
    const updated = conditions.map((cond, i) =>
      i === index ? { ...cond, ...updates } : cond
    );
    onChange(updated);
  };

  const selectedField = (fieldValue: string) => {
    return fields.find(f => f.value === fieldValue);
  };

  return (
    <div className="relative">
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Filter size={16} />
        Advanced Filters
        {conditions.length > 0 && (
          <span className="px-2 py-0.5 bg-bio-500 text-white text-xs rounded-full">
            {conditions.length}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Filter Conditions</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {conditions.map((condition, index) => {
              const field = selectedField(condition.field);
              const operators = field?.type === 'number'
                ? ['equals', 'greaterThan', 'lessThan', 'between']
                : field?.type === 'date'
                ? ['equals', 'greaterThan', 'lessThan', 'between']
                : ['equals', 'contains', 'startsWith', 'endsWith', 'in'];

              return (
                <div key={index} className="p-3 bg-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Condition {index + 1}</span>
                    <button
                      onClick={() => removeCondition(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Minus size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={condition.field}
                      onChange={(e) => updateCondition(index, { field: e.target.value, value: '' })}
                      className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-bio-500"
                    >
                      {fields.map(field => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
                      className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-bio-500"
                    >
                      {operators.map(op => (
                        <option key={op} value={op}>
                          {op.replace(/([A-Z])/g, ' $1').trim()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {condition.operator === 'between' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type={field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : 'text'}
                        value={Array.isArray(condition.value) ? condition.value[0] : ''}
                        onChange={(e) => updateCondition(index, {
                          value: [e.target.value, Array.isArray(condition.value) ? condition.value[1] : '']
                        })}
                        placeholder="From"
                        className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-bio-500"
                      />
                      <input
                        type={field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : 'text'}
                        value={Array.isArray(condition.value) ? condition.value[1] : ''}
                        onChange={(e) => updateCondition(index, {
                          value: [Array.isArray(condition.value) ? condition.value[0] : '', e.target.value]
                        })}
                        placeholder="To"
                        className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-bio-500"
                      />
                    </div>
                  ) : condition.operator === 'in' ? (
                    <input
                      type="text"
                      value={Array.isArray(condition.value) ? condition.value.join(', ') : String(condition.value)}
                      onChange={(e) => updateCondition(index, {
                        value: e.target.value.split(',').map(v => v.trim())
                      })}
                      placeholder="Comma-separated values"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-bio-500"
                    />
                  ) : (
                    <input
                      type={field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : 'text'}
                      value={String(condition.value)}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      placeholder="Value"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-bio-500"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={addCondition}
              className="flex-1"
            >
              <Plus size={16} /> Add Condition
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                onClear();
                setIsOpen(false);
              }}
              className="text-red-400 hover:text-red-300"
            >
              Clear All
            </Button>
            <Button
              onClick={() => {
                onApply();
                setIsOpen(false);
              }}
              variant="primary"
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

