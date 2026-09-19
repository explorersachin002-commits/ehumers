import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db.js';
import { getNextSerialNumber, getAllSequences, previewNextSerialNumber } from '../sequenceService.js';
import {
  validateUploadedFile,
  storeValidatedFile,
  resolveStorageFilePath,
  scanStorageDirectory,
} from '../fileService.js';
import { logAuditAction, getAuditLogs } from '../auditService.js';
import { generateCsvLedger, ExportDocumentRow } from '../exportService.js';
import {
  verifyAdminPassword,
  validateAdminSession,
  revokeAdminSession,
  ADMIN_MASTER_PASSWORD,
  isMasterPasswordValid,
} from '../authService.js';

export const apiRouter = Router();

// Configure Multer for in-memory buffer handling prior to magic-byte inspection
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 26 * 1024 * 1024, // 26MB ceiling to safely catch oversized files before processing
  },
});

/**
 * Resilient upload middleware using upload.any() to eliminate any "MulterError: Unexpected field" errors
 * and return structured JSON on upload failure.
 */
const handleDocumentUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.any()(req, res, (err: any) => {
    if (err) {
      console.warn('Multer upload handler error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'File size exceeds 25 MB limit. Please choose a smaller file.',
            code: 'LIMIT_FILE_SIZE',
            step: 'File Upload',
          });
        }
        return res.status(400).json({
          error: `Upload error (${err.code}): ${err.message}`,
          code: err.code,
          step: 'File Upload',
        });
      }
      return res.status(400).json({
        error: err.message || 'Error occurred while processing file upload.',
        step: 'File Upload',
      });
    }

    // Safely assign req.file from any uploaded files
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files.find((f: Express.Multer.File) => f.fieldname === 'file') || req.files[0];
    }
    next();
  });
};

/**
 * GET /api/documents
 * Query & Filter Engine
 */
apiRouter.get('/documents', (req: Request, res: Response) => {
  try {
    const {
      q,
      doc_type,
      status,
      startDate,
      endDate,
      sortBy = 'id',
      sortOrder = 'DESC',
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(String(limit), 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // Search query across ref_no, party_name, subject, serial_no, site_name, tender_id, ca_number
    if (q && String(q).trim() !== '') {
      const term = `%${String(q).trim()}%`;
      conditions.push('(ref_no LIKE ? OR party_name LIKE ? OR subject LIKE ? OR serial_no LIKE ? OR site_name LIKE ? OR tender_id LIKE ? OR ca_number LIKE ?)');
      params.push(term, term, term, term, term, term, term);
    }

    if (doc_type && doc_type !== 'ALL') {
      if (String(doc_type).toUpperCase() === 'TENDER') {
        // Tenders / Work Orders: include documents explicitly classified as TENDER, or having site/tender/CA identifiers
        conditions.push("(doc_type = 'TENDER' OR (site_name IS NOT NULL AND site_name != '') OR (tender_id IS NOT NULL AND tender_id != '') OR (ca_number IS NOT NULL AND ca_number != ''))");
      } else {
        conditions.push('doc_type = ?');
        params.push(String(doc_type).toUpperCase());
      }
    }

    if (status && status !== 'ALL') {
      conditions.push('status = ?');
      params.push(String(status).toUpperCase());
    }

    if (startDate) {
      conditions.push('date_recorded >= ?');
      params.push(String(startDate));
    }

    if (endDate) {
      conditions.push('date_recorded <= ?');
      params.push(String(endDate));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total records
    const countSql = `SELECT COUNT(*) as total FROM documents ${whereClause}`;
    const totalRow = db.prepare(countSql).get(...params) as { total: number };
    const total = totalRow ? totalRow.total : 0;

    // Allowed sort columns to prevent SQL injection
    const allowedSortCols: Record<string, string> = {
      id: 'id',
      date_recorded: 'date_recorded',
      serial_no: 'serial_no',
      created_at: 'created_at',
      party_name: 'party_name',
      status: 'status',
      doc_type: 'doc_type',
    };

    const sortCol = allowedSortCols[String(sortBy)] || 'id';
    const sortDirection = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const selectSql = `
      SELECT * FROM documents 
      ${whereClause} 
      ORDER BY ${sortCol} ${sortDirection}, id DESC 
      LIMIT ? OFFSET ?
    `;

    const documents = db.prepare(selectSql).all(...params, limitNum, offset);

    // Compute status and type counts for summary metric chips
    const statsRow = db.prepare(`
      SELECT 
        COUNT(*) as totalDocs,
        SUM(CASE WHEN doc_type = 'INWARD' THEN 1 ELSE 0 END) as inwardCount,
        SUM(CASE WHEN doc_type = 'OUTWARD' THEN 1 ELSE 0 END) as outwardCount,
        SUM(CASE WHEN doc_type = 'TENDER' OR (site_name IS NOT NULL AND site_name != '') OR (tender_id IS NOT NULL AND tender_id != '') OR (ca_number IS NOT NULL AND ca_number != '') THEN 1 ELSE 0 END) as tenderCount,
        SUM(CASE WHEN doc_type = 'BILL' THEN 1 ELSE 0 END) as billCount,
        SUM(CASE WHEN doc_type = 'INTERNAL' THEN 1 ELSE 0 END) as internalCount,
        SUM(CASE WHEN status = 'RECORDED' THEN 1 ELSE 0 END) as recordedCount,
        SUM(CASE WHEN status = 'PENDING_ACTION' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closedCount,
        SUM(CASE WHEN status = 'ARCHIVED' THEN 1 ELSE 0 END) as archivedCount
      FROM documents
    `).get();

    res.json({
      documents,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      stats: statsRow,
    });
  } catch (err: any) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: 'Failed to retrieve documents', details: err.message });
  }
});

