import { test, expect } from "./setup/fixtures";
import { AuthHelper } from "./setup/helpers";
import { TestUserFactory, SELECTORS } from "./setup/test-data";

/**
 * Authentication Flow E2E Tests
 *
 * Tests the complete authentication flow including:
 * - User signup
 * - User login
 * - Session persistence
 * - Password reset flow
 * - Logout
 */

test.describe("Authentication Flow", () => {
  test.describe("User Signup", () => {
    test("should successfully sign up a new user", async ({ page }) => {
      const authHelper = new AuthHelper(page);
      const testUser = TestUserFactory.create();

      await page.goto("/signup");

      // Fill signup form
      await page.fill(SELECTORS.AUTH_USERNAME_INPUT, testUser.username);
      await page.fill(SELECTORS.AUTH_EMAIL_INPUT, testUser.email);
      await page.fill(SELECTORS.AUTH_PASSWORD_INPUT, testUser.password);
      await page.fill('input[id="confirmPassword"]', testUser.password);

      // Submit
      await page.click(SELECTORS.AUTH_SUBMIT_BUTTON);

      // Should redirect to authenticated page
      await page.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      // Verify user is logged in
      const isAuthenticated = await authHelper.isAuthenticated();
      expect(isAuthenticated).toBeTruthy();
    });

    test("should show error for duplicate username", async ({ page }) => {
      const testUser = TestUserFactory.create();

      // Create first user
      const authHelper = new AuthHelper(page);
      await authHelper.signup(testUser.username, testUser.email, testUser.password);
      await authHelper.logout();

      // Try to sign up with same username but different email
      await page.goto("/signup");
      await page.fill(SELECTORS.AUTH_USERNAME_INPUT, testUser.username);
      await page.fill(SELECTORS.AUTH_EMAIL_INPUT, `different_${testUser.email}`);
      await page.fill(SELECTORS.AUTH_PASSWORD_INPUT, testUser.password);
      await page.fill('input[id="confirmPassword"]', testUser.password);
      await page.click(SELECTORS.AUTH_SUBMIT_BUTTON);

      // SECURITY: Generic error message (doesn't reveal if user exists)
      await expect(page.locator('text=/Could not create account/i')).toBeVisible({ timeout: 5000 });
    });

    test("should show error for duplicate email", async ({ page }) => {
      const testUser = TestUserFactory.create();

      // Create first user
      const authHelper = new AuthHelper(page);
      await authHelper.signup(testUser.username, testUser.email, testUser.password);
      await authHelper.logout();

      // Try to sign up with same email but different username
      await page.goto("/signup");
      await page.fill(SELECTORS.AUTH_USERNAME_INPUT, `different_${testUser.username}`);
      await page.fill(SELECTORS.AUTH_EMAIL_INPUT, testUser.email);
      await page.fill(SELECTORS.AUTH_PASSWORD_INPUT, testUser.password);
      await page.fill('input[id="confirmPassword"]', testUser.password);
      await page.click(SELECTORS.AUTH_SUBMIT_BUTTON);

      // SECURITY: Generic error message (doesn't reveal if user exists)
      await expect(page.locator('text=/Could not create account/i')).toBeVisible({ timeout: 5000 });
    });

    test("should validate password requirements", async ({ page }) => {
      await page.goto("/signup");

      const testUser = TestUserFactory.create({ password: "weak" });

      await page.fill(SELECTORS.AUTH_USERNAME_INPUT, testUser.username);
      await page.fill(SELECTORS.AUTH_EMAIL_INPUT, testUser.email);
      await page.fill(SELECTORS.AUTH_PASSWORD_INPUT, testUser.password);
      await page.fill('input[id="confirmPassword"]', testUser.password);
      await page.click(SELECTORS.AUTH_SUBMIT_BUTTON);

      // Should show password validation error
      await expect(page.locator('text=/password.*must/i')).toBeVisible({ timeout: 5000 });
    });

    test("should validate email format", async ({ page }) => {
      await page.goto("/signup");

      const testUser = TestUserFactory.create({ email: "invalid-email" });

      await page.fill(SELECTORS.AUTH_USERNAME_INPUT, testUser.username);
      await page.fill(SELECTORS.AUTH_EMAIL_INPUT, testUser.email);
      await page.fill(SELECTORS.AUTH_PASSWORD_INPUT, testUser.password);
      await page.fill('input[id="confirmPassword"]', testUser.password);
      await page.click(SELECTORS.AUTH_SUBMIT_BUTTON);

      // Should show email validation error
      await expect(page.locator('text=/valid.*email/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("User Login", () => {
    test("should successfully log in existing user", async ({ page }) => {
      // First, create a user
      const testUser = TestUserFactory.create();
      const authHelper = new AuthHelper(page);

      await authHelper.signup(testUser.username, testUser.email, testUser.password);
      await authHelper.logout();

      // Now log in
      await authHelper.login(testUser.email, testUser.password);

      // Verify logged in
      const isAuthenticated = await authHelper.isAuthenticated();
      expect(isAuthenticated).toBeTruthy();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login");

      await page.fill(SELECTORS.AUTH_EMAIL_INPUT, "nonexistent@example.com");
      await page.fill(SELECTORS.AUTH_PASSWORD_INPUT, "WrongPassword123!");
      await page.click(SELECTORS.AUTH_SUBMIT_BUTTON);

      // SECURITY: Generic error message (doesn't reveal if user exists)
      await expect(page.locator('text=/Invalid email or password/i')).toBeVisible({ timeout: 5000 });
    });

    test("should show error for wrong password", async ({ page }) => {
      // Create user
      const testUser = TestUserFactory.create();
      const authHelper = new AuthHelper(page);
      await authHelper.signup(testUser.username, testUser.email, testUser.password);
      await authHelper.logout();

      // Try to login with wrong password
      await page.goto("/login");
      await page.fill(SELECTORS.AUTH_EMAIL_INPUT, testUser.email);
      await page.fill(SELECTORS.AUTH_PASSWORD_INPUT, "WrongPassword123!");
      await page.click(SELECTORS.AUTH_SUBMIT_BUTTON);

      // SECURITY: Generic error message (doesn't reveal if user exists)
      await expect(page.locator('text=/Invalid email or password/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Session Persistence", () => {
    test("should maintain session after page reload", async ({ page }) => {
      const testUser = TestUserFactory.create();
      const authHelper = new AuthHelper(page);

      // Sign up and login
      await authHelper.signup(testUser.username, testUser.email, testUser.password);

      // Reload page
      await page.reload();

      // Should still be authenticated
      await page.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 5000 });
      const isAuthenticated = await authHelper.isAuthenticated();
      expect(isAuthenticated).toBeTruthy();
    });

    test("should maintain session in new tab", async ({ context, page }) => {
      const testUser = TestUserFactory.create();
      const authHelper = new AuthHelper(page);

      // Sign up and login
      await authHelper.signup(testUser.username, testUser.email, testUser.password);

      // Open new tab
      const newPage = await context.newPage();
      const newAuthHelper = new AuthHelper(newPage);

      await newPage.goto("/");

      // Should be authenticated in new tab
      const isAuthenticated = await newAuthHelper.isAuthenticated();
      expect(isAuthenticated).toBeTruthy();

      await newPage.close();
    });
  });

  test.describe("Logout", () => {
    test("should successfully log out user", async ({ page }) => {
      const testUser = TestUserFactory.create();
      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(testUser.username, testUser.email, testUser.password);

      // Logout
      await authHelper.logout();

      // Should be redirected to login or home
      await expect(page).toHaveURL(/\/(login|$)/);

      // Should not be authenticated
      const isAuthenticated = await authHelper.isAuthenticated();
      expect(isAuthenticated).toBeFalsy();
    });

    test("should clear session after logout", async ({ page }) => {
      const testUser = TestUserFactory.create();
      const authHelper = new AuthHelper(page);

      // Sign up and logout
      await authHelper.signup(testUser.username, testUser.email, testUser.password);
      await authHelper.logout();

      // Try to access protected page
      await page.goto("/binder");

      // Should redirect to login
      await page.waitForURL(/\/(login|$)/, { timeout: 5000 });
    });
  });

  test.describe("Password Reset", () => {
    test("should navigate to forgot password page", async ({ page }) => {
      await page.goto("/login");

      // Click forgot password link
      await page.click('a:has-text("Forgot")');

      // Should navigate to forgot password page
      await expect(page).toHaveURL(/\/forgot-password/);
    });

    test("should show success message on password reset request", async ({ page }) => {
      const testUser = TestUserFactory.create();
      const authHelper = new AuthHelper(page);

      // Create user first
      await authHelper.signup(testUser.username, testUser.email, testUser.password);
      await authHelper.logout();

      // Go to forgot password
      await page.goto("/forgot-password");

      // Enter email
      await page.fill(SELECTORS.AUTH_EMAIL_INPUT, testUser.email);
      await page.click(SELECTORS.AUTH_SUBMIT_BUTTON);

      // Should show success message
      await expect(page.locator('text=/sent.*reset.*link/i')).toBeVisible({ timeout: 5000 });
    });

    test("should handle non-existent email gracefully", async ({ page }) => {
      await page.goto("/forgot-password");

      // Enter non-existent email
      await page.fill(SELECTORS.AUTH_EMAIL_INPUT, "nonexistent@example.com");
      await page.click(SELECTORS.AUTH_SUBMIT_BUTTON);

      // Should show generic success message (security best practice)
      await expect(page.locator('text=/sent.*reset.*link/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      const protectedRoutes = [
        "/binder",
        "/shop",
        "/lunchtable",
        "/play/story",
        "/quests",
        "/social",
        "/settings",
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await page.waitForURL(/\/(login|$)/, { timeout: 5000 });
      }
    });

    test("should allow authenticated users to access protected routes", async ({
      authenticatedPage,
    }) => {
      const protectedRoutes = [
        "/binder",
        "/shop",
        "/lunchtable",
        "/play/story",
        "/quests",
        "/social",
        "/settings",
      ];

      for (const route of protectedRoutes) {
        await authenticatedPage.goto(route);
        // Should not redirect to login
        await expect(authenticatedPage).toHaveURL(new RegExp(route));
      }
    });
  });
});
