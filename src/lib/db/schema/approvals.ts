import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { approvalStatusEnum } from "./enums";
import { documents } from "./documents";
import { users } from "./users";

export const approvalTypeEnum = ["INTERMEDIATE", "FINAL"] as const;

export const approvals = pgTable(
  "approvals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id),
    approverId: text("approver_id")
      .notNull()
      .references(() => users.id),
    approvalType: text("approval_type", {
      enum: approvalTypeEnum,
    }).notNull(),
    status: approvalStatusEnum("status").notNull().default("PENDING"),
    comment: text("comment"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("approvals_document_id_idx").on(table.documentId),
    index("approvals_approver_id_idx").on(table.approverId),
    index("approvals_status_idx").on(table.status),
  ],
);