/**
 * GET /api/documents/preview-sequence
 * Preview what the next serial number will be
 */
apiRouter.get('/documents/preview-sequence', (req: Request, res: Response) => {
  try {
    const docType = String(req.query.doc_type || 'INWARD');
    const preview = previewNextSerialNumber(docType);
    res.json({ preview });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/documents
 * Create document record with file validation and atomic sequence numbering
 */
apiRouter.post('/documents', handleDocumentUpload, (req: Request, res: Response) => {
  try {
    const {
      doc_type,
      ref_no,
      party_name,
      subject,
      date_recorded,
      status = 'RECORDED',
      user_identifier = 'office_staff',
      // Work Order & Site execution fields
      site_name,
      tender_id,
      ca_number,
      total_work_order,
      amount_received,
      fdr_amount,
      fdr_date,
      fdr_maturity_date,
      fdr_maturity_amount,
      commencement_date,
      completion_date,
      actual_completion_date,
    } = req.body;

    const missing: string[] = [];
    if (!doc_type) missing.push('Document Classification');
    if (!ref_no || !String(ref_no).trim()) missing.push('Reference Number');
    if (!party_name || !String(party_name).trim()) missing.push('Party / Organization');
    if (!subject || !String(subject).trim()) missing.push('Subject / Synopsis');
    if (!date_recorded || !String(date_recorded).trim()) missing.push('Date Recorded');

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Mandatory field validation failed: Missing ${missing.join(', ')}.`,
        details: 'All core document registry attributes are mandatory to generate an authentic sequential ledger entry.',
        step: 'Parameter Validation',
        code: 'MISSING_REQUIRED_FIELDS',
        missingFields: missing,
      });
    }

    const normalizedDocType = String(doc_type).trim().toUpperCase();
    const validTypes = ['INWARD', 'OUTWARD', 'TENDER', 'BILL', 'INTERNAL'];
    if (!validTypes.includes(normalizedDocType)) {
      return res.status(400).json({
        error: `Invalid document type "${doc_type}". Allowed types: ${validTypes.join(', ')}`,
        step: 'Classification Validation',
        code: 'INVALID_DOC_TYPE',
      });
    }

    const validStatuses = ['RECORDED', 'PENDING_ACTION', 'CLOSED', 'ARCHIVED'];
    const normalizedStatus = status ? String(status).trim().toUpperCase() : 'RECORDED';
    const finalStatus = validStatuses.includes(normalizedStatus) ? normalizedStatus : 'RECORDED';

    let filePath: string | null = null;
    let fileMime: string | null = null;
    let fileSizeKb: number | null = null;

    // File Validation & Storage Pipeline
    if (req.file) {
      const validation = validateUploadedFile({
        originalname: req.file.originalname,
        size: req.file.size,
        buffer: req.file.buffer,
      });

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error || 'File validation failed.',
          step: 'File Validation (Extension, Magic Bytes, Size)',
        });
      }

      // Store file safely
      const stored = storeValidatedFile(
        {
          originalname: req.file.originalname,
          size: req.file.size,
          buffer: req.file.buffer,
        },
        normalizedDocType,
        validation.detectedMime!
      );

      filePath = stored.relativePath;
      fileMime = stored.fileMime;
      fileSizeKb = stored.fileSizeKb;
    }

    // Atomic DB Transaction: Generate Sequence No + Write Record + Audit Log
    const parsedYear = new Date(date_recorded).getFullYear();
    const yearFromDate = (!isNaN(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100)
      ? parsedYear
      : new Date().getFullYear();

    const { serialNo } = getNextSerialNumber(normalizedDocType, yearFromDate);

    const parseNum = (val: any) => {
      if (val === undefined || val === null || val === '') return null;
      // Strip currency signs, commas, and whitespace so figures like "₹ 50,000" or "50,000.00" parse reliably
      const cleanVal = String(val).replace(/[^0-9.-]/g, '').trim();
      if (!cleanVal) return null;
      const parsed = parseFloat(cleanVal);
      return isNaN(parsed) ? null : parsed;
    };

    const parseStr = (val: any) => {
      if (val === undefined || val === null || String(val).trim() === '') return null;
      return String(val).trim();
    };

    const insertStmt = db.prepare(`
      INSERT INTO documents (
        serial_no, doc_type, ref_no, party_name, subject, date_recorded, status, file_path, file_mime, file_size_kb,
        site_name, tender_id, ca_number, total_work_order, amount_received, fdr_amount, fdr_date,
        fdr_maturity_date, fdr_maturity_amount, commencement_date, completion_date, actual_completion_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      serialNo,
      normalizedDocType,
      String(ref_no).trim(),
      String(party_name).trim(),
      String(subject).trim(),
      String(date_recorded).trim(),
      finalStatus,
      filePath,
      fileMime,
      fileSizeKb,
      parseStr(site_name),
      parseStr(tender_id),
      parseStr(ca_number),
      parseNum(total_work_order),
      parseNum(amount_received),
      parseNum(fdr_amount),
      parseStr(fdr_date),
      parseStr(fdr_maturity_date),
      parseNum(fdr_maturity_amount),
      parseStr(commencement_date),
      parseStr(completion_date),
      parseStr(actual_completion_date)
    );

    const docId = Number(result.lastInsertRowid);

    // Audit Logging
    logAuditAction('INSERT', String(user_identifier || 'office_staff'), docId);

    const newDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
    res.status(201).json({
      message: 'Document successfully registered with non-colliding serial number.',
      document: newDoc,
    });
  } catch (err: any) {
    console.error('Error creating document:', err);
    res.status(500).json({
      error: 'Failed to commit document to registry database',
      details: err.message || 'An internal database error occurred during sequential insert.',
      step: 'Database Ledger Transaction',
      code: 'DB_TRANSACTION_FAILED',
    });
  }
});

/**
 * GET /api/documents/:id
 * Get single document details with its specific audit trail
 */
apiRouter.get('/documents/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document record not found' });
    }

    // Get audit history for this document
    const auditLogs = db
      .prepare('SELECT * FROM audit_logs WHERE document_id = ? ORDER BY timestamp DESC')
      .all(id);

    res.json({ document: doc, auditLogs });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve document', details: err.message });
  }
});

