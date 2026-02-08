import { afterEach, describe, expect, it, vi } from "vitest";
import { getRetakeRTMPCredentials } from "@/lib/streaming/retake";

describe("getRetakeRTMPCredentials", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses current Retake url/key response shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "rtmps://global-live.mux.com:443/app", key: "sk_live" }),
    } as Response);

    const result = await getRetakeRTMPCredentials("token");

    expect(result).toEqual({
      url: "rtmps://global-live.mux.com:443/app",
      key: "sk_live",
    });
  });

  it("parses legacy rtmp_url/stream_key response shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rtmp_url: "rtmps://legacy/app", stream_key: "legacy_key" }),
    } as Response);

    const result = await getRetakeRTMPCredentials("token");

    expect(result).toEqual({
      url: "rtmps://legacy/app",
      key: "legacy_key",
    });
  });

  it("supports nested data wrapper payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { url: "rtmps://wrapped/app", key: "wrapped_key" } }),
    } as Response);

    const result = await getRetakeRTMPCredentials("token");

    expect(result).toEqual({
      url: "rtmps://wrapped/app",
      key: "wrapped_key",
    });
  });
});
