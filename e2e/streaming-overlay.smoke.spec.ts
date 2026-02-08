import { expect, test } from "./setup/fixtures";

const runOverlayVisualSnapshots = process.env.OVERLAY_VISUAL_SNAPSHOTS === "1";

test.describe("Streaming Overlay Visuals @smoke", () => {
  test.skip(
    !runOverlayVisualSnapshots,
    "Set OVERLAY_VISUAL_SNAPSHOTS=1 to run overlay visual snapshot checks."
  );

  test.use({ viewport: { width: 1920, height: 1080 } });

  test("renders waiting preview", async ({ page }) => {
    await page.goto("/stream/overlay?preview=waiting&static=1");
    await expect(page.getByTestId("overlay-preview-waiting")).toBeVisible();
    await expect(page).toHaveScreenshot("streaming-overlay-waiting.png", {
      animations: "disabled",
      maxDiffPixels: 200,
    });
  });

  test("renders live preview", async ({ page }) => {
    await page.goto("/stream/overlay?preview=live&static=1");
    await expect(page.getByTestId("overlay-preview-live")).toBeVisible();
    await expect(page).toHaveScreenshot("streaming-overlay-live.png", {
      animations: "disabled",
      maxDiffPixels: 200,
    });
  });

  test("renders error preview", async ({ page }) => {
    await page.goto("/stream/overlay?preview=error&static=1");
    await expect(page.getByTestId("overlay-preview-error")).toBeVisible();
    await expect(page).toHaveScreenshot("streaming-overlay-error.png", {
      animations: "disabled",
      maxDiffPixels: 200,
    });
  });
});
