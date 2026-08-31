'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Calendar, 
  KeyRound, 
  Save, 
  AlertCircle, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { id: string; email: string; name?: string } | null;
  onProfileUpdated?: (updated: { id: string; email: string; name?: string }) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setError(null);
      setSuccess(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Fetch latest profile details
      fetch('/api/auth/profile')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            setName(data.user.name || '');
            setEmail(data.user.email || '');
            if (data.user.createdAt) {
              setCreatedAt(new Date(data.user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }));
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const payload: any = { name: name.trim() };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (onProfileUpdated && data.user) {
        onProfileUpdated(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Profile Management</h3>
              <p className="text-xs text-slate-400">Manage your workspace account credentials & settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 text-sm">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Account Meta Badge */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Role: <strong className="text-white">Lead Financial Auditor</strong></span>
            </div>
            {createdAt && (
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Calendar className="w-3.5 h-3.5" />
                <span>Member since {createdAt}</span>
              </div>
            )}
          </div>

          {/* Personal Info */}
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name / Display Title
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Senior Financial Auditor"
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address (Read-only)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-400 text-xs cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Password Section */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Change Password (Optional)</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
