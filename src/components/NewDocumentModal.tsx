import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileCheck,
  AlertCircle,
  Hash,
  Inbox,
  Send,
  Gavel,
  Receipt,
  FileCode,
  ShieldAlert,
  Calendar,
  Building,
  Tag,
  CheckCircle2,
  MapPin,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Clock,
  Landmark,
} from 'lucide-react';
import { DocumentType, DocumentStatus, UserRole, RegistryDocument } from '../types';

export interface DetailedRegistrationError {
  title: string;
  message: string;
  details?: string;
  step?: string;
  code?: string;
  status?: number;
  fieldErrors?: {
    refNo?: string;
    partyName?: string;
    subject?: string;
    dateRecorded?: string;
    file?: string;
  };
}

function extractCleanErrorMessage(responseText: string, status: number): { message: string; details?: string } {
  if (!responseText || !responseText.trim()) {
    return {
      message: `The server responded with HTTP status ${status} without error details.`,
    };
  }

  // Detect HTML responses (e.g. proxy, nginx, or framework error pages)
  if (responseText.trim().startsWith('<') || responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
    const titleMatch = responseText.match(/<title>(.*?)<\/title>/i);
    const h1Match = responseText.match(/<h1>(.*?)<\/h1>/i);
    const preMatch = responseText.match(/<pre>(.*?)<\/pre>/i);
    const extracted = (h1Match ? h1Match[1] : titleMatch ? titleMatch[1] : preMatch ? preMatch[1] : '').trim();

    if (status === 413) {
      return {
        message: 'Request payload or attached file exceeds server capacity limit (HTTP 413).',
        details: 'The attached file is too large for the HTTP gateway. Please select a scan or document under 25 MB.',
      };
    }
    if (status === 502 || status === 503 || status === 504) {
      return {
        message: `Registry gateway communication error (HTTP ${status}).`,
        details: extracted || 'The backend service took too long to respond or is temporarily restarting. Please retry.',
      };
    }
    return {
      message: `Web server error page received (HTTP ${status}).`,
      details: extracted || 'An internal server exception occurred prior to JSON serialization.',
    };
  }

  return {
    message: responseText.trim(),
  };
}

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentCreated: (newDoc?: any) => void;
  userRole: UserRole;
}

