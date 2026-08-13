import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables `.next/standalone` output for the production Docker image (see Dockerfile.prod).
  output: "standalone",
  experimental: {
    // Opts into the react@experimental bundle, which is what actually wires
    // <ViewTransition>'s enter/exit transition-types to document.startViewTransition.
    // Without this, ViewTransition renders but never calls the browser API.
    taint: true,
  },
};

export default nextConfig;
