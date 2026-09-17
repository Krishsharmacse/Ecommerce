'use client';

import React, { useState } from 'react';

export interface IncomeTrendItem {
    date: string;
    label: string;
    revenue: number;
    orders: number;
}

interface IncomeGraphProps {
    trend?: IncomeTrendItem[];
    totalRevenue?: number;
}

export default function IncomeGraph({ trend = [], totalRevenue = 0 }: IncomeGraphProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Fallback if trend is empty: create 14 empty days
    const displayData: IncomeTrendItem[] = trend.length > 0 ? trend : Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { date: key, label, revenue: 0, orders: 0 };
    });

    const maxRevenue = Math.max(...displayData.map(d => d.revenue), 1000);
    const totalPeriodRevenue = displayData.reduce((acc, d) => acc + d.revenue, 0);
    const totalPeriodOrders = displayData.reduce((acc, d) => acc + d.orders, 0);
    const avgDailyRevenue = totalPeriodRevenue / displayData.length;

    // Highest revenue day
    const peakDay = displayData.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev), displayData[0]);

    // SVG parameters
    const svgWidth = 700;
    const svgHeight = 220;
    const paddingX = 30;
    const paddingY = 30;
    const chartWidth = svgWidth - paddingX * 2;
    const chartHeight = svgHeight - paddingY * 2;

    const getX = (index: number) => paddingX + (index / (displayData.length - 1)) * chartWidth;
    const getY = (val: number) => paddingY + chartHeight - (val / maxRevenue) * chartHeight;

    // Build SVG Path for smooth area
    const points = displayData.map((d, i) => ({ x: getX(i), y: getY(d.revenue) }));
    
    // Smooth Bezier curve generator
    const generatePath = () => {
        if (points.length === 0) return '';
        let d = `M ${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            const controlPointX = (current.x + next.x) / 2;
            d += ` C ${controlPointX},${current.y} ${controlPointX},${next.y} ${next.x},${next.y}`;
        }
        return d;
    };

    const linePath = generatePath();
    const areaPath = points.length > 0 
        ? `${linePath} L ${points[points.length - 1].x},${paddingY + chartHeight} L ${points[0].x},${paddingY + chartHeight} Z`
        : '';

    const hoveredItem = hoveredIndex !== null ? displayData[hoveredIndex] : null;

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 backdrop-blur-sm space-y-5">
            {/* Header & Quick Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <h2 className="text-base font-bold text-white tracking-tight">
                            Platform Income & Transaction Trend
                        </h2>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                        Daily gross marketplace revenue over the last 14 days
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                    <div className="bg-zinc-950/70 border border-zinc-800 px-3 py-1.5 rounded-xl">
                        <span className="text-zinc-400 block text-[10px] uppercase">14-Day Gross</span>
                        <span className="font-bold text-emerald-400 text-sm">
                            ₹{totalPeriodRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="bg-zinc-950/70 border border-zinc-800 px-3 py-1.5 rounded-xl">
                        <span className="text-zinc-400 block text-[10px] uppercase">Daily Avg</span>
                        <span className="font-bold text-zinc-200 text-sm">
                            ₹{avgDailyRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="bg-zinc-950/70 border border-zinc-800 px-3 py-1.5 rounded-xl">
                        <span className="text-zinc-400 block text-[10px] uppercase">Volume</span>
                        <span className="font-bold text-cyan-400 text-sm">
                            {totalPeriodOrders} Orders
                        </span>
                    </div>
                </div>
            </div>

            {/* Interactive Chart Container */}
            <div className="relative">
                {/* Active Hover Tooltip */}
                {hoveredItem && (
                    <div 
                        className="absolute -top-3 z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-zinc-950/95 border border-zinc-700 text-zinc-100 px-3 py-2 rounded-xl shadow-2xl text-xs backdrop-blur-md min-w-[140px]"
                        style={{ left: `${getX(hoveredIndex ?? 0) / svgWidth * 100}%` }}
                    >
                        <div className="text-[11px] font-mono text-zinc-400">{hoveredItem.label} ({hoveredItem.date})</div>
                        <div className="text-sm font-bold text-emerald-400 mt-0.5">
                            ₹{hoveredItem.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                            {hoveredItem.orders} {hoveredItem.orders === 1 ? 'order' : 'orders'} completed
                        </div>
                    </div>
                )}

                {/* SVG Visualizer */}
                <div className="w-full overflow-hidden">
                    <svg
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        className="w-full h-48 sm:h-56 overflow-visible select-none"
                    >
                        <defs>
                            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.35" />
                                <stop offset="60%" stopColor="#a855f7" stopOpacity="0.1" />
                                <stop offset="100%" stopColor="#09090b" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#ec4899" />
                                <stop offset="50%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        <line
                            x1={paddingX}
                            y1={paddingY}
                            x2={svgWidth - paddingX}
                            y2={paddingY}
                            stroke="#27272a"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                        />
                        <line
                            x1={paddingX}
                            y1={paddingY + chartHeight / 2}
                            x2={svgWidth - paddingX}
                            y2={paddingY + chartHeight / 2}
                            stroke="#27272a"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                        />
                        <line
                            x1={paddingX}
                            y1={paddingY + chartHeight}
                            x2={svgWidth - paddingX}
                            y2={paddingY + chartHeight}
                            stroke="#3f3f46"
                            strokeWidth="1"
                        />

                        {/* Area gradient */}
                        {areaPath && (
                            <path
                                d={areaPath}
                                fill="url(#incomeGradient)"
                                className="transition-all duration-300"
                            />
                        )}

                        {/* Line Stroke */}
                        {linePath && (
                            <path
                                d={linePath}
                                fill="none"
                                stroke="url(#strokeGradient)"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        )}

                        {/* Data Points and Interaction Hotspots */}
                        {points.map((p, i) => {
                            const isHovered = hoveredIndex === i;
                            const hasRevenue = displayData[i].revenue > 0;
                            return (
                                <g key={i}>
                                    {/* Invisible hover bar hotspot */}
                                    <rect
                                        x={p.x - 14}
                                        y={paddingY}
                                        width={28}
                                        height={chartHeight}
                                        fill="transparent"
                                        className="cursor-pointer"
                                        onMouseEnter={() => setHoveredIndex(i)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    />

                                    {/* Vertical highlight guideline when hovered */}
                                    {isHovered && (
                                        <line
                                            x1={p.x}
                                            y1={paddingY}
                                            x2={p.x}
                                            y2={paddingY + chartHeight}
                                            stroke="#a1a1aa"
                                            strokeDasharray="2 2"
                                            strokeWidth="1"
                                        />
                                    )}

                                    {/* Bar indicator */}
                                    <circle
                                        cx={p.x}
                                        cy={p.y}
                                        r={isHovered ? 6 : hasRevenue ? 4 : 2.5}
                                        fill={isHovered ? '#ffffff' : hasRevenue ? '#ec4899' : '#52525b'}
                                        stroke={isHovered ? '#ec4899' : '#18181b'}
                                        strokeWidth="2"
                                        className="transition-all duration-200 pointer-events-none"
                                    />
                                </g>
                            );
                        })}
                    </svg>
                </div>

                {/* X-axis labels */}
                <div className="flex justify-between items-center px-6 text-[10px] font-mono text-zinc-400 mt-2">
                    <span>{displayData[0]?.label}</span>
                    <span className="hidden sm:inline">{displayData[Math.floor(displayData.length / 4)]?.label}</span>
                    <span>{displayData[Math.floor(displayData.length / 2)]?.label}</span>
                    <span className="hidden sm:inline">{displayData[Math.floor((displayData.length * 3) / 4)]?.label}</span>
                    <span>{displayData[displayData.length - 1]?.label}</span>
                </div>
            </div>

            {/* Bottom Insight Pill */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-zinc-800/80 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Peak Performance:</span>
                    <span className="text-zinc-200 font-semibold">{peakDay?.label || 'None'}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-emerald-400 font-mono font-medium">
                        ₹{(peakDay?.revenue || 0).toFixed(2)} ({peakDay?.orders || 0} orders)
                    </span>
                </div>
                <div className="text-[11px] text-zinc-400">
                    Showing rolling 14-day aggregated telemetry
                </div>
            </div>
        </div>
    );
}
