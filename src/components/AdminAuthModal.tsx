import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  KeyRound,
  Check,
} from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
  actionReason?: string;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionReason = 'unlock the System Administrator tier',
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedHint, setCopiedHint] = useState(false);

  const defaultKeyHint = 'HUMERS@ADMIN#2026';

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setShowPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the administrator privacy password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Incorrect privacy password.');
      }

      onSuccess(data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseDefaultKey = () => {
    setPassword(defaultKeyHint);
    setCopiedHint(true);
    setTimeout(() => setCopiedHint(false), 2000);
  };

  return (
    <div
      id="admin-auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="admin-auth-modal-card"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header with high-security branding */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white relative">
          <button
            id="close-admin-auth-btn"
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold tracking-wide uppercase text-white">
                  Admin Privacy Authentication
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Protected
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Authentication required to {actionReason}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Security policy notice */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center space-x-1.5 text-slate-800 font-semibold">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Immutable Master Security Policy</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              The System Administrator clearance privacy password is hard-locked as an immutable core credential to prevent unauthorized modification or system hijack.
            </p>
          </div>

          {/* Quick Credential Hint / Helper for Authorized Testing */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50/70 border border-blue-100 text-xs">
            <div className="flex items-center space-x-1.5 text-blue-800">
              <span className="font-semibold">Master Key:</span>
              <code className="font-mono text-[11px] bg-blue-100/80 text-blue-900 px-1.5 py-0.5 rounded">
                {defaultKeyHint}
              </code>
            </div>
            <button
              id="autofill-admin-key-btn"
              type="button"
              onClick={handleUseDefaultKey}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 cursor-pointer"
            >
              {copiedHint ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Filled</span>
                </>
              ) : (
                <span>Auto-Fill</span>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div
              id="admin-auth-error-alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2 animate-in fade-in duration-150"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug">{error}</div>
            </div>
          )}

          {/* Password Field */}
          <div>
            <label
              htmlFor="admin-privacy-password-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Master Privacy Password
            </label>
            <div className="relative">
              <input
                id="admin-privacy-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                placeholder="Enter privacy password..."
                className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all font-mono placeholder:font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2.5">
            <button
              id="cancel-admin-auth-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-admin-auth-btn"
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Unlock Administrator</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
