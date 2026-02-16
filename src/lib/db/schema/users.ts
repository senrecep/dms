import {
  pgTable,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { userRoleEnum } from "./enums";
import { departments } from "./departments";

export const users = pgTable(
  "user",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: userRoleEnum("role").notNull().default("USER"),
    departmentId: text("department_id").references(() => departments.id),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_department_id_idx").on(table.departmentId),
    index("users_role_idx").on(table.role),
    index("users_is_active_idx").on(table.isActive),
  ],
);
