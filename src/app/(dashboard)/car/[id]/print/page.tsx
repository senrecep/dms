import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { getCarById, getCarFormUsers } from "@/actions/car";
import { getCompanySettings } from "@/actions/settings";
import { CarPrintView } from "@/components/car/car-print-view";

export default async function CarPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const [car, companySettings, users] = await Promise.all([
    getCarById(id),
    getCompanySettings(),
    getCarFormUsers(),
  ]);
  if (!car) notFound();

  const pdfLocale = companySettings.pdfLanguage || "tr";
  const messages = (await import(`@/i18n/messages/${pdfLocale}.json`)).default;
  const carMessages = messages.car as Record<string, unknown>;
  const settingsMessages = messages.settings as Record<string, unknown>;

  return (
    <CarPrintView
      car={car}
      companyName={companySettings.companyName}
      companyLogoUrl={companySettings.companyLogoUrl}
      translations={carMessages}
      settingsTranslations={settingsMessages}
      users={users}
    />
  );
}
