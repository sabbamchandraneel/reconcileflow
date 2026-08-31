'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Sparkles, 
  ArrowUpDown, 
  ExternalLink, 
  Download,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  Info,
  Check
} from 'lucide-react';
import { DiscrepancyItem, DiscrepancyCategory, DiscrepancySeverity, CATEGORY_METADATA } from '@/lib/reconciliation-engine';

interface DiscrepancyTableProps {
  discrepancies: DiscrepancyItem[];
  selectedCategoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  onOpenAiAudit: (discrepancy: DiscrepancyItem) => void;
}

export const DiscrepancyTable: React.FC<DiscrepancyTableProps> = ({
  discrepancies,
  selectedCategoryFilter,
  onCategoryFilterChange,
  onOpenAiAudit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'discrepancyAmount' | 'severity' | 'orderId'>('discrepancyAmount');
  const [sortAsc, setSortAsc] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '--';
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter & Sort Logic
  const filteredDiscrepancies = useMemo(() => {
    return discrepancies
      .filter((d) => {
        // Search term filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchesOrder = d.orderId?.toLowerCase().includes(q);
          const matchesTxn = d.transactionRef?.toLowerCase().includes(q);
          const matchesEmail = d.customerEmail?.toLowerCase().includes(q);
          const matchesDesc = d.description?.toLowerCase().includes(q);
          const matchesCat = d.category?.toLowerCase().includes(q);
          if (!matchesOrder && !matchesTxn && !matchesEmail && !matchesDesc && !matchesCat) {
            return false;
          }
        }

        // Category filter
        if (selectedCategoryFilter !== 'ALL' && d.category !== selectedCategoryFilter) {
          return false;
        }

        // Severity filter
        if (severityFilter !== 'ALL' && d.severity !== severityFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'discrepancyAmount') {
          cmp = (b.discrepancyAmount || 0) - (a.discrepancyAmount || 0);
        } else if (sortField === 'severity') {
          const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          cmp = order[b.severity] - order[a.severity];
        } else if (sortField === 'orderId') {
          cmp = (a.orderId || '').localeCompare(b.orderId || '');
        }
        return sortAsc ? -cmp : cmp;
      });
  }, [discrepancies, searchTerm, selectedCategoryFilter, severityFilter, sortField, sortAsc]);

  const exportFilteredCsv = () => {
    const headers = ['Category', 'Severity', 'OrderID', 'TransactionRef', 'CustomerEmail', 'OrderAmount', 'PaymentAmount', 'DiscrepancyAmount', 'OrderStatus', 'PaymentStatus', 'Description'];
    const rows = filteredDiscrepancies.map((d) => [
      d.category,
      d.severity,
      d.orderId || '',
      d.transactionRef || '',
      d.customerEmail || '',
      d.orderAmount ?? '',
      d.paymentAmount ?? '',
      d.discrepancyAmount,
      d.orderStatus || '',
      d.paymentStatus || '',
      `"${(d.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reconciliation_discrepancies_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadge = (severity: DiscrepancySeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertOctagon className="w-3 h-3" />
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30">
            <AlertTriangle className="w-3 h-3" />
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3 h-3" />
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/15 text-slate-400 border border-slate-500/30">
            <Info className="w-3 h-3" />
            LOW
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl glass-panel border border-slate-800 p-5 bg-slate-900/70 shadow-xl flex flex-col space-y-4">
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>Drill-Down Discrepancies Ledger</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-300 font-semibold border border-slate-700">
              {filteredDiscrepancies.length} of {discrepancies.length} Issues
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Search, filter by risk classification, and launch deep AI root-cause auditor on any row.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, Txn, Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            {Object.entries(CATEGORY_METADATA).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>

          {/* Export CSV Button */}
          <button
            onClick={exportFilteredCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Export filtered discrepancies as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
        <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
          <thead className="bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-3.5 cursor-pointer" onClick={() => { setSortField('severity'); setSortAsc(!sortAsc); }}>
                <div className="flex items-center gap-1">
                  <span>Severity</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3.5">Category</th>
              <th className="py-3 px-3.5 cursor-pointer" onClick={() => { setSortField('orderId'); setSortAsc(!sortAsc); }}>
                <div className="flex items-center gap-1">
                  <span>Order ID / Ref</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3.5">Txn Ref</th>
              <th className="py-3 px-3.5">Customer Email</th>
              <th className="py-3 px-3.5 text-right">Order Net</th>
              <th className="py-3 px-3.5 text-right">Paid Amount</th>
              <th className="py-3 px-3.5 text-right cursor-pointer" onClick={() => { setSortField('discrepancyAmount'); setSortAsc(!sortAsc); }}>
                <div className="flex items-center justify-end gap-1">
                  <span>Discrepancy</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3.5">Status Matrix</th>
              <th className="py-3 px-3.5 text-center">AI Investigation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 bg-slate-900/30">
            {filteredDiscrepancies.length > 0 ? (
              filteredDiscrepancies.map((disc, idx) => (
                <tr
                  key={disc.id || `disc-row-${idx}`}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  {/* Severity */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    {getSeverityBadge(disc.severity)}
                  </td>

                  {/* Category */}
                  <td className="py-3 px-3.5 font-medium text-slate-200">
                    <span title={disc.description}>
                      {CATEGORY_METADATA[disc.category]?.label || disc.category}
                    </span>
                  </td>

                  {/* Order ID */}
                  <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-300">
                    {disc.orderId ? (
                      <button
                        onClick={() => handleCopy(disc.orderId!)}
                        className="inline-flex items-center gap-1 hover:text-indigo-400 transition"
                        title="Click to copy Order ID"
                      >
                        <span>{disc.orderId}</span>
                        {copiedId === disc.orderId ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : null}
                      </button>
                    ) : (
                      <span className="text-slate-500">--</span>
                    )}
                  </td>

                  {/* Transaction Ref */}
                  <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                    {disc.transactionRef || <span className="text-slate-600">--</span>}
                  </td>

                  {/* Customer Email */}
                  <td className="py-3 px-3.5 whitespace-nowrap text-slate-400">
                    {disc.customerEmail || <span className="text-slate-600">--</span>}
                  </td>

                  {/* Order Amount */}
                  <td className="py-3 px-3.5 text-right font-medium text-slate-300 whitespace-nowrap">
                    {formatCurrency(disc.orderAmount)}
                  </td>

                  {/* Paid Amount */}
                  <td className="py-3 px-3.5 text-right font-medium text-slate-300 whitespace-nowrap">
                    {formatCurrency(disc.paymentAmount)}
                  </td>

                  {/* Discrepancy Amount */}
                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                    <span
                      className={`font-bold ${
                        disc.severity === 'CRITICAL'
                          ? 'text-rose-400'
                          : disc.severity === 'HIGH'
                          ? 'text-orange-400'
                          : disc.severity === 'MEDIUM'
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {formatCurrency(disc.discrepancyAmount)}
                    </span>
                  </td>

                  {/* Status Matrix */}
                  <td className="py-3 px-3.5 whitespace-nowrap text-[11px]">
                    <div className="flex flex-col gap-0.5">
                      {disc.orderStatus && (
                        <span className="text-slate-400">
                          Ord: <span className="font-semibold text-slate-200">{disc.orderStatus}</span>
                        </span>
                      )}
                      {disc.paymentStatus && (
                        <span className="text-slate-400">
                          Pay: <span className="font-semibold text-slate-200">{disc.paymentStatus}</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* AI Root-Cause Audit Action */}
                  <td className="py-3 px-3.5 text-center whitespace-nowrap">
                    <button
                      onClick={() => onOpenAiAudit(disc)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600 hover:to-purple-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition shadow-sm"
                      title="Run backend AI root-cause analysis"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
                      <span>AI Audit</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500 text-xs">
                  No discrepancies match your search and filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
