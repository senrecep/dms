import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { documentRevisions } from "./document-revisions";
import { departments } from "./departments";

export const distributionLists = pgTable(
  "distribution_lists",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    revisionId: text("revision_id")
      .notNull()
      .references(() => documentRevisions.id),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("distribution_lists_revision_id_idx").on(table.revisionId),
    index("distribution_lists_department_id_idx").on(table.departmentId),
  ],
);
