"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { sanitizeText, sanitizeURL } from "@/lib/sanitize";
import {
  STREAMING_PLATFORM_META,
  type StreamingPlatform,
  requiresCustomRtmpUrl,
} from "@/lib/streaming/platforms";
import type { PlayerVisualMode } from "@/lib/streaming/types";
import { cn } from "@/lib/utils";
import { usePrivy } from "@privy-io/react-auth";
import { Bot, ChevronLeft, ChevronRight, Image, Link, Loader2, X } from "lucide-react";
import { useState } from "react";
import { ApiKeyDisplay } from "./ApiKeyDisplay";
import { StarterDeckPicker } from "./StarterDeckPicker";

interface RegisterAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

export function RegisterAgentModal({ isOpen, onClose, onSuccess }: RegisterAgentModalProps) {
  const { isAuthenticated } = useAuth();
  const { getAccessToken } = usePrivy();

  // Form state
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);

  // Result state
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [registeredAgentId, setRegisteredAgentId] = useState<string | null>(null);

  // Optional streaming setup state
  const [enableStreamingSetup, setEnableStreamingSetup] = useState(false);
  const [streamingPlatform, setStreamingPlatform] = useState<StreamingPlatform>("twitch");
  const [streamingStreamKey, setStreamingStreamKey] = useState("");
  const [streamingRtmpUrl, setStreamingRtmpUrl] = useState("");
  const [streamingAutoStart, setStreamingAutoStart] = useState(true);
  const [streamingKeepAlive, setStreamingKeepAlive] = useState(true);
  const [streamingVisualMode, setStreamingVisualMode] =
    useState<PlayerVisualMode>("profile-picture");
  const [streamingProfilePictureUrl, setStreamingProfilePictureUrl] = useState("");
  const [streamingVoiceTrackUrl, setStreamingVoiceTrackUrl] = useState("");
  const [streamingVoiceVolume, setStreamingVoiceVolume] = useState("0.9");
  const [streamingVoiceLoop, setStreamingVoiceLoop] = useState(false);
  const [isSavingStreaming, setIsSavingStreaming] = useState(false);
  const [streamingError, setStreamingError] = useState<string | null>(null);

  // Loading/error state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queries and mutations
  const starterDecks = useConvexQuery(typedApi.agents.agents.getStarterDecks, {});
  const registerAgent = useConvexMutation(typedApi.agents.agents.registerAgent);

  const handleSubmit = async () => {
    if (!isAuthenticated || !name || !selectedDeck) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await registerAgent({
        name,
        profilePictureUrl: profilePictureUrl || undefined,
        socialLink: socialLink || undefined,
        starterDeckCode: selectedDeck,
      });

      setApiKey(result.apiKey);
      setRegisteredAgentId(result.agentId);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => {
    onSuccess();
    handleClose();
  };

  const handleClose = () => {
    // Reset state
    setStep(1);
    setName("");
    setProfilePictureUrl("");
    setSocialLink("");
    setSelectedDeck(null);
    setApiKey(null);
    setRegisteredAgentId(null);
    setEnableStreamingSetup(false);
    setStreamingPlatform("twitch");
    setStreamingStreamKey("");
    setStreamingRtmpUrl("");
    setStreamingAutoStart(true);
    setStreamingKeepAlive(true);
    setStreamingVisualMode("profile-picture");
    setStreamingProfilePictureUrl("");
    setStreamingVoiceTrackUrl("");
    setStreamingVoiceVolume("0.9");
    setStreamingVoiceLoop(false);
    setIsSavingStreaming(false);
    setStreamingError(null);
    setError(null);
    onClose();
  };

  const handleSaveStreamingAndComplete = async () => {
    if (!registeredAgentId) {
      setStreamingError("Agent registration is incomplete. Please retry.");
      return;
    }

    if (!enableStreamingSetup) {
      handleComplete();
      return;
    }

    const needsRtmp = requiresCustomRtmpUrl(streamingPlatform);
    if (!streamingStreamKey.trim()) {
      setStreamingError("Stream key is required when enabling streaming setup.");
      return;
    }
    if (needsRtmp && !streamingRtmpUrl.trim()) {
      setStreamingError("RTMP URL is required for this platform.");
      return;
    }

    const parsedStreamingVoiceVolume = Number.parseFloat(streamingVoiceVolume);
    const normalizedStreamingVoiceVolume = Number.isFinite(parsedStreamingVoiceVolume)
      ? Math.max(0, Math.min(1, parsedStreamingVoiceVolume))
      : undefined;

    setIsSavingStreaming(true);
    setStreamingError(null);

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/streaming/configure-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          agentId: registeredAgentId,
          enabled: true,
          platform: streamingPlatform,
          streamKey: streamingStreamKey,
          rtmpUrl: streamingRtmpUrl.trim() ? streamingRtmpUrl.trim() : undefined,
          autoStart: streamingAutoStart,
          keepAlive: streamingKeepAlive,
          visualMode: streamingVisualMode,
          profilePictureUrl: streamingProfilePictureUrl.trim(),
          voiceTrackUrl: streamingVoiceTrackUrl.trim(),
          voiceVolume: normalizedStreamingVoiceVolume,
          voiceLoop: streamingVoiceLoop,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Failed to save streaming configuration");
      }

      handleComplete();
    } catch (streamingSaveError) {
      setStreamingError(
        streamingSaveError instanceof Error
          ? streamingSaveError.message
          : "Failed to save streaming configuration"
      );
    } finally {
      setIsSavingStreaming(false);
    }
  };

  const canProceedStep1 = name.trim().length >= 3;
  const canProceedStep2 = selectedDeck !== null;
  const requiresStreamingRtmp = requiresCustomRtmpUrl(streamingPlatform);
  const supportsOptionalStreamingRtmpOverride =
    streamingPlatform === "twitch" ||
    streamingPlatform === "kick" ||
    streamingPlatform === "youtube";
  const showStreamingRtmpInput = requiresStreamingRtmp || supportsOptionalStreamingRtmpOverride;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={step < 4 ? handleClose : undefined}
        onKeyDown={step < 4 ? (e) => e.key === "Enter" && handleClose() : undefined}
        role={step < 4 ? "button" : undefined}
        tabIndex={step < 4 ? 0 : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-linear-to-br from-[#1a1614] to-[#261f1c] rounded-2xl border border-[#3d2b1f] shadow-2xl overflow-hidden flex flex-col">
        <div className="ornament-corner ornament-corner-tl" />
        <div className="ornament-corner ornament-corner-tr" />

        {/* Header */}
        <div className="p-6 border-b border-[#3d2b1f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/30 flex items-center justify-center">
                <Bot className="w-5 h-5 text-[#d4af37]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#e8e0d5] uppercase tracking-wide">
                  Register AI Agent
                </h2>
                <p className="text-[10px] text-[#a89f94] uppercase tracking-widest">
                  Step {step} of 5
                </p>
              </div>
            </div>
            {step < 4 && (
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4 flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  s <= step ? "bg-[#d4af37]" : "bg-[#3d2b1f]"
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Agent Name */}
              <div>
                <label
                  htmlFor="register-agent-name"
                  className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2"
                >
                  Agent Name *
                </label>
                <div className="relative group">
                  <Bot className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94] group-focus-within:text-[#d4af37] transition-colors" />
                  <input
                    id="register-agent-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter agent name (3-32 chars)"
                    maxLength={32}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-[#3d2b1f]/20 focus:outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10 transition-all"
                  />
                </div>
                <p className="mt-1 text-[10px] text-[#a89f94]">{name.length}/32 characters</p>
              </div>

              {/* Profile Picture URL */}
              <div>
                <label
                  htmlFor="register-agent-profile-picture-url"
                  className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2"
                >
                  Profile Picture URL (Optional)
                </label>
                <div className="relative group">
                  <Image className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94] group-focus-within:text-[#d4af37] transition-colors" />
                  <input
                    id="register-agent-profile-picture-url"
                    type="url"
                    value={profilePictureUrl}
                    onChange={(e) => setProfilePictureUrl(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-[#3d2b1f]/20 focus:outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10 transition-all"
                  />
                </div>
              </div>

              {/* Social Link */}
              <div>
                <label
                  htmlFor="register-agent-social-link"
                  className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2"
                >
                  Social/Website Link (Optional)
                </label>
                <div className="relative group">
                  <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94] group-focus-within:text-[#d4af37] transition-colors" />
                  <input
                    id="register-agent-social-link"
                    type="url"
                    value={socialLink}
                    onChange={(e) => setSocialLink(e.target.value)}
                    placeholder="https://twitter.com/your_agent"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-[#3d2b1f]/20 focus:outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Choose Deck */}
          {step === 2 && starterDecks && (
            <StarterDeckPicker
              decks={starterDecks}
              selectedDeck={selectedDeck}
              onSelect={setSelectedDeck}
            />
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-black text-[#e8e0d5] uppercase tracking-wider">
                  Review & Confirm
                </h3>
                <p className="text-[#a89f94] text-xs mt-1">
                  Verify your agent's details before registration
                </p>
              </div>

              <div className="space-y-4 p-4 rounded-xl bg-black/30 border border-[#3d2b1f]">
                <div className="flex justify-between">
                  <span className="text-[#a89f94] text-sm">Name</span>
                  <span className="text-[#e8e0d5] font-bold">{sanitizeText(name)}</span>
                </div>
                {profilePictureUrl && sanitizeURL(profilePictureUrl) && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#a89f94] text-sm">Avatar</span>
                    <img
                      src={sanitizeURL(profilePictureUrl)}
                      alt="Preview"
                      className="w-8 h-8 rounded-lg object-cover border border-[#3d2b1f]"
                    />
                  </div>
                )}
                {socialLink && sanitizeURL(socialLink) && (
                  <div className="flex justify-between">
                    <span className="text-[#a89f94] text-sm">Social</span>
                    <a
                      href={sanitizeURL(socialLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#d4af37] text-sm hover:underline truncate max-w-[200px]"
                    >
                      {sanitizeText(socialLink)}
                    </a>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#a89f94] text-sm">Starter Deck</span>
                  <span className="text-[#e8e0d5] font-bold">
                    {starterDecks?.find(
                      (d: { deckCode: string; name: string }) => d.deckCode === selectedDeck
                    )?.name || selectedDeck}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 4: API Key */}
          {step === 4 && apiKey && (
            <ApiKeyDisplay
              apiKey={apiKey}
              buttonLabel="Continue to Streaming Setup"
              onAcknowledge={() => setStep(5)}
            />
          )}

          {/* Step 5: Optional Streaming Setup */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-[#e8e0d5] uppercase tracking-wider">
                  Streaming Setup (Optional)
                </h3>
                <p className="text-[#a89f94] text-xs mt-1">
                  Configure where this agent should auto-stream matches. You can also skip and set
                  it later.
                </p>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-[#3d2b1f] bg-black/25 p-3">
                <input
                  type="checkbox"
                  checked={enableStreamingSetup}
                  onChange={(e) => setEnableStreamingSetup(e.target.checked)}
                  className="h-4 w-4 accent-[#d4af37]"
                />
                <span className="text-sm text-[#e8e0d5]">Enable agent auto-streaming now</span>
              </label>

              {enableStreamingSetup && (
                <div className="space-y-4 rounded-xl border border-[#3d2b1f] bg-black/30 p-4">
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#a89f94]">
                      Platform
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(
                        [
                          "twitch",
                          "youtube",
                          "kick",
                          "retake",
                          "x",
                          "pumpfun",
                          "custom",
                        ] as StreamingPlatform[]
                      ).map((platformOption) => (
                        <button
                          key={platformOption}
                          type="button"
                          onClick={() => setStreamingPlatform(platformOption)}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-left text-sm transition",
                            streamingPlatform === platformOption
                              ? "border-[#d4af37] bg-[#d4af37]/15 text-[#f5deb3]"
                              : "border-[#3d2b1f] bg-black/20 text-[#c7b8a4] hover:border-[#8f6745]"
                          )}
                        >
                          <span className="block text-[10px] uppercase tracking-widest opacity-70">
                            {STREAMING_PLATFORM_META[platformOption].icon}
                          </span>
                          {STREAMING_PLATFORM_META[platformOption].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {showStreamingRtmpInput && (
                    <div>
                      <label
                        htmlFor="register-agent-streaming-rtmp-url"
                        className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#a89f94]"
                      >
                        RTMP URL{" "}
                        {supportsOptionalStreamingRtmpOverride && !requiresStreamingRtmp
                          ? "(Optional Override)"
                          : ""}
                      </label>
                      <input
                        id="register-agent-streaming-rtmp-url"
                        type="text"
                        value={streamingRtmpUrl}
                        onChange={(e) => setStreamingRtmpUrl(e.target.value)}
                        placeholder={
                          STREAMING_PLATFORM_META[streamingPlatform].rtmpHint ||
                          "rtmp://your-provider.example/live"
                        }
                        className="w-full rounded-xl border border-[#3d2b1f] bg-black/30 px-4 py-3 text-[#e8e0d5] placeholder:text-[#8f8171] focus:border-[#d4af37] focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="register-agent-streaming-stream-key"
                      className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#a89f94]"
                    >
                      Stream Key
                    </label>
                    <input
                      id="register-agent-streaming-stream-key"
                      type="password"
                      value={streamingStreamKey}
                      onChange={(e) => setStreamingStreamKey(e.target.value)}
                      placeholder={STREAMING_PLATFORM_META[streamingPlatform].keyHint}
                      className="w-full rounded-xl border border-[#3d2b1f] bg-black/30 px-4 py-3 text-[#e8e0d5] placeholder:text-[#8f8171] focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <p className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#a89f94]">
                      Agent PiP Source
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm text-[#c7b8a4]">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="register-agent-visual-mode"
                          checked={streamingVisualMode === "profile-picture"}
                          onChange={() => setStreamingVisualMode("profile-picture")}
                          className="h-4 w-4 accent-[#d4af37]"
                        />
                        Profile Picture
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="register-agent-visual-mode"
                          checked={streamingVisualMode === "webcam"}
                          onChange={() => setStreamingVisualMode("webcam")}
                          className="h-4 w-4 accent-[#d4af37]"
                        />
                        Webcam
                      </label>
                    </div>
                  </div>

                  {streamingVisualMode === "profile-picture" && (
                    <div>
                      <label
                        htmlFor="register-agent-streaming-profile-picture-url"
                        className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#a89f94]"
                      >
                        Profile Picture URL (Optional Override)
                      </label>
                      <input
                        id="register-agent-streaming-profile-picture-url"
                        type="url"
                        value={streamingProfilePictureUrl}
                        onChange={(e) => setStreamingProfilePictureUrl(e.target.value)}
                        placeholder={profilePictureUrl || "https://.../agent-profile.png"}
                        className="w-full rounded-xl border border-[#3d2b1f] bg-black/30 px-4 py-3 text-[#e8e0d5] placeholder:text-[#8f8171] focus:border-[#d4af37] focus:outline-none"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm text-[#c7b8a4]">
                    <input
                      type="checkbox"
                      checked={streamingAutoStart}
                      onChange={(e) => setStreamingAutoStart(e.target.checked)}
                      className="h-4 w-4 accent-[#d4af37]"
                    />
                    Auto-start stream when this agent enters a game
                  </label>

                  <label className="flex items-center gap-2 text-sm text-[#c7b8a4]">
                    <input
                      type="checkbox"
                      checked={streamingKeepAlive}
                      onChange={(e) => setStreamingKeepAlive(e.target.checked)}
                      className="h-4 w-4 accent-[#d4af37]"
                    />
                    Keep stream live between matches (lobby/chat mode)
                  </label>

                  <div>
                    <label
                      htmlFor="register-agent-streaming-voice-track-url"
                      className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#a89f94]"
                    >
                      Voice Track URL (Optional)
                    </label>
                    <input
                      id="register-agent-streaming-voice-track-url"
                      type="url"
                      value={streamingVoiceTrackUrl}
                      onChange={(e) => setStreamingVoiceTrackUrl(e.target.value)}
                      placeholder="https://.../voice.mp3 (ElevenLabs or hosted TTS)"
                      className="w-full rounded-xl border border-[#3d2b1f] bg-black/30 px-4 py-3 text-[#e8e0d5] placeholder:text-[#8f8171] focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="register-agent-streaming-voice-volume"
                      className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#a89f94]"
                    >
                      Voice Volume (0 to 1)
                    </label>
                    <input
                      id="register-agent-streaming-voice-volume"
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={streamingVoiceVolume}
                      onChange={(e) => setStreamingVoiceVolume(e.target.value)}
                      className="w-full rounded-xl border border-[#3d2b1f] bg-black/30 px-4 py-3 text-[#e8e0d5] placeholder:text-[#8f8171] focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-[#c7b8a4]">
                    <input
                      type="checkbox"
                      checked={streamingVoiceLoop}
                      onChange={(e) => setStreamingVoiceLoop(e.target.checked)}
                      className="h-4 w-4 accent-[#d4af37]"
                    />
                    Loop voice track continuously
                  </label>
                </div>
              )}

              {streamingError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {streamingError}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleComplete}
                  disabled={isSavingStreaming}
                  className="h-11 border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5]"
                >
                  Skip for Now
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveStreamingAndComplete}
                  disabled={isSavingStreaming}
                  className="h-11 tcg-button-primary text-white font-bold uppercase tracking-wide"
                >
                  {isSavingStreaming ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Finish Registration"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer (setup flow only) */}
        {step < 4 && (
          <div className="p-6 border-t border-[#3d2b1f] flex items-center justify-between">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="h-11 px-5 font-bold uppercase tracking-wide border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5]"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                className={cn(
                  "h-11 px-5 font-bold uppercase tracking-wide",
                  (step === 1 ? canProceedStep1 : canProceedStep2)
                    ? "tcg-button-primary text-white"
                    : "bg-[#3d2b1f]/50 text-[#a89f94]/50 cursor-not-allowed"
                )}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-11 px-6 font-bold uppercase tracking-wide tcg-button-primary text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register Agent"
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
