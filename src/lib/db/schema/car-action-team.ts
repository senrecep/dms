import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { carCorrectiveActions } from "./car-corrective-actions";
import { users } from "./users";

export const carActionTeam = pgTable(
  "car_action_team",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    correctiveActionId: text("corrective_action_id")
      .notNull()
      .references(() => carCorrectiveActions.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("car_action_team_action_user_idx").on(
      table.correctiveActionId,
      table.userId,
    ),
    index("car_action_team_corrective_action_id_idx").on(
      table.correctiveActionId,
    ),
    index("car_action_team_user_id_idx").on(table.userId),
  ],
);
