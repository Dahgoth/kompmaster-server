import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted on the Timeweb VPS behind Caddy (ADR 007 §Decision 1):
  // standalone output gives a deployable server bundle for PM2.
  output: "standalone",
  reactStrictMode: true,
  // Worktree-local builds: the tracing root must be the worktree, not the
  // cheapest common ancestor of the user's lockfile copies.
  outputFileTracingRoot: __dirname,

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
