import type { MetadataRoute } from "next";

// What makes the site installable — "Add to Home Screen" on a phone, or the
// install button in a desktop browser. It opens full screen under its own icon
// and is still this same site, so every deploy reaches it with no app store.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TULSI",
    short_name: "TULSI",
    description: "Your work log, planner and money in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#2c3a75",
    theme_color: "#2c3a75",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Full-bleed, so Android can crop it to its own icon shape.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
