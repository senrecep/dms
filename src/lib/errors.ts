/**
 * Shared error classification for server actions and API routes.
 * Maps PostgreSQL and filesystem errors to user-friendly error codes.
 */

export type ActionError = {
  success: false;
  error: string;
  errorCode: string;
  maxSize?: number;
};

export type ActionSuccess<T = Record<string, unknown>> = {
  success: true;
} & T;

export type ActionResult<T = Record<string, unknown>> = ActionSuccess<T> | ActionError;

/**
 * Classify a caught error into a structured ActionError response.
 */
export function classifyError(error: unknown): ActionError {
  if (error instanceof Error) {
    // PostgreSQL unique constraint violation (code 23505)
    if (hasCode(error, "23505")) {
      if (error.message.includes("document_code")) {
        return err("DOCUMENT_CODE_EXISTS", "Document code already exists");
      }
      if (error.message.includes("email")) {
        return err("EMAIL_EXISTS", "A user with this email already exists");
      }
      if (error.message.includes("slug")) {
        return err("SLUG_EXISTS", "A department with this slug already exists");
      }
      return err("DUPLICATE_ENTRY", "A duplicate entry was found");
    }

    // PostgreSQL foreign key violation (code 23503)
    if (hasCode(error, "23503")) {
      return err("REFERENCE_ERROR", "Referenced record not found");
    }

    // PostgreSQL not-null violation (code 23502)
    if (hasCode(error, "23502")) {
      return err("REQUIRED_FIELD", "A required field is missing");
    }

    // File system errors
    if (hasCode(error, "EACCES")) {
      return err("FILE_SYSTEM_ERROR", "Permission denied when saving file");
    }
    if (hasCode(error, "ENOSPC")) {
      return err("DISK_FULL", "No disk space available");
    }

    // Auth errors
    if (error.message === "Unauthorized") {
      return err("UNAUTHORIZED", "Authentication required");
    }
    if (error.message === "Forbidden") {
      return err("FORBIDDEN", "You do not have permission to perform this action");
    }
  }

  return err(
    "UNEXPECTED_ERROR",
    error instanceof Error ? error.message : "An unexpected error occurred",
  );
}

function err(errorCode: string, error: string): ActionError {
  return { success: false, error, errorCode };
}

function hasCode(error: Error, code: string): boolean {
  return "code" in error && (error as { code: string }).code === code;
}
