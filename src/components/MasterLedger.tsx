import React from 'react';
import {
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  Inbox,
  Send,
  Gavel,
  Receipt,
  FileCode,
  Paperclip,
  ExternalLink,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Archive,
  RefreshCw,
  MapPin,
  Briefcase,
  Share2,
  PlusCircle,
} from 'lucide-react';
import { RegistryDocument, DocumentType, DocumentStatus, DocumentStats, UserRole } from '../types';

interface MasterLedgerProps {
  documents: RegistryDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: DocumentStats | null;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedDocType: string;
  setSelectedDocType: (type: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  onPageChange: (p: number) => void;
  onViewDoc: (doc: RegistryDocument) => void;
  onShareDoc: (doc: RegistryDocument) => void;
  onDeleteDoc: (id: number, serialNo: string, doc?: RegistryDocument) => void;
  onQuickStatusChange: (id: number, newStatus: DocumentStatus) => void;
  onRefresh: () => void;
  onResetFiltersAndRefresh?: () => void;
  onPurgeSampleData?: () => void;
  userRole: UserRole;
  highlightedDocId?: number | null;
  sortBy?: string;
  setSortBy?: (col: string) => void;
  onOpenNewDocModal?: () => void;
  onLimitChange?: (limit: number) => void;
}

export const MasterLedger: React.FC<MasterLedgerProps> = ({
  documents,
  total,
  page,
  limit,
  totalPages,
  stats,
  isLoading,
  searchQuery,
  setSearchQuery,
  selectedDocType,
  setSelectedDocType,
  selectedStatus,
  setSelectedStatus,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onPageChange,
  onViewDoc,
  onShareDoc,
  onDeleteDoc,
  onQuickStatusChange,
  onRefresh,
  onResetFiltersAndRefresh,
  onPurgeSampleData,
  onOpenNewDocModal,
  userRole,
  highlightedDocId,
  sortBy = 'id',
  setSortBy,
  onLimitChange,
}) => {
  const getDocTypeBadge = (type: DocumentType) => {
    switch (type) {
      case 'INWARD':
        return {
          label: 'INWARD',
          code: 'IN',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: Inbox,
        };
      case 'OUTWARD':
        return {
          label: 'OUTWARD',
          code: 'OUT',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: Send,
        };
      case 'TENDER':
        return {
          label: 'TENDER',
          code: 'TNDR',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: Gavel,
        };
      case 'BILL':
        return {
          label: 'BILL',
          code: 'BILL',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: Receipt,
        };
      case 'INTERNAL':
        return {
          label: 'INTERNAL',
          code: 'INT',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: FileCode,
        };
      default:
        return {
          label: type,
          code: type,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: FileText,
        };
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'RECORDED':
        return {
          label: 'RECORDED',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: Clock,
        };
      case 'PENDING_ACTION':
        return {
          label: 'PENDING ACTION',
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: AlertCircle,
        };
      case 'CLOSED':
        return {
          label: 'CLOSED',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: CheckCircle2,
        };
      case 'ARCHIVED':
        return {
          label: 'ARCHIVED',
          bg: 'bg-purple-100 text-purple-800 border-purple-300',
          icon: Archive,
        };
      default:
        return {
          label: status,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: Clock,
        };
    }
  };

  const handleResetFilters = () => {
    if (onResetFiltersAndRefresh) {
      onResetFiltersAndRefresh();
    } else {
      setSearchQuery('');
      setSelectedDocType('ALL');
      setSelectedStatus('ALL');
      setStartDate('');
      setEndDate('');
      onRefresh();
    }
  };

  return (
    <div id="master-ledger-view" className="space-y-4">
      {/* KPI Stat Cards Bar */}
      <div id="ledger-stats-cards" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Registered Documents */}
        <button
          type="button"
          id="stat-card-total-docs"
          onClick={handleResetFilters}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedDocType === 'ALL' && selectedStatus === 'ALL' && !searchQuery
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
          title="Click to view all registered documents in the ledger"
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${selectedDocType === 'ALL' && selectedStatus === 'ALL' && !searchQuery ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Records
            </span>
            <span className={`p-1.5 rounded-lg ${selectedDocType === 'ALL' && selectedStatus === 'ALL' && !searchQuery ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline">
            <span className={`text-xl font-bold font-mono ${selectedDocType === 'ALL' && selectedStatus === 'ALL' && !searchQuery ? 'text-white' : 'text-slate-900'}`}>
              {stats?.totalDocs ?? total ?? 0}
            </span>
            <span className={`ml-2 text-[11px] ${selectedDocType === 'ALL' && selectedStatus === 'ALL' && !searchQuery ? 'text-slate-400' : 'text-slate-400'}`}>
              all types
            </span>
          </div>
        </button>

        {/* Inward Documents */}
        <button
          type="button"
          id="stat-card-inward"
          onClick={() => setSelectedDocType(selectedDocType === 'INWARD' ? 'ALL' : 'INWARD')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedDocType === 'INWARD'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
          title="Click to filter by Inward scans"
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${selectedDocType === 'INWARD' ? 'text-blue-100' : 'text-slate-500'}`}>
              Inward Scans
            </span>
            <span className={`p-1.5 rounded-lg ${selectedDocType === 'INWARD' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-600'}`}>
              <Inbox className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline">
            <span className={`text-xl font-bold font-mono ${selectedDocType === 'INWARD' ? 'text-white' : 'text-slate-900'}`}>
              {stats?.inwardCount ?? 0}
            </span>
            <span className={`ml-2 text-[11px] ${selectedDocType === 'INWARD' ? 'text-blue-200' : 'text-slate-400'}`}>
              /storage/IN
            </span>
          </div>
        </button>

        {/* Outward Documents */}
        <button
          type="button"
          id="stat-card-outward"
          onClick={() => setSelectedDocType(selectedDocType === 'OUTWARD' ? 'ALL' : 'OUTWARD')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedDocType === 'OUTWARD'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
          title="Click to filter by Outward dispatches"
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${selectedDocType === 'OUTWARD' ? 'text-emerald-100' : 'text-slate-500'}`}>
              Outward
            </span>
            <span className={`p-1.5 rounded-lg ${selectedDocType === 'OUTWARD' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
              <Send className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline">
            <span className={`text-xl font-bold font-mono ${selectedDocType === 'OUTWARD' ? 'text-white' : 'text-slate-900'}`}>
              {stats?.outwardCount ?? 0}
            </span>
            <span className={`ml-2 text-[11px] ${selectedDocType === 'OUTWARD' ? 'text-emerald-200' : 'text-slate-400'}`}>
              /storage/OUT
            </span>
          </div>
        </button>

        {/* Tenders & Contracts */}
        <button
          type="button"
          id="stat-card-tender"
          onClick={() => setSelectedDocType(selectedDocType === 'TENDER' ? 'ALL' : 'TENDER')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedDocType === 'TENDER'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
          title="Click to filter by Tenders & Work Orders"
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${selectedDocType === 'TENDER' ? 'text-amber-100' : 'text-slate-500'}`}>
              Work Orders
            </span>
            <span className={`p-1.5 rounded-lg ${selectedDocType === 'TENDER' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-600'}`}>
              <Gavel className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline">
            <span className={`text-xl font-bold font-mono ${selectedDocType === 'TENDER' ? 'text-white' : 'text-slate-900'}`}>
              {stats?.tenderCount ?? 0}
            </span>
            <span className={`ml-2 text-[11px] ${selectedDocType === 'TENDER' ? 'text-amber-200' : 'text-slate-400'}`}>
              Tenders
            </span>
          </div>
        </button>

        {/* Bills & Invoices */}
        <button
          type="button"
          id="stat-card-bill"
          onClick={() => setSelectedDocType(selectedDocType === 'BILL' ? 'ALL' : 'BILL')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedDocType === 'BILL'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
          title="Click to filter by Bills & Invoices"
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${selectedDocType === 'BILL' ? 'text-indigo-100' : 'text-slate-500'}`}>
              Bills & Claims
            </span>
            <span className={`p-1.5 rounded-lg ${selectedDocType === 'BILL' ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline">
            <span className={`text-xl font-bold font-mono ${selectedDocType === 'BILL' ? 'text-white' : 'text-slate-900'}`}>
              {stats?.billCount ?? 0}
            </span>
            <span className={`ml-2 text-[11px] ${selectedDocType === 'BILL' ? 'text-indigo-200' : 'text-slate-400'}`}>
              RA Bills
            </span>
          </div>
        </button>

        {/* Internal Memos / Notes */}
        <button
          type="button"
          id="stat-card-internal"
          onClick={() => setSelectedDocType(selectedDocType === 'INTERNAL' ? 'ALL' : 'INTERNAL')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedDocType === 'INTERNAL'
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
          title="Click to filter by Internal notes and memos"
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${selectedDocType === 'INTERNAL' ? 'text-purple-100' : 'text-slate-500'}`}>
              Internal Memos
            </span>
            <span className={`p-1.5 rounded-lg ${selectedDocType === 'INTERNAL' ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-600'}`}>
              <FileCode className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline">
            <span className={`text-xl font-bold font-mono ${selectedDocType === 'INTERNAL' ? 'text-white' : 'text-slate-900'}`}>
              {stats?.internalCount ?? 0}
            </span>
            <span className={`ml-2 text-[11px] ${selectedDocType === 'INTERNAL' ? 'text-purple-200' : 'text-slate-400'}`}>
              Office Memos
            </span>
          </div>
        </button>
      </div>

      {/* Real-time Query & Filter Controller */}
      <div id="query-filter-container" className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="search-registry-input"
              type="text"
              placeholder="Search by Reference No, Party, Subject, Site Name, Tender ID, C.A. No, or Serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Date range pickers */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <span className="text-slate-500 text-[11px]">From:</span>
              <input
                id="filter-date-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-slate-500 text-[11px]">To:</span>
              <input
                id="filter-date-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {setSortBy && (
              <div className="flex items-center space-x-1 text-xs">
                <span className="text-slate-500 text-[11px]">Sort:</span>
                <select
                  id="select-sort-order"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="id">Latest Registered (Newest First)</option>
                  <option value="date_recorded">Document Date</option>
                  <option value="serial_no">Serial Number</option>
                  <option value="party_name">Party / Organization</option>
                </select>
              </div>
            )}

            {onPurgeSampleData && (
              <button
                id="btn-purge-samples"
                onClick={onPurgeSampleData}
                className="px-2.5 py-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                title="Purge default sample / demo records to start with a clean registry"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Purge Samples</span>
              </button>
            )}

            <button
              id="btn-refresh-ledger"
              onClick={onRefresh}
              className="px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-center space-x-1"
              title="Refresh ledger data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {onOpenNewDocModal && (
              <button
                id="btn-ledger-record-doc"
                onClick={onOpenNewDocModal}
                className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 font-semibold shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Record Document</span>
              </button>
            )}

            {(searchQuery || selectedDocType !== 'ALL' || selectedStatus !== 'ALL' || startDate || endDate) && (
              <button
                id="btn-reset-filters"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-xs">
          {/* Doc Type Pills */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Type:</span>
            {['ALL', 'INWARD', 'OUTWARD', 'TENDER', 'BILL', 'INTERNAL'].map((type) => (
              <button
                key={type}
                id={`filter-type-${type.toLowerCase()}`}
                onClick={() => setSelectedDocType(type)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  selectedDocType === type
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type === 'ALL' ? 'All Types' : type}
              </button>
            ))}
          </div>

          {/* Status Pills */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Status:</span>
            {[
              { id: 'ALL', label: 'All Status' },
              { id: 'RECORDED', label: 'Recorded' },
              { id: 'PENDING_ACTION', label: 'Pending Action' },
              { id: 'CLOSED', label: 'Closed' },
              { id: 'ARCHIVED', label: 'Archived' },
            ].map((st) => (
              <button
                key={st.id}
                id={`filter-status-${st.id.toLowerCase()}`}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  selectedStatus === st.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Filter Notice */}
      {(searchQuery.trim() !== '' || selectedDocType !== 'ALL' || selectedStatus !== 'ALL' || startDate !== '' || endDate !== '') && (
        <div className="bg-blue-50/90 border border-blue-200 rounded-xl px-4 py-2 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-2xs">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Filtered View Active:</strong> Showing {total} document{total === 1 ? '' : 's'}. Clear filters to view all records in the registry.
            </span>
          </div>
          <button
            onClick={handleResetFilters}
            className="font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer text-left sm:text-right"
          >
            Clear Filters & View All
          </button>
        </div>
      )}

      {/* Master Document Table */}
      <div id="master-documents-table-wrapper" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading && documents.length > 0 && (
          <div className="bg-blue-50/90 border-b border-blue-200 px-4 py-1.5 text-xs text-blue-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Updating ledger records with latest data...</span>
            </div>
            <span className="text-[11px] font-mono text-blue-600 font-semibold">Live WAL Sync</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table id="master-registry-table" className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-3 w-40">Running Serial No</th>
                <th className="py-3 px-3 w-28">Type</th>
                <th className="py-3 px-3 w-44">Reference & Date</th>
                <th className="py-3 px-3 w-52">Party / Organization</th>
                <th className="py-3 px-3">Subject / Synopsis</th>
                <th className="py-3 px-3 w-36">Document Scan</th>
                <th className="py-3 px-3 w-36">Action Status</th>
                <th className="py-3 px-3 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && documents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <p className="text-xs font-medium text-slate-600">Querying registry database...</p>
                    </div>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className="w-8 h-8 text-slate-300 mb-1" />
                      <p className="font-semibold text-sm text-slate-700">No documents found matching criteria</p>
                      <p className="text-xs text-slate-400">Try adjusting your search query, type filters, or date range.</p>
                      <div className="flex items-center space-x-2 mt-2">
                        {onOpenNewDocModal && (
                          <button
                            id="btn-empty-state-record-doc"
                            onClick={onOpenNewDocModal}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer flex items-center space-x-1"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Record New Document</span>
                          </button>
                        )}
                        <button
                          onClick={handleResetFilters}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 cursor-pointer"
                        >
                          Clear All Filters & Show All
                        </button>
                        {onResetFiltersAndRefresh && (
                          <button
                            onClick={onResetFiltersAndRefresh}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 cursor-pointer flex items-center space-x-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Force Reload Ledger</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const typeBadge = getDocTypeBadge(doc.doc_type);
                  const statusBadge = getStatusBadge(doc.status);
                  const TypeIcon = typeBadge.icon;
                  const StatusIcon = statusBadge.icon;
                  const isHighlighted = highlightedDocId === doc.id;

                  return (
                    <tr
                      key={doc.id}
                      id={`document-row-${doc.id}`}
                      className={`transition-colors group ${
                        isHighlighted
                          ? 'bg-emerald-50/90 border-l-4 border-l-emerald-600 ring-1 ring-emerald-500/20'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Running Serial Number */}
                      <td className="py-3 px-3 align-top font-mono font-bold text-slate-900 text-xs">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <button
                            onClick={() => onViewDoc(doc)}
                            className="hover:text-blue-600 hover:underline text-left cursor-pointer flex items-center space-x-1"
                            title="Click to view details & audit trail"
                          >
                            <span>{doc.serial_no}</span>
                          </button>
                          {isHighlighted && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white tracking-wide uppercase shadow-2xs">
                              Just Registered
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3 align-top">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${typeBadge.bg}`}
                        >
                          <TypeIcon className="w-3 h-3" />
                          <span>{typeBadge.code}</span>
                        </span>
                      </td>

                      {/* Reference No & Date */}
                      <td className="py-3 px-3 align-top">
                        <div className="font-medium text-slate-800 font-mono text-[11px]">
                          {doc.ref_no}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Rec: {doc.date_recorded}
                        </div>
                      </td>

                      {/* Party / Organization */}
                      <td className="py-3 px-3 align-top">
                        <div className="font-medium text-slate-800 line-clamp-2" title={doc.party_name}>
                          {doc.party_name}
                        </div>
                      </td>

                      {/* Subject / Synopsis */}
                      <td className="py-3 px-3 align-top">
                        <p className="text-slate-600 line-clamp-2 leading-relaxed" title={doc.subject}>
                          {doc.subject}
                        </p>
                        {(doc.site_name || doc.tender_id || doc.ca_number || doc.total_work_order != null) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                            {doc.site_name && (
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                                <MapPin className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                <span className="truncate max-w-[130px]" title={doc.site_name}>
                                  {doc.site_name}
                                </span>
                              </span>
                            )}
                            {doc.tender_id && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono"
                                title={`Tender ID: ${doc.tender_id}`}
                              >
                                Tender: {doc.tender_id}
                              </span>
                            )}
                            {doc.ca_number && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono"
                                title={`C.A. No: ${doc.ca_number}`}
                              >
                                CA: {doc.ca_number}
                              </span>
                            )}
                            {doc.total_work_order != null && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono font-semibold"
                                title={`Total Work Order: ₹${Number(doc.total_work_order).toLocaleString()}`}
                              >
                                ₹{Number(doc.total_work_order).toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Document File / Scan Preview Badge */}
                      <td className="py-3 px-3 align-top">
                        {doc.file_path ? (
                          <a
                            href={`/api/documents/${doc.id}/file`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors text-[11px]"
                            title={`Open attached ${doc.file_mime || 'file'} (${doc.file_size_kb || 0} KB)`}
                          >
                            <Paperclip className="w-3 h-3 text-slate-500" />
                            <span className="font-medium truncate max-w-[80px]">
                              {doc.file_mime?.includes('pdf') ? 'PDF Scan' : 'Image'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {doc.file_size_kb ? `${doc.file_size_kb}K` : ''}
                            </span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No Scan</span>
                        )}
                      </td>

                      {/* Status & Quick Transition */}
                      <td className="py-3 px-3 align-top">
                        {userRole === 'office_staff' ? (
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${statusBadge.bg}`}
                          >
                            <StatusIcon className="w-2.5 h-2.5" />
                            <span>{statusBadge.label}</span>
                          </span>
                        ) : (
                          <select
                            id={`status-dropdown-${doc.id}`}
                            value={doc.status}
                            onChange={(e) => onQuickStatusChange(doc.id, e.target.value as DocumentStatus)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer ${statusBadge.bg}`}
                            title="Update document status"
                          >
                            <option value="RECORDED">RECORDED</option>
                            <option value="PENDING_ACTION">PENDING ACTION</option>
                            <option value="CLOSED">CLOSED</option>
                            <option value="ARCHIVED">ARCHIVED</option>
                          </select>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 align-top text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            id={`view-doc-btn-${doc.id}`}
                            onClick={() => onViewDoc(doc)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="View document dossier and audit trail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`share-doc-btn-${doc.id}`}
                            onClick={() => onShareDoc(doc)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Share document citation and permalink"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`delete-doc-btn-${doc.id}`}
                            onClick={() => onDeleteDoc(doc.id, doc.serial_no, doc)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete document record (Admin password protected)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div id="master-table-pagination" className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3 text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{documents.length}</span> of{' '}
              <span className="font-semibold text-slate-800">{total}</span> total documents
            </div>
            {onLimitChange && (
              <div className="flex items-center space-x-1.5 pl-3 border-l border-slate-300">
                <span className="text-slate-500">Rows per page:</span>
                <select
                  id="select-rows-per-page"
                  value={limit}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-prev-page"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <span className="text-slate-600 px-1 font-mono">
              Page {page} of {totalPages || 1}
            </span>

            <button
              id="btn-next-page"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
