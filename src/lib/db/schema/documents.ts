import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { documentStatusEnum, documentTypeEnum } from "./enums";
import { departments } from "./departments";
import { users } from "./users";

export const documents = pgTable(
  "documents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    documentCode: text("document_code").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    documentType: documentTypeEnum("document_type").notNull(),
    currentRevisionNo: integer("current_revision_no").notNull().default(1),
    status: documentStatusEnum("status").notNull().default("DRAFT"),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id),
    uploadedById: text("uploaded_by_id")
      .notNull()
      .references(() => users.id),
    preparerDepartmentId: text("preparer_department_id").references(
      () => departments.id,
    ),
    approverId: text("approver_id").references(() => users.id),
    filePath: text("file_path"),
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    mimeType: text("mime_type"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
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
    index("documents_document_code_idx").on(table.documentCode),
    index("documents_status_idx").on(table.status),
    index("documents_department_id_idx").on(table.departmentId),
    index("documents_uploaded_by_id_idx").on(table.uploadedById),
    index("documents_document_type_idx").on(table.documentType),
  ],
);
