import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables `.next/standalone` output for the production Docker image (see Dockerfile.prod).
  output: "standalone",
};

export default nextConfig;
