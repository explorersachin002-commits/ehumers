import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Ensure instance and storage directories exist
const INSTANCE_DIR = path.resolve(process.cwd(), 'instance');
const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'uploads');

if (!fs.existsSync(INSTANCE_DIR)) {
  fs.mkdirSync(INSTANCE_DIR, { recursive: true });
}
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export const DB_PATH = path.join(INSTANCE_DIR, 'registry.db');
export const db = new DatabaseSync(DB_PATH);

// Initialize WAL mode and foreign keys as specified in the schema
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// 1. Sequential Numbering Tracker
db.exec(`
  CREATE TABLE IF NOT EXISTS sequence_tracker (
    year INTEGER NOT NULL,
    doc_type TEXT NOT NULL,
    current_val INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (year, doc_type)
  );
`);

// 2. Master Document Registry Table
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serial_no TEXT NOT NULL UNIQUE,          -- Format: REG/YYYY/IN/00001
    doc_type TEXT NOT NULL CHECK(doc_type IN ('INWARD', 'OUTWARD', 'TENDER', 'BILL', 'INTERNAL')),
    ref_no TEXT NOT NULL,                    -- Sender or internal department letter reference
    party_name TEXT NOT NULL,                -- Sender or recipient organization/person
    subject TEXT NOT NULL,
    date_recorded DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'RECORDED' CHECK(status IN ('RECORDED', 'PENDING_ACTION', 'CLOSED', 'ARCHIVED')),
    file_path TEXT,                          -- Relative path in storage
    file_mime TEXT,                          -- application/pdf, image/jpeg, etc.
    file_size_kb INTEGER,
    -- Work Order & Site Information Fields
    site_name TEXT,                          -- Site / Project Location Name
    tender_id TEXT,                          -- Tender ID
    ca_number TEXT,                          -- Contract Agreement Number (C.A. No)
    total_work_order REAL,                   -- Total Work Order Value
    amount_received REAL,                    -- Amount Received till date
    fdr_amount REAL,                         -- Fixed Deposit Receipt (FDR) Security Amount
    fdr_date DATE,                           -- Date of FDR
    fdr_maturity_date DATE,                  -- Maturity Date of FDR
    fdr_maturity_amount REAL,                -- FDR Maturity Amount
    commencement_date DATE,                  -- Date of Commencement of work
    completion_date DATE,                    -- Scheduled / Stipulated Date of Completion
    actual_completion_date DATE,             -- Actual Date of Completion
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration for existing tables: safely add Work Order & Site columns if not present
const workColumns = [
  { name: 'site_name', type: 'TEXT' },
  { name: 'tender_id', type: 'TEXT' },
  { name: 'ca_number', type: 'TEXT' },
  { name: 'total_work_order', type: 'REAL' },
  { name: 'amount_received', type: 'REAL' },
  { name: 'fdr_amount', type: 'REAL' },
  { name: 'fdr_date', type: 'DATE' },
  { name: 'fdr_maturity_date', type: 'DATE' },
  { name: 'fdr_maturity_amount', type: 'REAL' },
  { name: 'commencement_date', type: 'DATE' },
  { name: 'completion_date', type: 'DATE' },
  { name: 'actual_completion_date', type: 'DATE' },
];

for (const col of workColumns) {
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN ${col.name} ${col.type};`);
  } catch (_ignored) {
    // Column already exists, ignore
  }
}

// Indexes for performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_doc_search ON documents(ref_no, party_name);
  CREATE INDEX IF NOT EXISTS idx_doc_date ON documents(date_recorded DESC);
  CREATE INDEX IF NOT EXISTS idx_doc_serial ON documents(serial_no);
  CREATE INDEX IF NOT EXISTS idx_doc_site ON documents(site_name);
  CREATE INDEX IF NOT EXISTS idx_doc_tender ON documents(tender_id);
`);

// 3. Audit Trails
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER,
    action TEXT NOT NULL,                    -- INSERT, UPDATE, EXPORT, PRINT, VIEW, DELETE
    user_identifier TEXT NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE SET NULL
  );
