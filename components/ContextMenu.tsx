import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, Edit, Trash2, Copy, Share2, Download, Eye, Archive } from 'lucide-react';

interface ContextMenuItem {
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactElement;
  trigger?: 'click' | 'right-click';
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  items,
  children,
  trigger = 'click'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleTrigger = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (trigger === 'right-click' && e.type !== 'contextmenu') return;
    if (trigger === 'click' && e.type === 'contextmenu') return;
    
    triggerRef.current = e.currentTarget;
    const rect = e.currentTarget.getBoundingClientRect();
    
    setPosition({
      top: trigger === 'right-click' ? e.clientY : rect.bottom + 4,
      left: trigger === 'right-click' ? e.clientX : rect.left
    });
    
    setIsOpen(true);
  };

  if (trigger === 'right-click') {
    return (
      <>
        {React.cloneElement(children, {
          onContextMenu: handleTrigger
        })}
        {isOpen && (
          <div
            ref={menuRef}
            className="fixed z-[10000] bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 min-w-[180px]"
            style={{ top: `${position.top}px`, left: `${position.left}px` }}
          >
            {items.map((item, index) => {
              if (item.separator) {
                return <div key={index} className="h-px bg-slate-800 my-1" />;
              }
              
              const Icon = item.icon || MoreVertical;
              return (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!item.disabled) {
                      item.onClick();
                      setIsOpen(false);
                    }
                  }}
                  disabled={item.disabled}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors
                    ${item.disabled
                      ? 'text-slate-600 cursor-not-allowed'
                      : item.danger
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-slate-300 hover:bg-slate-800'
                    }
                  `}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="relative">
      {React.cloneElement(children, {
        onClick: handleTrigger
      })}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 min-w-[180px] z-50"
        >
          {items.map((item, index) => {
            if (item.separator) {
              return <div key={index} className="h-px bg-slate-800 my-1" />;
            }
            
            const Icon = item.icon || MoreVertical;
            return (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!item.disabled) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                disabled={item.disabled}
                className={`
                  w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors
                  ${item.disabled
                    ? 'text-slate-600 cursor-not-allowed'
                    : item.danger
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-slate-300 hover:bg-slate-800'
                  }
                `}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

