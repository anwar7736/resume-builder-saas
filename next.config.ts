import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    const configuredOrigin = process.env.NEST_API_URL?.trim();
    const apiOrigin = configuredOrigin ||
      (process.env.NODE_ENV === "production" ? "" : "http://localhost:3001");
    if (!apiOrigin) throw new Error("NEST_API_URL must be set to the NestJS API origin.");
    const parsedOrigin = new URL(apiOrigin);
    if (parsedOrigin.protocol !== "https:" &&
        !(process.env.NODE_ENV !== "production" && parsedOrigin.hostname === "localhost" &&
          parsedOrigin.protocol === "http:")) {
      throw new Error("NEST_API_URL must use HTTPS outside local development.");
    }
    return [{
      source: "/api/:path*",
      destination: `${parsedOrigin.origin}/api/:path*`,
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