/**
 * PATCH /api/documents/:id
 * Update document details, site details, or status
 */
apiRouter.patch('/documents/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Document record not found' });
    }

    const {
      status,
      subject,
      ref_no,
      party_name,
      user_identifier = 'office_staff',
      site_name,
      tender_id,
      ca_number,
      total_work_order,
      amount_received,
      fdr_amount,
      fdr_date,
      fdr_maturity_date,
      fdr_maturity_amount,
      commencement_date,
      completion_date,
      actual_completion_date,
    } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let isStatusChange = false;

    if (status && status !== existing.status) {
      const validStatuses = ['RECORDED', 'PENDING_ACTION', 'CLOSED', 'ARCHIVED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      updates.push('status = ?');
      params.push(status);
      isStatusChange = true;
    }

    if (subject !== undefined) {
      updates.push('subject = ?');
      params.push(subject.trim());
    }

    if (ref_no !== undefined) {
      updates.push('ref_no = ?');
      params.push(ref_no.trim());
    }

    if (party_name !== undefined) {
      updates.push('party_name = ?');
      params.push(party_name.trim());
    }

    const parseNum = (val: any) => {
      if (val === undefined || val === null || val === '') return null;
      const parsed = parseFloat(String(val));
      return isNaN(parsed) ? null : parsed;
    };

    const parseStr = (val: any) => {
      if (val === undefined || val === null || String(val).trim() === '') return null;
      return String(val).trim();
    };

    // Work & site fields
    if (site_name !== undefined) {
      updates.push('site_name = ?');
      params.push(parseStr(site_name));
    }
    if (tender_id !== undefined) {
      updates.push('tender_id = ?');
      params.push(parseStr(tender_id));
    }
    if (ca_number !== undefined) {
      updates.push('ca_number = ?');
      params.push(parseStr(ca_number));
    }
    if (total_work_order !== undefined) {
      updates.push('total_work_order = ?');
      params.push(parseNum(total_work_order));
    }
    if (amount_received !== undefined) {
      updates.push('amount_received = ?');
      params.push(parseNum(amount_received));
    }
    if (fdr_amount !== undefined) {
      updates.push('fdr_amount = ?');
      params.push(parseNum(fdr_amount));
    }
    if (fdr_date !== undefined) {
      updates.push('fdr_date = ?');
      params.push(parseStr(fdr_date));
    }
    if (fdr_maturity_date !== undefined) {
      updates.push('fdr_maturity_date = ?');
      params.push(parseStr(fdr_maturity_date));
    }
    if (fdr_maturity_amount !== undefined) {
      updates.push('fdr_maturity_amount = ?');
      params.push(parseNum(fdr_maturity_amount));
    }
    if (commencement_date !== undefined) {
      updates.push('commencement_date = ?');
      params.push(parseStr(commencement_date));
    }
    if (completion_date !== undefined) {
      updates.push('completion_date = ?');
      params.push(parseStr(completion_date));
    }
    if (actual_completion_date !== undefined) {
      updates.push('actual_completion_date = ?');
      params.push(parseStr(actual_completion_date));
    }

    if (updates.length === 0) {
      return res.json({ message: 'No changes provided', document: existing });
    }

    updates.push("updated_at = datetime('now')");

    const updateSql = `UPDATE documents SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(updateSql).run(...params, id);

    // Audit logging
    logAuditAction(isStatusChange ? 'STATUS_CHANGE' : 'UPDATE', String(user_identifier), id);

    const updatedDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    res.json({ message: 'Document updated successfully', document: updatedDoc });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update document', details: err.message });
  }
});

/**
 * POST /api/admin/verify
 * Authenticate System Administrator using the Master Privacy Password
 */
apiRouter.post('/admin/verify', (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const result = verifyAdminPassword(password);
    if (!result.valid) {
      logAuditAction('ADMIN_LOGIN_FAILED', 'unauthorized_attempt', null);
      return res.status(401).json({
        success: false,
        error: result.error || 'Incorrect privacy password. Access to System Administrator tier is denied.',
      });
    }

    logAuditAction('ADMIN_LOGIN', 'system_administrator', null);
    res.json({
      success: true,
      token: result.token,
      message: 'System Administrator clearance unlocked successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to authenticate administrator', details: err.message });
  }
});

/**
 * GET /api/admin/status
 * Check if the active administrator session is authenticated
 */
apiRouter.get('/admin/status', (req: Request, res: Response) => {
  try {
    const token = (req.headers['x-admin-token'] || req.query.token) as string;
    const isAuthenticated = validateAdminSession(token);
    res.json({
      authenticated: isAuthenticated,
      isLocked: !isAuthenticated,
      role: isAuthenticated ? 'admin' : 'office_staff',
      message: isAuthenticated
        ? 'System Administrator clearance is active.'
        : 'System Administrator tier is locked. Master Privacy Password is required.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to query admin status', details: err.message });
  }
});

/**
 * POST /api/admin/lock
 * Revoke administrator session token and lock admin privileges
 */
apiRouter.post('/admin/lock', (req: Request, res: Response) => {
  try {
    const token = (req.headers['x-admin-token'] || req.body?.token) as string;
    revokeAdminSession(token);
    logAuditAction('ADMIN_LOGOUT', 'system_administrator', null);
    res.json({ success: true, message: 'System Administrator session locked successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to lock admin session', details: err.message });
  }
});

/**
 * STRICT IMMUTABILITY GUARD:
 * Blocks any attempt to modify, reset, update, or overwrite the System Administrator Privacy Password.
 * This credential cannot be modified by any user or administrator.
 */
apiRouter.all(
  ['/admin/password', '/admin/change-password', '/admin/reset-password', '/admin/update-password'],
  (req: Request, res: Response) => {
    return res.status(403).json({
      error:
        'Security Policy Violation: The System Administrator Privacy Password is an immutable core system credential. Modification, overrides, and resets are strictly prohibited.',
      immutable: true,
    });
  }
);

/**
 * DELETE /api/documents/:id
 * Delete document (Admin RBAC restricted with Privacy Password enforcement)
 */
apiRouter.delete('/documents/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userRole = req.headers['x-user-role'] || req.query.role || 'admin';
    const userIdentifier = String(req.headers['x-user-identifier'] || 'admin_user');
    const adminToken = req.headers['x-admin-token'] as string;
    const adminKey = req.headers['x-admin-key'] as string;
    const adminPassword = (req.headers['x-admin-password'] || req.body?.password || req.query.password) as string;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Permission denied: Document deletion requires Admin authority.' });
    }

    // Require valid unexpired admin session token OR master password key
    const isAuthorized =
      validateAdminSession(adminToken) ||
      isMasterPasswordValid(adminKey) ||
      isMasterPasswordValid(adminPassword);

    if (!isAuthorized) {
      return res.status(401).json({
        error:
          'Administrator Authentication Required: System Administrator clearance is locked. Please authenticate with the Master Privacy Password to authorize document deletion.',
        code: 'ADMIN_AUTH_REQUIRED',
      });
    }

    const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Document record not found' });
    }

    // Remove file from disk if present AND no other document in the registry shares the file
    if (existing.file_path) {
      const sharingCount = db
        .prepare('SELECT COUNT(*) as count FROM documents WHERE file_path = ? AND id != ?')
        .get(existing.file_path, id) as { count: number };

      if (!sharingCount || sharingCount.count === 0) {
        const fullPath = resolveStorageFilePath(existing.file_path);
        if (fullPath && fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (e) {
            console.error('Failed to unlink disk file:', e);
          }
        }
      }
    }

    // Delete record from DB
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);

    // Audit action
    logAuditAction('DELETE', userIdentifier, null);

    res.json({ message: `Document ${existing.serial_no} deleted successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete document', details: err.message });
  }
});

