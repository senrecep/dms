import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, departments, systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "System Admin";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@dms.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

async function seed() {
  if (!ADMIN_PASSWORD) {
    console.error("SEED_ADMIN_PASSWORD is required. Set it in .env.local");
    process.exit(1);
  }

  console.log("Seeding database...\n");

  // 1. Create departments
  console.log("Creating departments...");
  const deptData = [
    { name: "Quality", slug: "quality", description: "Quality Management" },
    { name: "Production", slug: "production", description: "Production Department" },
    { name: "Engineering", slug: "engineering", description: "Engineering Department" },
    { name: "Human Resources", slug: "hr", description: "Human Resources Department" },
  ];

  const createdDepts = await db
    .insert(departments)
    .values(deptData)
    .onConflictDoNothing()
    .returning();

  console.log(`  Created ${createdDepts.length} departments`);

  // 2. Create admin user via Better Auth
  console.log("Creating admin user...");

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    console.log("  Admin user already exists, skipping...");
  } else {
    await auth.api.signUpEmail({
      body: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    });

    // Update role to ADMIN
    await db
      .update(users)
      .set({ role: "ADMIN" })
      .where(eq(users.email, ADMIN_EMAIL));

    console.log("  Admin user created:");
    console.log(`    Name:     ${ADMIN_NAME}`);
    console.log(`    Email:    ${ADMIN_EMAIL}`);
    console.log("    Role:     ADMIN");
  }

  // 3. Create default system settings
  console.log("Creating system settings...");
  const settingsData = [
    {
      key: "app_name",
      value: "DMS",
      description: "Application display name",
    },
    {
      key: "default_reminder_days",
      value: "3",
      description: "Days before sending unread document reminders",
    },
    {
      key: "default_escalation_days",
      value: "7",
      description: "Days before escalating pending approvals",
    },
    {
      key: "read_reminder_days",
      value: "3",
      description: "Days before sending read confirmation reminders",
    },
    {
      key: "email_provider",
      value: "resend",
      description: "Email provider: resend or smtp",
    },
    {
      key: "email_from",
      value: process.env.EMAIL_FROM || "DMS <noreply@example.com>",
      description: "Default sender email address",
    },
    {
      key: "email_resend_api_key",
      value: process.env.RESEND_API_KEY || "",
      description: "Resend API key for email delivery",
    },
    {
      key: "email_smtp_host",
      value: "",
      description: "SMTP server hostname",
    },
    {
      key: "email_smtp_port",
      value: "587",
      description: "SMTP server port",
    },
    {
      key: "email_smtp_user",
      value: "",
      description: "SMTP authentication username",
    },
    {
      key: "email_smtp_pass",
      value: "",
      description: "SMTP authentication password",
    },
    {
      key: "email_smtp_secure",
      value: "false",
      description: "Use SSL/TLS for SMTP connection",
    },
    {
      key: "email_language",
      value: "en",
      description: "Email template language: tr or en",
    },
  ];

  const createdSettings = await db
    .insert(systemSettings)
    .values(settingsData)
    .onConflictDoNothing()
    .returning();

  console.log(`  Created ${createdSettings.length} settings`);

  console.log("\nSeed completed!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
