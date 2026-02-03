"use client";

/**
 * PWA Install Prompt Component
 *
 * Shows a dismissible banner prompting users to install the PWA.
 * Handles both Android/desktop Chrome install prompt and iOS instructions.
 * Respects user preference and only shows once per session after dismissal.
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DownloadIcon, ShareIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// Type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    setIsIOS(ios);

    // Check if user previously dismissed
    const dismissed = sessionStorage.getItem("pwa-install-dismissed");
    if (dismissed || standalone) {
      return;
    }

    // Listen for install prompt (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay for better UX
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // For iOS, show instructions after a delay
    if (ios && !standalone) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setShowPrompt(false);
      }
    } catch (error) {
      console.error("Error installing PWA:", error);
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa-install-dismissed", "true");
  }, []);

  // Don't show if already installed or prompt shouldn't be shown
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] animate-in slide-in-from-bottom-4 duration-300 md:left-auto md:right-4 md:max-w-sm">
      <Card className="relative border-primary/20 bg-card/95 p-4 shadow-lg backdrop-blur-sm">
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            {isIOS ? (
              <ShareIcon className="h-5 w-5 text-primary" />
            ) : (
              <DownloadIcon className="h-5 w-5 text-primary" />
            )}
          </div>

          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-sm">Install LTCG Admin</h3>

            {isIOS ? (
              <p className="text-xs text-muted-foreground">
                Tap{" "}
                <span className="inline-flex items-center gap-0.5">
                  <ShareIcon className="h-3 w-3" />
                </span>{" "}
                then &quot;Add to Home Screen&quot; for the best experience.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Install for quick access, offline support, and a native app experience.
                </p>
                <Button size="sm" onClick={handleInstall} className="mt-2 h-8 text-xs">
                  <DownloadIcon className="mr-1.5 h-3.5 w-3.5" />
                  Install App
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
