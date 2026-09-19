import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Download,
  FileText,
  Calendar,
  Building,
  Hash,
  Paperclip,
  CheckCircle2,
  Send,
  Printer,
} from 'lucide-react';
import { RegistryDocument } from '../types';

interface ShareDocumentModalProps {
  document: RegistryDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (message: string) => void;
}

export const ShareDocumentModal: React.FC<ShareDocumentModalProps> = ({
  document,
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [copiedFileUrl, setCopiedFileUrl] = useState(false);

  if (!isOpen || !document) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareableUrl = `${origin}/?docId=${document.id}`;
  const directFileUrl = document.file_path ? `${origin}/api/documents/${document.id}/file` : null;

  const formattedCitation = [
    `HUMERS CENTRAL REGISTRY — OFFICIAL DOCUMENT RECORD`,
    `Serial Number: ${document.serial_no}`,
    `Classification: ${document.doc_type}`,
    `Reference / Letter No: ${document.ref_no}`,
    `Date Recorded: ${document.date_recorded}`,
    `Party / Organization: ${document.party_name}`,
    `Subject / Synopsis: ${document.subject}`,
    `Current Status: ${document.status}`,
    document.site_name ? `Site: ${document.site_name}` : null,
    document.tender_id ? `Tender ID: ${document.tender_id}` : null,
    directFileUrl ? `Document File: ${directFileUrl}` : null,
    `Direct Ledger Link: ${shareableUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopiedLink(true);
      onShowToast?.(`Copied direct link for ${document.serial_no} to clipboard`);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (_err) {
      onShowToast?.('Could not access clipboard');
    }
  };

  const handleCopyCitation = async () => {
    try {
      await navigator.clipboard.writeText(formattedCitation);
      setCopiedCitation(true);
      onShowToast?.(`Copied official citation for ${document.serial_no} to clipboard`);
      setTimeout(() => setCopiedCitation(false), 2500);
    } catch (_err) {
      onShowToast?.('Could not access clipboard');
    }
  };

  const handleCopyFileUrl = async () => {
    if (!directFileUrl) return;
    try {
      await navigator.clipboard.writeText(directFileUrl);
      setCopiedFileUrl(true);
      onShowToast?.('Copied attachment scan URL to clipboard');
      setTimeout(() => setCopiedFileUrl(false), 2500);
    } catch (_err) {
      onShowToast?.('Could not access clipboard');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${document.serial_no} - ${document.subject}`,
          text: `Official Registry Record: ${document.serial_no} (${document.party_name})\n${document.subject}`,
          url: shareableUrl,
        });
        onShowToast?.('Shared document record');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyCitation();
        }
      }
    } else {
      handleCopyCitation();
    }
  };

  return (
    <div
      id="share-document-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        id="share-document-modal-card"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-2xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Share Document Record</h2>
              <p className="text-[11px] text-slate-500">
                Generate citation, direct ledger permalink, or share with external teams
              </p>
            </div>
          </div>
          <button
            id="close-share-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Document Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-md">
                {document.serial_no}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                {document.doc_type}
              </span>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 text-xs line-clamp-2">{document.subject}</h3>
              <p className="text-slate-500 text-[11px] mt-0.5 flex items-center space-x-1.5">
                <Building className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{document.party_name}</span>
              </p>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 text-[11px] text-slate-500">
              <span>Ref: {document.ref_no}</span>
              <span>Date: {document.date_recorded}</span>
            </div>
          </div>

          {/* Quick Share Options */}
          <div className="space-y-3">
            {/* Native OS Share (if supported) */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                id="btn-native-share"
                type="button"
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Share via Device Apps (WhatsApp, Mail, Messages)</span>
              </button>
            )}

            {/* Copy Permalink Box */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-700">
                Direct Record Permalink (Opens this dossier)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={shareableUrl}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-700 select-all outline-hidden focus:border-blue-500"
                />
                <button
                  id="btn-copy-shareable-link"
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-xs transition-colors shrink-0 cursor-pointer shadow-2xs"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Copy Official Citation Text */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700">
                  Official Dispatch Citation (Formatted for Memos & Emails)
                </label>
                <button
                  id="btn-copy-citation-text"
                  type="button"
                  onClick={handleCopyCitation}
                  className="text-blue-600 hover:text-blue-800 font-medium text-[11px] flex items-center space-x-1 cursor-pointer"
                >
                  {copiedCitation ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copied Citation!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Citation</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                readOnly
                rows={5}
                value={formattedCitation}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-mono text-slate-700 select-all leading-relaxed outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Direct Attached Scan Link (if available) */}
            {document.file_path && directFileUrl && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-700">
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-medium">Attached Scan File Link</span>
                  <span className="text-[10px] text-slate-400">({document.file_mime})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    id="btn-copy-file-url"
                    type="button"
                    onClick={handleCopyFileUrl}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedFileUrl ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedFileUrl ? 'Copied' : 'Copy URL'}</span>
                  </button>
                  <a
                    href={directFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 flex items-center space-x-1 font-medium"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open File</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            id="close-share-modal-footer-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
