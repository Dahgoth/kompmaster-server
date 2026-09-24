import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Tracing root must be the workspace root so Next's file trace reaches the
// hoisted node_modules (pnpm nodeLinker: hoisted places deps at repo root).
const tracingRoot = path.resolve(__dirname, "..");

const nextConfig: NextConfig = {
  // Self-hosted on the Timeweb VPS behind Caddy (ADR 007 §Decision 1):
  // standalone output gives a deployable server bundle for PM2.
  output: "standalone",
  reactStrictMode: true,
  // Workspace-root tracing so standalone captures hoisted deps.
  outputFileTracingRoot: tracingRoot,

  // Lint is gated by the CI `frontend` job (eslint.config.js + typecheck);
  // next build's integrated lint pass would double-run it with a divergent
  // plugin set.
  eslint: { ignoreDuringBuilds: true },

  // Client islands call the API same-origin; unmatched /api/* paths proxy to
  // the backend (own /api/revalidate and /api/indexnow routes win because
  // filesystem routes are matched before rewrites). App routes run first.
  async rewrites() {
    const destination = `${process.env.API_BASE ?? "http://localhost:4000/api"}/:path*`;
    return [{ source: "/api/:path*", destination }];
  },

  // No image-resize pipeline exists backend-side yet (plan gap §11.5);
  // revisit when the media origin serves WebP/resize variants.
  images: { unoptimized: true },
};

export default nextConfig;
