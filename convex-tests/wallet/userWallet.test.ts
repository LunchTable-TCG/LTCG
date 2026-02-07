/**
 * Wallet user query tests
 *
 * Ensures getUserWallet behaves correctly for authenticated and unauthenticated calls.
 */

import { api } from "../../_generated/api";
import type { MutationCtx } from "../../_generated/server";
import schema from "../../schema";
import { modules } from "../../test.setup";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { createAuthenticatedUser } from "../helpers/testAuth";

// Type helper to avoid TS2589 deep instantiation errors
// biome-ignore lint/suspicious/noExplicitAny: Required for TS2589 workaround
const walletUserWallet: any = (api as any)["wallet/userWallet"];

const createTestInstance = () => convexTest(schema, modules);

describe("wallet/userWallet.getUserWallet", () => {
  it("returns null when unauthenticated", async () => {
    const t = createTestInstance();

    const result = await t.query(walletUserWallet.getUserWallet, {});

    expect(result).toBeNull();
  });

  it("returns null when authenticated user has no wallet", async () => {
    const t = createTestInstance();
    const { privyId } = await createAuthenticatedUser(t, {
      email: "nowallet@example.com",
      username: "no_wallet_user",
    });

    const asUser = t.withIdentity({ subject: privyId });
    const result = await asUser.query(walletUserWallet.getUserWallet, {});

    expect(result).toBeNull();
  });

  it("returns wallet details for authenticated user", async () => {
    const t = createTestInstance();
    const { userId, privyId } = await createAuthenticatedUser(t, {
      email: "walletuser@example.com",
      username: "wallet_user",
    });

    const walletAddress = "B8Jq2m6rKJ6r5m3W7dYk4R7y7Z5p7V8u9R3Y6n7V8G";
    const walletType = "external" as const;
    const walletConnectedAt = Date.now();

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.patch(userId, {
        walletAddress,
        walletType,
        walletConnectedAt,
      });
    });

    const asUser = t.withIdentity({ subject: privyId });
    const result = await asUser.query(walletUserWallet.getUserWallet, {});

    expect(result).toEqual({
      walletAddress,
      walletType,
      walletConnectedAt,
    });
  });
});
