import { z } from "zod/v4";

const serverSchema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("DMS <noreply@example.com>"),
  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().default(500),
  DEFAULT_REMINDER_DAYS: z.coerce.number().default(3),
  DEFAULT_ESCALATION_DAYS: z.coerce.number().default(7),
  CRON_SECRET: z.string().default("dev-cron-secret-change-in-production"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_APP_NAME: z.string().default("DMS"),
});

export const env = {
  ...serverSchema.parse(process.env),
  ...clientSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  }),
};

export type Env = z.infer<typeof serverSchema> & z.infer<typeof clientSchema>;
