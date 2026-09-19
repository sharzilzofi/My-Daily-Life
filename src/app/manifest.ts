import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personal Life Dashboard",
    short_name: "Life Dashboard",
    description: "Track nutrition, finance, workouts, time, and daily life in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#e76f51",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}