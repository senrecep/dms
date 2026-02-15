import { pgTable, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { documents } from "./documents";
import { documentRevisions } from "./document-revisions";
import { users } from "./users";

export const activityActionEnum = [
  "UPLOADED",
  "SUBMITTED",
  "APPROVED",
  "PREPARER_APPROVED",
  "PREPARER_REJECTED",
  "APPROVER_REJECTED",
  "REJECTED",
  "READ",
  "REVISED",
  "PUBLISHED",
  "CANCELLED",
] as const;

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id),
    revisionId: text("revision_id").references(() => documentRevisions.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    action: text("action", { enum: activityActionEnum }).notNull(),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activity_logs_document_id_idx").on(table.documentId),
    index("activity_logs_revision_id_idx").on(table.revisionId),
    index("activity_logs_user_id_idx").on(table.userId),
    index("activity_logs_action_idx").on(table.action),
  ],
);
