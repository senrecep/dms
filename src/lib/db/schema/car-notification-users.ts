import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { correctiveActionRequests } from "./corrective-action-requests";
import { users } from "./users";

export const carNotificationUsers = pgTable(
  "car_notification_users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    carId: text("car_id")
      .notNull()
      .references(() => correctiveActionRequests.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("car_notification_users_car_user_idx").on(
      table.carId,
      table.userId,
    ),
    index("car_notification_users_car_id_idx").on(table.carId),
    index("car_notification_users_user_id_idx").on(table.userId),
  ],
);
