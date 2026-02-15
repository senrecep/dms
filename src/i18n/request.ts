import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { getUserLocale } from "@/lib/locale";

export default getRequestConfig(async () => {
  const cookieLocale = await getUserLocale();

  const locale = routing.locales.includes(cookieLocale as any)
    ? cookieLocale
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
