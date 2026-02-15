import { pgTable, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { documents } from "./documents";
import { users } from "./users";

export const activityActionEnum = [
  "UPLOADED",
  "APPROVED",
  "REJECTED",
  "READ",
  "REVISED",
  "CANCELLED",
  "PUBLISHED",
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
    index("activity_logs_user_id_idx").on(table.userId),
    index("activity_logs_action_idx").on(table.action),
  ],
);
