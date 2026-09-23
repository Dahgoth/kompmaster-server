import type { MetadataRoute } from "next";
import { config } from "@/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/auth",
          "/checkout",
          "/cart",
          "/orders",
          "/order/",
          "/profile",
          "/payment/",
          "/api/",
        ],
      },
    ],
    sitemap: `${config.siteUrl}/sitemap.xml`,
  };
}
