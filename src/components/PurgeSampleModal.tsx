import React, { useState } from 'react';
import {
  Trash2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Check,
  X,
  ShieldAlert,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface PurgeSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  adminToken: string | null;
  onPurged: (count: number) => void;
  onAdminUnlocked?: (token: string) => void;
}

export const PurgeSampleModal: React.FC<PurgeSampleModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  adminToken,
  onPurged,
  onAdminUnlocked,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const defaultKeyHint = 'Humers123';

  if (!isOpen) return null;

  const handleAutoFill = () => {
    setPassword(defaultKeyHint);
    setAutoFilled(true);
    setTimeout(() => setAutoFilled(false), 2000);
  };

  const handlePurge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin && !password.trim()) {
      setError('System Administrator privacy password is required to purge sample records.');
      return;
    }

    setIsPurging(true);
    setError(null);

    try {
      let currentToken = adminToken;
      if (!isAdmin || !currentToken) {
        const verifyRes = await fetch('/api/admin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: password.trim() }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData.error || 'Incorrect privacy password.');
        }
        currentToken = verifyData.token;
        if (onAdminUnlocked && currentToken) {
          onAdminUnlocked(currentToken);
        }
      }

      const res = await fetch('/api/documents/sample/purge', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
          'x-user-identifier': 'admin_officer',
          ...(currentToken ? { 'x-admin-token': currentToken } : {}),
          ...(password ? { 'x-admin-key': password.trim(), 'x-admin-password': password.trim() } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to purge sample documents.');
      }

      onPurged(data.deletedCount || 0);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div
      id="purge-sample-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPurging) onClose();
      }}
    >
      <div
        id="purge-sample-modal-card"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 px-6 py-4 text-white relative">
          <button
            id="close-purge-modal-btn"
            type="button"
            onClick={onClose}
            disabled={isPurging}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-800/60 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase text-white">
                Purge Sample & Demo Data
              </h3>
              <p className="text-xs text-rose-200/80 mt-0.5">
                Reset registry to clean production state
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handlePurge} className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
            <div className="flex items-center space-x-1.5 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Clean Slate Registry Operation</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              This will remove all seeded demonstration documents (e.g. Environmental Clearance, PWD Outward letter, Highway Tenders, and sample bills) so you can begin registering real official documents.
            </p>
          </div>

          {!isAdmin && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Master Privacy Password</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
                >
                  {autoFilled ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Filled</span>
                    </>
                  ) : (
                    <span>Auto-Fill</span>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  id="purge-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Master key (Humers123)"
                  className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs text-slate-800"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug">{error}</div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPurging}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPurging || (!isAdmin && !password.trim())}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPurging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Purging...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Purge Sample Data</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
