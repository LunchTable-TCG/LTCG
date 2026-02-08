import { literals } from "convex-helpers/validators";

/** All streaming platforms including agent-only platforms (e.g. retake). */
export const streamingPlatformValidator = literals(
  "twitch",
  "youtube",
  "kick",
  "custom",
  "retake",
  "x",
  "pumpfun"
);

/**
 * Streaming platforms available to regular users.
 * Excludes agent-only platforms like retake.
 */
export const userStreamingPlatformValidator = literals(
  "twitch",
  "youtube",
  "kick",
  "custom",
  "x",
  "pumpfun"
);
