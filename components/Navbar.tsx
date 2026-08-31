'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, 
  UploadCloud, 
  LogOut, 
  User, 
  Database,
  RefreshCw
} from 'lucide-react';

interface NavbarProps {
  user: { id: string; email: string; name?: string } | null;
  onOpenUploadModal: () => void;
  onRunDemoAudit: () => void;
  onOpenProfileModal: () => void;
  loadingDemo?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenUploadModal,
  onRunDemoAudit,
  onOpenProfileModal,
  loadingDemo = false,
}) => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-[1px] shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <div className="h-full w-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-300 truncate">
                ReconcileFlow
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v1.0
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate hidden xs:block">
              Financial Reconciliation &amp; Revenue Leakage Engine
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <button
            onClick={onRunDemoAudit}
            disabled={loadingDemo}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
            title="Reload May 2025 Store Audit Dataset"
          >
            {loadingDemo ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : (
              <Database className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>Reload Store Audit</span>
          </button>

          <button
            onClick={onOpenUploadModal}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-md shadow-indigo-600/20 transition active:scale-95"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">New Ingestion</span>
            <span className="sm:hidden">Ingest</span>
          </button>

          {/* User Profile / Logout */}
          <div className="h-5 w-[1px] bg-slate-800 mx-0.5 sm:mx-1" />

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-1.5 sm:gap-2 pl-1 pr-2 py-1 rounded-full bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs transition"
              title="Manage Profile"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-semibold text-[11px] flex-shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-slate-300 font-medium max-w-[100px] lg:max-w-[140px] truncate hidden sm:inline">
                {user?.name || user?.email?.split('@')[0] || 'Auditor'}
              </span>
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

