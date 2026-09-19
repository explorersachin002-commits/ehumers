import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { MasterLedger } from './components/MasterLedger';
import { NewDocumentModal } from './components/NewDocumentModal';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { ShareDocumentModal } from './components/ShareDocumentModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { PurgeSampleModal } from './components/PurgeSampleModal';
import { PrintSummaryView } from './components/PrintSummaryView';
import { DirectoryStorageView } from './components/DirectoryStorageView';
import { SequenceInspector } from './components/SequenceInspector';
import { AuditTrailView } from './components/AuditTrailView';
import { HumersLogo } from './components/HumersLogo';
import { RegistryDocument, DocumentStats, UserRole, DocumentStatus } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'ledger' | 'storage' | 'sequences' | 'audit' | 'print'>('ledger');
  const [userRole, setUserRole] = useState<UserRole>('office_staff');

  // Documents state
  const [documents, setDocuments] = useState<RegistryDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [highlightedDocId, setHighlightedDocId] = useState<number | null>(null);
  const highlightedDocIdRef = useRef<number | null>(null);
  const lastCreatedDocRef = useRef<RegistryDocument | null>(null);
  const latestRequestIdRef = useRef<number>(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [selectedDocForDetail, setSelectedDocForDetail] = useState<RegistryDocument | null>(null);
  const [selectedDocForShare, setSelectedDocForShare] = useState<RegistryDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<RegistryDocument | { id: number; serial_no: string; party_name?: string; subject?: string; doc_type?: string } | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isPurgeSampleOpen, setIsPurgeSampleOpen] = useState(false);

  // Admin Privacy Password Security State
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('humers_admin_token');
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminAuthReason, setAdminAuthReason] = useState<string>('unlock the System Administrator tier');
  const [pendingAdminAction, setPendingAdminAction] = useState<((token: string) => void) | null>(null);

  // Toast / Status banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Listen for shared URL permalinks (e.g. ?docId=123)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const docIdParam = params.get('docId');
      if (docIdParam) {
        const docId = parseInt(docIdParam, 10);
        if (!isNaN(docId) && docId > 0) {
          fetch(`/api/documents/${docId}`)
            .then((res) => {
              if (res.ok) return res.json();
              return null;
            })
            .then((data) => {
              if (data && data.id) {
                setSelectedDocForDetail(data);
                showToast(`Opened shared document ${data.serial_no}`);
              }
            })
            .catch((e) => console.error('Error fetching shared document permalink:', e));
        }
      }
    } catch (_e) {}
  }, []);

  // Validate active Admin session token against backend on mount
  useEffect(() => {
    if (adminToken) {
      fetch('/api/admin/status', {
        headers: {
          'x-admin-token': adminToken,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated) {
            setIsAdminAuthenticated(true);
          } else {
            setIsAdminAuthenticated(false);
            setAdminToken(null);
            localStorage.removeItem('humers_admin_token');
            if (userRole === 'admin') {
              setUserRole('office_staff');
            }
          }
        })
        .catch(() => {
          setIsAdminAuthenticated(false);
        });
    } else {
      setIsAdminAuthenticated(false);
      if (userRole === 'admin') {
        setUserRole('office_staff');
      }
    }
  }, [adminToken]);

  const handleAdminAuthSuccess = (token: string) => {
    setAdminToken(token);
    setIsAdminAuthenticated(true);
    localStorage.setItem('humers_admin_token', token);
    setUserRole('admin');
    showToast('System Administrator tier unlocked');

    if (pendingAdminAction) {
      const action = pendingAdminAction;
      setPendingAdminAction(null);
      action(token);
    }
  };

  const handleLockAdmin = async () => {
    if (adminToken) {
      try {
        await fetch('/api/admin/lock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken,
          },
          body: JSON.stringify({ token: adminToken }),
        });
      } catch (_ignored) {}
    }
    setAdminToken(null);
    setIsAdminAuthenticated(false);
    localStorage.removeItem('humers_admin_token');
    setUserRole('office_staff');
    showToast('System Administrator session locked');
  };

  const fetchDocuments = useCallback(
    async (targetPage = page, options?: { clearFilters?: boolean; sortByCol?: string; targetLimit?: number }) => {
      setIsLoading(true);
      const requestId = ++latestRequestIdRef.current;
      try {
        const params = new URLSearchParams();
        params.set('page', String(targetPage));
        const effectiveLimit = options?.targetLimit || limit;
        params.set('limit', String(effectiveLimit));
        params.set('_t', String(Date.now())); // Cache-buster to bypass any intermediate proxy or browser cache

        const effectiveSearch = options?.clearFilters ? '' : searchQuery.trim();
        const effectiveDocType = options?.clearFilters ? 'ALL' : selectedDocType;
        const effectiveStatus = options?.clearFilters ? 'ALL' : selectedStatus;
        const effectiveStart = options?.clearFilters ? '' : startDate;
        const effectiveEnd = options?.clearFilters ? '' : endDate;
        const effectiveSort = options?.sortByCol || sortBy;
        const effectiveSortOrder = options?.clearFilters ? 'DESC' : sortOrder;

        if (effectiveSearch) params.set('q', effectiveSearch);
        if (effectiveDocType !== 'ALL') params.set('doc_type', effectiveDocType);
        if (effectiveStatus !== 'ALL') params.set('status', effectiveStatus);
        if (effectiveStart) params.set('startDate', effectiveStart);
        if (effectiveEnd) params.set('endDate', effectiveEnd);

        params.set('sortBy', effectiveSort);
        params.set('sortOrder', effectiveSortOrder);

        const res = await fetch(`/api/documents?${params.toString()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        const data = await res.json();

        // Discard response if a newer request was dispatched in the meantime
        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        if (data.documents) {
          const targetHighlight = highlightedDocIdRef.current || highlightedDocId;
          const recentDoc = lastCreatedDocRef.current;
          setDocuments((prev) => {
            // Guard: If a newly registered document is active, pin it to the top of the ledger
            // so it is immediately visible regardless of previous sort, page, or filters
            if (targetHighlight) {
              const inIncoming = data.documents.find((d: RegistryDocument) => d.id === targetHighlight);
              if (inIncoming) {
                return [inIncoming, ...data.documents.filter((d: RegistryDocument) => d.id !== targetHighlight)];
              }
              const justAdded = (recentDoc && recentDoc.id === targetHighlight ? recentDoc : null) || prev.find((d) => d.id === targetHighlight);
              if (justAdded) {
                return [justAdded, ...data.documents.filter((d: RegistryDocument) => d.id !== targetHighlight)];
              }
            }
            return data.documents;
          });
          setTotal((prevTotal) => {
            if (targetHighlight && !data.documents.some((d: RegistryDocument) => d.id === targetHighlight)) {
              return Math.max(data.total + 1, prevTotal);
            }
            return data.total;
          });
          setPage(data.page);
          setTotalPages(data.totalPages);
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Failed to fetch documents:', err);
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [page, limit, searchQuery, selectedDocType, selectedStatus, startDate, endDate, sortBy, sortOrder, highlightedDocId]
  );

  useEffect(() => {
    fetchDocuments(1);
  }, [searchQuery, selectedDocType, selectedStatus, startDate, endDate, sortBy, sortOrder, refreshKey]);

  const handleDocumentCreated = (newDoc?: RegistryDocument) => {
    // 1. Immediately switch to the Master Ledger view
    setCurrentTab('ledger');

    // 2. Clear any active filters so newly registered document is guaranteed visible
    setSearchQuery('');
    setSelectedDocType('ALL');
    setSelectedStatus('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('id');
    setSortOrder('DESC');
    setPage(1);

    if (newDoc) {
      highlightedDocIdRef.current = newDoc.id;
      lastCreatedDocRef.current = newDoc;
      setHighlightedDocId(newDoc.id);

      // 3. Immediately prepend the document into local state for 0ms instantaneous feedback
      setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
      setTotal((prev) => Math.max(prev + 1, 1));

      showToast(`Document ${newDoc.serial_no} registered & visible in Master Ledger`);

      // Keep highlight badge active for 15s
      setTimeout(() => {
        if (highlightedDocIdRef.current === newDoc.id) {
          highlightedDocIdRef.current = null;
        }
        setHighlightedDocId((curr) => (curr === newDoc.id ? null : curr));
      }, 15000);
    } else {
      showToast('New document successfully recorded with sequential number');
    }

    // 4. Force immediate server fetch with clearFilters to sync total counts & stats
    fetchDocuments(1, { clearFilters: true, sortByCol: 'id' });
  };

  const handleResetFiltersAndRefresh = () => {
    setSearchQuery('');
    setSelectedDocType('ALL');
    setSelectedStatus('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('id');
    setSortOrder('DESC');
    setPage(1);
    setRefreshKey((k) => k + 1);
    showToast('Ledger refreshed & filters reset to show all records');
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedDocType !== 'ALL') params.set('doc_type', selectedDocType);
    if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('user', `${userRole}_user`);

    window.location.href = `/api/export?${params.toString()}`;
    showToast('Exporting official CSV ledger file with applied filters...');
  };

  const handleQuickStatusChange = async (id: number, newStatus: DocumentStatus) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
          'x-user-identifier': `${userRole}_officer`,
        },
        body: JSON.stringify({
          status: newStatus,
          user_identifier: `${userRole}_officer`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update status');
      }

      showToast(`Record status updated to ${newStatus}`);
      fetchDocuments(page);
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleDeleteDoc = (
    id: number,
    serialNo: string,
    doc?: RegistryDocument
  ) => {
    const targetDoc =
      doc ||
      documents.find((d) => d.id === id) || {
        id,
        serial_no: serialNo,
      };
    setDocToDelete(targetDoc);
    setIsConfirmDeleteOpen(true);
  };

  return (
    <div id="office-registry-app" className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="toast-notification-banner"
          className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Navigation & Role Switcher */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        userRole={userRole}
        setUserRole={(role) => {
          setUserRole(role);
          showToast(`Switched active tier to: ${role}`);
        }}
        isAdminAuthenticated={isAdminAuthenticated}
        onRequestAdminAuth={() => {
          setAdminAuthReason('unlock the System Administrator tier');
          setPendingAdminAction(null);
          setIsAdminAuthModalOpen(true);
        }}
        onLockAdmin={handleLockAdmin}
        onOpenNewDocModal={() => setIsNewDocModalOpen(true)}
        onExportCsv={handleExportCsv}
        totalDocs={total}
      />

      {/* Primary Workspace View Body */}
      <main id="main-content-viewport" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {currentTab === 'ledger' && (
          <MasterLedger
            documents={documents}
            total={total}
            page={page}
            limit={limit}
            totalPages={totalPages}
            stats={stats}
            isLoading={isLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedDocType={selectedDocType}
            setSelectedDocType={setSelectedDocType}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            onPageChange={(p) => fetchDocuments(p)}
            onViewDoc={(doc) => setSelectedDocForDetail(doc)}
            onShareDoc={(doc) => setSelectedDocForShare(doc)}
            onDeleteDoc={handleDeleteDoc}
            onQuickStatusChange={handleQuickStatusChange}
            onRefresh={() => fetchDocuments(page)}
            onResetFiltersAndRefresh={handleResetFiltersAndRefresh}
            onPurgeSampleData={() => setIsPurgeSampleOpen(true)}
            onOpenNewDocModal={() => setIsNewDocModalOpen(true)}
            userRole={userRole}
            highlightedDocId={highlightedDocId}
            sortBy={sortBy}
            setSortBy={(col) => setSortBy(col)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              fetchDocuments(1, { targetLimit: newLimit });
            }}
          />
        )}

        {currentTab === 'storage' && <DirectoryStorageView />}

        {currentTab === 'sequences' && <SequenceInspector />}

        {currentTab === 'audit' && <AuditTrailView />}

        {currentTab === 'print' && (
          <PrintSummaryView
            documents={documents}
            userRole={userRole}
            onExportCsv={handleExportCsv}
          />
        )}
      </main>

      {/* Footer */}
      <footer id="app-footer" className="no-print bg-white border-t border-slate-200 py-3 mt-auto text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <HumersLogo size="sm" />
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-slate-700">Document Management & Central Registry</span>
            <span className="text-slate-300">|</span>
            <span>SQLite WAL</span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-emerald-600 font-medium">Atomic Serials</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Partitioned Storage: <code className="font-mono">/storage/uploads/YYYY/MM/</code> • Magic-Byte MIME Enforcement
          </div>
        </div>
      </footer>

      {/* New Document Registration Modal */}
      <NewDocumentModal
        isOpen={isNewDocModalOpen}
        onClose={() => setIsNewDocModalOpen(false)}
        onDocumentCreated={handleDocumentCreated}
        userRole={userRole}
      />

      {/* Document Detail & Audit History Modal */}
      <DocumentDetailModal
        document={selectedDocForDetail}
        isOpen={!!selectedDocForDetail}
        onClose={() => setSelectedDocForDetail(null)}
        onStatusUpdated={() => fetchDocuments(page)}
        onShareDoc={(doc) => setSelectedDocForShare(doc)}
        onDeleteDoc={handleDeleteDoc}
        userRole={userRole}
      />

      {/* Document Share & Citation Modal */}
      <ShareDocumentModal
        document={selectedDocForShare}
        isOpen={!!selectedDocForShare}
        onClose={() => setSelectedDocForShare(null)}
        onShowToast={showToast}
      />

      {/* System Administrator Privacy Authentication Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => {
          setIsAdminAuthModalOpen(false);
          setPendingAdminAction(null);
        }}
        onSuccess={handleAdminAuthSuccess}
        actionReason={adminAuthReason}
      />

      {/* Confirmation & Authorization Modal for Deleting Single Documents */}
      <ConfirmDeleteModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => {
          setIsConfirmDeleteOpen(false);
          setDocToDelete(null);
        }}
        document={docToDelete}
        isAdmin={isAdminAuthenticated}
        adminToken={adminToken}
        onAdminUnlocked={(token) => {
          setIsAdminAuthenticated(true);
          setAdminToken(token);
          localStorage.setItem('humers_admin_token', token);
          setUserRole('admin');
        }}
        onDeleted={(serialNo) => {
          showToast(`Document ${serialNo} permanently deleted from registry.`);
          if (selectedDocForDetail?.id === docToDelete?.id) {
            setSelectedDocForDetail(null);
          }
          if (selectedDocForShare?.id === docToDelete?.id) {
            setSelectedDocForShare(null);
          }
          fetchDocuments(page);
        }}
      />

      {/* Admin Purge Sample / Seeded Demo Records Modal */}
      <PurgeSampleModal
        isOpen={isPurgeSampleOpen}
        onClose={() => setIsPurgeSampleOpen(false)}
        isAdmin={isAdminAuthenticated}
        adminToken={adminToken}
        onAdminUnlocked={(token) => {
          setIsAdminAuthenticated(true);
          setAdminToken(token);
          localStorage.setItem('humers_admin_token', token);
          setUserRole('admin');
        }}
        onPurged={(count) => {
          showToast(`Purged ${count} sample demonstration records from registry.`);
          fetchDocuments(1);
        }}
      />
    </div>
  );
}
