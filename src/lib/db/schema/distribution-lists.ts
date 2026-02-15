import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { documents } from "./documents";
import { departments } from "./departments";

export const distributionLists = pgTable(
  "distribution_lists",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("distribution_lists_document_id_idx").on(table.documentId),
    index("distribution_lists_department_id_idx").on(table.departmentId),
  ],
);
