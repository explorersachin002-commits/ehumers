import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, User, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuditLog } from '../types';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [userQuery, setUserQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = (p = page) => {
    setIsLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(p));
    params.set('limit', '25');
    if (actionFilter !== 'ALL') params.set('action', actionFilter);
    if (userQuery.trim()) params.set('user', userQuery.trim());

    fetch(`/api/audit-logs?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.logs) {
          setLogs(data.logs);
          setTotal(data.total);
          setTotalPages(data.totalPages);
          setPage(data.page);
        }
      })
      .catch((err) => console.error('Failed to load audit logs:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter]);

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'UPDATE':
      case 'STATUS_CHANGE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'EXPORT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PRINT':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'VIEW':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'DELETE':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'ADMIN_LOGIN':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'ADMIN_LOGOUT':
        return 'bg-slate-200 text-slate-800 border-slate-300 font-bold';
      case 'ADMIN_LOGIN_FAILED':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div id="audit-trail-view" className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Regulatory Audit Trails & Chain of Custody
            </h2>
            <p className="text-xs text-slate-500">
              Immutable logging of all document transactions (INSERT, UPDATE, STATUS_CHANGE, EXPORT, PRINT, VIEW, DELETE)
            </p>
          </div>
        </div>

        <button
          id="btn-refresh-audit"
          onClick={() => fetchLogs(page)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-medium">Filter Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-medium cursor-pointer"
          >
            <option value="ALL">All Actions</option>
            <option value="INSERT">INSERT (New Record)</option>
            <option value="UPDATE">UPDATE (Edit Metadata)</option>
            <option value="STATUS_CHANGE">STATUS_CHANGE</option>
            <option value="EXPORT">EXPORT (CSV/Excel)</option>
            <option value="PRINT">PRINT (A4 Summary)</option>
            <option value="VIEW">VIEW (Scan Download/Stream)</option>
            <option value="DELETE">DELETE</option>
            <option value="ADMIN_LOGIN">ADMIN_LOGIN (Privilege Unlock)</option>
            <option value="ADMIN_LOGOUT">ADMIN_LOGOUT (Session Locked)</option>
            <option value="ADMIN_LOGIN_FAILED">ADMIN_LOGIN_FAILED</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Filter by user identifier..."
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-hidden"
          />
        </div>

        <button
          onClick={() => fetchLogs(1)}
          className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Apply Filter
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-3 w-16">Log ID</th>
                <th className="py-3 px-3 w-40">Timestamp</th>
                <th className="py-3 px-3 w-32">Action</th>
                <th className="py-3 px-3 w-48">Officer / User</th>
                <th className="py-3 px-3 w-40">Target Serial</th>
                <th className="py-3 px-3">Subject Synopsis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading audit trail logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-500 font-bold text-[11px]">
                      #{log.id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${getActionBadgeClass(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.user_identifier}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {log.serial_no || (
                        <span className="text-slate-400 font-normal italic">System Level</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-xs">
                      {log.subject || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Total {total} audit records logged
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1 || isLoading}
              className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-slate-700 font-mono">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
