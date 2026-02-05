"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import { LiveStreamingRoom } from "@/components/streaming/LiveStreamingRoom";
import { useStreamNotifications } from "@/components/streaming/StreamNotifications";
import { useRouter } from "next/navigation";
import { ArrowLeft, Video } from "lucide-react";
import Link from "next/link";

export default function LiveStreamingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const currentUser = useConvexQuery(
    typedApi.core.users.currentUser,
    isAuthenticated ? {} : "skip"
  );

  const [platform, setPlatform] = useState<"twitch" | "youtube">("twitch");
  const [streamKey, setStreamKey] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const { notifyStreamStarted, notifyStreamError } = useStreamNotifications();

  if (!currentUser) {
    return null;
  }

  const handleStreamStarted = (sessionId: string) => {
    setIsStreaming(true);
    notifyStreamStarted(platform);
  };

  const handleError = (error: string) => {
    notifyStreamError(error);
    setIsStreaming(false);
  };

  return (
    <div className="min-h-screen bg-[#0d0a09]">
      {!isStreaming ? (
        // Setup screen
        <div className="container mx-auto px-4 pt-28 pb-16">
          <Link
            href="/streaming"
            className="inline-flex items-center gap-2 text-[#a89f94] hover:text-[#e8e0d5] mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Streaming
          </Link>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Video className="w-8 h-8 text-[#d4af37]" />
              <h1 className="text-3xl font-bold text-[#e8e0d5]">Go Live</h1>
            </div>
            <p className="text-[#a89f94]">Set up your stream and go live</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="p-6 rounded-xl bg-black/40 border border-[#3d2b1f]">
              <h2 className="text-xl font-bold text-[#e8e0d5] mb-4">Stream Configuration</h2>

              {/* Platform Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#a89f94] mb-2">
                  Platform
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPlatform("twitch")}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      platform === "twitch"
                        ? "bg-[#d4af37] text-black"
                        : "bg-black/40 border border-[#3d2b1f] text-[#a89f94]"
                    }`}
                  >
                    🟣 Twitch
                  </button>
                  <button
                    onClick={() => setPlatform("youtube")}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      platform === "youtube"
                        ? "bg-[#d4af37] text-black"
                        : "bg-black/40 border border-[#3d2b1f] text-[#a89f94]"
                    }`}
                  >
                    🔴 YouTube
                  </button>
                </div>
              </div>

              {/* Stream Key */}
              <div className="mb-6">
                <label
                  htmlFor="stream-key"
                  className="block text-sm font-medium text-[#a89f94] mb-2"
                >
                  Stream Key
                </label>
                <input
                  id="stream-key"
                  type="password"
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  placeholder={
                    platform === "twitch"
                      ? "Get from twitch.tv/dashboard/settings/stream"
                      : "Get from studio.youtube.com"
                  }
                  className="w-full px-4 py-3 bg-black/40 border border-[#3d2b1f] rounded-lg text-[#e8e0d5] placeholder:text-[#a89f94]/50 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
                />
                <p className="text-xs text-[#a89f94]/60 mt-2">
                  {platform === "twitch" ? (
                    <>
                      Get from{" "}
                      <a
                        href="https://dashboard.twitch.tv/settings/stream"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[#d4af37] hover:underline"
                      >
                        Twitch Dashboard
                      </a>
                    </>
                  ) : (
                    <>
                      Get from{" "}
                      <a
                        href="https://studio.youtube.com/"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[#d4af37] hover:underline"
                      >
                        YouTube Studio
                      </a>
                    </>
                  )}
                </p>
              </div>

              {streamKey && (
                <div className="bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-lg p-4 mb-6">
                  <p className="text-sm text-[#e8e0d5] font-medium mb-2">Next Steps:</p>
                  <ol className="text-sm text-[#a89f94] space-y-1 list-decimal list-inside">
                    <li>Select your camera and microphone</li>
                    <li>Share your screen or game window</li>
                    <li>Click "Start Streaming" to go live</li>
                  </ol>
                </div>
              )}
            </div>

            {streamKey && (
              <div className="mt-6">
                <LiveStreamingRoom
                  userId={currentUser._id}
                  streamType="user"
                  platform={platform}
                  streamKey={streamKey}
                  onStreamStarted={handleStreamStarted}
                  onError={handleError}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        // Live streaming view
        <div className="h-screen">
          <LiveStreamingRoom
            userId={currentUser._id}
            streamType="user"
            platform={platform}
            streamKey={streamKey}
            onStreamStarted={handleStreamStarted}
            onError={handleError}
          />
        </div>
      )}
    </div>
  );
}
