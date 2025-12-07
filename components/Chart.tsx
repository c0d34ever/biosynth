import React from 'react';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: ChartData[];
  title?: string;
  height?: number;
  showValues?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  title, 
  height = 200,
  showValues = true 
}) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const colors = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', 
    '#ef4444', '#ec4899', '#06b6d4', '#84cc16'
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      {title && (
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      )}
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const color = item.color || colors[index % colors.length];
          
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300">{item.label}</span>
                {showValues && (
                  <span className="text-slate-400 font-medium">{item.value}</span>
                )}
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface LineChartProps {
  data: { label: string; value: number }[];
  title?: string;
  height?: number;
  color?: string;
}

export const LineChart: React.FC<LineChartProps> = ({ 
  data, 
  title, 
  height = 200,
  color = '#10b981'
}) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;
  const width = 100;
  const chartHeight = height - 40;

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1 || 1)) * width;
    const y = chartHeight - ((item.value - minValue) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      {title && (
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      )}
      <svg
        viewBox={`0 0 ${width} ${chartHeight + 20}`}
        className="w-full"
        style={{ height: `${height}px` }}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chartHeight - ratio * chartHeight;
          return (
            <line
              key={ratio}
              x1="0"
              y1={y}
              x2={width}
              y2={y}
              stroke="#1e293b"
              strokeWidth="0.5"
            />
          );
        })}
        
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Points */}
        {data.map((item, index) => {
          const x = (index / (data.length - 1 || 1)) * width;
          const y = chartHeight - ((item.value - minValue) / range) * chartHeight;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill={color}
            />
          );
        })}
        
        {/* Labels */}
        {data.map((item, index) => {
          const x = (index / (data.length - 1 || 1)) * width;
          return (
            <text
              key={index}
              x={x}
              y={chartHeight + 15}
              fontSize="8"
              fill="#94a3b8"
              textAnchor="middle"
            >
              {item.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

interface PieChartProps {
  data: ChartData[];
  title?: string;
  size?: number;
}

export const PieChart: React.FC<PieChartProps> = ({ 
  data, 
  title, 
  size = 200 
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;

  const colors = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', 
    '#ef4444', '#ec4899', '#06b6d4', '#84cc16'
  ];

  let currentAngle = -90;
  const radius = size / 2 - 10;
  const center = size / 2;

  const segments = data.map((item, index) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (currentAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startAngleRad);
    const y1 = center + radius * Math.sin(startAngleRad);
    const x2 = center + radius * Math.cos(endAngleRad);
    const y2 = center + radius * Math.sin(endAngleRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    return {
      path,
      color: item.color || colors[index % colors.length],
      label: item.label,
      value: item.value,
      percentage: (percentage * 100).toFixed(1)
    };
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      {title && (
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      )}
      <div className="flex items-center gap-6">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.path}
              fill={segment.color}
              stroke="#0f172a"
              strokeWidth="2"
            />
          ))}
        </svg>
        <div className="flex-1 space-y-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: segment.color }}
              />
              <div className="flex-1">
                <div className="text-sm text-slate-300">{segment.label}</div>
                <div className="text-xs text-slate-500">
                  {segment.value} ({segment.percentage}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

