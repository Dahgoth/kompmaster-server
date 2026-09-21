import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted on the Timeweb VPS behind Caddy (ADR 007 §Decision 1):
  // standalone output gives a deployable server bundle for PM2.
  output: "standalone",
  reactStrictMode: true,

  // No image-resize pipeline exists backend-side yet (plan gap §11.5);
  // revisit when the media origin serves WebP/resize variants.
  images: { unoptimized: true },
};

export default nextConfig;
