import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { users } from "./users";

export const userPermissions = pgTable(
  "user_permissions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    permission: text("permission").notNull(),
    grantedById: text("granted_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_permissions_user_permission_idx").on(
      table.userId,
      table.permission,
    ),
    index("user_permissions_user_id_idx").on(table.userId),
    index("user_permissions_permission_idx").on(table.permission),
  ],
);
