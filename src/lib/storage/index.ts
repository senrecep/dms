import { createReadStream, existsSync } from "node:fs";
import { mkdir, readdir, unlink, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";
import { env } from "@/lib/env";
import { generateUploadPath, generateUniqueFileName, sanitizeFileName } from "./path";

export type FileMetadata = {
  path: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  hash: string;
};

/**
 * Ensure the upload directory for a document exists, creating it recursively if needed.
 */
export async function ensureUploadDir(documentId?: string): Promise<string> {
  const dir = documentId ? generateUploadPath(documentId) : "./uploads";
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Save an uploaded file to disk under the document's upload directory.
 */
export async function saveFile(
  file: File,
  documentId: string,
): Promise<FileMetadata> {
  const dir = await ensureUploadDir(documentId);

  // Read file buffer and compute hash
  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex");

  // Generate unique filename
  const existing = existsSync(dir) ? await readdir(dir) : [];
  const fileName = generateUniqueFileName(existing, file.name);
  const filePath = path.join(dir, fileName);

  await writeFile(filePath, buffer);

  return {
    path: path.relative(path.resolve(env.UPLOAD_DIR), path.resolve(filePath)),
    fileName,
    originalName: file.name,
    size: file.size,
    mimeType: file.type || getMimeType(fileName),
    hash,
  };
}

/**
 * Get the full file path for a document's file.
 */
export function getFilePath(documentId: string, fileName: string): string {
  const dir = generateUploadPath(documentId);
  return path.join(dir, sanitizeFileName(fileName));
}

/**
 * Delete a file from disk.
 */
export async function deleteFile(filePath: string): Promise<void> {
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}

/**
 * Get a ReadableStream for a file, suitable for streaming responses.
 */
export function getFileStream(filePath: string): ReadableStream {
  const nodeStream = createReadStream(filePath);
  return Readable.toWeb(nodeStream) as ReadableStream;
}

/**
 * Get file size in bytes. Returns null if the file doesn't exist.
 */
export async function getFileSize(filePath: string): Promise<number | null> {
  try {
    const stats = await stat(filePath);
    return stats.size;
  } catch {
    return null;
  }
}

/** Common MIME type mapping from file extension. */
const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".zip": "application/zip",
  ".rar": "application/vnd.rar",
  ".7z": "application/x-7z-compressed",
};

export function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}
