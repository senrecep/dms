import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { correctiveActionRequests } from "./corrective-action-requests";
import { users } from "./users";

export const carImmediateActions = pgTable(
  "car_immediate_actions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    carId: text("car_id")
      .notNull()
      .references(() => correctiveActionRequests.id),
    description: text("description").notNull(),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index("car_immediate_actions_car_id_idx").on(table.carId)],
);
