import { describe, expect, it } from "vitest";
import { buildRtmpUrl } from "@/lib/streaming/encryption";

describe("buildRtmpUrl", () => {
  it("builds default twitch and youtube ingest URLs with rtmps", () => {
    expect(buildRtmpUrl("twitch", "abc123")).toBe("rtmps://live.twitch.tv/app/abc123");
    expect(buildRtmpUrl("youtube", "yt-key")).toBe("rtmps://a.rtmp.youtube.com/live2/yt-key");
  });

  it("builds default kick ingest URL", () => {
    expect(buildRtmpUrl("kick", "kick-key")).toBe(
      "rtmps://fa723fc1b171.global-contribute.live-video.net:443/app/kick-key"
    );
  });

  it("uses custom RTMP overrides for fixed-ingest platforms when provided", () => {
    expect(buildRtmpUrl("twitch", "override-key", "rtmps://custom.twitch.ingest/app")).toBe(
      "rtmps://custom.twitch.ingest/app/override-key"
    );
    expect(buildRtmpUrl("kick", "override-kick", "rtmp://ingest.kick.alt/live")).toBe(
      "rtmp://ingest.kick.alt/live/override-kick"
    );
  });

  it("appends stream key to custom provider URLs", () => {
    expect(buildRtmpUrl("retake", "k1", "rtmps://global-live.mux.com:443/app")).toBe(
      "rtmps://global-live.mux.com:443/app/k1"
    );
    expect(buildRtmpUrl("custom", "k2", "rtmp://example.com/live")).toBe(
      "rtmp://example.com/live/k2"
    );
  });

  it("does not duplicate stream key when already present in URL", () => {
    expect(buildRtmpUrl("x", "stream-key", "rtmps://example.com/live/stream-key")).toBe(
      "rtmps://example.com/live/stream-key"
    );
  });

  it("throws for empty stream key", () => {
    expect(() => buildRtmpUrl("twitch", "   ")).toThrow("Stream key is required");
  });

  it("throws when custom RTMP URL is missing or malformed", () => {
    expect(() => buildRtmpUrl("custom", "abc", undefined)).toThrow(
      "RTMP URL required for custom platform"
    );
    expect(() => buildRtmpUrl("pumpfun", "abc", "https://example.com/live")).toThrow(
      "must start with rtmp:// or rtmps://"
    );
  });
});