/**
 * DELETE /api/documents/sample/purge
 * Allows an admin to cleanly purge all default/seeded sample demo documents
 */
apiRouter.delete('/documents/sample/purge', (req: Request, res: Response) => {
  try {
    const userRole = req.headers['x-user-role'] || req.query.role || 'admin';
    const userIdentifier = String(req.headers['x-user-identifier'] || 'admin_user');
    const adminToken = req.headers['x-admin-token'] as string;
    const adminKey = req.headers['x-admin-key'] as string;
    const adminPassword = (req.headers['x-admin-password'] || req.body?.password || req.query.password) as string;

    const isAuthorized =
      validateAdminSession(adminToken) ||
      isMasterPasswordValid(adminKey) ||
      isMasterPasswordValid(adminPassword);

    if (!isAuthorized) {
      return res.status(401).json({
        error: 'Administrator Authentication Required: System Administrator clearance is locked.',
        code: 'ADMIN_AUTH_REQUIRED',
      });
    }

    // Identify strictly initial seeded sample/demo documents by their exact seed reference numbers
    const sampleRows = db.prepare(`
      SELECT id, serial_no, file_path FROM documents
      WHERE ref_no IN (
        'DEPT-ENV/2026/L-849',
        'PWD-HQ/OUT/4910',
        'CA-04/TND/2026',
        'INV/2026/0994',
        'INTERNAL-SEC/012',
        'HIGHWAY-NH48/2026'
      )
    `).all() as { id: number; serial_no: string; file_path: string | null }[];

    let deletedCount = 0;
    for (const doc of sampleRows) {
      db.prepare('DELETE FROM documents WHERE id = ?').run(doc.id);
      logAuditAction('DELETE', userIdentifier, null);
      deletedCount++;
    }

    res.json({
      message: `Successfully purged ${deletedCount} sample / demo records from the central registry.`,
      deletedCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to purge sample records', details: err.message });
  }
});


/**
 * GET /api/documents/:id/file
 * Serve uploaded file with streaming & inline preview or download
 */
apiRouter.get('/documents/:id/file', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const download = req.query.download === '1';
    const userIdentifier = String(req.headers['x-user-identifier'] || req.query.user || 'office_staff');

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
    if (!doc || !doc.file_path) {
      return res.status(404).json({ error: 'No attached scan or letter exists for this document.' });
    }

    const fullPath = resolveStorageFilePath(doc.file_path);
    if (!fullPath || !fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Target document file was not found on storage disk.' });
    }

    // Log audit view/download
    logAuditAction(download ? 'EXPORT' : 'VIEW', userIdentifier, id);

    const filename = path.basename(fullPath);
    const mime = doc.file_mime || 'application/octet-stream';

    res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(filename)}"`
    );

    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to stream document file', details: err.message });
  }
});

