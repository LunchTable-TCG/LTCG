"use client";

/**
 * PWA Install Prompt Component
 *
 * Shows a dismissible banner prompting users to install the PWA.
 * Handles both Android/desktop Chrome install prompt and iOS instructions.
 * Respects user preference and only shows once per session after dismissal.
 *
 * Mobile-optimized with large touch targets and clear CTAs.
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckIcon, DownloadIcon, PlusIcon, ShareIcon, XIcon } from "lucide-react";
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
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    setIsIOS(ios);

    // Check if user previously dismissed (use localStorage for persistence across sessions)
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    const dismissedAt = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);

    // Show again after 7 days
    if (dismissedAt && daysSinceDismissed < 7) {
      return;
    }

    if (standalone) {
      return;
    }

    // Listen for install prompt (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay for better UX
      setTimeout(() => setShowPrompt(true), 2000);
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setInstallSuccess(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // For iOS, show instructions after a delay
    if (ios && !standalone) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setInstallSuccess(true);
        setTimeout(() => setShowPrompt(false), 1500);
      }
    } catch (error) {
      console.error("Error installing PWA:", error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  }, []);

  // Don't show if already installed or prompt shouldn't be shown
  if (isStandalone || !showPrompt) {
    return null;
  }

  // Success state
  if (installSuccess) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[100] animate-in slide-in-from-bottom-4 duration-300 md:left-auto md:right-4 md:max-w-sm">
        <Card className="border-green-500/30 bg-green-500/10 p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/20">
              <CheckIcon className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-semibold text-green-600 dark:text-green-400">App Installed!</p>
              <p className="text-xs text-muted-foreground">You can now access LTCG Admin from your home screen.</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 pb-safe animate-in slide-in-from-bottom duration-300 md:bottom-4 md:left-auto md:right-4 md:max-w-sm md:p-0">
      <Card className="relative overflow-hidden border-primary/20 bg-card/95 shadow-2xl backdrop-blur-sm">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          aria-label="Dismiss"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <div className="p-4 pb-3">
          <div className="flex items-start gap-4 pr-8">
            {/* App Icon */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-inner">
              <span className="text-2xl">🎴</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base">Install LTCG Admin</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-snug">
                {isIOS
                  ? "Add to your home screen for the best experience"
                  : "Get quick access, offline support & push notifications"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="border-t bg-muted/30 p-3">
          {isIOS ? (
            /* iOS Instructions */
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-background/50 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <ShareIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Step 1: Tap Share</p>
                  <p className="text-xs text-muted-foreground">
                    Tap the share icon in Safari&apos;s toolbar
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-background/50 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <PlusIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Step 2: Add to Home Screen</p>
                  <p className="text-xs text-muted-foreground">
                    Scroll down and tap &quot;Add to Home Screen&quot;
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                className="w-full h-10"
              >
                Got it, maybe later
              </Button>
            </div>
          ) : (
            /* Android/Desktop Install Button */
            <Button
              onClick={handleInstall}
              disabled={isInstalling || !deferredPrompt}
              className="w-full h-12 text-base font-semibold gap-2 active:scale-[0.98] transition-transform"
              size="lg"
            >
              {isInstalling ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Installing...
                </>
              ) : (
                <>
                  <DownloadIcon className="h-5 w-5" />
                  Install App
                </>
              )}
            </Button>
          )}
        </div>

        {/* Benefits (non-iOS) */}
        {!isIOS && (
          <div className="border-t px-4 py-3">
            <div className="flex justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Works offline
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Fast access
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                Notifications
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
