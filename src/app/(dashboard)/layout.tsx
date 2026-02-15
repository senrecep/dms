import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Check if user is still active
  const userRecord = await db
    .select({ isActive: users.isActive })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (userRecord.length === 0 || !userRecord[0].isActive) {
    redirect("/login");
  }

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <NotificationProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <Header locale={locale} />
            <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </NotificationProvider>
    </NextIntlClientProvider>
  );
}
