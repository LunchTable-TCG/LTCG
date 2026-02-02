import { type Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class SocialPage extends BasePage {
  readonly url = "/social";

  // Tab selectors
  get friendsTab(): Locator {
    return this.page.locator('button:has-text("Friends")');
  }

  get requestsTab(): Locator {
    return this.page.locator('button:has-text("Requests")');
  }

  get searchTab(): Locator {
    return this.page.locator('button:has-text("Find Players")');
  }

  // Friends list selectors
  get onlineFriendsSection(): Locator {
    return this.page.locator('h2:has-text("Online")').locator("..");
  }

  get offlineFriendsSection(): Locator {
    return this.page.locator('h2:has-text("Offline")').locator("..");
  }

  get friendItems(): Locator {
    return this.page.locator('[data-testid="online-status"]').locator("../..");
  }

  get noFriendsMessage(): Locator {
    return this.page.locator('p:has-text("No friends yet")');
  }

  // Friend requests selectors
  get friendRequestItems(): Locator {
    return this.page.locator('[data-testid="friend-request"]');
  }

  get noRequestsMessage(): Locator {
    return this.page.locator('p:has-text("No pending friend requests")');
  }

  // Search selectors
  get searchInput(): Locator {
    return this.page.locator('input[placeholder*="Search by username"]');
  }

  get searchResults(): Locator {
    return this.page.locator('[data-testid="friend-request"]').locator("..").locator("> div");
  }

  get noSearchResultsMessage(): Locator {
    return this.page.locator('p:has-text("No players found")');
  }

  get searchPromptMessage(): Locator {
    return this.page.locator('p:has-text("Start typing to search")');
  }

  // Helper methods to get specific items
  getFriendItem(index: number): Locator {
    return this.friendItems.nth(index);
  }

  getRequestItem(index: number): Locator {
    return this.friendRequestItems.nth(index);
  }

  getSearchResultItem(index: number): Locator {
    return this.searchResults.nth(index);
  }

  // Actions - Tab Navigation
  async goToFriendsTab() {
    await this.friendsTab.click();
    await this.page.waitForTimeout(300);
  }

  async goToRequestsTab() {
    await this.requestsTab.click();
    await this.page.waitForTimeout(300);
  }

  async goToSearchTab() {
    await this.searchTab.click();
    await this.page.waitForTimeout(300);
  }

  // Actions - Search
  async searchPlayer(username: string) {
    await this.goToSearchTab();
    await this.searchInput.fill(username);
    await this.page.waitForTimeout(500); // Debounce
  }

  async sendFriendRequest(resultIndex = 0) {
    const result = this.getSearchResultItem(resultIndex);
    await result.locator('button:has-text("Add Friend")').click();
    await this.page.waitForTimeout(500);
  }

  async sendFriendRequestToUsername(username: string) {
    await this.searchPlayer(username);
    await this.sendFriendRequest(0);
  }

  // Actions - Friend Requests
  async acceptFriendRequest(index = 0) {
    await this.goToRequestsTab();
    const request = this.getRequestItem(index);
    await request.locator('button:has([class*="check"])').click();
    await this.page.waitForTimeout(500);
  }

  async declineFriendRequest(index = 0) {
    await this.goToRequestsTab();
    const request = this.getRequestItem(index);
    await request.locator('button:has([class*="x"])').click();
    await this.page.waitForTimeout(500);
  }

  // Actions - Friend Management
  async removeFriend(friendIndex = 0) {
    await this.goToFriendsTab();
    const friend = this.getFriendItem(friendIndex);

    // Click the more options menu
    await friend.locator('button:has-text("")').last().click();
    await this.page.waitForTimeout(200);

    // Click Remove Friend option
    await this.page.locator('button:has-text("Remove Friend")').click();
    await this.page.waitForTimeout(500);
  }

  async blockFriend(friendIndex = 0) {
    await this.goToFriendsTab();
    const friend = this.getFriendItem(friendIndex);

    // Click the more options menu
    await friend.locator('button:has-text("")').last().click();
    await this.page.waitForTimeout(200);

    // Click Block option
    await this.page.locator('button:has-text("Block")').click();
    await this.page.waitForTimeout(500);
  }

  async challengeFriend(friendIndex = 0) {
    await this.goToFriendsTab();
    const friend = this.getFriendItem(friendIndex);
    await friend.locator('button:has-text("Challenge")').click();
    await this.page.waitForTimeout(500);
  }

  async messageFriend(friendIndex = 0) {
    await this.goToFriendsTab();
    const friend = this.getFriendItem(friendIndex);
    await friend.locator('button[aria-label*="Message"]').click();
    await this.page.waitForTimeout(500);
  }

  // Assertions - Friend List
  async expectFriendCount(count: number) {
    await this.goToFriendsTab();
    if (count === 0) {
      await expect(this.noFriendsMessage).toBeVisible();
    } else {
      await expect(this.friendItems).toHaveCount(count);
    }
  }

  async expectOnlineFriendCount(count: number) {
    await this.goToFriendsTab();
    const header = this.page.locator(`h2:has-text("Online — ${count}")`);
    await expect(header).toBeVisible();
  }

  async expectOfflineFriendCount(count: number) {
    await this.goToFriendsTab();
    const header = this.page.locator(`h2:has-text("Offline — ${count}")`);
    await expect(header).toBeVisible();
  }

  async expectFriendIsOnline(friendIndex: number) {
    await this.goToFriendsTab();
    const statusDot = this.getFriendItem(friendIndex).locator('[data-testid="online-status"]');
    await expect(statusDot).toHaveClass(/bg-green-500/);
  }

  async expectFriendIsOffline(friendIndex: number) {
    await this.goToFriendsTab();
    const statusDot = this.getFriendItem(friendIndex).locator('[data-testid="online-status"]');
    await expect(statusDot).toHaveClass(/bg-gray-500/);
  }

  // Assertions - Friend Requests
  async expectRequestCount(count: number) {
    await this.goToRequestsTab();
    if (count === 0) {
      await expect(this.noRequestsMessage).toBeVisible();
    } else {
      await expect(this.friendRequestItems).toHaveCount(count);
    }
  }

  async expectRequestFromUser(username: string) {
    await this.goToRequestsTab();
    const request = this.friendRequestItems.locator(`text=${username}`);
    await expect(request).toBeVisible();
  }

  // Assertions - Search
  async expectSearchResultCount(count: number) {
    if (count === 0) {
      await expect(this.noSearchResultsMessage).toBeVisible();
    } else {
      await expect(this.searchResults).toHaveCount(count);
    }
  }

  async expectSearchResultContainsUser(username: string) {
    const result = this.searchResults.locator(`text=${username}`);
    await expect(result).toBeVisible();
  }

  async expectFriendRequestButtonDisabled(resultIndex = 0) {
    const result = this.getSearchResultItem(resultIndex);
    const button = result.locator(
      'button:has-text("Add Friend"), button:has-text("Friends"), button:has-text("Pending")'
    );
    await expect(button).toBeDisabled();
  }

  async expectFriendRequestButtonText(resultIndex: number, expectedText: string) {
    const result = this.getSearchResultItem(resultIndex);
    const button = result.locator("button").last();
    await expect(button).toContainText(expectedText);
  }

  // Assertions - Tab Badge
  async expectFriendsTabBadge(count: number) {
    const badge = this.friendsTab.locator(`span:has-text("${count}")`);
    await expect(badge).toBeVisible();
  }

  async expectRequestsTabBadge(count: number) {
    const badge = this.requestsTab.locator(`span:has-text("${count}")`);
    await expect(badge).toBeVisible();
  }

  // Assertions - Challenge Toast
  async expectChallengeToast(username: string) {
    await this.waitForToast(`Challenge sent to ${username}!`);
  }

  // Assertions - Messaging (Coming Soon)
  async expectMessagingComingSoonToast() {
    await this.waitForToast("Messaging coming soon!");
  }
}
