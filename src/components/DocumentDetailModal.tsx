import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Clock,
  User,
  ShieldCheck,
  Download,
  ExternalLink,
  Calendar,
  Building,
  Tag,
  Hash,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Briefcase,
  MapPin,
  Landmark,
  Edit3,
  Save,
  RotateCcw,
  Check,
  Percent,
  Share2,
  Trash2,
} from 'lucide-react';
import { RegistryDocument, DocumentStatus, AuditLog, UserRole } from '../types';

interface DocumentDetailModalProps {
  document: RegistryDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated: () => void;
  onShareDoc: (doc: RegistryDocument) => void;
  onDeleteDoc: (id: number, serialNo: string, doc?: RegistryDocument) => void;
  userRole: UserRole;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  isOpen,
  onClose,
  onStatusUpdated,
  onShareDoc,
  onDeleteDoc,
  userRole,
}) => {
  const [docData, setDocData] = useState<RegistryDocument | null>(document);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<DocumentStatus>('RECORDED');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Work Order Details Edit Mode State
  const [isEditingWork, setIsEditingWork] = useState(false);
  const [isSavingWork, setIsSavingWork] = useState(false);
  const [editSiteName, setEditSiteName] = useState('');
  const [editTenderId, setEditTenderId] = useState('');
  const [editCaNumber, setEditCaNumber] = useState('');
  const [editTotalWorkOrder, setEditTotalWorkOrder] = useState('');
  const [editAmountReceived, setEditAmountReceived] = useState('');
  const [editFdrAmount, setEditFdrAmount] = useState('');
  const [editFdrDate, setEditFdrDate] = useState('');
  const [editFdrMaturityDate, setEditFdrMaturityDate] = useState('');
  const [editFdrMaturityAmount, setEditFdrMaturityAmount] = useState('');
  const [editCommencementDate, setEditCommencementDate] = useState('');
  const [editCompletionDate, setEditCompletionDate] = useState('');
  const [editActualCompletionDate, setEditActualCompletionDate] = useState('');

  const syncEditFields = (doc: RegistryDocument) => {
    setEditSiteName(doc.site_name || '');
    setEditTenderId(doc.tender_id || '');
    setEditCaNumber(doc.ca_number || '');
    setEditTotalWorkOrder(doc.total_work_order != null ? String(doc.total_work_order) : '');
    setEditAmountReceived(doc.amount_received != null ? String(doc.amount_received) : '');
    setEditFdrAmount(doc.fdr_amount != null ? String(doc.fdr_amount) : '');
    setEditFdrDate(doc.fdr_date || '');
    setEditFdrMaturityDate(doc.fdr_maturity_date || '');
    setEditFdrMaturityAmount(doc.fdr_maturity_amount != null ? String(doc.fdr_maturity_amount) : '');
    setEditCommencementDate(doc.commencement_date || '');
    setEditCompletionDate(doc.completion_date || '');
    setEditActualCompletionDate(doc.actual_completion_date || '');
  };

  useEffect(() => {
    if (!document || !isOpen) return;

    setDocData(document);
    setCurrentStatus(document.status);
    setStatusMessage(null);
    setIsEditingWork(false);
    syncEditFields(document);
    setIsLoadingAudit(true);

    fetch(`/api/documents/${document.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.document) {
          setDocData(data.document);
          syncEditFields(data.document);
        }
        if (data.auditLogs) {
          setAuditLogs(data.auditLogs);
        }
      })
      .catch((err) => console.error('Failed to load document audit logs:', err))
      .finally(() => setIsLoadingAudit(false));
  }, [document, isOpen]);

  if (!isOpen || !docData) return null;

  const handleStatusChange = async (newStatus: DocumentStatus) => {
    if (newStatus === docData.status) return;

    setIsUpdatingStatus(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/documents/${docData.id}`, {
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      setCurrentStatus(newStatus);
      setDocData((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setStatusMessage(`Status successfully updated to ${newStatus}. Audit log recorded.`);
      onStatusUpdated();

      // Refresh audit logs
      const auditRes = await fetch(`/api/documents/${docData.id}`);
      const auditData = await auditRes.json();
      if (auditData.auditLogs) setAuditLogs(auditData.auditLogs);
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveWorkDetails = async () => {
    setIsSavingWork(true);
    setStatusMessage(null);

    try {
      const payload: any = {
        user_identifier: `${userRole}_officer`,
        site_name: editSiteName.trim() || null,
        tender_id: editTenderId.trim() || null,
        ca_number: editCaNumber.trim() || null,
        total_work_order: editTotalWorkOrder ? parseFloat(editTotalWorkOrder) : null,
        amount_received: editAmountReceived ? parseFloat(editAmountReceived) : null,
        fdr_amount: editFdrAmount ? parseFloat(editFdrAmount) : null,
        fdr_date: editFdrDate || null,
        fdr_maturity_date: editFdrMaturityDate || null,
        fdr_maturity_amount: editFdrMaturityAmount ? parseFloat(editFdrMaturityAmount) : null,
        commencement_date: editCommencementDate || null,
        completion_date: editCompletionDate || null,
        actual_completion_date: editActualCompletionDate || null,
      };

      const res = await fetch(`/api/documents/${docData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
          'x-user-identifier': `${userRole}_officer`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update work details');

      if (data.document) {
        setDocData(data.document);
        syncEditFields(data.document);
      }
      setIsEditingWork(false);
      setStatusMessage('Work order & site execution details updated successfully.');
      onStatusUpdated();

      // Refresh audit logs
      const auditRes = await fetch(`/api/documents/${docData.id}`);
      const auditData = await auditRes.json();
      if (auditData.auditLogs) setAuditLogs(auditData.auditLogs);
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsSavingWork(false);
    }
  };

  const isPdf = docData.file_mime?.includes('pdf') || docData.file_path?.endsWith('.pdf');
  const isImage = docData.file_mime?.startsWith('image/') || /\.(png|jpg|jpeg)$/i.test(docData.file_path || '');

  // Calculate financials and progress
  const totalVal = docData.total_work_order != null ? Number(docData.total_work_order) : null;
  const recVal = docData.amount_received != null ? Number(docData.amount_received) : null;
  const balanceVal = totalVal != null && recVal != null ? totalVal - recVal : null;
  const percentReceived = totalVal && totalVal > 0 && recVal != null ? Math.min(100, Math.round((recVal / totalVal) * 100)) : null;

  const hasWorkDetails =
    docData.site_name ||
    docData.tender_id ||
    docData.ca_number ||
    docData.total_work_order != null ||
    docData.amount_received != null ||
    docData.fdr_amount != null ||
    docData.fdr_date ||
    docData.fdr_maturity_date ||
    docData.fdr_maturity_amount != null ||
    docData.commencement_date ||
    docData.completion_date ||
    docData.actual_completion_date;

  return (
    <div
      id="document-detail-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div
        id="document-detail-modal-card"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-slate-900 text-white shadow-2xs">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold font-mono text-slate-900">{docData.serial_no}</h2>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {docData.doc_type}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official Ledger Record ID #{docData.id} • Registered {docData.date_recorded}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              id="detail-modal-header-share-btn"
              type="button"
              onClick={() => onShareDoc(docData)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
              title="Share document record and citation"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Share</span>
            </button>

            <button
              id="detail-modal-header-delete-btn"
              type="button"
              onClick={() => {
                onDeleteDoc(docData.id, docData.serial_no, docData);
                onClose();
              }}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-rose-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
              title="Delete document record (Admin password protected)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete</span>
            </button>

            <button
              id="close-doc-detail-modal-btn"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-center space-x-2 text-xs ${
                statusMessage.startsWith('Error')
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Quick Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Reference / Department Letter No.
              </span>
              <p className="font-mono font-semibold text-slate-800 text-sm">{docData.ref_no}</p>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Date Recorded
              </span>
              <p className="font-semibold text-slate-800 text-sm flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>{docData.date_recorded}</span>
              </p>
            </div>

            <div className="md:col-span-2">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Party / Sender / Recipient Organization
              </span>
              <p className="font-semibold text-slate-900 text-sm flex items-center space-x-1.5">
                <Building className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{docData.party_name}</span>
              </p>
            </div>

            <div className="md:col-span-2">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Subject & Synopsis
              </span>
              <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 text-xs">
                {docData.subject}
              </p>
            </div>
          </div>

          {/* WORK ORDER & SITE EXECUTION SECTION */}
          <div className="border border-amber-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="px-4 py-3 bg-amber-50/80 border-b border-amber-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-amber-700" />
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    Work Order & Site Execution Details
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Site name, tender id, C.A. agreement, contract financials & FDR security
                  </span>
                </div>
              </div>

              <div>
                {!isEditingWork ? (
                  <button
                    type="button"
                    id="btn-edit-work-details"
                    onClick={() => {
                      syncEditFields(docData);
                      setIsEditingWork(true);
                    }}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-2xs transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{hasWorkDetails ? 'Edit Work Details' : 'Add Work / Site Info'}</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingWork(false)}
                      disabled={isSavingWork}
                      className="px-2.5 py-1 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      id="btn-save-work-details"
                      onClick={handleSaveWorkDetails}
                      disabled={isSavingWork}
                      className="inline-flex items-center space-x-1 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs cursor-pointer"
                    >
                      {isSavingWork ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Details</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Read-only view vs Edit form */}
            {isEditingWork ? (
              <div className="p-4 space-y-4 bg-amber-50/20">
                {/* 1. Identifiers */}
                <div>
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-2">
                    1. Site & Contract Agreement Identifiers
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Site Name</label>
                      <input
                        id="edit-input-site-name"
                        type="text"
                        placeholder="e.g. Sector 9 Elevated Corridor Site"
                        value={editSiteName}
                        onChange={(e) => setEditSiteName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Tender ID</label>
                      <input
                        id="edit-input-tender-id"
                        type="text"
                        placeholder="e.g. NIT-2026-PWD-092"
                        value={editTenderId}
                        onChange={(e) => setEditTenderId(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">C.A. Number</label>
                      <input
                        id="edit-input-ca-number"
                        type="text"
                        placeholder="e.g. CA/EE/PWD/2026/04"
                        value={editCaNumber}
                        onChange={(e) => setEditCaNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Financials */}
                <div className="pt-2 border-t border-amber-200/60">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-2">
                    2. Work Order Financials
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Total Work Order Value</label>
                      <input
                        id="edit-input-total-work-order"
                        type="number"
                        step="any"
                        placeholder="e.g. 5000000"
                        value={editTotalWorkOrder}
                        onChange={(e) => setEditTotalWorkOrder(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Amount Received to Date</label>
                      <input
                        id="edit-input-amount-received"
                        type="number"
                        step="any"
                        placeholder="e.g. 1750000"
                        value={editAmountReceived}
                        onChange={(e) => setEditAmountReceived(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. FDR */}
                <div className="pt-2 border-t border-amber-200/60">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-2">
                    3. FDR / Security Deposit
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">FDR Amount</label>
                      <input
                        id="edit-input-fdr-amount"
                        type="number"
                        step="any"
                        placeholder="e.g. 250000"
                        value={editFdrAmount}
                        onChange={(e) => setEditFdrAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Date of FDR</label>
                      <input
                        id="edit-input-fdr-date"
                        type="date"
                        value={editFdrDate}
                        onChange={(e) => setEditFdrDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Maturity Date of FDR</label>
                      <input
                        id="edit-input-fdr-maturity-date"
                        type="date"
                        value={editFdrMaturityDate}
                        onChange={(e) => setEditFdrMaturityDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Maturity Amount</label>
                      <input
                        id="edit-input-fdr-maturity-amount"
                        type="number"
                        step="any"
                        placeholder="e.g. 278000"
                        value={editFdrMaturityAmount}
                        onChange={(e) => setEditFdrMaturityAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Dates */}
                <div className="pt-2 border-t border-amber-200/60">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-2">
                    4. Execution Timeline & Milestones
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Date of Commencement</label>
                      <input
                        id="edit-input-commencement-date"
                        type="date"
                        value={editCommencementDate}
                        onChange={(e) => setEditCommencementDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Stipulated Completion</label>
                      <input
                        id="edit-input-completion-date"
                        type="date"
                        value={editCompletionDate}
                        onChange={(e) => setEditCompletionDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Actual Completion Date</label>
                      <input
                        id="edit-input-actual-completion-date"
                        type="date"
                        value={editActualCompletionDate}
                        onChange={(e) => setEditActualCompletionDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : !hasWorkDetails ? (
              <div className="p-5 text-center text-slate-500 bg-slate-50/50">
                <Briefcase className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="font-medium text-slate-700">No work order or site information recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click &ldquo;Add Work / Site Info&rdquo; above to attach site name, tender ID, contract financials, and FDR details.
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* 1. Project & Agreement Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-100">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                      Site Name
                    </span>
                    <p className="font-semibold text-slate-900 text-xs mt-0.5 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{docData.site_name || '—'}</span>
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Tender ID
                    </span>
                    <p className="font-mono font-semibold text-slate-900 text-xs mt-0.5 truncate">
                      {docData.tender_id || '—'}
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      C.A. Agreement No
                    </span>
                    <p className="font-mono font-semibold text-slate-900 text-xs mt-0.5 truncate">
                      {docData.ca_number || '—'}
                    </p>
                  </div>
                </div>

                {/* 2. Financials Progress */}
                {(totalVal != null || recVal != null) && (
                  <div className="p-3 bg-linear-to-r from-blue-50/50 to-emerald-50/30 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide flex items-center space-x-1">
                        <Landmark className="w-3.5 h-3.5 text-blue-600" />
                        <span>Contract Financial Status</span>
                      </span>
                      {percentReceived != null && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {percentReceived}% Disbursed / Received
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center mb-2">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Total Work Order</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {totalVal != null ? `₹${totalVal.toLocaleString()}` : '—'}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Amount Received</span>
                        <span className="font-mono font-bold text-emerald-700 text-xs">
                          {recVal != null ? `₹${recVal.toLocaleString()}` : '—'}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Pending Balance</span>
                        <span className="font-mono font-bold text-amber-700 text-xs">
                          {balanceVal != null ? `₹${balanceVal.toLocaleString()}` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {percentReceived != null && (
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentReceived}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 3. FDR / Security Deposit Details */}
                {(docData.fdr_amount != null || docData.fdr_date || docData.fdr_maturity_date || docData.fdr_maturity_amount != null) && (
                  <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/70">
                    <span className="font-bold text-amber-900 text-[11px] uppercase tracking-wide block mb-2 flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                      <span>FDR (Fixed Deposit Receipt / Security Deposit)</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-white p-2 rounded-lg border border-amber-100">
                        <span className="text-[10px] text-slate-400 block">FDR Amount</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {docData.fdr_amount != null ? `₹${Number(docData.fdr_amount).toLocaleString()}` : '—'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-amber-100">
                        <span className="text-[10px] text-slate-400 block">Date of FDR</span>
                        <span className="font-medium text-slate-800 text-xs">
                          {docData.fdr_date || '—'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-amber-100">
                        <span className="text-[10px] text-slate-400 block">Maturity Date</span>
                        <span className="font-medium text-slate-800 text-xs">
                          {docData.fdr_maturity_date || '—'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-amber-100">
                        <span className="text-[10px] text-slate-400 block">Maturity Amount</span>
                        <span className="font-mono font-bold text-emerald-700 text-xs">
                          {docData.fdr_maturity_amount != null ? `₹${Number(docData.fdr_maturity_amount).toLocaleString()}` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Execution Milestones */}
                {(docData.commencement_date || docData.completion_date || docData.actual_completion_date) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Commencement Date
                      </span>
                      <p className="font-medium text-slate-800 text-xs mt-0.5">
                        {docData.commencement_date || '—'}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Stipulated Completion
                      </span>
                      <p className="font-medium text-slate-800 text-xs mt-0.5">
                        {docData.completion_date || '—'}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Actual Completion Date
                      </span>
                      <p className="font-semibold text-emerald-700 text-xs mt-0.5">
                        {docData.actual_completion_date || 'In Progress'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status & Lifecycle Transition Bar */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-0.5">
                Registry Lifecycle Status
              </span>
              <span className="font-semibold text-slate-800 text-xs">
                Current: <span className="font-mono text-blue-700">{currentStatus}</span>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-500 text-xs font-medium">Transition to:</span>
              <div className="flex flex-wrap gap-1.5">
                {(['RECORDED', 'PENDING_ACTION', 'CLOSED', 'ARCHIVED'] as DocumentStatus[]).map((st) => (
                  <button
                    key={st}
                    id={`btn-transition-status-${st.toLowerCase()}`}
                    type="button"
                    disabled={isUpdatingStatus || currentStatus === st}
                    onClick={() => handleStatusChange(st)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      currentStatus === st
                        ? 'bg-slate-800 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Document Attachment & Storage Info */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
              <Paperclip className="w-3.5 h-3.5 text-blue-600" />
              <span>Attached Document Scan / File</span>
            </h3>

            {docData.file_path ? (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-semibold text-slate-800 text-xs">
                        {docData.file_path}
                      </span>
                      <span className="px-1.5 py-0.2 text-[10px] font-mono bg-slate-200 text-slate-700 rounded-sm">
                        {docData.file_mime}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Disk partition size: {docData.file_size_kb || 0} KB • MIME magic-bytes verified
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <a
                      id="view-attachment-direct-btn"
                      href={`/api/documents/${docData.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs inline-flex items-center space-x-1.5 shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Direct</span>
                    </a>

                    <a
                      id="download-attachment-btn"
                      href={`/api/documents/${docData.id}/file?download=1`}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs inline-flex items-center space-x-1.5 shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>

                {/* Inline Preview */}
                {isImage && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white p-2 flex justify-center max-h-64">
                    <img
                      src={`/api/documents/${docData.id}/file`}
                      alt="Attachment Preview"
                      className="max-h-60 max-w-full object-contain rounded-md"
                    />
                  </div>
                )}

                {isPdf && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <iframe
                      src={`/api/documents/${docData.id}/file#toolbar=0`}
                      title="PDF Preview"
                      className="w-full h-64 border-none"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-slate-400">
                No electronic scan or file attachment is linked to this registry record.
              </div>
            )}
          </div>

          {/* Document Specific Audit History */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Record Audit History & Chain of Custody</span>
            </h3>

            {isLoadingAudit ? (
              <p className="text-slate-400 italic">Loading audit trail records...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-slate-400 italic">No audit trail logged for this record yet.</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 bg-white flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {log.action}
                      </span>
                      <span className="text-slate-600 font-medium">By: {log.user_identifier}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <button
              id="footer-modal-share-btn"
              type="button"
              onClick={() => onShareDoc(docData)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Share Record</span>
            </button>
            <button
              id="footer-modal-delete-btn"
              type="button"
              onClick={() => {
                onDeleteDoc(docData.id, docData.serial_no, docData);
                onClose();
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete Record</span>
            </button>
          </div>

          <button
            id="close-doc-detail-footer-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
