import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFoundPage() {
  const t = await getTranslations("errorPages.notFound");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="size-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          {t("goHome")}
        </Link>
      </div>
    </div>
  );
}
