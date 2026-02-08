"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRecording } from "@/hooks/feedback/useRecording";
import { useScreenCapture } from "@/hooks/feedback/useScreenCapture";
import { typedApi, useConvexMutation } from "@/lib/convexHelpers";
import { uploadRecording, uploadScreenshot } from "@/lib/feedbackUpload";
import { cn } from "@/lib/utils";
import { Bug, Camera, CheckCircle, Lightbulb, Loader2, Video, VideoOff, X } from "lucide-react";
import { useState } from "react";

type FeedbackType = "bug" | "feature";

interface FeedbackFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FeedbackForm({ onSuccess, onCancel }: FeedbackFormProps) {
  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<Blob | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = useConvexMutation(typedApi.feedback.feedback.submit);

  const { capture: captureScreenshot, isCapturing, error: screenshotError } = useScreenCapture();

  const {
    startRecording,
    stopRecording,
    isRecording,
    isSupported: isRecordingSupported,
    error: recordingError,
    recordingDuration,
  } = useRecording();

  const handleCaptureScreenshot = async () => {
    const blob = await captureScreenshot();
    if (blob) {
      setScreenshot(blob);
      // Create preview URL
      const url = URL.createObjectURL(blob);
      setScreenshotPreview(url);
    }
  };

  const handleRemoveScreenshot = () => {
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        setRecording(blob);
      }
    } else {
      setRecording(null);
      await startRecording();
    }
  };

  const handleRemoveRecording = () => {
    setRecording(null);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let screenshotUrl: string | undefined;
      let recordingUrl: string | undefined;

      // Upload media if present
      if (screenshot || recording) {
        setIsUploading(true);

        if (screenshot) {
          screenshotUrl = await uploadScreenshot(screenshot, type);
        }

        if (recording) {
          recordingUrl = await uploadRecording(recording, type);
        }

        setIsUploading(false);
      }

      // Submit feedback
      await submitFeedback({
        type,
        title,
        description,
        screenshotUrl,
        recordingUrl,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      });

      setSubmitSuccess(true);

      // Cleanup
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
      }

      // Call success callback after a brief delay to show success state
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (err) {
      console.error("Feedback submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to submit feedback");
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h3 className="text-lg font-semibold text-[#d4af37] mb-2">Thank you for your feedback!</h3>
        <p className="text-[#a89f94] text-sm">
          We&apos;ll review your {type === "bug" ? "bug report" : "feature request"} soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("bug")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all",
            type === "bug"
              ? "bg-red-500/20 border-red-500/50 text-red-400"
              : "bg-secondary/20 border-border text-[#a89f94] hover:bg-secondary/30"
          )}
        >
          <Bug className="w-5 h-5" />
          <span className="font-medium">Bug Report</span>
        </button>
        <button
          type="button"
          onClick={() => setType("feature")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all",
            type === "feature"
              ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
              : "bg-secondary/20 border-border text-[#a89f94] hover:bg-secondary/30"
          )}
        >
          <Lightbulb className="w-5 h-5" />
          <span className="font-medium">Feature Request</span>
        </button>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="feedback-title" className="block text-sm font-medium text-[#d4af37] mb-1">
          Title
        </label>
        <Input
          id="feedback-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            type === "bug" ? "Brief description of the bug..." : "What feature would you like?"
          }
          required
          minLength={5}
          maxLength={200}
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="feedback-description"
          className="block text-sm font-medium text-[#d4af37] mb-1"
        >
          Description
        </label>
        <textarea
          id="feedback-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            type === "bug"
              ? "What happened? What did you expect to happen? Steps to reproduce..."
              : "Describe the feature you'd like and why it would be useful..."
          }
          required
          minLength={10}
          maxLength={5000}
          rows={4}
          className={cn(
            "flex w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-none"
          )}
        />
      </div>

      {/* Media Capture */}
      <div className="space-y-3">
        <p className="block text-sm font-medium text-[#d4af37]">Attachments (optional)</p>

        <div className="flex gap-2">
          {/* Screenshot Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCaptureScreenshot}
            disabled={isCapturing || isSubmitting}
            className="flex-1"
          >
            {isCapturing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            {screenshot ? "Retake Screenshot" : "Take Screenshot"}
          </Button>

          {/* Recording Button */}
          {isRecordingSupported && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleRecording}
              disabled={isCapturing || isSubmitting}
              className={cn("flex-1", isRecording && "bg-red-500/20 border-red-500/50")}
            >
              {isRecording ? (
                <>
                  <VideoOff className="w-4 h-4 mr-2" />
                  Stop ({formatDuration(recordingDuration)})
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  {recording ? "Re-record" : "Record Screen"}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Screenshot Preview */}
        {screenshotPreview && (
          <div className="relative rounded-lg border border-border overflow-hidden">
            <img
              src={screenshotPreview}
              alt="Screenshot preview"
              className="w-full max-h-40 object-contain bg-black/20"
            />
            <button
              type="button"
              onClick={handleRemoveScreenshot}
              className="absolute top-2 right-2 p-1 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* Recording Indicator */}
        {recording && !isRecording && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-green-500" />
              <span className="text-sm text-[#a89f94]">
                Recording attached ({(recording.size / 1024 / 1024).toFixed(1)}MB)
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveRecording}
              className="p-1 hover:bg-secondary/40 rounded transition-colors"
            >
              <X className="w-4 h-4 text-[#a89f94]" />
            </button>
          </div>
        )}

        {/* Errors */}
        {(screenshotError || recordingError) && (
          <p className="text-red-400 text-sm">{screenshotError || recordingError}</p>
        )}
      </div>

      {/* Submit Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || isRecording || !title || !description}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isUploading ? "Uploading..." : "Submitting..."}
            </>
          ) : (
            <>Submit {type === "bug" ? "Bug Report" : "Feature Request"}</>
          )}
        </Button>
      </div>
    </form>
  );
}
