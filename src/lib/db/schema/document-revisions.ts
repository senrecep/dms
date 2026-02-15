import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { documentStatusEnum, documentTypeEnum } from "./enums";
import { documents } from "./documents";
import { departments } from "./departments";
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
    title: text("title").notNull(),
    description: text("description"),
    documentType: documentTypeEnum("document_type").notNull(),
    status: documentStatusEnum("status").notNull().default("DRAFT"),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id),
    preparerDepartmentId: text("preparer_department_id").references(
      () => departments.id,
    ),
    preparerId: text("preparer_id")
      .notNull()
      .references(() => users.id),
    approverId: text("approver_id").references(() => users.id),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    filePath: text("file_path").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size"),
    mimeType: text("mime_type"),
    changes: text("changes"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    unique("document_revisions_document_id_revision_no_unique").on(
      table.documentId,
      table.revisionNo,
    ),
    index("document_revisions_document_id_idx").on(table.documentId),
    index("document_revisions_status_idx").on(table.status),
    index("document_revisions_department_id_idx").on(table.departmentId),
    index("document_revisions_preparer_id_idx").on(table.preparerId),
    index("document_revisions_approver_id_idx").on(table.approverId),
    index("document_revisions_created_by_id_idx").on(table.createdById),
    index("document_revisions_doc_status_rev_idx").on(
      table.documentId,
      table.status,
      table.revisionNo,
    ),
  ],
);
