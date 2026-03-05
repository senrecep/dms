import { pgTable, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { correctiveActionRequests } from "./corrective-action-requests";
import { carCorrectiveActions } from "./car-corrective-actions";
import { users } from "./users";

export const carActivityActionEnum = [
  "CREATED",
  "UPDATED",
  "STATUS_CHANGED",
  "ROOT_CAUSE_ADDED",
  "ROOT_CAUSE_UPDATED",
  "IMMEDIATE_ACTION_ADDED",
  "IMMEDIATE_ACTION_UPDATED",
  "ACTION_ADDED",
  "ACTION_UPDATED",
  "ACTION_COMPLETED",
  "CLOSURE_REQUESTED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
  "DELETED",
  "ATTACHMENT_ADDED",
  "ATTACHMENT_DELETED",
  "TEAM_MEMBER_ADDED",
  "TEAM_MEMBER_REMOVED",
] as const;

export const carActivityLogs = pgTable(
  "car_activity_logs",
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
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    action: text("action", { enum: carActivityActionEnum }).notNull(),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("car_activity_logs_car_id_idx").on(table.carId),
    index("car_activity_logs_user_id_idx").on(table.userId),
    index("car_activity_logs_action_idx").on(table.action),
    index("car_activity_logs_car_created_idx").on(
      table.carId,
      table.createdAt,
    ),
    index("car_activity_logs_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);
