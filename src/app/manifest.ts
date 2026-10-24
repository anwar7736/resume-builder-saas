import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ResumeCraft AI",
    short_name: "ResumeCraft",
    description:
      "Share your career information for your next resume request.",
    start_url: "/",
    display: "standalone",
    background_color: "#17191f",
    theme_color: "#17191f",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
