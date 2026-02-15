import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { documents } from "./documents";
import { users } from "./users";

export const readConfirmations = pgTable(
  "read_confirmations",
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
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("read_confirmations_document_id_idx").on(table.documentId),
    index("read_confirmations_user_id_idx").on(table.userId),
  ],
);
