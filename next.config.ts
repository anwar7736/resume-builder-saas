import type { NextConfig } from "next";
import { getBackendOrigin } from "./src/lib/backend-origin";

const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT_STANDALONE === "true" ? "standalone" : undefined,
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    return [{
      source: "/api/:path*",
      destination: `${getBackendOrigin()}/api/:path*`,
    }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
