"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Flag, X } from "lucide-react";
import { useState } from "react";

interface ReportUserDialogProps {
  username: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export function ReportUserDialog({ username, isOpen, onClose, onSubmit }: ReportUserDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reason.trim().length < 10) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(reason.trim());
      setReason("");
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md bg-linear-to-br from-[#2a1810] to-[#1a0f08] border border-[#d4af37]/20 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3d2b1f]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Flag className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#e8e0d5]">Report User</h2>
              <p className="text-sm text-[#c4b69c]">@{username}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 hover:bg-[#3d2b1f] rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#c4b69c]" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-200/90">
              <p className="font-semibold mb-1">Please use responsibly</p>
              <p className="text-xs text-amber-200/70">
                False reports may result in action against your account. Reports are reviewed by
                moderators.
              </p>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label
              htmlFor="report-reason"
              className="block text-sm font-medium text-[#e8e0d5] mb-2"
            >
              Reason for reporting *
            </label>
            <textarea
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the issue (minimum 10 characters)..."
              disabled={isSubmitting}
              className={cn(
                "w-full h-32 px-4 py-3 bg-[#1a0f08] border rounded-lg resize-none",
                "text-[#e8e0d5] placeholder:text-[#8b7355]",
                "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                reason.length > 0 && reason.length < 10 ? "border-red-500/50" : "border-[#3d2b1f]"
              )}
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-2 text-xs">
              <span
                className={cn(
                  "text-[#8b7355]",
                  reason.length > 0 && reason.length < 10 && "text-red-400"
                )}
              >
                {reason.length > 0 && reason.length < 10
                  ? `${10 - reason.length} more characters required`
                  : "Min. 10 characters"}
              </span>
              <span className="text-[#8b7355]">{reason.length}/500</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-[#1a0f08] border border-[#3d2b1f] text-[#e8e0d5] rounded-lg hover:bg-[#2a1810] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 10}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-lg font-medium transition-all",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isSubmitting || reason.trim().length < 10
                  ? "bg-red-500/30 text-red-300 cursor-not-allowed"
                  : "bg-red-500 text-white hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/20"
              )}
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
