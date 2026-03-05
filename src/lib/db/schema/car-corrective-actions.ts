import {
  pgTable,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { carActionStatusEnum } from "./enums";
import { correctiveActionRequests } from "./corrective-action-requests";
import { users } from "./users";

export const carCorrectiveActions = pgTable(
  "car_corrective_actions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    carId: text("car_id")
      .notNull()
      .references(() => correctiveActionRequests.id),
    description: text("description").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    targetDate: timestamp("target_date", { withTimezone: true }).notNull(),
    status: carActionStatusEnum("status").notNull().default("OPEN"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    results: text("results"),
    cost: text("cost"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
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
    index("car_corrective_actions_car_id_idx").on(table.carId),
    index("car_corrective_actions_owner_id_idx").on(table.ownerId),
    index("car_corrective_actions_status_idx").on(table.status),
    index("car_corrective_actions_target_date_idx").on(table.targetDate),
  ],
);
