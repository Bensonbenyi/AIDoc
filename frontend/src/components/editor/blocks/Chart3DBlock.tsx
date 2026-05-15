'use client';

import { DocumentBlock } from '@/types/block';

interface Props {
  block: DocumentBlock;
}

interface ChartBar {
  label: string;
  height: number;
}

interface AxisLabels {
  x?: string;
  y?: string;
  z?: string;
}

export function Chart3DBlock({ block }: Props) {
  const bars = ((block.content.bars as ChartBar[]) || []).filter((bar) => Number.isFinite(bar.height));
  const title = (block.content.title as string) || '3D 图表';
  const source = block.content.source as string | undefined;
  const axisLabels = (block.content.axisLabels as AxisLabels | undefined) || {};
  const maxValue = Math.max(1, ...bars.map((bar) => bar.height));

  const origin = { x: 78, y: 238 };
  const depth = { x: 32, y: -22 };
  const chart = {
    width: 600,
    height: 320,
    maxBarHeight: 155,
    plotWidth: 410,
  };
  const xStep = bars.length > 1 ? chart.plotWidth / bars.length : 86;
  const barWidth = Math.max(24, Math.min(40, xStep * 0.54));
  const xAxisEnd = origin.x + chart.plotWidth + 42;
  const zAxisEnd = { x: origin.x + depth.x * 2.5, y: origin.y + depth.y * 2.5 };
  const yAxisEnd = { x: origin.x, y: origin.y - chart.maxBarHeight - 34 };
  const formatValue = (value: number) => `${value}`;

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>
        {source && <span className="text-xs text-muted-foreground">{source}</span>}
      </div>

      <div className="overflow-hidden rounded-md bg-gradient-to-b from-slate-50 to-white">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="h-[320px] w-full"
          role="img"
          aria-label={`${title} 3D 柱状图`}
        >
          <defs>
            <linearGradient id={`bar-front-${block.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <linearGradient id={`bar-side-${block.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#3730a3" />
            </linearGradient>
            <linearGradient id={`bar-top-${block.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c7d2fe" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>

          <polygon
            points={`${origin.x},${origin.y} ${xAxisEnd},${origin.y} ${xAxisEnd + depth.x * 1.8},${
              origin.y + depth.y * 1.8
            } ${origin.x + depth.x * 1.8},${origin.y + depth.y * 1.8}`}
            fill="#eef2ff"
            opacity="0.65"
          />

          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = origin.y - chart.maxBarHeight * tick;
            const value = Math.round(maxValue * tick);
            return (
              <g key={tick}>
                <line x1={origin.x} y1={y} x2={xAxisEnd} y2={y} stroke="#dbe4ff" strokeDasharray="4 4" />
                <line
                  x1={xAxisEnd}
                  y1={y}
                  x2={xAxisEnd + depth.x * 1.8}
                  y2={y + depth.y * 1.8}
                  stroke="#dbe4ff"
                  strokeDasharray="4 4"
                />
                <text x={origin.x - 10} y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px]">
                  {value}
                </text>
              </g>
            );
          })}

          {bars.map((bar, i) => {
            const x = origin.x + i * xStep + 24;
            const valueHeight = (bar.height / maxValue) * chart.maxBarHeight;
            const yTop = origin.y - valueHeight;
            const xRight = x + barWidth;
            const front = `${x},${origin.y} ${xRight},${origin.y} ${xRight},${yTop} ${x},${yTop}`;
            const side = `${xRight},${origin.y} ${xRight + depth.x},${origin.y + depth.y} ${
              xRight + depth.x
            },${yTop + depth.y} ${xRight},${yTop}`;
            const top = `${x},${yTop} ${xRight},${yTop} ${xRight + depth.x},${yTop + depth.y} ${
              x + depth.x
            },${yTop + depth.y}`;

            return (
              <g key={`${bar.label}-${i}`}>
                <polygon points={side} fill={`url(#bar-side-${block.id})`} />
                <polygon points={front} fill={`url(#bar-front-${block.id})`} />
                <polygon points={top} fill={`url(#bar-top-${block.id})`} />
                <text
                  x={x + barWidth / 2 + depth.x / 2}
                  y={yTop + depth.y - 8}
                  textAnchor="middle"
                  className="fill-slate-700 text-[11px] font-semibold"
                >
                  {formatValue(bar.height)}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={origin.y + 22}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px]"
                >
                  {bar.label}
                </text>
              </g>
            );
          })}

          <line x1={origin.x} y1={origin.y} x2={xAxisEnd} y2={origin.y} stroke="#f43f5e" strokeWidth="2" />
          <line x1={origin.x} y1={origin.y} x2={yAxisEnd.x} y2={yAxisEnd.y} stroke="#10b981" strokeWidth="2" />
          <line x1={origin.x} y1={origin.y} x2={zAxisEnd.x} y2={zAxisEnd.y} stroke="#0ea5e9" strokeWidth="2" />
          <line
            x1={xAxisEnd}
            y1={origin.y}
            x2={xAxisEnd + depth.x * 1.8}
            y2={origin.y + depth.y * 1.8}
            stroke="#0ea5e9"
            strokeWidth="2"
          />

          <text x={xAxisEnd + 10} y={origin.y + 4} className="fill-rose-500 text-[11px] font-semibold">
            {axisLabels.x || 'X 轴：月份'}
          </text>
          <text
            x={yAxisEnd.x - 8}
            y={yAxisEnd.y - 8}
            textAnchor="middle"
            className="fill-emerald-600 text-[11px] font-semibold"
          >
            {axisLabels.y || 'Y 轴：数值'}
          </text>
          <text
            x={xAxisEnd + depth.x * 1.8 - 4}
            y={origin.y + depth.y * 1.8 - 6}
            textAnchor="end"
            className="fill-sky-600 text-[11px] font-semibold"
          >
            {axisLabels.z || 'Z 轴：系列'}
          </text>
        </svg>
      </div>
    </div>
  );
}
