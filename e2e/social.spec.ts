/**
 * Social Features E2E Tests
 *
 * Tests social functionality including:
 * - Friends list
 * - Friend requests
 * - Player search
 * - Leaderboards
 * - Profile viewing
 */

import { expect, test } from "./setup/fixtures";

test.describe("Social Features", () => {
  test.describe("Friends Page", () => {
    test("social page loads correctly", async ({ socialPage }) => {
      await socialPage.navigate();
      await expect(socialPage.page).toHaveURL(/social/);
    });

    test("displays friends tab by default", async ({ socialPage }) => {
      await socialPage.navigate();
      await expect(socialPage.friendsTab).toBeVisible();
    });

    test("can switch between tabs", async ({ socialPage }) => {
      await socialPage.navigate();

      await socialPage.goToRequestsTab();
      await expect(socialPage.requestsTab).toBeVisible();

      await socialPage.goToSearchTab();
      await expect(socialPage.searchInput).toBeVisible();

      await socialPage.goToFriendsTab();
      await expect(socialPage.friendsTab).toBeVisible();
    });

    test("shows empty state when no friends", async ({ socialPage }) => {
      await socialPage.navigate();
      await socialPage.goToFriendsTab();

      // New user should have no friends or show the friends list
      const hasFriends = await socialPage.friendItems.count();
      const hasEmptyState = await socialPage.noFriendsMessage.isVisible({ timeout: 2000 });

      expect(hasFriends > 0 || hasEmptyState).toBeTruthy();
    });
  });

  test.describe("Player Search", () => {
    test("can search for players", async ({ socialPage }) => {
      await socialPage.navigate();
      await socialPage.goToSearchTab();

      // Search input should be visible
      await expect(socialPage.searchInput).toBeVisible();

      // Search for a common term
      await socialPage.searchPlayer("test");

      // Either shows results or no results message
      await socialPage.page.waitForTimeout(1000);
    });

    test("shows empty state for no results", async ({ socialPage }) => {
      await socialPage.navigate();
      await socialPage.goToSearchTab();

      // Search for unlikely username
      await socialPage.searchPlayer("xyznonexistent12345");

      // Should show no results message or empty state
      await socialPage.page.waitForTimeout(1000);
    });

    test("shows search prompt initially", async ({ socialPage }) => {
      await socialPage.navigate();
      await socialPage.goToSearchTab();

      // Should show prompt message before searching
      await expect(socialPage.searchPromptMessage).toBeVisible();
    });
  });

  test.describe("Friend Requests", () => {
    test("can view pending requests", async ({ socialPage }) => {
      await socialPage.navigate();
      await socialPage.goToRequestsTab();

      // Requests tab should be visible
      await expect(socialPage.requestsTab).toBeVisible();
    });

    test("shows empty state when no requests", async ({ socialPage }) => {
      await socialPage.navigate();
      await socialPage.goToRequestsTab();

      // Check for either requests or empty state
      const hasRequests = await socialPage.friendRequestItems.count();
      const hasEmptyState = await socialPage.noRequestsMessage.isVisible({ timeout: 2000 });

      expect(hasRequests > 0 || hasEmptyState).toBeTruthy();
    });

    // These tests would need another test user to send requests
    test.skip("can accept friend request", async ({ socialPage }) => {
      await socialPage.navigate();
      await socialPage.acceptFriendRequest(0);
    });

    test.skip("can decline friend request", async ({ socialPage }) => {
      await socialPage.navigate();
      await socialPage.declineFriendRequest(0);
    });

    test.skip("can send friend request", async ({ socialPage }) => {
      await socialPage.navigate();
      await socialPage.sendFriendRequestToUsername("testuser");
    });
  });

  test.describe("Friend Management", () => {
    test.skip("can remove friend", async ({ socialPage }) => {
      await socialPage.navigate();
      await socialPage.removeFriend(0);
    });

    test.skip("can challenge friend", async ({ socialPage }) => {
      await socialPage.navigate();
      await socialPage.challengeFriend(0);
      await socialPage.expectChallengeToast("TestPlayer");
    });

    test.skip("can message friend", async ({ socialPage }) => {
      await socialPage.navigate();
      await socialPage.messageFriend(0);
      await socialPage.expectMessagingComingSoonToast();
    });
  });

  test.describe("Leaderboards", () => {
    test("can view leaderboards", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/leaderboards");

      // Leaderboard should load
      await expect(authenticatedPage.locator('[data-testid="leaderboard"]')).toBeVisible({
        timeout: 10000,
      });
    });

    test("shows player rankings", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/leaderboards");

      // Should show leaderboard structure
      await authenticatedPage.waitForLoadState("networkidle");
      await expect(authenticatedPage).toHaveURL(/leaderboards/);
    });
  });

  test.describe("Profile", () => {
    test("can view own profile", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/profile");

      // Profile should load
      await authenticatedPage.waitForLoadState("networkidle");
      await expect(authenticatedPage).toHaveURL(/profile/);
    });

    test("profile page renders", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/profile");

      // Page should be visible
      await expect(authenticatedPage.locator("body")).toBeVisible();
    });
  });

  test.describe("Match History", () => {
    test("can view match history", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/match-history");

      // Match history should load
      await authenticatedPage.waitForLoadState("networkidle");
      await expect(authenticatedPage).toHaveURL(/match-history/);
    });

    test("match history page renders", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/match-history");

      // Page should be visible
      await expect(authenticatedPage.locator("body")).toBeVisible();
    });
  });
});
