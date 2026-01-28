/// <reference types="vite/client" />

import type { TestConvex } from "convex-test";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";

export function createTestInstance(): TestConvex<typeof schema>;
export function createTestContext(): Promise<TestConvex<typeof schema>>;
export function cleanupTestContext(helper: TestConvex<typeof schema>): Promise<void>;
export function waitFor(
  condition: () => Promise<boolean>,
  timeoutMs?: number,
  intervalMs?: number
): Promise<void>;
export function insertTestUser(
  helper: TestConvex<typeof schema>,
  userData: {
    email: string;
    username: string;
    name?: string;
    gold?: number;
    rankedElo?: number;
  }
): Promise<Id<"users">>;
export function createTestSession(
  helper: TestConvex<typeof schema>,
  userId: Id<"users">
): Promise<Id<"authSessions">>;
export function deleteTestUser(
  helper: TestConvex<typeof schema>,
  userId: Id<"users">
): Promise<void>;
