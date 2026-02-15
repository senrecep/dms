import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PWAProvider } from "@/components/pwa-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appName = process.env.NEXT_PUBLIC_APP_NAME || "DMS";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000";
const appDescription = "Corporate Document Management System - Securely manage, approve, and distribute documents across your organization.";

export const metadata: Metadata = {
  title: {
    default: `${appName} - Document Management System`,
    template: `%s | ${appName}`,
  },
  description: appDescription,
  applicationName: appName,
  keywords: ["document management", "DMS", "corporate documents", "approval workflow", "document tracking"],
  authors: [{ name: appName }],
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    siteName: appName,
    title: `${appName} - Document Management System`,
    description: appDescription,
    url: appUrl,
    locale: "en_US",
    images: [
      {
        url: `${appUrl}/icon.svg`,
        width: 512,
        height: 512,
        alt: `${appName} Logo`,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${appName} - Document Management System`,
    description: appDescription,
    images: [`${appUrl}/icon.svg`],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: appName,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `${appName} - Document Management System`,
  description: appDescription,
  url: appUrl,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          // Safe: jsonLd is a static build-time constant with no user input
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PWAProvider>{children}</PWAProvider>
      </body>
    </html>
  );
}
