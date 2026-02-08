"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "announcement-dismissed";

interface AnnouncementBannerProps {
  /** Optional className for styling */
  className?: string;
}

/**
 * AnnouncementBanner displays system-wide announcements from Edge Config
 *
 * Features:
 * - Fetches announcement from /api/announcement endpoint
 * - Dismissible with localStorage persistence
 * - Auto-hides when no announcement is set
 *
 * @example
 * ```tsx
 * <AnnouncementBanner />
 * ```
 */
export function AnnouncementBanner({ className }: AnnouncementBannerProps) {
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if previously dismissed
    const dismissedAnnouncement = localStorage.getItem(DISMISSED_KEY);

    async function fetchAnnouncement() {
      try {
        const response = await fetch("/api/announcement");
        if (response.ok) {
          const data = await response.json();
          if (data.announcement) {
            setAnnouncement(data.announcement);
            // Only show if not previously dismissed (or if announcement changed)
            setIsDismissed(dismissedAnnouncement === data.announcement);
          }
        }
      } catch (error) {
        console.error("Failed to fetch announcement:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnnouncement();
  }, []);

  const handleDismiss = () => {
    if (announcement) {
      localStorage.setItem(DISMISSED_KEY, announcement);
    }
    setIsDismissed(true);
  };

  // Don't render if loading, dismissed, or no announcement
  if (isLoading || isDismissed || !announcement) {
    return null;
  }

  return (
    <div
      className={`bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-4 py-2 ${className ?? ""}`}
      role="alert"
      aria-live="polite"
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        <p className="text-sm font-medium flex-1 text-center">{announcement}</p>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 hover:bg-black/10 rounded-full transition-colors flex-shrink-0"
          aria-label="Dismiss announcement"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
