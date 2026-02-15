import { ShieldX } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function ForbiddenPage() {
  const t = await getTranslations("errorPages.forbidden");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="size-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            {t("goHome")}
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {t("login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
