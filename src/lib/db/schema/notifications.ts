import {
  pgTable,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { users } from "./users";
import { documents } from "./documents";
import { documentRevisions } from "./document-revisions";
import { correctiveActionRequests } from "./corrective-action-requests";

export const notificationTypeEnum = [
  "APPROVAL_REQUEST",
  "DOCUMENT_REJECTED",
  "READ_ASSIGNMENT",
  "DOCUMENT_DISTRIBUTED",
  "REMINDER",
  "ESCALATION",
  "CAR_CREATED",
  "CAR_STATUS_CHANGED",
  "CAR_ACTION_ASSIGNED",
  "CAR_ACTION_COMPLETED",
  "CAR_CLOSURE_REQUESTED",
  "CAR_CLOSED",
  "CAR_REJECTED",
  "CAR_REMINDER",
  "CAR_OVERDUE",
  "CAR_ESCALATION",
] as const;

export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    type: text("type", { enum: notificationTypeEnum }).notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    relatedDocumentId: text("related_document_id").references(
      () => documents.id,
    ),
    relatedRevisionId: text("related_revision_id").references(
      () => documentRevisions.id,
    ),
    relatedCarId: text("related_car_id").references(
      () => correctiveActionRequests.id,
    ),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_is_read_idx").on(table.isRead),
    index("notifications_related_document_id_idx").on(
      table.relatedDocumentId,
    ),
    index("notifications_related_revision_id_idx").on(
      table.relatedRevisionId,
    ),
    index("notifications_related_car_id_idx").on(
      table.relatedCarId,
    ),
    index("notifications_user_read_created_idx").on(
      table.userId,
      table.isRead,
      table.createdAt,
    ),
  ],
);
