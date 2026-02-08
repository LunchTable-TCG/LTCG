"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { cn } from "@/lib/utils";
import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { FeedbackForm } from "./FeedbackForm";

/**
 * Floating feedback button widget.
 *
 * Renders a fixed-position button in the bottom-right corner that opens
 * a feedback dialog. Only visible when user is authenticated.
 */
export function FeedbackWidget() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Don't render if not authenticated or still loading
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <button
        type="button"
        id="feedback-widget"
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 z-40",
          "w-12 h-12 md:w-14 md:h-14",
          "flex items-center justify-center",
          "rounded-full",
          "bg-gradient-to-br from-[#d4af37] to-[#b8962e]",
          "shadow-lg shadow-black/30",
          "hover:shadow-xl hover:shadow-[#d4af37]/20",
          "hover:scale-105 active:scale-95",
          "transition-all duration-200",
          "group"
        )}
        aria-label="Send feedback"
        title="Send feedback"
      >
        <MessageSquarePlus
          className={cn(
            "w-6 h-6 md:w-7 md:h-7",
            "text-[#1a1614]",
            "group-hover:rotate-12 transition-transform duration-200"
          )}
        />
      </button>

      {/* Feedback Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md" data-feedback-exclude="true">
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
            <DialogDescription>
              Help us improve by reporting bugs or suggesting new features.
            </DialogDescription>
          </DialogHeader>

          <FeedbackForm
            onSuccess={() => {
              // Close dialog after success animation
              setTimeout(() => setIsOpen(false), 500);
            }}
            onCancel={() => setIsOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
