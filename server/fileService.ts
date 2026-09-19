import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.docx',
  '.doc',
  '.xlsx',
  '.txt',
]);

const STORAGE_ROOT = path.resolve(process.cwd(), 'storage', 'uploads');

export interface ValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: string;
}

export interface StoredFileInfo {
  relativePath: string;
  absolutePath: string;
  fileMime: string;
  fileSizeKb: number;
  originalName: string;
}

/**
 * Magic Bytes inspection for detecting MIME spoofing and verifying document file signatures.
 */
export function verifyMagicBytes(
  buffer: Buffer,
  hintExt?: string
): { valid: boolean; detectedMime?: string; error?: string } {
  if (!buffer || buffer.length < 2) {
    return { valid: false, error: 'File is empty or too small to inspect binary header' };
  }

  // Explicit safety block against executables and binary scripts
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { valid: false, error: 'Executable binaries (.exe, DOS MZ) are strictly disallowed.' };
  }
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { valid: false, error: 'Linux ELF executables are strictly disallowed.' };
  }

  // 1. PDF signature (%PDF-) in the header (search within first 1024 bytes)
  const headerSlice = buffer.subarray(0, Math.min(buffer.length, 1024));
  const pdfPos = headerSlice.indexOf('%PDF-');
  if (pdfPos !== -1) {
    return { valid: true, detectedMime: 'application/pdf' };
  }

  // 2. PNG Magic Bytes: 0x89 0x50 0x4E 0x47
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { valid: true, detectedMime: 'image/png' };
  }

  // 3. JPEG / JPG Magic Bytes: 0xFF 0xD8 (Standard JPEG SOI marker)
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // 4. ZIP / Office OpenXML (.docx, .xlsx): PK\x03\x04
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  ) {
    if (hintExt === '.xlsx') {
      return { valid: true, detectedMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }
    return { valid: true, detectedMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }

  // 5. OLE Compound Binary (.doc, .xls legacy)
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    return { valid: true, detectedMime: 'application/msword' };
  }

  // 6. Plain text (.txt)
  if (hintExt === '.txt') {
    return { valid: true, detectedMime: 'text/plain' };
  }

  // 7. If file extension is allowed and content is safe non-executable binary/text, permit with extension MIME
  if (hintExt === '.pdf') {
    // If it was supposed to be a PDF but had no %PDF-
    return { valid: false, error: 'File extension is .pdf but content is missing valid PDF header (%PDF-).' };
  }
  if (hintExt === '.jpg' || hintExt === '.jpeg') {
    return { valid: false, error: 'File extension is JPEG but content is missing valid JPEG header.' };
  }
  if (hintExt === '.png') {
    return { valid: false, error: 'File extension is PNG but content is missing valid PNG header.' };
  }

  return {
    valid: false,
    error: 'MIME validation failed: Document format could not be verified.',
  };
}

/**
 * Validates extension, file size, and binary magic bytes.
 */
export function validateUploadedFile(file: { originalname: string; size: number; buffer: Buffer }): ValidationResult {
  // 1. File Size Limit
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds the strict 25 MB limit.`,
    };
  }

  // 2. Extension check
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Invalid file extension "${ext}". Authorized formats: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}.`,
    };
  }

  // 3. Magic Bytes verification
  const magicCheck = verifyMagicBytes(file.buffer, ext);
  if (!magicCheck.valid) {
    return magicCheck;
  }

  return { valid: true, detectedMime: magicCheck.detectedMime };
}

/**
 * Saves the validated file buffer into partitioned directory structure:
 * /storage/uploads/YYYY/MM/UUID.ext
 * Also guarantees no path traversal.
 */
export function storeValidatedFile(
  file: { originalname: string; size: number; buffer: Buffer },
  docType: string,
  detectedMime: string
): StoredFileInfo {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Subfolder partitioning by Year/Month
  const targetDir = path.join(STORAGE_ROOT, year, month);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const safeUuid = crypto.randomUUID();
  const filename = `${safeUuid}${ext}`;

  // Prevent path traversal check
  const destinationPath = path.join(targetDir, filename);
  const relativeFromRoot = path.relative(STORAGE_ROOT, destinationPath);
  if (relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
    throw new Error('Security alert: Illegal path traversal detected');
  }

  fs.writeFileSync(destinationPath, file.buffer);

  const relativePath = path.join(year, month, filename).replace(/\\/g, '/');
  const fileSizeKb = Math.ceil(file.size / 1024);

  return {
    relativePath,
    absolutePath: destinationPath,
    fileMime: detectedMime,
    fileSizeKb,
    originalName: file.originalname,
  };
}

/**
 * Safely resolves an uploaded file by its relative path.
 * Checks for path traversal to ensure secure delivery.
 */
export function resolveStorageFilePath(relativePath: string): string | null {
  if (!relativePath) return null;
  // Sanitize path
  const sanitized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const resolved = path.join(STORAGE_ROOT, sanitized);

  const check = path.relative(STORAGE_ROOT, resolved);
  if (check.startsWith('..') || path.isAbsolute(check)) {
    return null; // Path traversal blocked
  }

  if (fs.existsSync(resolved)) {
    return resolved;
  }
  return null;
}

/**
 * Inspect storage directories for Directory Browser / Storage Inspection view.
 */
export interface StorageNode {
  name: string;
  relativePath: string;
  type: 'directory' | 'file';
  sizeBytes?: number;
  fileCount?: number;
  children?: StorageNode[];
}

export function scanStorageDirectory(dirPath: string = STORAGE_ROOT, relBase = ''): StorageNode {
  if (!fs.existsSync(dirPath)) {
    return { name: 'uploads', relativePath: '', type: 'directory', sizeBytes: 0, fileCount: 0, children: [] };
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const children: StorageNode[] = [];
  let totalSize = 0;
  let totalFiles = 0;

  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    const itemRel = relBase ? `${relBase}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const sub = scanStorageDirectory(full, itemRel);
      totalSize += sub.sizeBytes || 0;
      totalFiles += sub.fileCount || 0;
      children.push(sub);
    } else if (entry.isFile()) {
      const stat = fs.statSync(full);
      totalSize += stat.size;
      totalFiles += 1;
      children.push({
        name: entry.name,
        relativePath: itemRel,
        type: 'file',
        sizeBytes: stat.size,
      });
    }
  }

  return {
    name: path.basename(dirPath),
    relativePath: relBase,
    type: 'directory',
    sizeBytes: totalSize,
    fileCount: totalFiles,
    children,
  };
}
