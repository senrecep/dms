import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/documents/",
          "/approvals/",
          "/users/",
          "/departments/",
          "/settings/",
          "/notifications/",
          "/read-tasks/",
          "/profile/",
          "/guide/",
          "/set-password/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
