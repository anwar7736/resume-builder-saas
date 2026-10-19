import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ResumeCraft AI",
    short_name: "ResumeCraft",
    description:
      "Create a polished, ATS-friendly resume with professional templates and thoughtful writing guidance.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf8",
    theme_color: "#5c4bd8",
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
