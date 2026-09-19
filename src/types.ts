export type DocumentType = 'INWARD' | 'OUTWARD' | 'TENDER' | 'BILL' | 'INTERNAL';

export type DocumentStatus = 'RECORDED' | 'PENDING_ACTION' | 'CLOSED' | 'ARCHIVED';

export type UserRole = 'office_staff' | 'superior_officer' | 'admin';

export interface RegistryDocument {
  id: number;
  serial_no: string;
  doc_type: DocumentType;
  ref_no: string;
  party_name: string;
  subject: string;
  date_recorded: string;
  status: DocumentStatus;
  file_path: string | null;
  file_mime: string | null;
  file_size_kb: number | null;
  // Work Order & Site Information Fields
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
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  document_id: number | null;
  action: 'INSERT' | 'UPDATE' | 'STATUS_CHANGE' | 'EXPORT' | 'PRINT' | 'VIEW' | 'DELETE';
  user_identifier: string;
  timestamp: string;
  serial_no?: string | null;
  subject?: string | null;
  doc_type?: string | null;
}

export interface SequenceRecord {
  year: number;
  doc_type: string;
  current_val: number;
  prefix_code: string;
  next_serial_preview: string;
}

export interface StorageNode {
  name: string;
  relativePath: string;
  type: 'directory' | 'file';
  sizeBytes?: number;
  fileCount?: number;
  children?: StorageNode[];
}

export interface DocumentStats {
  totalDocs: number;
  inwardCount: number;
  outwardCount: number;
  tenderCount: number;
  billCount: number;
  internalCount: number;
  recordedCount: number;
  pendingCount: number;
  closedCount: number;
  archivedCount: number;
}
