import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  users,
  departments,
  departmentMembers,
  systemSettings,
  documents,
  documentRevisions,
  approvals,
  distributionLists,
  distributionUsers,
  readConfirmations,
  activityLogs,
  notifications,
  session,
  account,
  verification,
  carSources,
  carSystems,
  carProcesses,
  carCustomers,
  carProducts,
  carOperations,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const EMAIL_DOMAIN = process.env.SEED_EMAIL_DOMAIN || "qms.com";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "System Admin";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || `admin@${EMAIL_DOMAIN}`;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin123!";

// ── Pre-generated IDs ────────────────────────────────────────────────
const deptIds = {
  quality: nanoid(),
  production: nanoid(),
  hr: nanoid(),
  it: nanoid(),
};

const userIds = {
  admin: nanoid(),
};

// ── Helper: create user via Better Auth ──────────────────────────────
async function createUser(
  name: string,
  email: string,
  password: string,
  role: "ADMIN" | "MANAGER" | "USER",
  _userId: string,
) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  User ${email} already exists, updating...`);
    await db
      .update(users)
      .set({ role, name })
      .where(eq(users.email, email));
    return existing[0].id;
  }

  // Create via Better Auth API (handles password hashing + account record)
  await auth.api.signUpEmail({
    body: { name, email, password },
  });

  // Update the auto-generated user with our desired role
  const [created] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!created) throw new Error(`Failed to create user: ${email}`);

  await db
    .update(users)
    .set({ role })
    .where(eq(users.id, created.id));

  return created.id;
}

async function seed() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║    QMS Database Seed Script          ║");
  console.log("╚══════════════════════════════════════╝\n");

  // ── 1. Clear tables (FK order) ───────────────────────────────────
  console.log("Clearing existing data...");
  await db.delete(activityLogs);
  await db.delete(readConfirmations);
  await db.delete(distributionUsers);
  await db.delete(distributionLists);
  await db.delete(approvals);
  await db.delete(notifications);
  await db.update(documents).set({ currentRevisionId: null, currentRevisionNo: 0 });
  await db.delete(documentRevisions);
  await db.delete(documents);
  await db.delete(session);
  await db.delete(account);
  await db.delete(verification);
  await db.delete(departmentMembers);
  await db.delete(users);
  await db.delete(departments);
  await db.delete(systemSettings);
  console.log("  All tables cleared.\n");

  // ── 2. Departments ──────────────────────────────────────────────
  console.log("Creating departments...");
  await db.insert(departments).values([
    {
      id: deptIds.quality,
      name: "Kalite Yönetimi",
      slug: "quality",
      description: "Quality Management Department",
    },
    {
      id: deptIds.production,
      name: "Üretim",
      slug: "production",
      description: "Production Department",
    },
    {
      id: deptIds.hr,
      name: "İnsan Kaynakları",
      slug: "hr",
      description: "Human Resources Department",
    },
    {
      id: deptIds.it,
      name: "Bilgi Teknolojileri",
      slug: "it",
      description: "Information Technology Department",
    },
  ]);
  console.log("  4 departments created.\n");

  // ── 3. Users ────────────────────────────────────────────────────
  console.log("Creating users...");

  const u: Record<string, string> = {};

  u.admin = await createUser(
    ADMIN_NAME,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    "ADMIN",
    userIds.admin,
  );
  console.log(`  ✓ Admin: ${ADMIN_EMAIL}`);

  console.log("  1 user created.\n");

  // ── 4. System Settings ──────────────────────────────────────────
  console.log("Creating system settings...");
  await db.insert(systemSettings).values([
    { key: "app_name", value: "QMS", description: "Application display name" },
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
      value: process.env.EMAIL_FROM || "QMS <noreply@example.com>",
      description: "Default sender email address",
    },
    {
      key: "email_resend_api_key",
      value: process.env.RESEND_API_KEY || "",
      description: "Resend API key for email delivery",
    },
    { key: "email_smtp_host", value: "", description: "SMTP server hostname" },
    { key: "email_smtp_port", value: "587", description: "SMTP server port" },
    { key: "email_smtp_user", value: "", description: "SMTP authentication username" },
    { key: "email_smtp_pass", value: "", description: "SMTP authentication password" },
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
  ]);
  console.log("  13 system settings created.\n");

  // ── CAR Lookup Tables ───────────────────────────────────────────
  await seedCarLookups();

  console.log("╔══════════════════════════════════════╗");
  console.log("║    Seed completed successfully!      ║");
  console.log("╚══════════════════════════════════════╝\n");
  console.log(`  Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}\n`);
}

async function seedCarLookups() {
  console.log("Seeding CAR lookup tables...");

  // Sources (Bildirim Kaynakları)
  const sourceData = [
    "İç Tetkik",
    "İç Uygunsuzluk",
    "Müşteri Şikayeti",
    "Dış Tetkik",
    "Proses Hatası",
    "Tedarikçi Uygunsuzluğu",
    "Diğer",
  ];

  for (let i = 0; i < sourceData.length; i++) {
    const existing = await db
      .select({ id: carSources.id })
      .from(carSources)
      .where(eq(carSources.name, sourceData[i]))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(carSources).values({
        name: sourceData[i],
        sortOrder: i + 1,
      });
      console.log(`  Created source: ${sourceData[i]}`);
    } else {
      console.log(`  Source already exists: ${sourceData[i]}`);
    }
  }

  // Systems (Sistemler)
  const systemData = [
    "Kalite Yönetim Sistemi",
    "Çevre Yönetim Sistemi",
    "İSG Yönetim Sistemi",
    "Entegre Yönetim Sistemi",
  ];

  for (let i = 0; i < systemData.length; i++) {
    const existing = await db
      .select({ id: carSystems.id })
      .from(carSystems)
      .where(eq(carSystems.name, systemData[i]))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(carSystems).values({
        name: systemData[i],
        sortOrder: i + 1,
      });
      console.log(`  Created system: ${systemData[i]}`);
    } else {
      console.log(`  System already exists: ${systemData[i]}`);
    }
  }

  // Processes (Süreçler)
  const processData = [
    "Üretim Planlama",
    "Satınalma",
    "Depolama ve Sevkiyat",
    "Kalite Kontrol",
    "ArGe",
    "İnsan Kaynakları",
    "Bakım",
  ];

  for (let i = 0; i < processData.length; i++) {
    const existing = await db
      .select({ id: carProcesses.id })
      .from(carProcesses)
      .where(eq(carProcesses.name, processData[i]))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(carProcesses).values({
        name: processData[i],
        sortOrder: i + 1,
      });
      console.log(`  Created process: ${processData[i]}`);
    } else {
      console.log(`  Process already exists: ${processData[i]}`);
    }
  }

  console.log("CAR lookup tables seeded successfully!\n");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
