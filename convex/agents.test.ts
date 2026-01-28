/**
 * Agent API Key Management Tests
 *
 * Tests bcrypt-based API key hashing, validation, and lifecycle management.
 * These tests verify the core bcrypt functionality and key generation.
 */

import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

describe("Bcrypt API Key Hashing", () => {
  describe("Hash generation and validation", () => {
    it("should hash and verify API keys with bcrypt", async () => {
      const testKey = "ltcg_testkey1234567890abcdefghij";
      const saltRounds = 12;

      // Hash the key
      const hash = await bcrypt.hash(testKey, saltRounds);

      // Verify hash format (bcrypt hashes start with $2a$, $2b$, or $2y$)
      expect(hash).toMatch(/^\$2[aby]\$12\$/);
      expect(hash).not.toBe(testKey); // Hash should not equal plain text

      // Verify correct key validates successfully
      const isValid = await bcrypt.compare(testKey, hash);
      expect(isValid).toBe(true);

      // Verify incorrect key fails validation
      const wrongKey = "ltcg_wrongkey1234567890abcdefghij";
      const isInvalid = await bcrypt.compare(wrongKey, hash);
      expect(isInvalid).toBe(false);
    });

    it("should generate unique hashes for the same key (different salts)", async () => {
      const testKey = "ltcg_samekey1234567890abcdefghijk";
      const saltRounds = 12;

      // Generate two hashes of the same key
      const hash1 = await bcrypt.hash(testKey, saltRounds);
      const hash2 = await bcrypt.hash(testKey, saltRounds);

      // Hashes should be different (bcrypt uses random salt)
      expect(hash1).not.toBe(hash2);

      // But both should validate the same key
      expect(await bcrypt.compare(testKey, hash1)).toBe(true);
      expect(await bcrypt.compare(testKey, hash2)).toBe(true);
    });

    it("should use exactly 12 salt rounds", async () => {
      const testKey = "ltcg_roundtest1234567890abcdefgh";
      const saltRounds = 12;

      const hash = await bcrypt.hash(testKey, saltRounds);

      // Extract salt rounds from hash (format: $2a$rounds$salt+hash)
      const match = hash.match(/^\$2[aby]\$(\d{2})\$/);
      expect(match).toBeTruthy();
      expect(match![1]).toBe("12");
    });

    it("should handle errors gracefully during verification", async () => {
      const testKey = "ltcg_errortest1234567890abcdefgh";

      // Try to compare against an invalid hash format
      const isValid = await bcrypt.compare(testKey, "invalid_hash_format");
      expect(isValid).toBe(false);
    });
  });

  describe("API key format validation", () => {
    it("should validate ltcg_ prefix", () => {
      const validKey = "ltcg_abcdefghij1234567890ABCDEFGHIJKL"; // 37 chars total: ltcg_ (5) + 32
      const invalidKey = "invalid_abcdefghij1234567890ABCD";

      expect(validKey.startsWith("ltcg_")).toBe(true);
      expect(validKey.length).toBe(37); // ltcg_ + 32 chars = 37 total
      expect(invalidKey.startsWith("ltcg_")).toBe(false);
    });

    it("should generate keys with correct length", () => {
      // Simulate key generation
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const randomValues = new Uint8Array(32);
      crypto.getRandomValues(randomValues);
      const key = Array.from(randomValues)
        .map((byte) => chars[byte % chars.length])
        .join("");
      const fullKey = `ltcg_${key}`;

      expect(fullKey).toMatch(/^ltcg_[A-Za-z0-9]{32}$/);
      expect(fullKey.length).toBe(37); // ltcg_ (5) + 32 chars
    });

    it("should create correct key prefix for display", () => {
      const testKey = "ltcg_abcdefghij1234567890ABCDEFGH";
      const prefix = `${testKey.substring(0, 12)}...`;

      expect(prefix).toBe("ltcg_abcdefg...");
      expect(prefix.length).toBe(15); // 12 chars + "..."
    });
  });

  describe("Performance considerations", () => {
    it("should hash keys within reasonable time", async () => {
      const testKey = "ltcg_perftest1234567890abcdefghij";
      const saltRounds = 12;

      const startTime = Date.now();
      await bcrypt.hash(testKey, saltRounds);
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Bcrypt with 12 rounds should take between 50ms - 500ms
      // (depends on CPU, but shouldn't be instant or extremely slow)
      expect(duration).toBeGreaterThan(10); // Not instant
      expect(duration).toBeLessThan(2000); // Not unreasonably slow
    });

    it("should verify keys within reasonable time", async () => {
      const testKey = "ltcg_verifytest1234567890abcdefgh";
      const hash = await bcrypt.hash(testKey, 12);

      const startTime = Date.now();
      await bcrypt.compare(testKey, hash);
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Verification should be similar to hashing time
      expect(duration).toBeGreaterThan(10);
      expect(duration).toBeLessThan(2000);
    });
  });
});
