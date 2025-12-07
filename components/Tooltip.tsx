import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showTooltip = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return;
    
    const trigger = e.currentTarget;
    triggerRef.current = trigger;
    const rect = trigger.getBoundingClientRect();
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      
      // Calculate position after tooltip is rendered
      setTimeout(() => {
        if (tooltipRef.current) {
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          let top = 0;
          let left = 0;
          
          switch (position) {
            case 'top':
              top = rect.top - tooltipRect.height - 8;
              left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
              break;
            case 'bottom':
              top = rect.bottom + 8;
              left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
              break;
            case 'left':
              top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
              left = rect.left - tooltipRect.width - 8;
              break;
            case 'right':
              top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
              left = rect.right + 8;
              break;
          }
          
          setTooltipPosition({ top, left });
        }
      }, 0);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  return (
    <>
      {React.cloneElement(children, {
        onMouseEnter: showTooltip,
        onMouseLeave: hideTooltip,
        onFocus: showTooltip,
        onBlur: hideTooltip
      })}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`
            fixed z-[10000] px-3 py-1.5 text-sm text-white bg-slate-900 border border-slate-700 rounded-lg shadow-xl
            pointer-events-none animate-in fade-in zoom-in-95 duration-200
            max-w-xs
          `}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`
          }}
        >
          {content}
          <div
            className={`
              absolute w-2 h-2 bg-slate-900 border-slate-700
              ${position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2 rotate-45 border-b border-r' : ''}
              ${position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2 rotate-45 border-t border-l' : ''}
              ${position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2 rotate-45 border-t border-r' : ''}
              ${position === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2 rotate-45 border-b border-l' : ''}
            `}
          />
        </div>
      )}
    </>
  );
};

