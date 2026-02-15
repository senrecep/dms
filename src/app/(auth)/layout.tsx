import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "DMS";

export const metadata: Metadata = {
  title: `Login | ${appName}`,
  description: `Sign in to ${appName} - Corporate Document Management System`,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
