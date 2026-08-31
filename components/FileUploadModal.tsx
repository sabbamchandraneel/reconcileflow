'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Database, 
  AlertCircle, 
  CheckCircle2, 
  Sliders, 
  RefreshCw 
} from 'lucide-react';
import Papa from 'papaparse';
import { OrderRecord, PaymentRecord } from '@/lib/reconciliation-engine';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReconciliationComplete: (result: any) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onReconciliationComplete,
}) => {
  const [title, setTitle] = useState('');
  const [tolerance, setTolerance] = useState(0.05);
  const [ordersFile, setOrdersFile] = useState<File | null>(null);
  const [paymentsFile, setPaymentsFile] = useState<File | null>(null);
  const [ordersParsedCount, setOrdersParsedCount] = useState<number | null>(null);
  const [paymentsParsedCount, setPaymentsParsedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ordersInputRef = useRef<HTMLInputElement>(null);
  const paymentsInputRef = useRef<HTMLInputElement>(null);

  const handleOrdersUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOrdersFile(file);
      Papa.parse<OrderRecord>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setOrdersParsedCount(results.data.length);
        },
      });
    }
  };

  const handlePaymentsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentsFile(file);
      Papa.parse<PaymentRecord>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setPaymentsParsedCount(results.data.length);
        },
      });
    }
  };

  const handleRunReconciliation = async () => {
    if (!ordersFile || !paymentsFile) {
      setError('Please upload both orders.csv and payments.csv before proceeding.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ordersText = await ordersFile.text();
      const paymentsText = await paymentsFile.text();

      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordersCsv: ordersText,
          paymentsCsv: paymentsText,
          title: title.trim() || undefined,
          roundingTolerance: tolerance,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Reconciliation failed.');
      }

      onReconciliationComplete(data.reconciliation);
      onClose();
    } catch (err: any) {
      console.error('Upload reconciliation error:', err);
      setError(err.message || 'Failed to reconcile uploaded files.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isDemo: true,
          title: title.trim() || 'Store Financial Audit (May 2025 Dataset)',
          roundingTolerance: tolerance,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load demo dataset');
      }

      onReconciliationComplete(data.reconciliation);
      onClose();
    } catch (err: any) {
      console.error('Demo load error:', err);
      setError(err.message || 'Failed to load demo dataset.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl glass-panel-glow border border-indigo-500/30 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Ingest Datasets for Reconciliation</h3>
              <p className="text-xs text-slate-400">Upload store exports & payment transaction ledgers</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          {/* Quick Demo Button */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-400" />
                <span>Assignment Dataset — <span className="text-indigo-300">orders.csv & payments.csv</span></span>
              </div>
              <p className="text-slate-400 text-[11px]">
                The original <code className="text-indigo-300 bg-indigo-950/50 px-1 rounded">orders.csv</code> (185 rows) &amp; <code className="text-indigo-300 bg-indigo-950/50 px-1 rounded">payments.csv</code> (187 rows) provided in the assignment — committed to the repo root.
              </p>
            </div>

            <button
              onClick={handleLoadDemo}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>1-Click Load</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            <div className="h-[1px] flex-1 bg-slate-800" />
            <span className="text-[10px] uppercase font-bold tracking-wider">or upload custom csv files</span>
            <div className="h-[1px] flex-1 bg-slate-800" />
          </div>

          {/* Audit Title */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 text-[11px]">Audit Run Title (Optional)</label>
            <input
              type="text"
              placeholder="e.g. May 2025 Revenue Reconciliation Audit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Dual File Upload Dropzones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Orders File */}
            <div
              onClick={() => ordersInputRef.current?.click()}
              className={`p-4 rounded-xl border-2 border-dashed cursor-pointer transition text-center flex flex-col items-center justify-center space-y-1.5 ${
                ordersFile
                  ? 'border-emerald-500/40 bg-emerald-950/10'
                  : 'border-slate-800 hover:border-indigo-500/50 bg-slate-950/40'
              }`}
            >
              <input
                ref={ordersInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleOrdersUpload}
              />
              {ordersFile ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <p className="font-semibold text-slate-200 truncate max-w-[180px]">{ordersFile.name}</p>
                  <p className="text-[11px] text-emerald-400">{ordersParsedCount} order rows detected</p>
                </>
              ) : (
                <>
                  <FileText className="w-6 h-6 text-indigo-400" />
                  <p className="font-semibold text-slate-200">Upload orders.csv</p>
                  <p className="text-[11px] text-slate-400">Order management system export</p>
                </>
              )}
            </div>

            {/* Payments File */}
            <div
              onClick={() => paymentsInputRef.current?.click()}
              className={`p-4 rounded-xl border-2 border-dashed cursor-pointer transition text-center flex flex-col items-center justify-center space-y-1.5 ${
                paymentsFile
                  ? 'border-emerald-500/40 bg-emerald-950/10'
                  : 'border-slate-800 hover:border-indigo-500/50 bg-slate-950/40'
              }`}
            >
              <input
                ref={paymentsInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handlePaymentsUpload}
              />
              {paymentsFile ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <p className="font-semibold text-slate-200 truncate max-w-[180px]">{paymentsFile.name}</p>
                  <p className="text-[11px] text-emerald-400">{paymentsParsedCount} payment txns detected</p>
                </>
              ) : (
                <>
                  <FileText className="w-6 h-6 text-indigo-400" />
                  <p className="font-semibold text-slate-200">Upload payments.csv</p>
                  <p className="text-[11px] text-slate-400">Payment processor settlement export</p>
                </>
              )}
            </div>
          </div>

          {/* Tolerance Config */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-400" />
              <div>
                <span className="font-semibold text-slate-200 text-xs">Penny Rounding Tolerance</span>
                <p className="text-[10px] text-slate-400">Variances below this threshold are marked low-risk noise</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1.00"
                value={tolerance}
                onChange={(e) => setTolerance(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 text-right focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleRunReconciliation}
            disabled={!ordersFile || !paymentsFile || loading}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Execute Reconciliation</span>
          </button>
        </div>
      </div>
    </div>
  );
};
