"use client";

import { ChannelHealthPanel } from "@/components/streaming/ChannelHealthPanel";
import { LiveStreamingRoom } from "@/components/streaming/LiveStreamingRoom";
import { useStreamNotifications } from "@/components/streaming/StreamNotifications";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { useUserStreams } from "@/hooks/useStreaming";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import {
  STREAMING_PLATFORM_META,
  type StreamingPlatform,
  requiresCustomRtmpUrl,
} from "@/lib/streaming/platforms";
import type { PlayerVisualMode, WebcamPosition, WebcamSize } from "@/lib/streaming/types";
import { usePrivy } from "@privy-io/react-auth";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Eye,
  KeyRound,
  Sparkles,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const PLATFORM_ORDER: StreamingPlatform[] = ["twitch", "youtube", "kick", "x", "pumpfun", "custom"];

export default function LiveStreamingPage() {
  const { isAuthenticated } = useAuth();
  const { getAccessToken } = usePrivy();
  const currentUser = useConvexQuery(
    typedApi.core.users.currentUser,
    isAuthenticated ? {} : "skip"
  );
  const streamingConfig = useConvexQuery(
    typedApi.core.userPreferences.getUserStreamingConfig,
    isAuthenticated ? {} : "skip"
  );

  const [platform, setPlatform] = useState<StreamingPlatform>("twitch");
  const [streamKey, setStreamKey] = useState("");
  const [customRtmpUrl, setCustomRtmpUrl] = useState("");
  const [useStoredCreds, setUseStoredCreds] = useState(false);
  const [showPlayerCam, setShowPlayerCam] = useState(true);
  const [playerVisualMode, setPlayerVisualMode] = useState<PlayerVisualMode>("webcam");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [webcamPosition, setWebcamPosition] = useState<WebcamPosition>("bottom-right");
  const [webcamSize, setWebcamSize] = useState<WebcamSize>("medium");
  const [voiceTrackUrl, setVoiceTrackUrl] = useState("");
  const [voiceVolume, setVoiceVolume] = useState("0.9");
  const [voiceLoop, setVoiceLoop] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const { notifyStreamStarted, notifyStreamError } = useStreamNotifications();
  const selectedPlatform = STREAMING_PLATFORM_META[platform];
  const needsCustomRtmp = useMemo(() => requiresCustomRtmpUrl(platform), [platform]);
  const { activeSession } = useUserStreams(currentUser?._id);

  // Pre-fill from saved streaming config
  useEffect(() => {
    if (streamingConfig?.platform) {
      const savedPlatform = streamingConfig.platform as StreamingPlatform;
      if (STREAMING_PLATFORM_META[savedPlatform]) {
        setPlatform(savedPlatform);
      }
      if (streamingConfig.hasStreamKey) {
        setUseStoredCreds(true);
      }
      if (streamingConfig.rtmpUrl) {
        setCustomRtmpUrl(streamingConfig.rtmpUrl);
      }
    }
  }, [streamingConfig]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    if (!profilePictureUrl.trim()) {
      const userProfile = (currentUser as { image?: string }).image;
      if (typeof userProfile === "string" && userProfile.trim()) {
        setProfilePictureUrl(userProfile.trim());
      }
    }
  }, [currentUser, profilePictureUrl]);

  if (!currentUser) {
    return null;
  }

  const handleStreamStarted = (sessionId: string) => {
    setIsStreaming(true);
    setActiveSessionId(sessionId);
    notifyStreamStarted(selectedPlatform.label);
  };

  const handleError = (error: string) => {
    notifyStreamError(error);
    setIsStreaming(false);
  };

  const handleGenerateVoiceTrack = async () => {
    if (!voiceText.trim()) {
      setVoiceError("Enter text to generate a voice line.");
      return;
    }

    setIsGeneratingVoice(true);
    setVoiceError(null);

    try {
      const authToken = await getAccessToken();
      const response = await fetch("/api/streaming/voice/elevenlabs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          text: voiceText.trim(),
          returnDataUrl: true,
        }),
      });
      const payload = (await response.json()) as { dataUrl?: string; error?: string };
      if (!response.ok || !payload.dataUrl) {
        throw new Error(payload.error || "Failed to generate voice track");
      }
      setVoiceTrackUrl(payload.dataUrl);
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : "Failed to generate voice track");
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const streamKeyReady = useStoredCreds || streamKey.trim().length > 0;
  const rtmpReady = !needsCustomRtmp || customRtmpUrl.trim().length > 0;
  const canStart = streamKeyReady && rtmpReady;
  const readiness = [
    {
      label: `${selectedPlatform.label} destination selected`,
      done: true,
    },
    {
      label: useStoredCreds ? "Using saved credentials" : "Stream key added",
      done: streamKeyReady,
    },
    {
      label: needsCustomRtmp ? "RTMP URL added" : "RTMP endpoint can use default ingest",
      done: rtmpReady,
    },
    {
      label: "Pre-live room unlocked",
      done: canStart,
    },
    {
      label: showPlayerCam
        ? playerVisualMode === "profile-picture"
          ? "Profile picture PiP enabled for overlay"
          : "Webcam PiP enabled for overlay"
        : "Player visual PiP disabled for overlay",
      done: true,
    },
    {
      label: voiceTrackUrl.trim()
        ? "Voice track configured for stream mix"
        : "Optional voice track not configured",
      done: true,
    },
  ];

  const telemetrySessionId = activeSessionId || activeSession?._id;

  return (
    <div className="min-h-screen bg-[#0a0706] text-[#e8e0d5]">
      {!isStreaming ? (
        <div className="relative container mx-auto px-4 pt-28 pb-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.12),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(148,163,184,0.08),transparent_35%)]" />

          <Link
            href="/streaming"
            className="relative z-10 inline-flex items-center gap-2 text-[#a89f94] hover:text-[#e8e0d5] mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Streaming
          </Link>

          <div className="relative z-10 mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#4a3425] bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#d4af37]">
                <Sparkles className="h-3.5 w-3.5" />
                Broadcast Forge
              </div>
              <div className="flex items-center gap-3">
                <Video className="h-8 w-8 text-[#d4af37]" />
                <h1 className="text-3xl font-black tracking-wide">Go Live</h1>
              </div>
              <p className="mt-2 text-[#a89f94]">
                Configure your destination, verify ingest credentials, and launch your stream room.
              </p>
              <p className="mt-1 text-xs text-[#8f8171]">
                Retake is reserved for agent streaming workflows.
              </p>
            </div>
          </div>

          <div className="relative z-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <section className="rounded-2xl border border-[#3d2b1f] bg-gradient-to-b from-black/55 to-black/35 p-6">
              <h2 className="mb-4 text-xl font-bold">Destination Setup</h2>

              <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {PLATFORM_ORDER.map((candidate) => {
                  const candidateMeta = STREAMING_PLATFORM_META[candidate];
                  const active = platform === candidate;
                  return (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => setPlatform(candidate)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-[#d4af37] bg-[#d4af37]/15 text-[#f5deb3]"
                          : "border-[#3d2b1f] bg-black/30 text-[#c7b8a4] hover:border-[#8f6745]"
                      }`}
                    >
                      <div className="mb-1 text-xs font-black uppercase tracking-wider">
                        {candidateMeta.icon}
                      </div>
                      <div className="font-semibold">{candidateMeta.label}</div>
                    </button>
                  );
                })}
              </div>

              {selectedPlatform.docsUrl && (
                <p className="mb-5 text-xs text-[#b8a894]">
                  Credential docs:{" "}
                  <a
                    href={selectedPlatform.docsUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[#d4af37] hover:underline"
                  >
                    {selectedPlatform.label} setup
                  </a>
                </p>
              )}

              {needsCustomRtmp && (
                <div className="mb-4">
                  <label
                    htmlFor="custom-rtmp-url"
                    className="mb-2 block text-xs font-black uppercase tracking-wider text-[#b8a894]"
                  >
                    RTMP URL <span className="text-[#fca5a5]">(Required)</span>
                  </label>
                  <input
                    id="custom-rtmp-url"
                    type="text"
                    value={customRtmpUrl}
                    onChange={(e) => setCustomRtmpUrl(e.target.value)}
                    placeholder={selectedPlatform.rtmpHint || "rtmps://provider.example/app"}
                    className="w-full rounded-xl border border-[#3d2b1f] bg-black/30 px-4 py-3 text-[#e8e0d5] placeholder:text-[#8f8171] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
              )}

              <div className="mb-4">
                <label
                  htmlFor="stream-key"
                  className="mb-2 block text-xs font-black uppercase tracking-wider text-[#b8a894]"
                >
                  Stream Key <span className="text-[#fca5a5]">(Required)</span>
                </label>

                {useStoredCreds ? (
                  <div className="flex items-center gap-3 rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-3">
                    <KeyRound className="h-4 w-4 text-[#d4af37]" />
                    <span className="flex-1 text-sm text-[#f5deb3]">Using saved credentials</span>
                    <button
                      type="button"
                      onClick={() => setUseStoredCreds(false)}
                      className="text-xs text-[#a89f94] hover:text-[#e8e0d5] underline"
                    >
                      Enter manually
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      id="stream-key"
                      type="password"
                      value={streamKey}
                      onChange={(e) => setStreamKey(e.target.value)}
                      placeholder={selectedPlatform.keyHint}
                      className="w-full rounded-xl border border-[#3d2b1f] bg-black/30 px-4 py-3 text-[#e8e0d5] placeholder:text-[#8f8171] focus:border-[#d4af37] focus:outline-none"
                    />
                    {streamingConfig?.hasStreamKey && (
                      <button
                        type="button"
                        onClick={() => {
                          setUseStoredCreds(true);
                          setStreamKey("");
                        }}
                        className="mt-2 text-xs text-[#d4af37] hover:underline"
                      >
                        Use saved credentials instead
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="mb-4 rounded-xl border border-[#4a3425] bg-black/20 p-4">
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#b8a894]">
                  Viewer Overlay Camera
                </p>
                <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-[#d7cfbf]">
                  <input
                    type="checkbox"
                    checked={showPlayerCam}
                    onChange={(e) => setShowPlayerCam(e.target.checked)}
                    className="h-4 w-4 rounded border-[#6b4d34] bg-black/40 text-[#d4af37] focus:ring-[#d4af37]"
                  />
                  Show player picture-in-picture window on the live overlay
                </label>
                {showPlayerCam && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <p className="mb-1 text-xs font-black uppercase tracking-wider text-[#b8a894]">
                        PiP Source
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm text-[#d7cfbf]">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="player-visual-mode"
                            checked={playerVisualMode === "webcam"}
                            onChange={() => setPlayerVisualMode("webcam")}
                            className="h-4 w-4 border-[#6b4d34] bg-black/40 text-[#d4af37] focus:ring-[#d4af37]"
                          />
                          Webcam
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="player-visual-mode"
                            checked={playerVisualMode === "profile-picture"}
                            onChange={() => setPlayerVisualMode("profile-picture")}
                            className="h-4 w-4 border-[#6b4d34] bg-black/40 text-[#d4af37] focus:ring-[#d4af37]"
                          />
                          Profile Picture
                        </label>
                      </div>
                    </div>
                    {playerVisualMode === "profile-picture" && (
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="profile-picture-url"
                          className="mb-1 block text-xs font-black uppercase tracking-wider text-[#b8a894]"
                        >
                          Profile Picture URL
                        </label>
                        <input
                          id="profile-picture-url"
                          type="url"
                          value={profilePictureUrl}
                          onChange={(e) => setProfilePictureUrl(e.target.value)}
                          placeholder="https://.../profile.png"
                          className="w-full rounded-lg border border-[#3d2b1f] bg-black/35 px-3 py-2 text-sm text-[#e8e0d5] placeholder:text-[#8f8171] focus:border-[#d4af37] focus:outline-none"
                        />
                      </div>
                    )}
                    <div>
                      <label
                        htmlFor="webcam-position"
                        className="mb-1 block text-xs font-black uppercase tracking-wider text-[#b8a894]"
                      >
                        PiP Position
                      </label>
                      <select
                        id="webcam-position"
                        value={webcamPosition}
                        onChange={(e) =>
                          setWebcamPosition(
                            e.target.value as
                              | "top-left"
                              | "top-right"
                              | "bottom-left"
                              | "bottom-right"
                          )
                        }
                        className="w-full rounded-lg border border-[#3d2b1f] bg-black/35 px-3 py-2 text-sm text-[#e8e0d5] focus:border-[#d4af37] focus:outline-none"
                      >
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="top-left">Top Left</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="webcam-size"
                        className="mb-1 block text-xs font-black uppercase tracking-wider text-[#b8a894]"
                      >
                        PiP Size
                      </label>
                      <select
                        id="webcam-size"
                        value={webcamSize}
                        onChange={(e) =>
                          setWebcamSize(e.target.value as "small" | "medium" | "large")
                        }
                        className="w-full rounded-lg border border-[#3d2b1f] bg-black/35 px-3 py-2 text-sm text-[#e8e0d5] focus:border-[#d4af37] focus:outline-none"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4 rounded-xl border border-[#4a3425] bg-black/20 p-4">
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#b8a894]">
                  Voice Track (Optional)
                </p>
                <p className="mb-3 text-xs text-[#a89f94]">
                  Add an external audio source for spoken announcements or agent narration.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="stream-voice-url"
                      className="mb-1 block text-[10px] font-black uppercase tracking-wider text-[#b8a894]"
                    >
                      Voice Track URL
                    </label>
                    <input
                      id="stream-voice-url"
                      type="url"
                      value={voiceTrackUrl}
                      onChange={(e) => setVoiceTrackUrl(e.target.value)}
                      placeholder="https://.../voice.mp3 or generated data URL"
                      className="w-full rounded-lg border border-[#3d2b1f] bg-black/35 px-3 py-2 text-sm text-[#e8e0d5] placeholder:text-[#8f8171] focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="stream-voice-volume"
                      className="mb-1 block text-[10px] font-black uppercase tracking-wider text-[#b8a894]"
                    >
                      Voice Volume (0-1)
                    </label>
                    <input
                      id="stream-voice-volume"
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={voiceVolume}
                      onChange={(e) => setVoiceVolume(e.target.value)}
                      className="w-full rounded-lg border border-[#3d2b1f] bg-black/35 px-3 py-2 text-sm text-[#e8e0d5] placeholder:text-[#8f8171] focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>
                  <label className="mt-6 inline-flex items-center gap-2 text-sm text-[#c7b8a4]">
                    <input
                      type="checkbox"
                      checked={voiceLoop}
                      onChange={(e) => setVoiceLoop(e.target.checked)}
                      className="h-4 w-4 rounded border-[#6b4d34] bg-black/40 text-[#d4af37] focus:ring-[#d4af37]"
                    />
                    Loop voice track
                  </label>
                  <div className="sm:col-span-2 mt-1 rounded-lg border border-[#3d2b1f] bg-black/25 p-3">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-[#b8a894]">
                      ElevenLabs Quick Generate
                    </p>
                    <textarea
                      value={voiceText}
                      onChange={(e) => setVoiceText(e.target.value)}
                      rows={3}
                      placeholder="Type narration to synthesize and inject into the stream..."
                      className="w-full rounded-lg border border-[#3d2b1f] bg-black/35 px-3 py-2 text-sm text-[#e8e0d5] placeholder:text-[#8f8171] focus:border-[#d4af37] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateVoiceTrack}
                      disabled={isGeneratingVoice}
                      className="mt-2 rounded-lg border border-[#8f6745] bg-black/35 px-3 py-2 text-xs font-black uppercase tracking-wider text-[#e8e0d5] hover:border-[#d4af37] disabled:opacity-60"
                    >
                      {isGeneratingVoice ? "Generating..." : "Generate Voice Track"}
                    </button>
                    {voiceError && <p className="mt-2 text-xs text-red-300">{voiceError}</p>}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#4a3425] bg-black/25 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#b8a894]">
                  Go-Live Readiness
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {readiness.map((item) => (
                    <li key={item.label} className="flex items-center gap-2">
                      {item.done ? (
                        <CheckCircle2 className="h-4 w-4 text-[#86efac]" />
                      ) : (
                        <Circle className="h-4 w-4 text-[#8f8171]" />
                      )}
                      <span className={item.done ? "text-[#d7cfbf]" : "text-[#8f8171]"}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <aside className="rounded-2xl border border-[#3d2b1f] bg-gradient-to-b from-[#1b1410] to-[#0f0b09] p-6">
              <h3 className="mb-3 text-lg font-bold text-[#f5deb3]">Stream Lifecycle</h3>
              <ul className="space-y-3 text-sm text-[#c7b8a4]">
                <li>1. Select channel destination and paste credentials.</li>
                <li>2. Join pre-live room and verify camera/mic/screen.</li>
                <li>
                  3. Choose picture-in-picture source: webcam or profile picture in the overlay.
                </li>
                <li>4. LiveKit egress captures overlay and pushes to RTMP.</li>
                <li>5. Session metrics and status update in real time.</li>
              </ul>
              <div className="mt-5 rounded-xl border border-[#4a3425] bg-black/30 p-3 text-xs text-[#a89f94]">
                Viewer overlay includes game board, event ticker, and agent reasoning panels when
                enabled.
              </div>
              <div className="mt-4 grid gap-2">
                <a
                  href="/stream/overlay?preview=waiting&static=1"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center justify-between rounded-lg border border-[#4a3425] bg-black/25 px-3 py-2 text-xs text-[#d7cfbf] transition hover:border-[#8f6745] hover:text-[#f5deb3]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5" />
                    Preview Waiting Overlay
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href="/stream/overlay?preview=live&static=1"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center justify-between rounded-lg border border-[#4a3425] bg-black/25 px-3 py-2 text-xs text-[#d7cfbf] transition hover:border-[#8f6745] hover:text-[#f5deb3]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5" />
                    Preview Live Overlay
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="mt-5">
                <ChannelHealthPanel sessionId={telemetrySessionId || undefined} />
              </div>
            </aside>
          </div>

          <div className="relative z-10 mt-6">
            {canStart ? (
              <LiveStreamingRoom
                userId={currentUser._id}
                streamType="user"
                platform={platform}
                streamKey={useStoredCreds ? undefined : streamKey}
                customRtmpUrl={needsCustomRtmp ? customRtmpUrl : undefined}
                useStoredCredentials={useStoredCreds}
                showPlayerCam={showPlayerCam}
                playerVisualMode={playerVisualMode}
                profilePictureUrl={profilePictureUrl.trim() ? profilePictureUrl.trim() : undefined}
                webcamPosition={webcamPosition}
                webcamSize={webcamSize}
                voiceTrackUrl={voiceTrackUrl.trim() ? voiceTrackUrl.trim() : undefined}
                voiceVolume={
                  Number.isFinite(Number.parseFloat(voiceVolume))
                    ? Math.max(0, Math.min(1, Number.parseFloat(voiceVolume)))
                    : undefined
                }
                voiceLoop={voiceLoop}
                onStreamStarted={handleStreamStarted}
                onError={handleError}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-[#4a3425] bg-black/25 p-5 text-sm text-[#a89f94]">
                Fill required credentials to unlock the pre-live room and device checks.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-screen grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-0 rounded-2xl border border-[#3d2b1f] overflow-hidden">
            <LiveStreamingRoom
              userId={currentUser._id}
              streamType="user"
              platform={platform}
              streamKey={useStoredCreds ? undefined : streamKey}
              customRtmpUrl={needsCustomRtmp ? customRtmpUrl : undefined}
              useStoredCredentials={useStoredCreds}
              showPlayerCam={showPlayerCam}
              playerVisualMode={playerVisualMode}
              profilePictureUrl={profilePictureUrl.trim() ? profilePictureUrl.trim() : undefined}
              webcamPosition={webcamPosition}
              webcamSize={webcamSize}
              voiceTrackUrl={voiceTrackUrl.trim() ? voiceTrackUrl.trim() : undefined}
              voiceVolume={
                Number.isFinite(Number.parseFloat(voiceVolume))
                  ? Math.max(0, Math.min(1, Number.parseFloat(voiceVolume)))
                  : undefined
              }
              voiceLoop={voiceLoop}
              onStreamStarted={handleStreamStarted}
              onError={handleError}
            />
          </div>
          <div className="overflow-y-auto">
            <ChannelHealthPanel sessionId={telemetrySessionId || undefined} />
          </div>
        </div>
      )}
    </div>
  );
}
