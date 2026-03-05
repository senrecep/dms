import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { carAttachmentSectionEnum } from "./enums";
import { correctiveActionRequests } from "./corrective-action-requests";
import { carCorrectiveActions } from "./car-corrective-actions";
import { users } from "./users";

export const carAttachments = pgTable(
  "car_attachments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    carId: text("car_id")
      .notNull()
      .references(() => correctiveActionRequests.id),
    correctiveActionId: text("corrective_action_id").references(
      () => carCorrectiveActions.id,
    ),
    section: carAttachmentSectionEnum("section").notNull(),
    filePath: text("file_path").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size"),
    mimeType: text("mime_type"),
    uploadedById: text("uploaded_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("car_attachments_car_id_idx").on(table.carId),
    index("car_attachments_corrective_action_id_idx").on(
      table.correctiveActionId,
    ),
    index("car_attachments_section_idx").on(table.section),
  ],
);
