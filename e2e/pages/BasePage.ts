import { type Locator, type Page, expect } from "@playwright/test";

export abstract class BasePage {
  constructor(public page: Page) {}

  abstract readonly url: string;

  async navigate() {
    await this.page.goto(this.url);
    await this.waitForLoad();
  }

  async waitForLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  // Common UI elements
  get loadingSpinner(): Locator {
    return this.page.locator('[data-testid="loading"]');
  }

  get toast(): Locator {
    return this.page.locator('[data-testid="toast"]');
  }

  async waitForToast(message: string) {
    await expect(this.toast).toContainText(message, { timeout: 5000 });
  }

  async expectNoErrors() {
    await expect(this.page.locator('[data-testid="error"]')).not.toBeVisible();
  }

  // Wait for loading to complete
  async waitForLoadingComplete() {
    await this.loadingSpinner.waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
  }

  // Screenshot helper for debugging
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `test-results/${name}.png` });
  }
}
