'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  TrendingDown, 
  BarChart3, 
  Cpu, 
  Lock,
  RefreshCw 
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated) {
          router.push('/dashboard');
        } else {
          setChecking(false);
        }
      } catch {
        setChecking(false);
      }
    }
    check();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-sm font-medium">Loading ReconcileFlow...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-400 p-[1px]">
              <div className="h-full w-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-300">
              ReconcileFlow
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 transition"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/20 transition"
            >
              Launch Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-4 sm:px-6 text-center py-16 sm:py-24 space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Production-Ready Financial Reconciliation & AI Auditor</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl leading-tight sm:leading-none">
          Stop Silent Revenue Leakage with{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400">
            Deterministic Reconciliation
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          Ingest messy store orders and payment processor ledgers. Automatically detect duplicate charges, orphan unpaid orders, ghost captures, and pricing variances with 100% deterministic mathematical precision and backend AI root-cause analysis.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 group"
          >
            <span>Launch Interactive Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>1-Click Demo Auditor Account</span>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-12 text-left w-full">
          <div className="p-5 rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/60 space-y-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">Deterministic Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict code-based matching. Zero LLM hallucinations in financial calculations or status evaluations.
            </p>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/60 space-y-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">AI Root-Cause Auditor</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Structured JSON explanations via OpenAI (temp: 0.1) with resilient offline fallback rules.
            </p>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/60 space-y-2">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">Executive Drill-Down</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Interactive KPI cards, financial exposure charts, and filterable ledger tables for immediate triage.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
