/**
 * Service Worker for PWA
 *
 * Provides offline support, caching strategies, and background sync
 * using Serwist (modern successor to Workbox).
 */

/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// Declare the injection point for precache manifest
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Initialize Serwist with configuration
const serwist = new Serwist({
  // Precache entries injected at build time
  precacheEntries: self.__SW_MANIFEST,

  // Take control immediately
  skipWaiting: true,
  clientsClaim: true,

  // Enable navigation preload for faster page loads
  navigationPreload: true,

  // Use default caching strategies from @serwist/next
  // Includes: static assets, images, fonts, API routes, etc.
  runtimeCaching: defaultCache,

  // Fallback to offline page when navigation fails
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// Add event listeners for service worker lifecycle
serwist.addEventListeners();

// Handle push notifications (optional, for future use)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options: NotificationOptions = {
      body: data.body || "New notification",
      icon: data.icon || "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      tag: data.tag || "default",
      data: {
        url: data.url || "/",
        dateOfArrival: Date.now(),
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "LTCG Admin", options)
    );
  } catch (error) {
    console.error("Error handling push notification:", error);
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await (client as WindowClient).navigate(url);
          }
          return;
        }
      }
      // Open new window if no existing window found
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })
  );
});
