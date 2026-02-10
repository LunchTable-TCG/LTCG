import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for RetakeChatService.normalizeMessage
 *
 * The normalizeMessage method must handle multiple payload formats from Retake.tv:
 * - author.fusername (Retake comment format)
 * - user.username (generic chat format)
 * - message.author as string (flat format)
 * - Various ID fields (_id, commentId, messageId)
 * - Various text fields (message, text, comment, content)
 */

// We can't import the private normalizeMessage directly, so we test it
// through the class by extracting it. We'll use a helper approach.
// Since normalizeMessage and firstNonEmptyString are private instance methods,
// we access them via prototype for testing.

// First, mock the @elizaos/core imports
vi.mock("@elizaos/core", () => ({
  ModelType: { TEXT_SMALL: "text_small" },
  Service: class MockService {
    protected runtime: any;
    constructor(runtime: any) {
      this.runtime = runtime;
    }
  },
}));

vi.mock("../../src/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
import { RetakeChatService } from "../../src/services/retakeChatService";

// Create a minimal runtime mock
function createMockRuntime() {
  return {
    character: { name: "Dizzy", username: "dizzy" },
    agentId: "test-agent",
    getSetting: vi.fn().mockReturnValue(null),
  };
}

// Helper to call private normalizeMessage via prototype
function normalizeMessage(service: any, raw: unknown) {
  return service.normalizeMessage(raw);
}

describe("RetakeChatService.normalizeMessage", () => {
  let service: any;

  beforeEach(() => {
    const runtime = createMockRuntime();
    // Construct without starting (bypass initialize)
    service = new RetakeChatService(runtime);
  });

  // =========================================================================
  // Retake comment format (author.fusername)
  // =========================================================================

  it("parses Retake comment with author.fusername", () => {
    const result = normalizeMessage(service, {
      _id: "comment_123",
      comment: "nice play!",
      author: {
        fusername: "viewer42",
        favatar: "https://retake.tv/avatars/v42.png",
      },
      createdAt: 1700000000000,
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe("comment_123");
    expect(result!.message).toBe("nice play!");
    expect(result!.user.username).toBe("viewer42");
    expect(result!.user.avatar).toBe("https://retake.tv/avatars/v42.png");
    expect(result!.timestamp).toBe(1700000000000);
    expect(result!.type).toBe("chat");
  });

  it("parses Retake comment with author.username fallback", () => {
    const result = normalizeMessage(service, {
      _id: "comment_456",
      comment: "gg",
      author: {
        username: "viewer99",
      },
    });

    expect(result).not.toBeNull();
    expect(result!.user.username).toBe("viewer99");
  });

  it("parses Retake comment with author.name fallback", () => {
    const result = normalizeMessage(service, {
      _id: "comment_789",
      text: "hello stream",
      author: {
        name: "CoolViewer",
      },
    });

    expect(result).not.toBeNull();
    expect(result!.user.username).toBe("CoolViewer");
  });

  // =========================================================================
  // Generic chat format (user.username)
  // =========================================================================

  it("parses generic chat with user.username", () => {
    const result = normalizeMessage(service, {
      id: "msg_001",
      message: "what deck is that?",
      user: {
        username: "chatter1",
        avatar: "https://example.com/avatar.png",
      },
      timestamp: 1700000001000,
      type: "chat",
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe("msg_001");
    expect(result!.message).toBe("what deck is that?");
    expect(result!.user.username).toBe("chatter1");
    expect(result!.user.avatar).toBe("https://example.com/avatar.png");
    expect(result!.type).toBe("chat");
  });

  it("parses chat with user.handle", () => {
    const result = normalizeMessage(service, {
      id: "msg_002",
      message: "attack!",
      user: {
        handle: "h4ndl3",
      },
    });

    expect(result).not.toBeNull();
    expect(result!.user.username).toBe("h4ndl3");
  });

  it("parses chat with user.name", () => {
    const result = normalizeMessage(service, {
      id: "msg_003",
      message: "cool game",
      user: {
        name: "DisplayName",
      },
    });

    expect(result).not.toBeNull();
    expect(result!.user.username).toBe("DisplayName");
  });

  // =========================================================================
  // Flat format (message.username / message.author as string)
  // =========================================================================

  it("parses flat format with message.username", () => {
    const result = normalizeMessage(service, {
      id: "flat_001",
      text: "hi there",
      username: "flat_user",
    });

    expect(result).not.toBeNull();
    expect(result!.user.username).toBe("flat_user");
    expect(result!.message).toBe("hi there");
  });

  it("parses flat format with message.author as string", () => {
    const result = normalizeMessage(service, {
      id: "flat_002",
      text: "hey",
      author: "string_author",
    });

    expect(result).not.toBeNull();
    expect(result!.user.username).toBe("string_author");
  });

  // =========================================================================
  // ID field variations
  // =========================================================================

  it("uses _id as fallback", () => {
    const result = normalizeMessage(service, {
      _id: "mongo_id",
      message: "test",
      username: "u",
    });

    expect(result!.id).toBe("mongo_id");
  });

  it("uses commentId as fallback", () => {
    const result = normalizeMessage(service, {
      commentId: "cid_123",
      message: "test",
      username: "u",
    });

    expect(result!.id).toBe("cid_123");
  });

  it("uses messageId as fallback", () => {
    const result = normalizeMessage(service, {
      messageId: "mid_456",
      message: "test",
      username: "u",
    });

    expect(result!.id).toBe("mid_456");
  });

  it("prefers id over _id", () => {
    const result = normalizeMessage(service, {
      id: "primary",
      _id: "secondary",
      message: "test",
      username: "u",
    });

    expect(result!.id).toBe("primary");
  });

  // =========================================================================
  // Text field variations
  // =========================================================================

  it("uses text field", () => {
    const result = normalizeMessage(service, {
      id: "t1",
      text: "from text",
      username: "u",
    });

    expect(result!.message).toBe("from text");
  });

  it("uses comment field", () => {
    const result = normalizeMessage(service, {
      id: "t2",
      comment: "from comment",
      username: "u",
    });

    expect(result!.message).toBe("from comment");
  });

  it("uses content field", () => {
    const result = normalizeMessage(service, {
      id: "t3",
      content: "from content",
      username: "u",
    });

    expect(result!.message).toBe("from content");
  });

  it("prefers message over text", () => {
    const result = normalizeMessage(service, {
      id: "t4",
      message: "primary text",
      text: "secondary text",
      username: "u",
    });

    expect(result!.message).toBe("primary text");
  });

  // =========================================================================
  // Username priority: user.* > author.* > message.*
  // =========================================================================

  it("prefers user.username over author.fusername", () => {
    const result = normalizeMessage(service, {
      id: "p1",
      message: "test",
      user: { username: "user_name" },
      author: { fusername: "author_name" },
    });

    expect(result!.user.username).toBe("user_name");
  });

  it("prefers author.fusername over message.username", () => {
    const result = normalizeMessage(service, {
      id: "p2",
      message: "test",
      author: { fusername: "author_name" },
      username: "flat_name",
    });

    expect(result!.user.username).toBe("author_name");
  });

  // =========================================================================
  // Timestamp handling
  // =========================================================================

  it("uses numeric timestamp", () => {
    const result = normalizeMessage(service, {
      id: "ts1",
      message: "test",
      username: "u",
      timestamp: 1700000000000,
    });

    expect(result!.timestamp).toBe(1700000000000);
  });

  it("uses numeric createdAt as fallback", () => {
    const result = normalizeMessage(service, {
      id: "ts2",
      message: "test",
      username: "u",
      createdAt: 1700000001000,
    });

    expect(result!.timestamp).toBe(1700000001000);
  });

  it("parses string timestamp", () => {
    const result = normalizeMessage(service, {
      id: "ts3",
      message: "test",
      username: "u",
      timestamp: "2024-01-01T00:00:00.000Z",
    });

    expect(result!.timestamp).toBe(Date.parse("2024-01-01T00:00:00.000Z"));
  });

  it("falls back to Date.now() when no timestamp", () => {
    const before = Date.now();
    const result = normalizeMessage(service, {
      id: "ts4",
      message: "test",
      username: "u",
    });
    const after = Date.now();

    expect(result!.timestamp).toBeGreaterThanOrEqual(before);
    expect(result!.timestamp).toBeLessThanOrEqual(after);
  });

  // =========================================================================
  // Type handling
  // =========================================================================

  it("recognizes tip type", () => {
    const result = normalizeMessage(service, {
      id: "ty1",
      message: "tipped 100",
      username: "u",
      type: "tip",
    });

    expect(result!.type).toBe("tip");
  });

  it("recognizes system type", () => {
    const result = normalizeMessage(service, {
      id: "ty2",
      message: "system msg",
      username: "system",
      type: "system",
    });

    expect(result!.type).toBe("system");
  });

  it("defaults to chat for unknown type", () => {
    const result = normalizeMessage(service, {
      id: "ty3",
      message: "hello",
      username: "u",
      type: "unknown_type",
    });

    expect(result!.type).toBe("chat");
  });

  it("defaults to chat when no type", () => {
    const result = normalizeMessage(service, {
      id: "ty4",
      message: "hello",
      username: "u",
    });

    expect(result!.type).toBe("chat");
  });

  // =========================================================================
  // Avatar handling
  // =========================================================================

  it("extracts avatar from user.avatar", () => {
    const result = normalizeMessage(service, {
      id: "av1",
      message: "test",
      user: { username: "u", avatar: "https://img.com/a.png" },
    });

    expect(result!.user.avatar).toBe("https://img.com/a.png");
  });

  it("extracts avatar from user.image", () => {
    const result = normalizeMessage(service, {
      id: "av2",
      message: "test",
      user: { username: "u", image: "https://img.com/b.png" },
    });

    expect(result!.user.avatar).toBe("https://img.com/b.png");
  });

  it("extracts avatar from author.favatar", () => {
    const result = normalizeMessage(service, {
      id: "av3",
      message: "test",
      author: { fusername: "u", favatar: "https://img.com/c.png" },
    });

    expect(result!.user.avatar).toBe("https://img.com/c.png");
  });

  it("omits avatar when none present", () => {
    const result = normalizeMessage(service, {
      id: "av4",
      message: "test",
      username: "u",
    });

    expect(result!.user.avatar).toBeUndefined();
  });

  // =========================================================================
  // Rejection cases
  // =========================================================================

  it("rejects null input", () => {
    expect(normalizeMessage(service, null)).toBeNull();
  });

  it("rejects undefined input", () => {
    expect(normalizeMessage(service, undefined)).toBeNull();
  });

  it("rejects non-object input", () => {
    expect(normalizeMessage(service, "string")).toBeNull();
    expect(normalizeMessage(service, 42)).toBeNull();
    expect(normalizeMessage(service, true)).toBeNull();
  });

  it("rejects message with no id", () => {
    const result = normalizeMessage(service, {
      message: "test",
      username: "u",
    });

    expect(result).toBeNull();
  });

  it("rejects message with no text", () => {
    const result = normalizeMessage(service, {
      id: "no_text",
      username: "u",
    });

    expect(result).toBeNull();
  });

  it("rejects message with no username", () => {
    const result = normalizeMessage(service, {
      id: "no_user",
      message: "test",
    });

    expect(result).toBeNull();
  });

  it("rejects message with empty string fields", () => {
    const result = normalizeMessage(service, {
      id: "",
      message: "",
      username: "",
    });

    expect(result).toBeNull();
  });

  it("rejects message with whitespace-only fields", () => {
    const result = normalizeMessage(service, {
      id: "  ",
      message: "  ",
      username: "  ",
    });

    expect(result).toBeNull();
  });

  it("does not use author object as username when author is an object", () => {
    // When author is an object with no fusername/username/name,
    // and there's no other username source, message should be rejected
    const result = normalizeMessage(service, {
      id: "obj_author",
      message: "test",
      author: { someOtherField: "value" },
    });

    expect(result).toBeNull();
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  it("trims whitespace from all string fields", () => {
    const result = normalizeMessage(service, {
      id: "  trimmed_id  ",
      message: "  trimmed text  ",
      username: "  trimmed_user  ",
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe("trimmed_id");
    expect(result!.message).toBe("trimmed text");
    expect(result!.user.username).toBe("trimmed_user");
  });

  it("handles real Retake.tv comment payload shape", () => {
    // Based on actual Retake API response
    const result = normalizeMessage(service, {
      _id: "65abc123def456",
      comment: "this deck is insane bro",
      author: {
        fusername: "xViperx",
        favatar: "https://retake.tv/storage/avatars/xViperx.jpg",
        _id: "user_789",
      },
      createdAt: 1706000000000,
      streamId: "stream_abc",
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe("65abc123def456");
    expect(result!.message).toBe("this deck is insane bro");
    expect(result!.user.username).toBe("xViperx");
    expect(result!.user.avatar).toBe("https://retake.tv/storage/avatars/xViperx.jpg");
    expect(result!.timestamp).toBe(1706000000000);
    expect(result!.type).toBe("chat");
  });
});
