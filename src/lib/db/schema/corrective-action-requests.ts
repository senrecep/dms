import {
  pgTable,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { carStatusEnum } from "./enums";
import { carSources } from "./car-lookups";
import { carSystems } from "./car-lookups";
import { carProcesses } from "./car-lookups";
import { carCustomers } from "./car-lookups";
import { carProducts } from "./car-lookups";
import { carOperations } from "./car-lookups";
import { users } from "./users";
import { departments } from "./departments";
import { documents } from "./documents";

export const correctiveActionRequests = pgTable(
  "corrective_action_requests",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    carCode: text("car_code").notNull().unique(),
    status: carStatusEnum("status").notNull().default("OPEN"),
    sourceId: text("source_id")
      .notNull()
      .references(() => carSources.id),
    systemId: text("system_id").references(() => carSystems.id),
    processId: text("process_id").references(() => carProcesses.id),
    customerId: text("customer_id").references(() => carCustomers.id),
    productId: text("product_id").references(() => carProducts.id),
    operationId: text("operation_id").references(() => carOperations.id),
    relatedStandard: text("related_standard"),
    nonconformityDescription: text("nonconformity_description").notNull(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id),
    requesterDepartmentId: text("requester_department_id")
      .notNull()
      .references(() => departments.id),
    responsibleDepartmentId: text("responsible_department_id")
      .notNull()
      .references(() => departments.id),
    assigneeId: text("assignee_id")
      .notNull()
      .references(() => users.id),
    targetCompletionDate: timestamp("target_completion_date", {
      withTimezone: true,
    }).notNull(),
    closingDate: timestamp("closing_date", { withTimezone: true }),
    closedById: text("closed_by_id").references(() => users.id),
    closingApprovalNote: text("closing_approval_note"),
    dmsDocumentId: text("dms_document_id").references(() => documents.id),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index("car_status_idx").on(table.status),
    index("car_source_id_idx").on(table.sourceId),
    index("car_requester_id_idx").on(table.requesterId),
    index("car_assignee_id_idx").on(table.assigneeId),
    index("car_requester_department_id_idx").on(table.requesterDepartmentId),
    index("car_responsible_department_id_idx").on(
      table.responsibleDepartmentId,
    ),
    index("car_target_completion_date_idx").on(table.targetCompletionDate),
    index("car_is_deleted_idx").on(table.isDeleted),
    index("car_status_is_deleted_idx").on(table.status, table.isDeleted),
  ],
);
