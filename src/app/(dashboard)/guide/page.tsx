import { getTranslations } from "next-intl/server";
import { GuideContent } from "@/components/guide/guide-content";

export default async function GuidePage() {
  const t = await getTranslations("guide");

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <GuideContent />
    </div>
  );
}
