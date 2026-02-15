import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { documentRevisions } from "./document-revisions";
import { users } from "./users";

export const readConfirmations = pgTable(
  "read_confirmations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    revisionId: text("revision_id")
      .notNull()
      .references(() => documentRevisions.id),
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
    index("read_confirmations_revision_id_idx").on(table.revisionId),
    index("read_confirmations_user_id_idx").on(table.userId),
  ],
);
