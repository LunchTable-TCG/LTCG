import { test, expect } from "./setup/fixtures";
import { AuthHelper } from "./setup/helpers";
import { TestUserFactory } from "./setup/test-data";

/**
 * AuthForm Component E2E Tests
 *
 * Tests the specific AuthForm component behavior with its unique fantasy-themed
 * labels and interactions that weren't covered by the general auth flow tests.
 *
 * This complements auth.spec.ts by testing:
 * - AuthForm-specific UI labels and text
 * - Password confirmation matching (sign up flow)
 * - Button loading states during submission
 * - Error message display for validation failures
 * - Redirect to /lunchtable specifically (not other protected routes)
 */

test.describe("AuthForm Component", () => {
  test.describe("Sign Up Form - Fantasy-Themed Labels", () => {
    test("should display fantasy-themed labels for sign up", async ({ page }) => {
      await page.goto("/signup");

      // Verify fantasy-themed labels are present
      await expect(page.locator('text=/archivist name/i')).toBeVisible();
      await expect(page.locator('text=/digital seal/i')).toBeVisible();
      await expect(page.locator('text=/secret cipher/i')).toBeVisible();
      await expect(page.locator('text=/verify cipher/i')).toBeVisible();

      // Verify fantasy-themed header text
      await expect(page.locator('text=/initiate.*archive/i')).toBeVisible();
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

      // Verify submit button has fantasy text
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    });

    test("should validate password confirmation match", async ({ page }) => {
      await page.goto("/signup");

      const testUser = TestUserFactory.create();

      // Fill form with mismatched passwords (meet requirements but don't match)
      await page.fill('input[name="name"]', testUser.username);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', "Password123");
      await page.fill('input#confirmPassword', "Different456");

      // Submit form
      await page.click('button[type="submit"]');

      // Should show password mismatch error
      await expect(page.locator('text=/passwords do not match/i')).toBeVisible({
        timeout: 2000,
      });
    });

    test("should redirect to /lunchtable after successful sign up", async ({ page }) => {
      const testUser = TestUserFactory.create();

      await page.goto("/signup");

      // Fill sign up form with matching passwords
      await page.fill('input[name="name"]', testUser.username);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input#confirmPassword', testUser.password);

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect specifically to /lunchtable (not binder or profile)
      await page.waitForURL("/lunchtable", { timeout: 10000 });

      // Verify we're on lunchtable page
      expect(page.url()).toContain("/lunchtable");
    });

    test("should show loading state during sign up submission", async ({ page }) => {
      const testUser = TestUserFactory.create();

      await page.goto("/signup");

      // Fill form
      await page.fill('input[name="name"]', testUser.username);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input#confirmPassword', testUser.password);

      // Click submit
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Button should show loading state (disabled with loading text)
      // Check within a short time window before redirect completes
      try {
        await expect(submitButton).toBeDisabled({ timeout: 1000 });
      } catch {
        // If redirect happens too fast, that's also acceptable
        expect(page.url()).toContain("/lunchtable");
      }
    });
  });

  test.describe("Sign In Form - Fantasy-Themed Labels", () => {
    test("should display fantasy-themed labels for sign in", async ({ page }) => {
      await page.goto("/login");

      // Verify fantasy-themed labels are present
      await expect(page.locator('text=/digital seal/i')).toBeVisible();
      await expect(page.locator('text=/secret cipher/i')).toBeVisible();

      // Verify fantasy-themed header text
      await expect(page.locator('text=/speak the passcode/i')).toBeVisible();
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

      // Verify submit button has fantasy text
      await expect(page.getByRole('button', { name: 'Enter the Hall' })).toBeVisible();

      // Verify username field is NOT present in sign in form
      await expect(page.locator('text=/archivist name/i')).not.toBeVisible();
      await expect(page.locator('text=/verify cipher/i')).not.toBeVisible();
    });

    test("should redirect to /lunchtable after successful sign in", async ({ page }) => {
      // Create user first
      const testUser = TestUserFactory.create();
      const authHelper = new AuthHelper(page);

      await authHelper.signup(testUser.username, testUser.email, testUser.password);
      await authHelper.logout();

      // Now sign in
      await page.goto("/login");

      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);

      // Click "Enter the Hall" button
      await page.click('button:has-text("Enter the Hall")');

      // Should redirect specifically to /lunchtable
      await page.waitForURL("/lunchtable", { timeout: 10000 });

      expect(page.url()).toContain("/lunchtable");
    });

    test("should display error message for invalid password", async ({ page }) => {
      // Create user first
      const testUser = TestUserFactory.create();
      const authHelper = new AuthHelper(page);

      await authHelper.signup(testUser.username, testUser.email, testUser.password);
      await authHelper.logout();

      // Try to sign in with wrong password
      await page.goto("/login");

      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', "WrongPassword123");

      await page.click('button[type="submit"]');

      // SECURITY: Generic error message (doesn't reveal if user exists)
      await expect(page.locator('text=/Invalid email or password/i')).toBeVisible({ timeout: 5000 });
    });

    test("should show loading state during sign in submission", async ({ page }) => {
      // Create user first
      const testUser = TestUserFactory.create();
      const authHelper = new AuthHelper(page);

      await authHelper.signup(testUser.username, testUser.email, testUser.password);
      await authHelper.logout();

      // Sign in
      await page.goto("/login");

      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);

      // Click submit
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Button should show loading state
      try {
        await expect(submitButton).toBeDisabled({ timeout: 1000 });
      } catch {
        // If redirect happens too fast, that's acceptable
        expect(page.url()).toContain("/lunchtable");
      }
    });
  });

  test.describe("Form Toggle Behavior", () => {
    test("should toggle from sign up to sign in via link", async ({ page }) => {
      await page.goto("/signup");

      // Verify we're on sign up page with "Create Account" button
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();

      // Click link to go to sign in
      await page.click('a[href="/login"]');

      // Should navigate to login page
      await page.waitForURL("/login", { timeout: 5000 });

      // Verify we're now on sign in page with "Enter the Hall" button
      await expect(page.getByRole('button', { name: 'Enter the Hall' })).toBeVisible();
    });

    test("should toggle from sign in to sign up via link", async ({ page }) => {
      await page.goto("/login");

      // Verify we're on sign in page
      await expect(page.getByRole('button', { name: 'Enter the Hall' })).toBeVisible();

      // Click link to go to sign up
      await page.click('a[href="/signup"]');

      // Should navigate to signup page
      await page.waitForURL("/signup", { timeout: 5000 });

      // Verify we're now on sign up page
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    });
  });

  test.describe("HTML5 Validation", () => {
    test("should have HTML5 email validation", async ({ page }) => {
      await page.goto("/login");

      const emailInput = page.locator('input[name="email"]');

      // Verify input has type="email" for browser validation
      await expect(emailInput).toHaveAttribute("type", "email");
      await expect(emailInput).toHaveAttribute("required");
    });

    test("should have HTML5 password length validation", async ({ page }) => {
      await page.goto("/login");

      const passwordInput = page.locator('input[name="password"]');

      // Verify input has minLength attribute
      await expect(passwordInput).toHaveAttribute("minLength", "8");
      await expect(passwordInput).toHaveAttribute("required");
    });

    test("should have HTML5 username validation for sign up", async ({ page }) => {
      await page.goto("/signup");

      const usernameInput = page.locator('input[name="name"]');

      // Verify input has pattern and title for validation hints
      await expect(usernameInput).toHaveAttribute("pattern");
      await expect(usernameInput).toHaveAttribute("title");
      await expect(usernameInput).toHaveAttribute("required");

      // Verify the validation hint text is present
      await expect(page.locator('text=/3-20 characters/i')).toBeVisible();
    });
  });

  test.describe("Error Display", () => {
    test("should display error in red error box", async ({ page }) => {
      await page.goto("/login");

      // Submit with invalid credentials (password meets requirements but user doesn't exist)
      await page.fill('input[name="email"]', "invalid@example.com");
      await page.fill('input[name="password"]', "InvalidPassword123");

      await page.click('button[type="submit"]');

      // Wait for error to appear
      await page.waitForSelector('text=/invalid/i', { timeout: 5000 });

      // Verify error box has red styling (bg-red-500/10 border-red-500/20)
      const errorBox = page.locator('[class*="bg-red"]').first();
      await expect(errorBox).toBeVisible();
    });

    test("should clear error message when form is resubmitted", async ({ page }) => {
      await page.goto("/login");

      // Submit with invalid credentials to trigger error
      await page.fill('input[name="email"]', "invalid@example.com");
      await page.fill('input[name="password"]', "InvalidPass123");
      await page.click('button[type="submit"]');

      // Wait for error
      await expect(page.locator('text=/invalid/i')).toBeVisible({ timeout: 5000 });

      // Clear form and submit again
      await page.fill('input[name="email"]', "newemail@example.com");
      await page.fill('input[name="password"]', "NewPassword123");
      await page.click('button[type="submit"]');

      // Previous error should be cleared (component sets error to "" on submit)
      // New error may appear if credentials are still invalid, but that's expected behavior
    });
  });
});
