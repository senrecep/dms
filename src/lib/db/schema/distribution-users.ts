import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { documentRevisions } from "./document-revisions";
import { users } from "./users";

export const distributionUsers = pgTable(
  "distribution_users",
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("distribution_users_revision_id_idx").on(table.revisionId),
    index("distribution_users_user_id_idx").on(table.userId),
  ],
);
