export const STREAMING_PLATFORMS = [
  "twitch",
  "youtube",
  "kick",
  "retake",
  "x",
  "pumpfun",
  "custom",
] as const;

export type StreamingPlatform = (typeof STREAMING_PLATFORMS)[number];

export interface StreamingPlatformMeta {
  id: StreamingPlatform;
  label: string;
  icon: string;
  requiresCustomRtmpUrl: boolean;
  docsUrl?: string;
  keyHint: string;
  rtmpHint?: string;
}

export const STREAMING_PLATFORM_META: Record<StreamingPlatform, StreamingPlatformMeta> = {
  twitch: {
    id: "twitch",
    label: "Twitch",
    icon: "TV",
    requiresCustomRtmpUrl: false,
    docsUrl: "https://dashboard.twitch.tv/settings/stream",
    keyHint: "Get from Twitch Dashboard > Stream Key & Preferences",
    rtmpHint: "Optional override: rtmps://live.twitch.tv/app",
  },
  youtube: {
    id: "youtube",
    label: "YouTube",
    icon: "YT",
    requiresCustomRtmpUrl: false,
    docsUrl: "https://studio.youtube.com/",
    keyHint: "Get from YouTube Studio > Go Live > Stream key",
  },
  kick: {
    id: "kick",
    label: "Kick",
    icon: "K",
    requiresCustomRtmpUrl: false,
    docsUrl: "https://help.kick.com/en/articles/12273234-how-to-stream-on-kick-com",
    keyHint: "Get from Kick Dashboard > Settings > Stream Key",
    rtmpHint: "Optional override: rtmps://fa723fc1b171.global-contribute.live-video.net:443/app",
  },
  retake: {
    id: "retake",
    label: "Retake.tv",
    icon: "RT",
    requiresCustomRtmpUrl: true,
    keyHint: "Use RTMP credentials returned by Retake API",
    rtmpHint: "rtmps://... from Retake agent RTMP endpoint",
  },
  x: {
    id: "x",
    label: "X",
    icon: "X",
    requiresCustomRtmpUrl: true,
    docsUrl: "https://help.x.com/en/using-x/x-live",
    keyHint: "Get from X Media Studio > Producer",
    rtmpHint: "rtmps://... from X Media Studio RTMP source",
  },
  pumpfun: {
    id: "pumpfun",
    label: "Pump.fun",
    icon: "PF",
    requiresCustomRtmpUrl: true,
    keyHint: "Get from Pump.fun livestream settings",
    rtmpHint: "rtmp://... from Pump.fun coin page > Start Livestream",
  },
  custom: {
    id: "custom",
    label: "Custom RTMP",
    icon: "RTMP",
    requiresCustomRtmpUrl: true,
    keyHint: "Enter stream key for your RTMP provider",
    rtmpHint: "rtmp://your-provider.example/live",
  },
};

export function isStreamingPlatform(value: string): value is StreamingPlatform {
  return STREAMING_PLATFORMS.includes(value as StreamingPlatform);
}

export function requiresCustomRtmpUrl(platform: StreamingPlatform): boolean {
  return STREAMING_PLATFORM_META[platform].requiresCustomRtmpUrl;
}
