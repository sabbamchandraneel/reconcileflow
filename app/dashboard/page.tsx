'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ExecutiveKpiCards } from '@/components/ExecutiveKpiCards';
import { DiscrepancyCharts } from '@/components/DiscrepancyCharts';
import { DiscrepancyTable } from '@/components/DiscrepancyTable';
import { AiAuditModal } from '@/components/AiAuditModal';
import { FileUploadModal } from '@/components/FileUploadModal';
import { ExportReportButton } from '@/components/ExportReportButton';
import { DiscrepancyItem } from '@/lib/reconciliation-engine';
import { StoredReconciliation } from '@/lib/store';
import { 
  ShieldAlert, 
  RefreshCw, 
  Calendar, 
  Database, 
  Layers, 
  AlertOctagon,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [reconciliations, setReconciliations] = useState<StoredReconciliation[]>([]);
  const [activeReconciliation, setActiveReconciliation] = useState<StoredReconciliation | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<DiscrepancyItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Step 1: Check Auth Session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Step 2: Fetch or Auto-Initialize Reconciliations for User
  useEffect(() => {
    if (!user) return;

    async function loadReconciliations() {
      setLoadingAudit(true);
      try {
        const res = await fetch('/api/reconciliations');
        const data = await res.json();

        if (res.ok && data.reconciliations && data.reconciliations.length > 0) {
          setReconciliations(data.reconciliations);
          setActiveReconciliation(data.reconciliations[0]);
        } else {
          // If first visit and no audit run exists, auto-load benchmark demo dataset!
          await runDemoAudit();
        }
      } catch (err) {
        console.error('Failed to load reconciliations:', err);
      } finally {
        setLoadingAudit(false);
      }
    }

    loadReconciliations();
  }, [user]);

  const runDemoAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDemo: true }),
      });
      const data = await res.json();
      if (res.ok && data.reconciliation) {
        setReconciliations((prev) => [data.reconciliation, ...prev]);
        setActiveReconciliation(data.reconciliation);
      }
    } catch (err) {
      console.error('Failed to execute demo audit:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleOpenAiAudit = (discrepancy: DiscrepancyItem) => {
    setSelectedDiscrepancy(discrepancy);
    setIsAiModalOpen(true);
  };

  const handleSelectChartCategory = (categoryKey: string) => {
    setCategoryFilter(categoryKey);
    // Scroll down smoothly to the table
    const tableEl = document.getElementById('drill-down-table-section');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-sm font-medium">Authenticating auditor session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Top Navigation */}
      <Navbar
        user={user}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onRunDemoAudit={runDemoAudit}
        loadingDemo={loadingAudit}
      />

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Executive Header & Audit Switcher Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeReconciliation?.title || 'Executive Revenue Reconciliation Audit'}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Audit Completed
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {activeReconciliation
                  ? new Date(activeReconciliation.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Just now'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span>Store Orders: </span>
                <strong className="text-slate-200">{activeReconciliation?.summary.totalOrdersCount ?? 0} rows</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Payment Gateway: </span>
                <strong className="text-slate-200">{activeReconciliation?.summary.totalPaymentsCount ?? 0} txns</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audit Run Switcher (if multiple runs exist) */}
            {reconciliations.length > 1 && (
              <select
                value={activeReconciliation?.id || ''}
                onChange={(e) => {
                  const selected = reconciliations.find((r) => r.id === e.target.value);
                  if (selected) setActiveReconciliation(selected);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {reconciliations.map((rec) => (
                  <option key={rec.id} value={rec.id}>
                    {rec.title} ({new Date(rec.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            )}

            {/* Export Audit Report Button */}
            {activeReconciliation && <ExportReportButton reconciliation={activeReconciliation} />}
          </div>
        </div>

        {/* Loading Spinner or Active Audit Content */}
        {loadingAudit && !activeReconciliation ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm text-slate-300 font-medium">Running deterministic multi-pass reconciliation engine...</p>
          </div>
        ) : activeReconciliation ? (
          <div className="space-y-6">
            {/* 1. Executive Headline KPI Metrics Cards */}
            <ExecutiveKpiCards summary={activeReconciliation.summary} />

            {/* 2. Visualizations Breakdown (Donut + Bar Charts) */}
            <DiscrepancyCharts
              summary={activeReconciliation.summary}
              onSelectCategory={handleSelectChartCategory}
            />

            {/* 3. Drill-Down Discrepancies Table */}
            <div id="drill-down-table-section">
              <DiscrepancyTable
                discrepancies={activeReconciliation.discrepancies}
                selectedCategoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                onOpenAiAudit={handleOpenAiAudit}
              />
            </div>
          </div>
        ) : null}
      </main>

      {/* AI Root-Cause Auditor Modal */}
      <AiAuditModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        discrepancy={selectedDiscrepancy}
        reconciliationId={activeReconciliation?.id}
      />

      {/* Ingestion & CSV Upload Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onReconciliationComplete={(newRun) => {
          setReconciliations((prev) => [newRun, ...prev]);
          setActiveReconciliation(newRun);
        }}
      />
    </div>
  );
}