export const NewDocumentModal: React.FC<NewDocumentModalProps> = ({
  isOpen,
  onClose,
  onDocumentCreated,
  userRole,
}) => {
  const [docType, setDocType] = useState<DocumentType>('INWARD');
  const [refNo, setRefNo] = useState('');
  const [partyName, setPartyName] = useState('');
  const [subject, setSubject] = useState('');
  const [dateRecorded, setDateRecorded] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<DocumentStatus>('RECORDED');
  const [file, setFile] = useState<File | null>(null);
  const [previewSerial, setPreviewSerial] = useState<string>('REG/2026/IN/0000X');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailedError, setDetailedError] = useState<DetailedRegistrationError | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Work Order & Site Information Fields
  const [siteName, setSiteName] = useState('');
  const [tenderId, setTenderId] = useState('');
  const [caNumber, setCaNumber] = useState('');
  const [totalWorkOrder, setTotalWorkOrder] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [fdrAmount, setFdrAmount] = useState('');
  const [fdrDate, setFdrDate] = useState('');
  const [fdrMaturityDate, setFdrMaturityDate] = useState('');
  const [fdrMaturityAmount, setFdrMaturityAmount] = useState('');
  const [commencementDate, setCommencementDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [actualCompletionDate, setActualCompletionDate] = useState('');
  const [showWorkDetails, setShowWorkDetails] = useState(true);

  // Fetch sequence preview when docType changes
  useEffect(() => {
    if (!isOpen) return;
    fetch(`/api/documents/preview-sequence?doc_type=${docType}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.preview) setPreviewSerial(data.preview);
      })
      .catch((err) => console.error('Failed to preview sequence:', err));
    if (isOpen) {
      setDetailedError(null);
      setFileValidationError(null);
    }
  }, [docType, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileValidationError(null);
    if (!e.target.files || e.target.files.length === 0) {
      setFile(null);
      return;
    }

    const selected = e.target.files[0];
    const ext = selected.name.substring(selected.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.doc', '.xlsx', '.txt'];

    if (!allowed.includes(ext)) {
      setFileValidationError(`Invalid file type "${ext}". Permitted formats: PDF, PNG, JPG, DOCX, XLSX, TXT.`);
      setFile(null);
      return;
    }

    if (selected.size > 25 * 1024 * 1024) {
      setFileValidationError(
        `File size (${(selected.size / (1024 * 1024)).toFixed(2)} MB) exceeds the strict 25 MB ceiling limit.`
      );
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFileValidationError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0];
      const ext = dropped.name.substring(dropped.name.lastIndexOf('.')).toLowerCase();
      const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.doc', '.xlsx', '.txt'];

      if (!allowed.includes(ext)) {
        setFileValidationError(`Invalid file type "${ext}". Permitted formats: PDF, PNG, JPG, DOCX, XLSX, TXT.`);
        return;
      }

      if (dropped.size > 25 * 1024 * 1024) {
        setFileValidationError(
          `File size (${(dropped.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 25 MB ceiling limit.`
        );
        return;
      }

      setFile(dropped);
    }
  };

  const resetForm = () => {
    setRefNo('');
    setPartyName('');
    setSubject('');
    setFile(null);
    setSiteName('');
    setTenderId('');
    setCaNumber('');
    setTotalWorkOrder('');
    setAmountReceived('');
    setFdrAmount('');
    setFdrDate('');
    setFdrMaturityDate('');
    setFdrMaturityAmount('');
    setCommencementDate('');
    setCompletionDate('');
    setActualCompletionDate('');
    setDetailedError(null);
    setFileValidationError(null);
    setDateRecorded(new Date().toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailedError(null);
    setFileValidationError(null);

    // 1. Client-Side Field Validation
    const clientFieldErrors: {
      refNo?: string;
      partyName?: string;
      subject?: string;
      dateRecorded?: string;
      file?: string;
    } = {};

    if (!refNo.trim()) {
      clientFieldErrors.refNo = 'Reference / Department Letter No is mandatory.';
    }
    if (!partyName.trim()) {
      clientFieldErrors.partyName = 'Party / Sender / Recipient organization name is mandatory.';
    }
    if (!subject.trim()) {
      clientFieldErrors.subject = 'Document subject / synopsis summary is mandatory.';
    }
    if (!dateRecorded) {
      clientFieldErrors.dateRecorded = 'Registration date is mandatory.';
    }

    if (Object.keys(clientFieldErrors).length > 0) {
      setDetailedError({
        title: 'Mandatory Fields Incomplete',
        message: 'Please fill in all required fields indicated in red before submitting to the registry.',
        step: 'Client Input Pre-Validation',
        fieldErrors: clientFieldErrors,
      });
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('doc_type', docType);
      formData.append('ref_no', refNo.trim());
      formData.append('party_name', partyName.trim());
      formData.append('subject', subject.trim());
      formData.append('date_recorded', dateRecorded);
      formData.append('status', status);
      formData.append('user_identifier', `${userRole}_user`);

      // Append Work Order & Site execution fields with commas stripped for numeric safety
      if (siteName.trim()) formData.append('site_name', siteName.trim());
      if (tenderId.trim()) formData.append('tender_id', tenderId.trim());
      if (caNumber.trim()) formData.append('ca_number', caNumber.trim());
      if (totalWorkOrder.trim()) formData.append('total_work_order', totalWorkOrder.replace(/,/g, '').trim());
      if (amountReceived.trim()) formData.append('amount_received', amountReceived.replace(/,/g, '').trim());
      if (fdrAmount.trim()) formData.append('fdr_amount', fdrAmount.replace(/,/g, '').trim());
      if (fdrDate) formData.append('fdr_date', fdrDate);
      if (fdrMaturityDate) formData.append('fdr_maturity_date', fdrMaturityDate);
      if (fdrMaturityAmount.trim()) formData.append('fdr_maturity_amount', fdrMaturityAmount.replace(/,/g, '').trim());
      if (commencementDate) formData.append('commencement_date', commencementDate);
      if (completionDate) formData.append('completion_date', completionDate);
      if (actualCompletionDate) formData.append('actual_completion_date', actualCompletionDate);

      if (file) {
        formData.append('file', file);
      }

      let res: Response | null = null;
      let networkFetchError: any = null;

      try {
        res = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });
      } catch (postErr: any) {
        networkFetchError = postErr;
      }

      // If network failed (e.g. idle socket dropped during slow entry) or proxy returned 502/504,
      // verify if the document was already committed to the database
      if (!res || res.status === 502 || res.status === 504) {
        try {
          const verifyRes = await fetch(`/api/documents?q=${encodeURIComponent(refNo.trim())}&limit=5`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          });
          if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            const matchedDoc = verifyData.documents?.find(
              (d: RegistryDocument) => d.ref_no.trim().toLowerCase() === refNo.trim().toLowerCase()
            );
            if (matchedDoc) {
              // Document was committed to DB despite client-side connection hiccup!
              resetForm();
              setDetailedError(null);
              onDocumentCreated(matchedDoc);
              onClose();
              return;
            }
          }
        } catch (_verifyErr) {
          // Verification check failed, proceed to retry
        }

        // Attempt one clean retry if DB does not have it yet
        try {
          res = await fetch('/api/documents', {
            method: 'POST',
            body: formData,
          });
          networkFetchError = null;
        } catch (retryErr: any) {
          throw networkFetchError || retryErr;
        }
      }

      if (!res) {
        throw networkFetchError || new Error('Failed to obtain server response.');
      }

      const responseText = await res.text();
      let data: any = {};
      let parseFailed = false;

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (_jsonErr) {
        parseFailed = true;
      }

      if (!res.ok) {
        let title = 'Registration Validation Failed';
        let primaryMessage = '';
        let detailsMessage: string | undefined = undefined;
        let step = data?.step;
        let code = data?.code;
        const serverFieldErrors: typeof clientFieldErrors = {};

        if (parseFailed) {
          const extracted = extractCleanErrorMessage(responseText, res.status);
          title = res.status >= 500 ? 'Central Registry Server Error' : `Server Error (HTTP ${res.status})`;
          primaryMessage = extracted.message;
          detailsMessage = extracted.details;
          step = step || `HTTP ${res.status} Response`;
        } else {
          // JSON returned with error details
          if (data.error && data.details) {
            primaryMessage = data.error;
            detailsMessage = data.details;
          } else if (data.error) {
            primaryMessage = data.error;
          } else if (data.details) {
            primaryMessage = data.details;
          } else if (data.message) {
            primaryMessage = data.message;
          } else {
            primaryMessage = `Server rejected registration with HTTP status ${res.status}.`;
          }

          if (res.status >= 500) {
            title = 'Database & Registry Commit Error';
          } else if (res.status === 400) {
            title = step ? `Validation Alert: ${step}` : 'Registration Validation Error';
          }

          // Automatically highlight fields based on backend error text
          const combinedMsg = `${primaryMessage} ${detailsMessage || ''}`.toLowerCase();
          if (combinedMsg.includes('reference') || combinedMsg.includes('ref_no')) {
            serverFieldErrors.refNo = 'Reference Number validation rejected by server.';
          }
          if (combinedMsg.includes('party') || combinedMsg.includes('party_name') || combinedMsg.includes('organization')) {
            serverFieldErrors.partyName = 'Party / Organization validation rejected by server.';
          }
          if (combinedMsg.includes('subject')) {
            serverFieldErrors.subject = 'Subject validation rejected by server.';
          }
          if (combinedMsg.includes('date recorded') || combinedMsg.includes('date_recorded')) {
            serverFieldErrors.dateRecorded = 'Date validation rejected by server.';
          }
          if (combinedMsg.includes('file') || combinedMsg.includes('mime') || combinedMsg.includes('magic') || combinedMsg.includes('size')) {
            serverFieldErrors.file = primaryMessage;
            setFileValidationError(primaryMessage);
          }
        }

        setDetailedError({
          title,
          message: primaryMessage,
          details: detailsMessage,
          step,
          code,
          status: res.status,
          fieldErrors: Object.keys(serverFieldErrors).length > 0 ? serverFieldErrors : undefined,
        });
        formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Successful Registration
      resetForm();
      setDetailedError(null);
      onDocumentCreated(data.document);
      onClose();
    } catch (err: any) {
      console.error('Registration submission catch:', err);
      const isNetwork = err?.message?.toLowerCase().includes('network') || err?.message?.toLowerCase().includes('fetch');
      const isSyntax = err instanceof SyntaxError || err?.message?.toLowerCase().includes('unexpected') || err?.message?.toLowerCase().includes('json');

      let title = 'Registration Submission Error';
      let message = err?.message || 'An unexpected error occurred while communicating with the registry server.';
      let details: string | undefined = undefined;

      if (isNetwork) {
        title = 'Network Connection Unavailable';
        message = 'Unable to establish connection to the central registry service.';
        details = 'Please check that your network connection is active and that the backend server is reachable, then try again.';
      } else if (isSyntax) {
        title = 'Data Format Serialization Alert';
        message = 'The server response could not be parsed into valid JSON registry confirmation.';
        details = err.message;
      }

      setDetailedError({
        title,
        message,
        details,
        step: 'Client Request Pipeline',
      });
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="new-document-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div
        id="new-document-modal-card"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-2xs">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Document in Master Ledger</h2>
              <p className="text-xs text-slate-500">
                Official registration with non-colliding serial sequence & site work order tracking
              </p>
            </div>
          </div>
          <button
            id="close-new-doc-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto grow">
          {detailedError && (
            <div
              id="registration-validation-error-card"
              className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5 text-rose-900 shadow-2xs animate-in fade-in duration-150"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2.5">
                  <div className="p-1 rounded-md bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="font-bold text-xs text-rose-900">{detailedError.title}</h4>
                      {detailedError.status && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-rose-200/80 text-rose-800">
                          HTTP {detailedError.status}
                        </span>
                      )}
                      {detailedError.code && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-rose-200/80 text-rose-800">
                          {detailedError.code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">{detailedError.message}</p>
                  </div>
                </div>
                <button
                  type="button"
                  id="dismiss-registration-error-btn"
                  onClick={() => setDetailedError(null)}
                  className="p-1 rounded-md text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
                  title="Dismiss error notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {detailedError.step && (
                <div className="flex items-center space-x-1.5 text-[11px] text-rose-700 pt-1.5 border-t border-rose-200/60">
                  <span className="font-semibold">Pipeline Step:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-rose-200 text-rose-800">
                    {detailedError.step}
                  </span>
                </div>
              )}

              {detailedError.details && (
                <div className="p-2.5 bg-white rounded-lg border border-rose-200/80 text-[11px] font-mono text-rose-800 whitespace-pre-wrap break-words leading-relaxed">
                  <span className="font-sans font-semibold text-rose-900 block mb-0.5">Diagnostic Details:</span>
                  {detailedError.details}
                </div>
              )}
            </div>
          )}

          {/* Running Serial Preview Banner */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-blue-900 font-semibold">Allocated Serial Number:</span>
              <span className="font-mono font-bold text-sm text-blue-700 bg-white px-2.5 py-0.5 rounded-md border border-blue-300 shadow-2xs">
                {previewSerial}
              </span>
            </div>
            <span className="text-[11px] text-blue-600 font-medium">Non-colliding sequence</span>
          </div>

          {/* Document Type Selector Grid */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Document Classification (Doc Type) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { type: 'INWARD' as DocumentType, label: 'Inward Scan', code: 'IN', icon: Inbox },
                { type: 'OUTWARD' as DocumentType, label: 'Outward Letter', code: 'OUT', icon: Send },
                { type: 'TENDER' as DocumentType, label: 'Work Order', code: 'TNDR', icon: Gavel },
                { type: 'BILL' as DocumentType, label: 'RA Bill / Invoice', code: 'BILL', icon: Receipt },
                { type: 'INTERNAL' as DocumentType, label: 'Internal Memo', code: 'INT', icon: FileCode },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = docType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    id={`select-doc-type-${item.type.toLowerCase()}`}
                    onClick={() => setDocType(item.type)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span className="font-bold text-[11px]">{item.code}</span>
                    <span className="text-[10px] opacity-80">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference Number & Date Recorded */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reference / Letter Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-ref-no"
                type="text"
                required
                placeholder="e.g. DEPT-ENV/2026/L-849 or REF-9902"
                value={refNo}
                onChange={(e) => {
                  setRefNo(e.target.value);
                  if (detailedError?.fieldErrors?.refNo) {
                    setDetailedError((prev) =>
                      prev ? { ...prev, fieldErrors: { ...prev.fieldErrors, refNo: undefined } } : null
                    );
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg outline-hidden font-mono ${
                  detailedError?.fieldErrors?.refNo
                    ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {detailedError?.fieldErrors?.refNo && (
                <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{detailedError.fieldErrors.refNo}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Date Recorded <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-date-recorded"
                type="date"
                required
                value={dateRecorded}
                onChange={(e) => {
                  setDateRecorded(e.target.value);
                  if (detailedError?.fieldErrors?.dateRecorded) {
                    setDetailedError((prev) =>
                      prev ? { ...prev, fieldErrors: { ...prev.fieldErrors, dateRecorded: undefined } } : null
                    );
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg outline-hidden ${
                  detailedError?.fieldErrors?.dateRecorded
                    ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {detailedError?.fieldErrors?.dateRecorded && (
                <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{detailedError.fieldErrors.dateRecorded}</span>
                </p>
              )}
            </div>
          </div>

          {/* Party Name & Initial Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Party / Sender / Recipient Organization <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-party-name"
                type="text"
                required
                placeholder="e.g. Ministry of Environment or ABC Contracting Ltd."
                value={partyName}
                onChange={(e) => {
                  setPartyName(e.target.value);
                  if (detailedError?.fieldErrors?.partyName) {
                    setDetailedError((prev) =>
                      prev ? { ...prev, fieldErrors: { ...prev.fieldErrors, partyName: undefined } } : null
                    );
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg outline-hidden ${
                  detailedError?.fieldErrors?.partyName
                    ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {detailedError?.fieldErrors?.partyName && (
                <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{detailedError.fieldErrors.partyName}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
              <select
                id="select-initial-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden bg-white font-medium cursor-pointer"
              >
                <option value="RECORDED">RECORDED</option>
                <option value="PENDING_ACTION">PENDING ACTION</option>
                <option value="CLOSED">CLOSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          {/* Subject / Synopsis */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Subject & Synopsis Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="input-subject"
              required
              rows={2}
              placeholder="Brief summary of letter content, action items, or order details..."
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (detailedError?.fieldErrors?.subject) {
                  setDetailedError((prev) =>
                    prev ? { ...prev, fieldErrors: { ...prev.fieldErrors, subject: undefined } } : null
                  );
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg outline-hidden resize-none leading-relaxed ${
                detailedError?.fieldErrors?.subject
                  ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
                  : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {detailedError?.fieldErrors?.subject && (
              <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{detailedError.fieldErrors.subject}</span>
              </p>
            )}
          </div>

          {/* WORK ORDER & SITE INFORMATION SECTION */}
          <div className="border border-amber-200 bg-linear-to-b from-amber-50/50 to-orange-50/20 rounded-xl overflow-hidden shadow-2xs">
            <button
              type="button"
              id="toggle-work-details-btn"
              onClick={() => {
                setShowWorkDetails(!showWorkDetails);
                if (!showWorkDetails && docType === 'INWARD') {
                  setDocType('TENDER');
                }
              }}
              className="w-full px-4 py-3 bg-amber-100/50 hover:bg-amber-100/80 flex items-center justify-between text-left transition-colors cursor-pointer border-b border-amber-200/60"
            >
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500 text-white shadow-2xs">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                      Work Order & Site Execution Details
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
                      Site • Tender • FDR • Milestones
                    </span>
                    {docType === 'TENDER' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Classified: Work Order
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Complete project reference, contract financials, security deposit & timelines
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-slate-600 text-xs font-semibold">
                <span>{showWorkDetails ? 'Collapse' : 'Expand'}</span>
                {showWorkDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showWorkDetails && (
              <div className="p-4 space-y-4">
                {/* 1. Project & Site Identifiers */}
                <div>
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>1. Site & Contract Identifiers</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Site Name */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Site Name
                      </label>
                      <input
                        id="input-site-name"
                        type="text"
                        placeholder="e.g. Sector 9 Elevated Corridor Site"
                        value={siteName}
                        onChange={(e) => {
                          setSiteName(e.target.value);
                          if (docType === 'INWARD') setDocType('TENDER');
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden bg-white"
                      />
                    </div>

                    {/* Tender ID */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tender ID
                      </label>
                      <input
                        id="input-tender-id"
                        type="text"
                        placeholder="e.g. NIT-2026-PWD-092"
                        value={tenderId}
                        onChange={(e) => {
                          setTenderId(e.target.value);
                          if (docType === 'INWARD') setDocType('TENDER');
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-mono bg-white"
                      />
                    </div>

                    {/* C.A. Number */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        C.A. Number (Contract Agreement No)
                      </label>
                      <input
                        id="input-ca-number"
                        type="text"
                        placeholder="e.g. CA/EE/PWD/2026/04"
                        value={caNumber}
                        onChange={(e) => {
                          setCaNumber(e.target.value);
                          if (docType === 'INWARD') setDocType('TENDER');
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-mono bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Contract Financials */}
                <div className="pt-2 border-t border-amber-200/50">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <Landmark className="w-3.5 h-3.5 text-amber-600" />
                    <span>2. Work Order Value & Financials</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Total Work Order */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Total Work Order Value (Amount)
                      </label>
                      <input
                        id="input-total-work-order"
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 50,00,000 or 5000000"
                        value={totalWorkOrder}
                        onChange={(e) => {
                          setTotalWorkOrder(e.target.value);
                          if (docType === 'INWARD') setDocType('TENDER');
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-mono bg-white"
                      />
                    </div>

                    {/* Amount Received */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Amount Received to Date
                      </label>
                      <input
                        id="input-amount-received"
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 17,50,000 or 1750000"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-mono bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. FDR (Fixed Deposit Receipt) / Security Deposit */}
                <div className="pt-2 border-t border-amber-200/50">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    <span>3. FDR (Fixed Deposit Receipt / Security Deposit)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* FDR Amount */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        FDR Amount
                      </label>
                      <input
                        id="input-fdr-amount"
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 2,50,000 or 250000"
                        value={fdrAmount}
                        onChange={(e) => setFdrAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-mono bg-white"
                      />
                    </div>

                    {/* Date of FDR */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Date of FDR
                      </label>
                      <input
                        id="input-date-of-fdr"
                        type="date"
                        value={fdrDate}
                        onChange={(e) => setFdrDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden bg-white"
                      />
                    </div>

                    {/* Maturity Date of FDR */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Maturity Date of FDR
                      </label>
                      <input
                        id="input-fdr-maturity-date"
                        type="date"
                        value={fdrMaturityDate}
                        onChange={(e) => setFdrMaturityDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden bg-white"
                      />
                    </div>

                    {/* Maturity Amount */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Maturity Amount
                      </label>
                      <input
                        id="input-fdr-maturity-amount"
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 2,78,000 or 278000"
                        value={fdrMaturityAmount}
                        onChange={(e) => setFdrMaturityAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-mono bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Execution Milestones & Dates */}
                <div className="pt-2 border-t border-amber-200/50">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>4. Execution Timeline & Milestones</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Date of Commencement */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Date of Commencement
                      </label>
                      <input
                        id="input-commencement-date"
                        type="date"
                        value={commencementDate}
                        onChange={(e) => setCommencementDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden bg-white"
                      />
                    </div>

                    {/* Date of Completion */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Stipulated Date of Completion
                      </label>
                      <input
                        id="input-completion-date"
                        type="date"
                        value={completionDate}
                        onChange={(e) => setCompletionDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden bg-white"
                      />
                    </div>

                    {/* Actual Date of Completion */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Actual Date of Completion
                      </label>
                      <input
                        id="input-actual-completion-date"
                        type="date"
                        value={actualCompletionDate}
                        onChange={(e) => setActualCompletionDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* File Upload Zone with Magic Bytes & Partitioned Storage Notice */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                Document File Attachment (Scan / Letter Copy)
              </label>
              <span className="text-[11px] text-slate-400">PDF, PNG, JPG, DOCX, XLSX, TXT (Max 25MB)</span>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
                file
                  ? 'border-emerald-400 bg-emerald-50/40'
                  : fileValidationError || detailedError?.fieldErrors?.file
                  ? 'border-rose-400 bg-rose-50/40'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
              }`}
            >
              <input
                id="file-upload-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.docx,.doc,.xlsx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-left">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-xs truncate max-w-xs sm:max-w-md">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {(file.size / 1024).toFixed(1)} KB • Magic byte verification active
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setFileValidationError(null);
                    }}
                    className="text-xs text-rose-600 hover:underline px-2 py-1 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label htmlFor="file-upload-input" className="cursor-pointer block">
                  <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-1.5" />
                  <p className="font-semibold text-slate-700 text-xs">
                    Drag & drop scan file here, or <span className="text-blue-600 underline">browse</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Binary magic-byte header inspected to prevent MIME spoofing. Stored in /storage/uploads/YYYY/MM/
                  </p>
                </label>
              )}
            </div>

            {(fileValidationError || detailedError?.fieldErrors?.file) && (
              <p className="text-rose-600 text-[11px] mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fileValidationError || detailedError?.fieldErrors?.file}</span>
              </p>
            )}
          </div>

          {/* Inline Error Notice if validation failed */}
          {detailedError && (
            <div
              id="registration-bottom-error-banner"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start space-x-2 animate-in fade-in duration-150"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">{detailedError.title}: </span>
                <span>{detailedError.message}</span>
                {detailedError.fieldErrors && (
                  <p className="mt-1 text-[11px] text-rose-700 font-medium">
                    Please review mandatory fields marked in red above.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              id="btn-cancel-doc"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-submit-doc"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs disabled:opacity-50 transition-colors flex items-center space-x-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validating & Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Commit to Registry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

