'use client';

import React from 'react';
import { 
  AlertOctagon, 
  CheckCircle2, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  CreditCard,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { ReconciliationSummary } from '@/lib/reconciliation-engine';

interface ExecutiveKpiCardsProps {
  summary: ReconciliationSummary;
}

export const ExecutiveKpiCards: React.FC<ExecutiveKpiCardsProps> = ({ summary }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Money at Risk (Primary Revenue Leakage Alert) */}
      <div className="relative overflow-hidden rounded-2xl glass-panel-glow border border-rose-500/40 p-5 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-rose-950/20 shadow-xl shadow-rose-950/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            Total Money at Risk
          </span>
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(summary.totalMoneyAtRisk)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
            <span>Critical & High Leakage</span>
            <span className="font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              {summary.severityBreakdown.CRITICAL.count + summary.severityBreakdown.HIGH.count} Critical Issues
            </span>
          </div>
        </div>
      </div>

      {/* 2. Match Rate & Reconciled Volume */}
      <div className="rounded-2xl glass-panel border border-slate-800 p-5 bg-slate-900/60 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Clean Match Rate
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs">
            {summary.matchRatePercentage.toFixed(1)}%
          </div>
        </div>

        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {summary.cleanMatchedOrdersCount}{' '}
            <span className="text-base font-normal text-slate-400">/ {summary.totalOrdersCount} Clean</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Clean Reconciled Value</span>
            <span className="font-semibold text-emerald-400">
              {formatCurrency(summary.cleanMatchedValue)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Total Order vs Payment Volume */}
      <div className="rounded-2xl glass-panel border border-slate-800 p-5 bg-slate-900/60 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-indigo-400" />
            Gross Financial Volume
          </span>
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(summary.totalNetSettled || summary.totalPaymentValue)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Orders: {formatCurrency(summary.totalOrderValue)}</span>
            <span className="text-slate-500">|</span>
            <span>{summary.totalPaymentsCount} Settled Txns</span>
          </div>
        </div>
      </div>

      {/* 4. Value in Dispute & Discrepancies Count */}
      <div className="rounded-2xl glass-panel border border-slate-800 p-5 bg-slate-900/60 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Total Discrepancies
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs">
            {summary.discrepancyCount} Total
          </div>
        </div>

        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(summary.totalValueInDispute)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span className="text-rose-400 font-medium">Crit: {summary.severityBreakdown.CRITICAL.count}</span>
            <span className="text-amber-400 font-medium">High: {summary.severityBreakdown.HIGH.count}</span>
            <span className="text-sky-400 font-medium">Med: {summary.severityBreakdown.MEDIUM.count}</span>
            <span className="text-slate-400 font-medium">Low: {summary.severityBreakdown.LOW.count}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
