'use client';

import React, { useState } from 'react';
import { Download, Check, FileJson, FileSpreadsheet } from 'lucide-react';
import { StoredReconciliation } from '@/lib/store';

interface ExportReportButtonProps {
  reconciliation: StoredReconciliation;
}

export const ExportReportButton: React.FC<ExportReportButtonProps> = ({ reconciliation }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const exportCsv = () => {
    const summary = reconciliation.summary;
    const discrepancies = reconciliation.discrepancies;

    const summaryRows = [
      ['AUDIT SUMMARY REPORT', reconciliation.title],
      ['Generated At', new Date().toISOString()],
      ['Total Orders Count', summary.totalOrdersCount],
      ['Total Payments Count', summary.totalPaymentsCount],
      ['Total Order Value ($)', summary.totalOrderValue],
      ['Total Settled Charges ($)', summary.totalSettledCharges],
      ['Total Money at Risk ($)', summary.totalMoneyAtRisk],
      ['Total Value in Dispute ($)', summary.totalValueInDispute],
      ['Clean Match Rate (%)', `${summary.matchRatePercentage}%`],
      ['Total Discrepancies Count', summary.discrepancyCount],
      [],
      ['DISCREPANCIES DRILL-DOWN'],
      ['Category', 'Severity', 'OrderID', 'TransactionRef', 'CustomerEmail', 'OrderAmount', 'PaymentAmount', 'DiscrepancyAmount', 'OrderStatus', 'PaymentStatus', 'Description', 'AI Likely Root Cause', 'AI Recommended Action'],
    ];

    const discRows = discrepancies.map((d) => [
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
      `"${(d.likelyRootCause || '').replace(/"/g, '""')}"`,
      `"${(d.recommendedAction || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [...summaryRows.map((r) => r.join(',')), ...discRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reconciliation_executive_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDropdown(false);
  };

  const exportJson = () => {
    const jsonStr = JSON.stringify(reconciliation, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reconciliation_audit_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDropdown(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
      >
        <Download className="w-3.5 h-3.5 text-indigo-400" />
        <span>Export Audit Report</span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1 z-50 animate-fadeIn text-xs">
          <button
            onClick={exportCsv}
            className="w-full text-left px-3.5 py-2 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export as CSV (.csv)</span>
          </button>

          <button
            onClick={exportJson}
            className="w-full text-left px-3.5 py-2 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
          >
            <FileJson className="w-4 h-4 text-indigo-400" />
            <span>Export as JSON (.json)</span>
          </button>
        </div>
      )}
    </div>
  );
};
