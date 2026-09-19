import React from 'react';
import {
  FileText,
  FolderTree,
  Hash,
  ShieldCheck,
  Printer,
  PlusCircle,
  Download,
  UserCheck,
  Building2,
  Lock,
  Unlock,
  KeyRound,
} from 'lucide-react';
import { UserRole } from '../types';
import { HumersLogo } from './HumersLogo';

interface HeaderProps {
  currentTab: 'ledger' | 'storage' | 'sequences' | 'audit' | 'print';
  setCurrentTab: (tab: 'ledger' | 'storage' | 'sequences' | 'audit' | 'print') => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isAdminAuthenticated: boolean;
  onRequestAdminAuth: () => void;
  onLockAdmin: () => void;
  onOpenNewDocModal: () => void;
  onExportCsv: () => void;
  totalDocs: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  userRole,
  setUserRole,
  isAdminAuthenticated,
  onRequestAdminAuth,
  onLockAdmin,
  onOpenNewDocModal,
  onExportCsv,
  totalDocs,
}) => {
  const roleLabelMap: Record<UserRole, { title: string; badgeClass: string }> = {
    office_staff: {
      title: 'Office Staff (Registrar)',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    superior_officer: {
      title: 'Superior Officer (Reviewer)',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    admin: {
      title: 'System Administrator',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as UserRole;
    if (selected === 'admin') {
      if (isAdminAuthenticated) {
        setUserRole('admin');
      } else {
        onRequestAdminAuth();
      }
    } else {
      setUserRole(selected);
    }
  };

  return (
    <header id="app-header" className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner: Official Registry Branding & Role Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3.5 border-b border-slate-100 gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="p-1.5 bg-slate-50 border border-slate-200/80 rounded-xl shadow-xs">
              <HumersLogo size="md" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black tracking-wider text-slate-800 uppercase">
                  E-MANAGEMENT
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  WAL SQLite
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Central Registry • Atomic Sequential Numbering • Partitioned Storage Tier
              </p>
            </div>
          </div>

          {/* Role Switcher & Action Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* RBAC Role Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-600 font-medium hidden md:inline">Active Tier:</span>
              <select
                id="role-selector-dropdown"
                value={userRole}
                onChange={handleRoleChange}
                className="bg-transparent font-semibold text-slate-800 border-none outline-hidden cursor-pointer text-xs"
              >
                <option value="office_staff">Office Staff (Entry / Upload)</option>
                <option value="superior_officer">Superior Officer (Review & Sign)</option>
                <option value="admin">
                  {isAdminAuthenticated ? 'System Administrator (Unlocked 🔓)' : 'System Administrator (Password Protected 🔒)'}
                </option>
              </select>
            </div>

            {/* If Admin is active, show Lock Admin session button */}
            {userRole === 'admin' && (
              <button
                id="lock-admin-tier-btn"
                type="button"
                onClick={onLockAdmin}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 transition-colors shadow-2xs cursor-pointer"
                title="Lock System Administrator session (Requires Master Privacy Password to re-open)"
              >
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Lock Admin</span>
              </button>
            )}

            {/* Quick action buttons */}
            <button
              id="export-csv-header-btn"
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              title="Download RFC-4180 CSV Ledger Export"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>

            <button
              id="register-document-header-btn"
              type="button"
              onClick={onOpenNewDocModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Record Document</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center justify-between overflow-x-auto py-2">
          <nav id="primary-navigation-tabs" className="flex space-x-1 sm:space-x-2" aria-label="Tabs">
            <button
              id="tab-master-ledger"
              onClick={() => setCurrentTab('ledger')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                currentTab === 'ledger'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Master Ledger</span>
              <span
                className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  currentTab === 'ledger' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {totalDocs}
              </span>
            </button>

            <button
              id="tab-storage-directory"
              onClick={() => setCurrentTab('storage')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                currentTab === 'storage'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>Directory Storage (/uploads/)</span>
            </button>

            <button
              id="tab-sequence-tracker"
              onClick={() => setCurrentTab('sequences')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                currentTab === 'sequences'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Hash className="w-4 h-4" />
              <span>Sequence Engine</span>
            </button>

            <button
              id="tab-audit-trails"
              onClick={() => setCurrentTab('audit')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                currentTab === 'audit'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Audit Trails</span>
            </button>

            <button
              id="tab-print-summary"
              onClick={() => setCurrentTab('print')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                currentTab === 'print'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Printer className="w-4 h-4 text-amber-500" />
              <span>Printable A4 Summary</span>
            </button>
          </nav>

          {/* Active status indicator badge */}
          <div className="hidden lg:flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Current Role:</span>
            <div className="flex items-center space-x-1.5">
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${roleLabelMap[userRole].badgeClass}`}>
                {roleLabelMap[userRole].title}
              </span>
              {userRole === 'admin' && (
                <span
                  id="admin-clearance-secured-badge"
                  className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white flex items-center space-x-1 shadow-2xs"
                  title="System Administrator tier is authenticated with Master Privacy Password"
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>PROTECTED</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
