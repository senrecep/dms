import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CarGuideContent } from "@/components/car/car-guide-content";

export const metadata: Metadata = {
  title: "CAR Guide",
  description: "Corrective Action Request process guide and documentation.",
  robots: { index: false, follow: false },
};

export default async function CarGuidePage() {
  const t = await getTranslations("carGuide");

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CarGuideContent />
    </div>
  );
}
