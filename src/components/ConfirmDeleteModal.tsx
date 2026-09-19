import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  KeyRound,
  Check,
  X,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Building,
  Calendar,
  Loader2,
} from 'lucide-react';
import { RegistryDocument, UserRole } from '../types';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: RegistryDocument | { id: number; serial_no: string; party_name?: string; subject?: string; doc_type?: string; ref_no?: string; date_recorded?: string } | null;
  isAdmin: boolean;
  adminToken: string | null;
  onDeleted: (serialNo: string) => void;
  onAdminUnlocked?: (token: string) => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  document,
  isAdmin,
  adminToken,
  onDeleted,
  onAdminUnlocked,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const defaultKeyHint = 'Humers123';

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setShowPassword(false);
      setIsDeleting(false);
      setAutoFilled(false);
    }
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const handleAutoFill = () => {
    setPassword(defaultKeyHint);
    setAutoFilled(true);
    setTimeout(() => setAutoFilled(false), 2000);
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin && !password.trim()) {
      setError('System Administrator privacy password is required to delete records.');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      // If we don't have an admin token yet, let's authenticate first
      let currentToken = adminToken;
      if (!isAdmin || !currentToken) {
        const verifyRes = await fetch('/api/admin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: password.trim() }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData.error || 'Incorrect privacy password. Access denied.');
        }
        currentToken = verifyData.token;
        if (onAdminUnlocked && currentToken) {
          onAdminUnlocked(currentToken);
        }
      }

      // Now execute delete
      const res = await fetch(`/api/documents/${document.id}`, {
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
        throw new Error(data.error || 'Failed to delete document from central registry.');
      }

      onDeleted(document.serial_no);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while deleting the record.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      id="confirm-delete-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div
        id="confirm-delete-modal-card"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 px-6 py-4 text-white relative">
          <button
            id="close-confirm-delete-btn"
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-800/60 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold tracking-wide uppercase text-white">
                  Permanently Delete Document Record
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-rose-400/20 text-rose-200 border border-rose-400/30">
                  Admin Required
                </span>
              </div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                Central Registry Permanent Purge & Audit Logging
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleConfirmDelete} className="p-6 space-y-4">
          {/* Target Document Dossier Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Registry Document Identifier
              </span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                {document.serial_no}
              </span>
            </div>

            {document.party_name && (
              <div className="flex items-start space-x-2 text-slate-700">
                <Building className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="font-medium">{document.party_name}</span>
              </div>
            )}

            {document.subject && (
              <div className="flex items-start space-x-2 text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/70">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2 leading-relaxed">{document.subject}</span>
              </div>
            )}
          </div>

          {/* Warning Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-1">
            <div className="flex items-center space-x-1.5 font-semibold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Permanent Irreversible Action</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed pl-5.5">
              Deleting this record completely removes it from the central ledger database and deletes the physical uploaded file (if unshared). Audit logs will record the purge timestamp.
            </p>
          </div>

          {/* Admin Clearance Section */}
          {isAdmin ? (
            <div className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">System Administrator Clearance Active</span>
                <p className="text-[11px] text-emerald-700">Privileged deletion clearance is verified.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="delete-admin-password-input"
                  className="text-xs font-semibold text-slate-700 flex items-center space-x-1"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Enter Master Privacy Password</span>
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
                    <span>Auto-Fill Key</span>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  id="delete-admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Master key (e.g. Humers123)"
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
              <p className="text-[11px] text-slate-400 flex items-center space-x-1">
                <KeyRound className="w-3 h-3 text-slate-400" />
                <span>Default Password: <code className="font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded">Humers123</code></span>
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              id="confirm-delete-error-alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug">{error}</div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              id="cancel-delete-doc-btn"
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              id="execute-delete-doc-btn"
              type="submit"
              disabled={isDeleting || (!isAdmin && !password.trim())}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting Record...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
