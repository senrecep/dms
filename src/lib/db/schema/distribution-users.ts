import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { documents } from "./documents";
import { users } from "./users";

export const distributionUsers = pgTable(
  "distribution_users",
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("distribution_users_document_id_idx").on(table.documentId),
    index("distribution_users_user_id_idx").on(table.userId),
  ],
);
