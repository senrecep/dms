import path from "node:path";
import { env } from "@/lib/env";

/**
 * Generate the upload directory path for a document.
 * Pattern: {UPLOAD_DIR}/{year}/{month}/{documentId}/
 */
export function generateUploadPath(documentId: string): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");

  return path.join(env.UPLOAD_DIR, year, month, documentId);
}

/**
 * Sanitize a filename by removing special characters while preserving the extension.
 */
export function sanitizeFileName(fileName: string): string {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);

  // Replace special chars with hyphens, collapse multiples, trim edges
  const sanitized = base
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return (sanitized || "file") + ext.toLowerCase();
}

/**
 * Generate a unique filename by appending a numeric suffix if the base name already exists.
 */
export function generateUniqueFileName(
  existingFiles: string[],
  fileName: string,
): string {
  const sanitized = sanitizeFileName(fileName);

  if (!existingFiles.includes(sanitized)) {
    return sanitized;
  }

  const ext = path.extname(sanitized);
  const base = path.basename(sanitized, ext);
  let counter = 1;

  while (existingFiles.includes(`${base}-${counter}${ext}`)) {
    counter++;
  }

  return `${base}-${counter}${ext}`;
}

/**
 * Resolve and validate that a file path is within the uploads directory.
 * Returns the resolved absolute path or null if the path escapes the upload root.
 *
 * Handles both legacy paths that include the upload dir prefix (e.g. "uploads/2026/...")
 * and paths relative to the upload dir (e.g. "2026/...").
 */
export function resolveSecurePath(filePath: string): string | null {
  const uploadRoot = path.resolve(env.UPLOAD_DIR);
  const uploadDirName = path.basename(uploadRoot);

  // Strip upload directory prefix if path already includes it (legacy stored paths)
  let normalizedPath = filePath;
  if (normalizedPath.startsWith(uploadDirName + "/")) {
    normalizedPath = normalizedPath.slice(uploadDirName.length + 1);
  }

  const resolved = path.resolve(uploadRoot, normalizedPath);

  if (!resolved.startsWith(uploadRoot + path.sep) && resolved !== uploadRoot) {
    return null;
  }

  return resolved;
}
