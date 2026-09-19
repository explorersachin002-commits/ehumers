import React, { useState } from 'react';
import { Printer, Calendar, Building2, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { RegistryDocument, UserRole } from '../types';
import { HumersLogo } from './HumersLogo';

interface PrintSummaryViewProps {
  documents: RegistryDocument[];
  userRole: UserRole;
  onExportCsv: () => void;
}

export const PrintSummaryView: React.FC<PrintSummaryViewProps> = ({
  documents,
  userRole,
  onExportCsv,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [printedTime, setPrintedTime] = useState<string>(() => new Date().toLocaleString());

  const handlePrint = async () => {
    try {
      // Record audit action for printing
      await fetch('/api/audit-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_identifier: `${userRole}_officer` }),
      });
    } catch (e) {
      console.error('Audit print log failed:', e);
    }

    setPrintedTime(new Date().toLocaleString());
    window.print();
  };

  const filteredDocs = filterType === 'ALL'
    ? documents
    : documents.filter((d) => d.doc_type === filterType);

  return (
    <div id="print-summary-view-container" className="space-y-4">
      {/* Print Controls Header (Hidden during actual print) */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Printer className="w-4 h-4 text-amber-500" />
            <span>High-Density Printable Master Register (A4 Ledger)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Optimized for official physical archives, supervisory reviews, and institutional audit sign-offs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-medium">Filter for Print:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-medium cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="INWARD">Inward Scans Only</option>
              <option value="OUTWARD">Outward Dispatches Only</option>
              <option value="TENDER">Tenders & Work Orders</option>
              <option value="BILL">RA Bills & Invoices</option>
              <option value="INTERNAL">Internal Memos</option>
            </select>
          </div>

          <button
            id="print-a4-now-btn"
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Ledger (A4)</span>
          </button>
        </div>
      </div>

      {/* The Official Printable Sheet (A4 Landscape Layout) */}
      <div
        id="printable-a4-sheet"
        className="print-container bg-white p-6 sm:p-8 rounded-xl border border-slate-300 shadow-xs text-slate-900 font-serif"
      >
        {/* Formal Institutional Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
          <div className="flex flex-col items-center justify-center space-y-1 mb-2">
            <HumersLogo size="lg" />
            <h1 className="text-sm font-sans font-bold tracking-widest uppercase text-slate-800">
              E-MANAGEMENT • CENTRAL REGISTRAR & ARCHIVES
            </h1>
          </div>
          <p className="text-xs font-sans tracking-wide text-slate-700 uppercase font-semibold">
            CENTRAL CORRESPONDENCE & DOCUMENT DISPATCH LEDGER
          </p>
          <div className="flex justify-between items-center text-[10px] font-sans text-slate-500 mt-2 px-1">
            <span>
              Document Classification: <strong>{filterType}</strong>
            </span>
            <span>
              Generated & Certified: <strong>{printedTime}</strong>
            </span>
            <span>
              Total Certified Entries: <strong>{filteredDocs.length}</strong>
            </span>
          </div>
        </div>

        {/* High Density Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-400 text-[11px] font-sans">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400 text-slate-800 font-bold uppercase text-[10px]">
                <th className="border border-slate-300 p-2 w-10 text-center">No.</th>
                <th className="border border-slate-300 p-2 w-32">Serial Number</th>
                <th className="border border-slate-300 p-2 w-16 text-center">Class</th>
                <th className="border border-slate-300 p-2 w-36">Reference No.</th>
                <th className="border border-slate-300 p-2 w-24">Date</th>
                <th className="border border-slate-300 p-2 w-48">Party / Organization</th>
                <th className="border border-slate-300 p-2">Subject / Brief Synopsis</th>
                <th className="border border-slate-300 p-2 w-28 text-center">Status</th>
                <th className="border border-slate-300 p-2 w-20 text-center">Scan</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500 italic">
                    No registry records listed under the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc, idx) => (
                  <tr key={doc.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="border border-slate-300 p-1.5 text-center font-mono text-[10px]">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 p-1.5 font-mono font-bold text-[10px] text-slate-900">
                      {doc.serial_no}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-[10px]">
                      {doc.doc_type}
                    </td>
                    <td className="border border-slate-300 p-1.5 font-mono text-[10px]">
                      {doc.ref_no}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-[10px] whitespace-nowrap">
                      {doc.date_recorded}
                    </td>
                    <td className="border border-slate-300 p-1.5 font-medium text-[10px]">
                      {doc.party_name}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-[10px] leading-snug">
                      {doc.subject}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-[9px]">
                      {doc.status}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center text-[10px]">
                      {doc.file_path ? 'YES' : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Official Physical Sign-Off Signature Blocks */}
        <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-3 gap-8 text-center text-xs font-sans">
          <div>
            <div className="h-14 border-b border-dashed border-slate-400 mb-2"></div>
            <p className="font-bold text-slate-800">PREPARED BY</p>
            <p className="text-[10px] text-slate-500">Registry Clerk / Office Staff</p>
            <p className="text-[10px] text-slate-400 mt-1">Date: ____________________</p>
          </div>

          <div>
            <div className="h-14 border-b border-dashed border-slate-400 mb-2"></div>
            <p className="font-bold text-slate-800">VERIFIED & CHECKED BY</p>
            <p className="text-[10px] text-slate-500">Superintendent / Officer-in-Charge</p>
            <p className="text-[10px] text-slate-400 mt-1">Date: ____________________</p>
          </div>

          <div>
            <div className="h-14 border-b border-dashed border-slate-400 mb-2"></div>
            <p className="font-bold text-slate-800">OFFICIALLY APPROVED BY</p>
            <p className="text-[10px] text-slate-500">Head of Department / Director</p>
            <p className="text-[10px] text-slate-400 mt-1">Date: ____________________</p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-[9px] font-sans text-slate-400 border-t border-slate-200 pt-2">
          Official Office Document Registry Ledger • Generated from SQLite WAL Master Store with Strict Non-Colliding Sequences
        </div>
      </div>
    </div>
  );
};
