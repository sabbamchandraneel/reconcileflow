'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ReconciliationSummary } from '@/lib/reconciliation-engine';

interface DiscrepancyChartsProps {
  summary: ReconciliationSummary;
  onSelectCategory?: (category: string) => void;
}

const COLORS = [
  '#f43f5e', // rose-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#6366f1', // indigo-500
  '#8b5cf6', // purple-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#ec4899', // pink-500
];

export const DiscrepancyCharts: React.FC<DiscrepancyChartsProps> = ({ summary, onSelectCategory }) => {
  // Format data for Category Count Pie/Donut Chart
  const pieData = Object.entries(summary.categoryBreakdown)
    .filter(([_, item]) => item.count > 0)
    .map(([key, item]) => ({
      key,
      name: item.label.split('(')[0].trim(),
      fullName: item.label,
      count: item.count,
      value: item.value,
    }))
    .sort((a, b) => b.count - a.count);

  // Format data for Financial Value at Risk Bar Chart
  const barData = Object.entries(summary.categoryBreakdown)
    .filter(([_, item]) => item.value > 0)
    .map(([key, item]) => ({
      key,
      name: item.label.split('(')[0].trim(),
      value: Math.round(item.value * 100) / 100,
      count: item.count,
    }))
    .sort((a, b) => b.value - a.value);

  const formatDollar = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Category Distribution Donut Chart */}
      <div className="rounded-2xl glass-panel border border-slate-800 p-5 bg-slate-900/60 shadow-lg flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Discrepancy Anomaly Distribution</h3>
            <p className="text-xs text-slate-400">Total detected issue records by category</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {pieData.reduce((acc, curr) => acc + curr.count, 0)} Records
          </span>
        </div>

        <div className="h-64 w-full">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      onClick={() => onSelectCategory && onSelectCategory(entry.key)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 shadow-xl text-xs">
                          <p className="font-semibold text-slate-200">{data.fullName}</p>
                          <p className="text-indigo-400 mt-1">
                            Count: <span className="font-bold text-white">{data.count}</span>
                          </p>
                          <p className="text-rose-400">
                            Disputed Value: <span className="font-bold text-white">{formatDollar(data.value)}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No discrepancy data found
            </div>
          )}
        </div>

        {/* Legend pills */}
        <div className="mt-2 flex flex-wrap gap-2 max-h-24 overflow-y-auto pt-2 border-t border-slate-800/50">
          {pieData.map((entry, idx) => (
            <button
              key={entry.key}
              onClick={() => onSelectCategory && onSelectCategory(entry.key)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="truncate max-w-[120px]">{entry.name}</span>
              <span className="font-bold text-slate-400">({entry.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Financial Exposure Bar Chart */}
      <div className="rounded-2xl glass-panel border border-slate-800 p-5 bg-slate-900/60 shadow-lg flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Financial Exposure by Problem Category</h3>
            <p className="text-xs text-slate-400">Dollar value at risk per anomaly category</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {formatDollar(summary.totalValueInDispute)} Total Exposure
          </span>
        </div>

        <div className="h-72 w-full">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} horizontal={false} />
                <XAxis 
                  type="number" 
                  tickFormatter={(v) => `$${v}`}
                  stroke="#94a3b8" 
                  fontSize={11}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={11}
                  width={110}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 shadow-xl text-xs">
                          <p className="font-semibold text-slate-200">{data.name}</p>
                          <p className="text-rose-400 mt-1">
                            Disputed Value: <span className="font-bold text-white">{formatDollar(data.value)}</span>
                          </p>
                          <p className="text-slate-400">
                            Affected Records: <span className="font-bold text-white">{data.count}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#f43f5e" 
                  radius={[0, 4, 4, 0]}
                  onClick={(data) => onSelectCategory && onSelectCategory(data.key)}
                  className="cursor-pointer hover:opacity-80"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No financial exposure data found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