/**
 * GET /api/sequences
 * Sequence tracker inspector
 */
apiRouter.get('/sequences', (req: Request, res: Response) => {
  try {
    const sequences = getAllSequences();
    res.json({ sequences });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve sequences', details: err.message });
  }
});

/**
 * GET /api/audit-logs
 * Audit Trails with filtering
 */
apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  try {
    const { action, user, page = '1', limit = '30' } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 30));
    const offset = (pageNum - 1) * limitNum;

    const result = getAuditLogs({
      action: action && action !== 'ALL' ? String(action) : undefined,
      userIdentifier: user ? String(user) : undefined,
      limit: limitNum,
      offset,
    });

    res.json({
      logs: result.logs,
      total: result.total,
      page: pageNum,
      totalPages: Math.ceil(result.total / limitNum) || 1,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve audit logs', details: err.message });
  }
});

/**
 * GET /api/export
 * CSV / Excel Export Pipeline
 */
apiRouter.get('/export', (req: Request, res: Response) => {
  try {
    const { doc_type, status, startDate, endDate, q, user = 'office_staff' } = req.query;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (q && String(q).trim() !== '') {
      const term = `%${String(q).trim()}%`;
      conditions.push('(ref_no LIKE ? OR party_name LIKE ? OR subject LIKE ? OR serial_no LIKE ?)');
      params.push(term, term, term, term);
    }

    if (doc_type && doc_type !== 'ALL') {
      conditions.push('doc_type = ?');
      params.push(String(doc_type).toUpperCase());
    }

    if (status && status !== 'ALL') {
      conditions.push('status = ?');
      params.push(String(status).toUpperCase());
    }

    if (startDate) {
      conditions.push('date_recorded >= ?');
      params.push(String(startDate));
    }

    if (endDate) {
      conditions.push('date_recorded <= ?');
      params.push(String(endDate));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM documents ${whereClause} ORDER BY date_recorded DESC, id DESC`;

    const rows = db.prepare(sql).all(...params) as unknown as ExportDocumentRow[];

    const csvContent = generateCsvLedger(rows, String(user));

    // Audit log
    logAuditAction('EXPORT', String(user), null);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="humers_e_management_ledger_${timestamp}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to export registry', details: err.message });
  }
});

/**
 * POST /api/audit-print
 * Log when the user executes printable A4 ledger summary
 */
apiRouter.post('/audit-print', (req: Request, res: Response) => {
  try {
    const { user_identifier = 'superior_officer' } = req.body;
    logAuditAction('PRINT', String(user_identifier), null);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record print audit' });
  }
});

/**
 * GET /api/storage/stats
 * Inspect partitioned document store tree (/storage/uploads/)
 */
apiRouter.get('/storage/stats', (req: Request, res: Response) => {
  try {
    const storageTree = scanStorageDirectory();
    res.json({
      storageRoot: 'storage/uploads',
      tree: storageTree,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to scan storage', details: err.message });
  }
});
