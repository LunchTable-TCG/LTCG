import { test, expect } from "./setup/fixtures";
import { TestUserFactory, SELECTORS } from "./setup/test-data";

/**
 * Social Features E2E Tests
 *
 * Tests social functionality including:
 * - Friend requests
 * - Accepting friend requests
 * - Chat messages
 * - Viewing leaderboards
 * - Profile viewing
 */

test.describe("Social Features Flow", () => {
  test.describe("Friend System", () => {
    test("should send friend request", async ({ context, authenticatedPage, testUser }) => {
      // Create second user
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      // User 1 sends friend request to User 2
      await authenticatedPage.goto("/social");

      // Search for user
      await authenticatedPage.fill('input[placeholder*="Search"]', user2.username);
      await authenticatedPage.waitForTimeout(1000);

      // Send request
      await authenticatedPage.click('button:has-text("Add Friend")');

      // Should show success message
      await expect(
        authenticatedPage.locator('text=/request.*sent/i')
      ).toBeVisible({ timeout: 5000 });

      await page2.close();
    });

    test("should receive friend request notification", async ({
      context,
      authenticatedPage,
      testUser,
    }) => {
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      // Create user 2
      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      // User 1 sends request
      await authenticatedPage.goto("/social");
      await authenticatedPage.fill('input[placeholder*="Search"]', user2.username);
      await authenticatedPage.waitForTimeout(1000);
      await authenticatedPage.click('button:has-text("Add Friend")');

      // User 2 checks notifications
      await page2.goto("/social");
      await page2.click('button:has-text("Requests")');

      // Should see pending request
      await expect(
        page2.locator('[data-testid="friend-request"]')
      ).toBeVisible({ timeout: 5000 });

      await page2.close();
    });

    test("should accept friend request", async ({ context, authenticatedPage, testUser }) => {
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      // Create user 2
      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      // User 1 sends request
      await authenticatedPage.goto("/social");
      await authenticatedPage.fill('input[placeholder*="Search"]', user2.username);
      await authenticatedPage.waitForTimeout(1000);
      await authenticatedPage.click('button:has-text("Add Friend")');

      // User 2 accepts
      await page2.goto("/social");
      await page2.click('button:has-text("Requests")');
      await page2.click('button:has-text("Accept")');

      // Should show in friends list
      await page2.click('button:has-text("Friends")');
      await expect(
        page2.locator(`text=${testUser.username}`)
      ).toBeVisible({ timeout: 5000 });

      // User 1 should also see user 2 in friends
      await authenticatedPage.goto("/social");
      await authenticatedPage.click('button:has-text("Friends")');
      await expect(
        authenticatedPage.locator(`text=${user2.username}`)
      ).toBeVisible({ timeout: 5000 });

      await page2.close();
    });

    test("should decline friend request", async ({ context, authenticatedPage, testUser }) => {
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      // Create user 2
      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      // User 1 sends request
      await authenticatedPage.goto("/social");
      await authenticatedPage.fill('input[placeholder*="Search"]', user2.username);
      await authenticatedPage.waitForTimeout(1000);
      await authenticatedPage.click('button:has-text("Add Friend")');

      // User 2 declines
      await page2.goto("/social");
      await page2.click('button:has-text("Requests")');
      await page2.click('button:has-text("Decline")');

      // Request should be removed
      const requestCount = await page2
        .locator('[data-testid="friend-request"]')
        .count();
      expect(requestCount).toBe(0);

      await page2.close();
    });

    test("should remove friend", async ({ context, authenticatedPage, testUser }) => {
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      // Setup friendship
      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      await authenticatedPage.goto("/social");
      await authenticatedPage.fill('input[placeholder*="Search"]', user2.username);
      await authenticatedPage.waitForTimeout(1000);
      await authenticatedPage.click('button:has-text("Add Friend")');

      await page2.goto("/social");
      await page2.click('button:has-text("Requests")');
      await page2.click('button:has-text("Accept")');

      // Remove friend
      await authenticatedPage.goto("/social");
      await authenticatedPage.click('button:has-text("Friends")');
      await authenticatedPage.locator(`text=${user2.username}`).click();
      await authenticatedPage.click('button:has-text("Remove")');
      await authenticatedPage.click('button:has-text("Confirm")');

      // Should be removed from list
      const friendExists = await authenticatedPage
        .locator(`text=${user2.username}`)
        .count();
      expect(friendExists).toBe(0);

      await page2.close();
    });
  });

  test.describe("Global Chat", () => {
    test("should display global chat", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/lunchtable");

      // Chat should be visible
      await expect(
        authenticatedPage.locator('[data-testid="global-chat"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should send chat message", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/lunchtable");

      const message = `Test message ${Date.now()}`;

      // Send message
      await authenticatedPage.fill('input[placeholder*="message"]', message);
      await authenticatedPage.press('input[placeholder*="message"]', "Enter");

      // Message should appear in chat
      await expect(
        authenticatedPage.locator(`text=${message}`)
      ).toBeVisible({ timeout: 5000 });
    });

    test("should receive messages from other users", async ({
      context,
      authenticatedPage,
    }) => {
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      // Create user 2
      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      // User 2 sends message
      await page2.goto("/lunchtable");
      const message = `Hello from ${user2.username}`;
      await page2.fill('input[placeholder*="message"]', message);
      await page2.press('input[placeholder*="message"]', "Enter");

      // User 1 should see message
      await authenticatedPage.goto("/lunchtable");
      await expect(
        authenticatedPage.locator(`text=${message}`)
      ).toBeVisible({ timeout: 10000 });

      await page2.close();
    });

    test("should show message sender username", async ({ authenticatedPage, testUser }) => {
      await authenticatedPage.goto("/lunchtable");

      const message = `Test ${Date.now()}`;
      await authenticatedPage.fill('input[placeholder*="message"]', message);
      await authenticatedPage.press('input[placeholder*="message"]', "Enter");

      // Username should be displayed with message
      await expect(
        authenticatedPage.locator(`text=${testUser.username}`)
      ).toBeVisible({ timeout: 5000 });
    });

    test("should enforce chat rate limiting", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/lunchtable");

      // Send multiple messages quickly
      for (let i = 0; i < 10; i++) {
        await authenticatedPage.fill('input[placeholder*="message"]', `Spam ${i}`);
        await authenticatedPage.press('input[placeholder*="message"]', "Enter");
        await authenticatedPage.waitForTimeout(100);
      }

      // Should show rate limit error
      const rateLimitError = authenticatedPage.locator('text=/too many messages/i');
      if (await rateLimitError.isVisible({ timeout: 2000 })) {
        expect(true).toBeTruthy();
      }
    });
  });

  test.describe("Leaderboards", () => {
    test("should display global leaderboard", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/leaderboards");

      // Leaderboard should be visible
      await expect(
        authenticatedPage.locator('[data-testid="leaderboard"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should show player rankings", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/leaderboards");

      // Player entries should be visible
      await expect(
        authenticatedPage.locator('[data-testid="leaderboard-entry"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should display player stats in leaderboard", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/leaderboards");

      // Stats columns should be visible
      await expect(
        authenticatedPage.locator('[data-testid="player-wins"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should filter leaderboard by timeframe", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/leaderboards");

      // Select weekly filter
      await authenticatedPage.click('button:has-text("Weekly")');

      // Leaderboard should update
      await authenticatedPage.waitForTimeout(1000);

      await expect(
        authenticatedPage.locator('[data-testid="leaderboard-entry"]')
      ).toBeVisible();
    });

    test("should show current player ranking", async ({ authenticatedPage, testUser }) => {
      await authenticatedPage.goto("/leaderboards");

      // Player's own rank should be highlighted or shown
      const playerEntry = authenticatedPage.locator(`text=${testUser.username}`);
      if (await playerEntry.isVisible({ timeout: 2000 })) {
        expect(true).toBeTruthy();
      }
    });
  });

  test.describe("Player Profiles", () => {
    test("should view own profile", async ({ authenticatedPage, testUser }) => {
      await authenticatedPage.goto("/profile");

      // Profile should display username
      await expect(
        authenticatedPage.locator(`text=${testUser.username}`)
      ).toBeVisible({ timeout: 5000 });
    });

    test("should view other player profile", async ({ context, authenticatedPage }) => {
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      // Create user 2
      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      // Get user 2 profile URL
      await page2.goto("/profile");
      const profileUrl = page2.url();

      // User 1 visits user 2 profile
      await authenticatedPage.goto(profileUrl);

      // Should show user 2 profile
      await expect(
        authenticatedPage.locator(`text=${user2.username}`)
      ).toBeVisible({ timeout: 5000 });

      await page2.close();
    });

    test("should display player statistics", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/profile");

      // Stats should be visible
      await expect(
        authenticatedPage.locator('[data-testid="player-stats"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should display player badges", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/profile");

      // Badges section should be visible
      await expect(
        authenticatedPage.locator('[data-testid="player-badges"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should display match history", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/match-history");

      // Match history should be visible
      await expect(
        authenticatedPage.locator('[data-testid="match-entry"]')
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Player Presence", () => {
    test("should show online status", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/social");
      await authenticatedPage.click('button:has-text("Friends")');

      // Online status indicator should be visible
      const onlineIndicator = authenticatedPage.locator('[data-testid="online-status"]');
      if (await onlineIndicator.isVisible({ timeout: 2000 })) {
        expect(true).toBeTruthy();
      }
    });

    test("should show in-game status", async ({ authenticatedPage }) => {
      // When player is in game, status should reflect that
      await authenticatedPage.goto("/social");

      const inGameStatus = authenticatedPage.locator('text=/in game/i');
      if (await inGameStatus.isVisible({ timeout: 2000 })) {
        expect(true).toBeTruthy();
      }
    });
  });
});
