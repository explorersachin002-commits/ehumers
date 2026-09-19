import { db } from './db.js';

export interface AuditLogEntry {
  id: number;
  document_id: number | null;
  action: string;
  user_identifier: string;
  timestamp: string;
  serial_no?: string | null;
  subject?: string | null;
  doc_type?: string | null;
}

/**
 * Log an audit trail entry.
 */
export function logAuditAction(
  action:
    | 'INSERT'
    | 'UPDATE'
    | 'STATUS_CHANGE'
    | 'EXPORT'
    | 'PRINT'
    | 'VIEW'
    | 'DELETE'
    | 'ADMIN_LOGIN'
    | 'ADMIN_LOGOUT'
    | 'ADMIN_LOGIN_FAILED',
  userIdentifier: string,
  documentId?: number | null
) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (document_id, action, user_identifier, timestamp)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(documentId || null, action, userIdentifier);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

/**
 * Query audit logs with joined document serial number and subject.
 */
export function getAuditLogs(options?: {
  limit?: number;
  offset?: number;
  documentId?: number;
  action?: string;
  userIdentifier?: string;
}): { logs: AuditLogEntry[]; total: number } {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.documentId) {
    conditions.push('a.document_id = ?');
    params.push(options.documentId);
  }

  if (options?.action) {
    conditions.push('a.action = ?');
    params.push(options.action);
  }

  if (options?.userIdentifier) {
    conditions.push('a.user_identifier LIKE ?');
    params.push(`%${options.userIdentifier}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM audit_logs a ${whereClause}`;
  const totalRow = db.prepare(countQuery).get(...params) as { total: number };
  const total = totalRow ? totalRow.total : 0;

  const selectQuery = `
    SELECT 
      a.id, 
      a.document_id, 
      a.action, 
      a.user_identifier, 
      a.timestamp,
      d.serial_no,
      d.subject,
      d.doc_type
    FROM audit_logs a
    LEFT JOIN documents d ON a.document_id = d.id
    ${whereClause}
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT ? OFFSET ?
  `;

  const logs = db.prepare(selectQuery).all(...params, limit, offset) as unknown as AuditLogEntry[];

  return { logs, total };
}
