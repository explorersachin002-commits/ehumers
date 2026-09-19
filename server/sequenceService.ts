import { db } from './db.js';

export const DOC_CODE_MAP: Record<string, string> = {
  INWARD: 'IN',
  OUTWARD: 'OUT',
  TENDER: 'TENDER',
  BILL: 'BILL',
  INTERNAL: 'INTERNAL',
};

export interface SequenceRecord {
  year: number;
  doc_type: string;
  current_val: number;
  prefix_code: string;
  next_serial_preview: string;
}

/**
 * Thread-safe atomic generation of the next running serial number.
 * Guarantees non-colliding serial numbers formatted as:
 * REG/YYYY/IN/00001
 */
export function getNextSerialNumber(docType: string, yearInput?: number): { serialNo: string; year: number; sequenceVal: number } {
  const normalizedDocType = docType.toUpperCase();
  if (!DOC_CODE_MAP[normalizedDocType]) {
    throw new Error(`Invalid document type: ${docType}`);
  }

  const year = yearInput || new Date().getFullYear();
  const code = DOC_CODE_MAP[normalizedDocType];

  // Atomic increment within SQLite:
  // We execute atomic UPSERT or check-and-increment
  db.exec('BEGIN IMMEDIATE');
  try {
    const existing = db
      .prepare('SELECT current_val FROM sequence_tracker WHERE year = ? AND doc_type = ?')
      .get(year, normalizedDocType) as { current_val: number } | undefined;

    let nextVal = 1;
    if (existing) {
      nextVal = existing.current_val + 1;
    }

    // Safety check: Ensure nextVal never collides with any existing document in the ledger
    let candidateVal = nextVal;
    while (true) {
      const testSerial = `REG/${year}/${code}/${String(candidateVal).padStart(5, '0')}`;
      const docExists = db.prepare('SELECT 1 FROM documents WHERE serial_no = ?').get(testSerial);
      if (!docExists) {
        nextVal = candidateVal;
        break;
      }
      candidateVal++;
    }

    if (existing) {
      db.prepare('UPDATE sequence_tracker SET current_val = ? WHERE year = ? AND doc_type = ?').run(
        nextVal,
        year,
        normalizedDocType
      );
    } else {
      db.prepare('INSERT INTO sequence_tracker (year, doc_type, current_val) VALUES (?, ?, ?)').run(
        year,
        normalizedDocType,
        nextVal
      );
    }

    db.exec('COMMIT');

    const paddedVal = String(nextVal).padStart(5, '0');
    const serialNo = `REG/${year}/${code}/${paddedVal}`;
    return { serialNo, year, sequenceVal: nextVal };
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch (_rbErr) {
      // Ignore if transaction was already aborted or not active
    }
    throw err;
  }
}

/**
 * Preview what the next serial number will be without incrementing.
 */
export function previewNextSerialNumber(docType: string, yearInput?: number): string {
  const normalizedDocType = docType.toUpperCase();
  const code = DOC_CODE_MAP[normalizedDocType] || 'DOC';
  const year = yearInput || new Date().getFullYear();

  const existing = db
    .prepare('SELECT current_val FROM sequence_tracker WHERE year = ? AND doc_type = ?')
    .get(year, normalizedDocType) as { current_val: number } | undefined;

  let nextVal = (existing ? existing.current_val : 0) + 1;
  while (true) {
    const testSerial = `REG/${year}/${code}/${String(nextVal).padStart(5, '0')}`;
    const docExists = db.prepare('SELECT 1 FROM documents WHERE serial_no = ?').get(testSerial);
    if (!docExists) break;
    nextVal++;
  }
  return `REG/${year}/${code}/${String(nextVal).padStart(5, '0')}`;
}

/**
 * Return all sequence status records for monitoring.
 */
export function getAllSequences(): SequenceRecord[] {
  const currentYear = new Date().getFullYear();
  const rows = db
    .prepare('SELECT year, doc_type, current_val FROM sequence_tracker ORDER BY year DESC, doc_type ASC')
    .all() as { year: number; doc_type: string; current_val: number }[];

  const docTypes = ['INWARD', 'OUTWARD', 'TENDER', 'BILL', 'INTERNAL'];

  // Map and include current year entries if not present yet
  const resultMap = new Map<string, SequenceRecord>();

  docTypes.forEach((dt) => {
    const key = `${currentYear}-${dt}`;
    resultMap.set(key, {
      year: currentYear,
      doc_type: dt,
      current_val: 0,
      prefix_code: DOC_CODE_MAP[dt],
      next_serial_preview: `REG/${currentYear}/${DOC_CODE_MAP[dt]}/00001`,
    });
  });

  rows.forEach((r) => {
    const key = `${r.year}-${r.doc_type}`;
    const code = DOC_CODE_MAP[r.doc_type] || r.doc_type;
    resultMap.set(key, {
      year: r.year,
      doc_type: r.doc_type,
      current_val: r.current_val,
      prefix_code: code,
      next_serial_preview: `REG/${r.year}/${code}/${String(r.current_val + 1).padStart(5, '0')}`,
    });
  });

  return Array.from(resultMap.values());
}
