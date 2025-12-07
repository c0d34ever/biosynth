import React, { useState } from 'react';

interface FlowchartProps {
  steps: string[];
  interactive?: boolean;
}

export const Flowchart: React.FC<FlowchartProps> = ({ steps, interactive = false }) => {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const nodeWidth = 200;
  const nodeHeight = 60;
  const gapY = 40;
  const padding = 20;

  const width = interactive ? 600 : 200;
  const height = steps.length * (nodeHeight + gapY) + padding * 2;
  const centerX = width / 2;

  return (
    <div className={`w-full overflow-x-auto ${interactive ? 'bg-slate-900/50 rounded-xl border border-slate-800 p-4' : ''}`}>
      <svg width={width} height={height} className="mx-auto">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
          <filter id="glow">
             <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
             <feMerge>
                 <feMergeNode in="coloredBlur"/>
                 <feMergeNode in="SourceGraphic"/>
             </feMerge>
          </filter>
        </defs>

        {steps.map((step, i) => {
          const y = padding + i * (nodeHeight + gapY);
          const isHovered = hoveredStep === i;
          const isLast = i === steps.length - 1;

          return (
            <g 
              key={i} 
              onMouseEnter={() => interactive && setHoveredStep(i)}
              onMouseLeave={() => interactive && setHoveredStep(null)}
              className="transition-all duration-300 cursor-default"
            >
              {/* Connector Line */}
              {!isLast && (
                <line
                  x1={centerX}
                  y1={y + nodeHeight}
                  x2={centerX}
                  y2={y + nodeHeight + gapY}
                  stroke="#334155"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              )}

              {/* Node Body */}
              <rect
                x={centerX - nodeWidth / 2}
                y={y}
                width={nodeWidth}
                height={nodeHeight}
                rx="8"
                fill={isHovered ? '#064e3b' : '#1e293b'}
                stroke={isHovered ? '#34d399' : '#334155'}
                strokeWidth={isHovered ? 2 : 1}
                filter={isHovered ? 'url(#glow)' : ''}
                className="transition-all duration-300"
              />

              {/* Step Number */}
              <circle
                cx={centerX - nodeWidth / 2}
                cy={y + nodeHeight / 2}
                r="12"
                fill="#0f172a"
                stroke={isHovered ? '#34d399' : '#64748b'}
                strokeWidth="2"
              />
              <text
                x={centerX - nodeWidth / 2}
                y={y + nodeHeight / 2}
                dy="4"
                textAnchor="middle"
                fill={isHovered ? '#34d399' : '#94a3b8'}
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {i + 1}
              </text>

              {/* Text */}
              <foreignObject
                 x={centerX - nodeWidth / 2 + 10}
                 y={y + 5}
                 width={nodeWidth - 20}
                 height={nodeHeight - 10}
              >
                <div className="w-full h-full flex items-center justify-center text-center">
                   <p className={`text-xs ${isHovered ? 'text-white' : 'text-slate-300'} line-clamp-2`}>
                     {step}
                   </p>
                </div>
              </foreignObject>
              
              {/* Tooltip for long text if interactive */}
              {interactive && isHovered && (
                 <g>
                    <rect 
                        x={centerX + nodeWidth/2 + 20} 
                        y={y} 
                        width="250" 
                        height={nodeHeight || 100}
                        fill="#020617"
                        stroke="#334155"
                        rx="6"
                        className="opacity-90"
                    />
                    <foreignObject
                         x={centerX + nodeWidth/2 + 30}
                         y={y + 10}
                         width="230"
                         height={200} // ample height
                      >
                        <div className="text-xs text-slate-200">
                           <strong className="block text-bio-400 mb-1">Step {i+1} Detail</strong>
                           {step}
                        </div>
                      </foreignObject>
                 </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const MiniFlowchart: React.FC<{ steps: string[] }> = ({ steps }) => {
   const height = 60;
   const width = 200;
   const nodeCount = Math.min(steps.length, 6);
   const nodeWidth = width / nodeCount;
   
   return (
     <div className="w-full h-[60px] flex items-center justify-between relative px-2">
        {/* Connecting Line */}
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-700 -z-10"></div>
        
        {steps.slice(0, nodeCount).map((_, i) => (
           <div key={i} className="group relative">
              <div className={`w-3 h-3 rounded-full border-2 ${i===0 ? 'border-bio-500 bg-bio-900' : 'border-slate-600 bg-slate-800'} z-10 hover:scale-125 hover:border-bio-400 transition-all cursor-help`}></div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-slate-900 border border-slate-700 p-2 rounded text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                 <span className="text-bio-500 font-bold mr-1">{i+1}.</span> {steps[i]}
              </div>
           </div>
        ))}
        {steps.length > nodeCount && (
            <div className="text-[10px] text-slate-500 font-mono">+{steps.length - nodeCount}</div>
        )}
     </div>
   );
};