/**
 * Web App Manifest for PWA
 *
 * Configures the admin dashboard as an installable Progressive Web App
 * with offline support, app-like experience, and custom icons.
 */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LTCG Admin Dashboard",
    short_name: "LTCG Admin",
    description: "Admin dashboard for managing Lunchtable Card Game",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#d4af37",
    orientation: "any",
    scope: "/",
    icons: [
      {
        src: "/icons/icon-72x72.png",
        sizes: "72x72",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-96x96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-128x128.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-144x144.png",
        sizes: "144x144",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-384x384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/desktop.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "Admin Dashboard - Desktop View",
      },
      {
        src: "/screenshots/mobile.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: "Admin Dashboard - Mobile View",
      },
    ] as MetadataRoute.Manifest["screenshots"],
    categories: ["business", "productivity", "utilities"],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Go to main dashboard",
        url: "/",
        icons: [{ src: "/icons/shortcut-dashboard.png", sizes: "96x96" }],
      },
      {
        name: "Players",
        short_name: "Players",
        description: "Manage players",
        url: "/players",
        icons: [{ src: "/icons/shortcut-players.png", sizes: "96x96" }],
      },
      {
        name: "Analytics",
        short_name: "Analytics",
        description: "View analytics",
        url: "/analytics",
        icons: [{ src: "/icons/shortcut-analytics.png", sizes: "96x96" }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}
