"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { UserNav } from "./user-nav";
import { LocaleSwitcher } from "./locale-switcher";
import { NotificationPanel } from "@/components/notifications/notification-panel";

export function Header({ locale }: { locale: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <LocaleSwitcher currentLocale={locale} />
        <NotificationPanel />
        <UserNav />
      </div>
    </header>
  );
}
