import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Actually.",
    short_name: "Actually.",
    description:
      "The world’s least reliable witness for scandalously trivial disagreements.",
    start_url: "/",
    display: "standalone",
    background_color: "#101522",
    theme_color: "#ef4438",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}

