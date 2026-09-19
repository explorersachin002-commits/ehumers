export interface ExportDocumentRow {
  serial_no: string;
  doc_type: string;
  ref_no: string;
  party_name: string;
  subject: string;
  date_recorded: string;
  status: string;
  site_name?: string | null;
  tender_id?: string | null;
  ca_number?: string | null;
  total_work_order?: number | null;
  amount_received?: number | null;
  fdr_amount?: number | null;
  fdr_date?: string | null;
  fdr_maturity_date?: string | null;
  fdr_maturity_amount?: number | null;
  commencement_date?: string | null;
  completion_date?: string | null;
  actual_completion_date?: string | null;
  file_path: string | null;
  file_mime: string | null;
  file_size_kb: number | null;
  created_at: string;
}

function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generate standardized RFC-4180 compliant CSV ledger export.
 */
export function generateCsvLedger(rows: ExportDocumentRow[], exportedBy: string): string {
  const exportDate = new Date().toISOString().split('T')[0];
  const lines: string[] = [];

  // Header metadata block
  lines.push(`# HUMERS E MANAGEMENT - MASTER DOCUMENT REGISTRY LEDGER EXPORT`);
  lines.push(`# Generated On: ${exportDate} | Exported By: ${exportedBy} | Total Records: ${rows.length}`);
  lines.push('');

  // Column Headers
  const headers = [
    'Serial Number',
    'Document Type',
    'Reference Number',
    'Party / Organization',
    'Subject Description',
    'Site Name',
    'Tender ID',
    'C.A. Number',
    'Total Work Order Amount',
    'Amount Received',
    'FDR Security Amount',
    'Date of FDR',
    'Maturity Date of FDR',
    'FDR Maturity Amount',
    'Date of Commencement',
    'Stipulated Completion Date',
    'Actual Date of Completion',
    'Date Recorded',
    'Registry Status',
    'Attached File Path',
    'MIME Type',
    'File Size (KB)',
    'Timestamp Created',
  ];
  lines.push(headers.map(escapeCsvField).join(','));

  // Data rows
  for (const doc of rows) {
    const row = [
      doc.serial_no,
      doc.doc_type,
      doc.ref_no,
      doc.party_name,
      doc.subject,
      doc.site_name || '',
      doc.tender_id || '',
      doc.ca_number || '',
      doc.total_work_order !== null && doc.total_work_order !== undefined ? doc.total_work_order : '',
      doc.amount_received !== null && doc.amount_received !== undefined ? doc.amount_received : '',
      doc.fdr_amount !== null && doc.fdr_amount !== undefined ? doc.fdr_amount : '',
      doc.fdr_date || '',
      doc.fdr_maturity_date || '',
      doc.fdr_maturity_amount !== null && doc.fdr_maturity_amount !== undefined ? doc.fdr_maturity_amount : '',
      doc.commencement_date || '',
      doc.completion_date || '',
      doc.actual_completion_date || '',
      doc.date_recorded,
      doc.status,
      doc.file_path || 'None',
      doc.file_mime || 'N/A',
      doc.file_size_kb !== null ? doc.file_size_kb : 0,
      doc.created_at,
    ];
    lines.push(row.map(escapeCsvField).join(','));
  }

  return lines.join('\r\n');
}
