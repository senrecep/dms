import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { documentStatusEnum } from "./enums";
import { documents } from "./documents";
import { users } from "./users";

export const documentRevisions = pgTable(
  "document_revisions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id),
    revisionNo: integer("revision_no").notNull(),
    filePath: text("file_path").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size"),
    mimeType: text("mime_type"),
    changes: text("changes"),
    status: documentStatusEnum("status").notNull(),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("document_revisions_document_id_idx").on(table.documentId),
    index("document_revisions_created_by_id_idx").on(table.createdById),
  ],
);
