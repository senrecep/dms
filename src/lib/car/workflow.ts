/**
 * CAR (Corrective Action Request) Workflow Engine
 *
 * Pure state machine logic - no database calls, no "use server".
 * Defines the 7-stage status lifecycle and transition rules.
 *
 * Status Flow:
 *   OPEN -> ROOT_CAUSE_ANALYSIS -> IMMEDIATE_ACTION -> PLANNED_ACTION
 *     -> ACTION_RESULTS -> PENDING_CLOSURE -> CLOSED
 *
 * Special transitions:
 *   PENDING_CLOSURE -> ACTION_RESULTS (rejection)
 *   Any non-terminal -> CANCELLED
 */

// --- Valid transitions map ---

export const CAR_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["ROOT_CAUSE_ANALYSIS", "CANCELLED"],
  ROOT_CAUSE_ANALYSIS: ["IMMEDIATE_ACTION", "CANCELLED"],
  IMMEDIATE_ACTION: ["PLANNED_ACTION", "CANCELLED"],
  PLANNED_ACTION: ["ACTION_RESULTS", "CANCELLED"],
  ACTION_RESULTS: ["PENDING_CLOSURE", "CANCELLED"],
  PENDING_CLOSURE: ["CLOSED", "ACTION_RESULTS", "CANCELLED"],
  CLOSED: [],
  CANCELLED: [],
};

// --- Status display order for workflow stepper ---

export const CAR_STATUS_ORDER = [
  "OPEN",
  "ROOT_CAUSE_ANALYSIS",
  "IMMEDIATE_ACTION",
  "PLANNED_ACTION",
  "ACTION_RESULTS",
  "PENDING_CLOSURE",
  "CLOSED",
] as const;

export type CarStatus = (typeof CAR_STATUS_ORDER)[number] | "CANCELLED";

// --- Status colors for badges (light + dark mode) ---

export const CAR_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  ROOT_CAUSE_ANALYSIS:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  IMMEDIATE_ACTION:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  PLANNED_ACTION:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  ACTION_RESULTS:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  PENDING_CLOSURE:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  CLOSED:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  CANCELLED:
    "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

// --- Pure functions ---

/**
 * Check if a transition from currentStatus to nextStatus is valid.
 */
export function isValidTransition(
  currentStatus: string,
  nextStatus: string,
): boolean {
  return CAR_TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
}

/**
 * Get the next status in the linear workflow (excludes CANCELLED).
 * Returns null if the current status is terminal or not found.
 */
export function getNextStatus(currentStatus: string): string | null {
  const currentIndex = CAR_STATUS_ORDER.indexOf(
    currentStatus as (typeof CAR_STATUS_ORDER)[number],
  );
  if (currentIndex === -1 || currentIndex >= CAR_STATUS_ORDER.length - 1) {
    return null;
  }
  return CAR_STATUS_ORDER[currentIndex + 1];
}

/**
 * Check if a status is terminal (no further transitions possible).
 */
export function isTerminalStatus(status: string): boolean {
  return status === "CLOSED" || status === "CANCELLED";
}

/**
 * Get the index of a status in the workflow order.
 * Returns -1 for CANCELLED or unknown statuses.
 */
export function getStatusIndex(status: string): number {
  return CAR_STATUS_ORDER.indexOf(
    status as (typeof CAR_STATUS_ORDER)[number],
  );
}

/**
 * Check if a status has been completed (is before currentStatus in the order).
 */
export function isStatusCompleted(
  status: string,
  currentStatus: string,
): boolean {
  const statusIndex = getStatusIndex(status);
  const currentIndex = getStatusIndex(currentStatus);
  if (statusIndex === -1 || currentIndex === -1) return false;
  return statusIndex < currentIndex;
}

/**
 * Get all valid next statuses from the current status.
 */
export function getValidNextStatuses(currentStatus: string): string[] {
  return CAR_TRANSITIONS[currentStatus] ?? [];
}
