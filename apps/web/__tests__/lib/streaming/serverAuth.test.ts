import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("resolveStreamingAuth", () => {
  it("detects internal auth via X-Internal-Auth", async () => {
    const { resolveStreamingAuth } = await import("@/lib/streaming/serverAuth");
    process.env.INTERNAL_API_SECRET = "internal-secret";

    const request = new Request("http://localhost/api", {
      headers: {
        "X-Internal-Auth": "internal-secret",
      },
    });

    const auth = await resolveStreamingAuth(request);

    expect(auth.isInternal).toBe(true);
    expect(auth.isAgentApiKey).toBe(false);
    expect(auth.userId).toBeNull();
  });

  it("detects agent API key via bearer token", async () => {
    const { resolveStreamingAuth } = await import("@/lib/streaming/serverAuth");
    process.env.LTCG_API_KEY = "agent-key";

    const request = new Request("http://localhost/api", {
      headers: {
        Authorization: "Bearer agent-key",
      },
    });

    const auth = await resolveStreamingAuth(request);

    expect(auth.isInternal).toBe(false);
    expect(auth.isAgentApiKey).toBe(true);
    expect(auth.bearerToken).toBe("agent-key");
    expect(auth.userId).toBeNull();
  });

  it("detects agent API key via x-api-key header", async () => {
    const { resolveStreamingAuth } = await import("@/lib/streaming/serverAuth");
    process.env.LTCG_API_KEY = "agent-key";

    const request = new Request("http://localhost/api", {
      headers: {
        "x-api-key": "agent-key",
      },
    });

    const auth = await resolveStreamingAuth(request);

    expect(auth.isInternal).toBe(false);
    expect(auth.isAgentApiKey).toBe(true);
    expect(auth.bearerToken).toBe("agent-key");
    expect(auth.userId).toBeNull();
  });

  it("returns unauthenticated context when no auth is provided", async () => {
    const { resolveStreamingAuth } = await import("@/lib/streaming/serverAuth");
    const request = new Request("http://localhost/api");

    const auth = await resolveStreamingAuth(request);

    expect(auth.isInternal).toBe(false);
    expect(auth.isAgentApiKey).toBe(false);
    expect(auth.bearerToken).toBeNull();
    expect(auth.userId).toBeNull();
  });
});
