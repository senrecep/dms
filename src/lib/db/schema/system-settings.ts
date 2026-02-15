import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { users } from "./users";

export const systemSettings = pgTable("system_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedById: text("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
