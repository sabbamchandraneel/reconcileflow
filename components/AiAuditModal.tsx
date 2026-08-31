'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  Copy, 
  Check, 
  Bot, 
  ShieldAlert, 
  RefreshCw,
  Cpu
} from 'lucide-react';
import { DiscrepancyItem, CATEGORY_METADATA } from '@/lib/reconciliation-engine';
import { AiExplanationResult } from '@/lib/llm';

interface AiAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  discrepancy: DiscrepancyItem | null;
  reconciliationId?: string;
}

export const AiAuditModal: React.FC<AiAuditModalProps> = ({
  isOpen,
  onClose,
  discrepancy,
  reconciliationId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<AiExplanationResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && discrepancy) {
      // Check if discrepancy already has cached AI explanation
      if (discrepancy.aiExplanation) {
        try {
          const cached = JSON.parse(discrepancy.aiExplanation);
          setExplanation(cached);
          setLoading(false);
          setError(null);
          return;
        } catch {
          // ignore json parse error, fetch fresh
        }
      }

      // Fetch fresh AI reasoning from backend
      fetchAiExplanation();
    } else {
      setExplanation(null);
      setError(null);
    }
  }, [isOpen, discrepancy]);

  const fetchAiExplanation = async () => {
    if (!discrepancy) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/explain-discrepancy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discrepancy,
          reconciliationId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI explanation');
      }

      setExplanation(data.explanation);
    } catch (err: any) {
      console.error('AI explanation fetch error:', err);
      setError(err.message || 'An unexpected error occurred while communicating with the AI service.');
    } finally {
      setLoading(false);
    }
  };

  const copyAuditReport = () => {
    if (!discrepancy || !explanation) return;
    const reportText = `[AI DISCREPANCY AUDIT REPORT]
Order: ${discrepancy.orderId || 'N/A'}
Txn: ${discrepancy.transactionRef || 'N/A'}
Category: ${discrepancy.category} (${discrepancy.severity})
Discrepancy Variance: $${discrepancy.discrepancyAmount.toFixed(2)}

EXECUTIVE SUMMARY:
${explanation.summary}

LIKELY ROOT CAUSE:
${explanation.likelyRootCause}

BUSINESS & REVENUE RISK:
${explanation.businessRisk}

RECOMMENDED ACTION:
${explanation.recommendedAction}

Auditor Source: ${explanation.source}`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !discrepancy) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl glass-panel-glow border border-indigo-500/30 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-[1px] shadow-md shadow-indigo-600/30">
              <div className="h-full w-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  AI Root-Cause Discrepancy Auditor
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Structured JSON
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {CATEGORY_METADATA[discrepancy.category]?.label || discrepancy.category}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Key Identifiers Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Order Reference</span>
              <p className="font-mono font-bold text-slate-200 mt-0.5">{discrepancy.orderId || '--'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Transaction Ref</span>
              <p className="font-mono font-bold text-slate-200 mt-0.5 truncate">{discrepancy.transactionRef || '--'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Order Net</span>
              <p className="font-semibold text-slate-200 mt-0.5">
                {discrepancy.orderAmount !== undefined ? `$${discrepancy.orderAmount.toFixed(2)}` : '--'}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Discrepancy</span>
              <p className="font-bold text-rose-400 mt-0.5">${discrepancy.discrepancyAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* In-Flight Loading Skeleton */}
          {loading && (
            <div className="py-8 space-y-4">
              <div className="flex items-center justify-center gap-2.5 text-indigo-400 font-semibold">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing backend LLM reasoning model (gpt-4o-mini, temp: 0.1)...</span>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-800 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-slate-800 rounded animate-pulse w-full" />
                <div className="h-4 bg-slate-800 rounded animate-pulse w-5/6" />
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>AI Reasoner Notice</span>
              </div>
              <p className="text-xs">{error}</p>
              <button
                onClick={fetchAiExplanation}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded bg-rose-900/50 hover:bg-rose-900 border border-rose-700/60 text-white font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          )}

          {/* Explanation Output */}
          {explanation && !loading && (
            <div className="space-y-4">
              {/* Executive Summary Card */}
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" />
                    Auditor Executive Summary
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      explanation.urgency === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : explanation.urgency === 'HIGH'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {explanation.urgency} URGENCY
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed pt-1">
                  {explanation.summary}
                </p>
              </div>

              {/* Technical Root Cause */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  Likely Technical & Operational Root Cause
                </span>
                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  {explanation.likelyRootCause}
                </p>
              </div>

              {/* Business & Financial Risk */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Business & Revenue Impact
                </span>
                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  {explanation.businessRisk}
                </p>
              </div>

              {/* Action Plan */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Recommended Actionable Resolution
                </span>
                <p className="text-xs text-slate-200 leading-relaxed pt-1">
                  {explanation.recommendedAction}
                </p>
              </div>

              {/* Model Source Footer */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  Engine: <span className="text-slate-300 font-semibold">{explanation.source}</span>
                </span>
                <span>Config: Low Temperature (0.1) • Zero Matching Logic in LLM</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <button
            onClick={fetchAiExplanation}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-evaluate</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={copyAuditReport}
              disabled={!explanation || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Report' : 'Copy Audit Note'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