`);

// Ensure sample files exist on disk for preview and demonstration
export function ensureSampleFilesExist() {
  const currentYear = new Date().getFullYear();
  const yearDir = path.join(STORAGE_DIR, String(currentYear));
  ['IN', 'OUT', 'TENDER', '01', '02', '03'].forEach((sub) => {
    fs.mkdirSync(path.join(yearDir, sub), { recursive: true });
  });

  const samplePdfPath = path.join(yearDir, 'IN', 'sample_inward_scan_2026.pdf');
  if (!fs.existsSync(samplePdfPath)) {
    const minimalPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000108 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF\n'
    );
    fs.writeFileSync(samplePdfPath, minimalPdf);
  }

  const samplePngPath = path.join(yearDir, 'OUT', 'dispatch_receipt_proof.png');
  if (!fs.existsSync(samplePngPath)) {
    const minimalPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(samplePngPath, minimalPng);
  }
}

// Seed initial sequence tracker and sample records if table is empty
export function seedInitialDataIfNeeded() {
  // Always guarantee sample disk templates exist
  ensureSampleFilesExist();

  const countRow = db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number };
  if (countRow && countRow.count > 0) {
    return;
  }

  console.log('Seeding initial documents and sequence trackers...');
  const currentYear = new Date().getFullYear();

  const initialDocs = [
    {
      serial_no: `REG/${currentYear}/IN/00001`,
      doc_type: 'INWARD',
      ref_no: 'DEPT-ENV/2026/L-849',
      party_name: 'State Environmental Protection Agency',
      subject: 'Annual Clearance Compliance Audit & Air Quality Assessment Report',
      date_recorded: `${currentYear}-02-15`,
      status: 'PENDING_ACTION',
      file_path: `${currentYear}/IN/sample_inward_scan_2026.pdf`,
      file_mime: 'application/pdf',
      file_size_kb: 48,
    },
    {
      serial_no: `REG/${currentYear}/OUT/00001`,
      doc_type: 'OUTWARD',
      ref_no: 'CORP/HQ/DISP/2026/012',
      party_name: 'Apex Infrastructure & Logistics Ltd.',
      subject: 'Official Notice of Milestone Completion & Verification Schedule',
      date_recorded: `${currentYear}-02-18`,
      status: 'CLOSED',
      file_path: `${currentYear}/OUT/dispatch_receipt_proof.png`,
      file_mime: 'image/png',
      file_size_kb: 12,
    },
    {
      serial_no: `REG/${currentYear}/TENDER/00001`,
      doc_type: 'TENDER',
      ref_no: 'TNDR/CIVIL-PKG-04B',
      party_name: 'National Highways Construction Board',
      subject: 'Technical Bid Submission & Performance Bank Guarantee Confirmation',
      date_recorded: `${currentYear}-03-02`,
      status: 'RECORDED',
      file_path: `${currentYear}/IN/sample_inward_scan_2026.pdf`,
      file_mime: 'application/pdf',
      file_size_kb: 125,
    },
    {
      serial_no: `REG/${currentYear}/BILL/00001`,
      doc_type: 'BILL',
      ref_no: 'INV-2026-9042',
      party_name: 'Starlight Facilities & Power Solutions',
      subject: 'Monthly High-Voltage Grid Maintenance & Diesel Generator Standby Bill',
      date_recorded: `${currentYear}-03-08`,
      status: 'PENDING_ACTION',
      file_path: null,
      file_mime: null,
      file_size_kb: null,
    },
    {
      serial_no: `REG/${currentYear}/INTERNAL/00001`,
      doc_type: 'INTERNAL',
      ref_no: 'MEMO/HR/2026/Q1-09',
      party_name: 'Executive Directorate & Personnel Office',
      subject: 'Office Security Protocol & Digital Ledger Compliance Directive',
      date_recorded: `${currentYear}-03-12`,
      status: 'CLOSED',
      file_path: null,
      file_mime: null,
      file_size_kb: null,
    },
    {
      serial_no: `REG/${currentYear}/IN/00002`,
      doc_type: 'INWARD',
      ref_no: 'MUNI/WATER/NOTICE-44',
      party_name: 'Metropolitan Water Supply & Sewerage Board',
      subject: 'Scheduled Infrastructure Upgrades & Temporary Flow Disruption Schedule',
      date_recorded: `${currentYear}-03-14`,
      status: 'RECORDED',
      file_path: `${currentYear}/IN/sample_inward_scan_2026.pdf`,
      file_mime: 'application/pdf',
      file_size_kb: 64,
    }
  ];

  const insertDoc = db.prepare(`
    INSERT INTO documents (serial_no, doc_type, ref_no, party_name, subject, date_recorded, status, file_path, file_mime, file_size_kb)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (document_id, action, user_identifier, timestamp)
    VALUES (?, ?, ?, ?)
  `);

  const insertSeq = db.prepare(`
    INSERT INTO sequence_tracker (year, doc_type, current_val)
    VALUES (?, ?, ?)
  `);

  // Count docs per type
  const countsByType: Record<string, number> = {
    INWARD: 2,
    OUTWARD: 1,
    TENDER: 1,
    BILL: 1,
    INTERNAL: 1,
  };

  Object.entries(countsByType).forEach(([docType, val]) => {
    insertSeq.run(currentYear, docType, val);
  });

  initialDocs.forEach((doc, idx) => {
    const res = insertDoc.run(
      doc.serial_no,
      doc.doc_type,
      doc.ref_no,
      doc.party_name,
      doc.subject,
      doc.date_recorded,
      doc.status,
      doc.file_path,
      doc.file_mime,
      doc.file_size_kb
    );
    const docId = Number(res.lastInsertRowid);
    insertAudit.run(docId, 'INSERT', 'system_initializer', new Date(Date.now() - (10 - idx) * 3600000).toISOString());
  });

  console.log('Seeding completed successfully.');
}
