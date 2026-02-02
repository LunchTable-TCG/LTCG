import { BasePage } from "./BasePage";
import { Locator, expect } from "@playwright/test";

export class StoryPage extends BasePage {
  readonly url = "/play/story";

  // Main story page selectors
  get chapterGrid(): Locator {
    return this.page.locator('[data-testid="story-chapter"]').first().locator("..");
  }

  get stageStars(): Locator {
    return this.page.locator('[data-testid="stage-stars"]').first();
  }

  // Chapter-specific selectors
  get chapterArtwork(): Locator {
    return this.page.locator('[data-testid="chapter-artwork"]');
  }

  get chapterProgress(): Locator {
    return this.page.locator('[data-testid="chapter-progress"]');
  }

  get stageGrid(): Locator {
    return this.page.locator('[data-testid="story-stage"]').first().locator("..");
  }

  get storyDialogue(): Locator {
    return this.page.locator('[data-testid="story-dialogue"]');
  }

  get stageDifficulty(): Locator {
    return this.page.locator('[data-testid="stage-difficulty"]');
  }

  get completionPercentage(): Locator {
    return this.page.locator('[data-testid="completion-percentage"]');
  }

  // Chapter card methods
  getChapter(index: number): Locator {
    return this.page.locator('[data-testid="story-chapter"]').nth(index);
  }

  getChapterByName(name: string): Locator {
    return this.page.locator('[data-testid="story-chapter"]', { hasText: name });
  }

  // Stage node methods
  getStage(stageNumber: number): Locator {
    return this.page.locator('[data-testid="story-stage"]').nth(stageNumber - 1);
  }

  getStageByNumber(number: number): Locator {
    return this.page.locator('[data-testid="story-stage"]').filter({ hasText: number.toString() });
  }

  // Actions
  async selectChapter(index: number) {
    const chapter = this.getChapter(index);
    await expect(chapter).toBeVisible();
    await chapter.click();
    await this.waitForLoad();
  }

  async selectChapterByName(name: string) {
    const chapter = this.getChapterByName(name);
    await expect(chapter).toBeVisible();
    await chapter.click();
    await this.waitForLoad();
  }

  async selectStage(stageNumber: number) {
    const stage = this.getStage(stageNumber);
    await expect(stage).toBeVisible();
    await stage.click();
    await expect(this.storyDialogue).toBeVisible();
  }

  async startBattle() {
    const startButton = this.page.locator('button:has-text("Start Battle")');
    await expect(startButton).toBeEnabled();
    await startButton.click();
  }

  async replayBattle() {
    const replayButton = this.page.locator('button:has-text("Replay")');
    await expect(replayButton).toBeEnabled();
    await replayButton.click();
  }

  async closeStageDialog() {
    await this.page.keyboard.press("Escape");
    await expect(this.storyDialogue).not.toBeVisible();
  }

  async navigateBack() {
    const backLink = this.page.locator('a:has-text("Back to Chapters")');
    await backLink.click();
    await this.waitForLoad();
  }

  async returnToHub() {
    const hubLink = this.page.locator('a:has-text("Return to Hub")');
    await hubLink.click();
    await this.waitForLoad();
  }

  // Assertions
  async expectChapterUnlocked(index: number) {
    const chapter = this.getChapter(index);
    await expect(chapter).toBeVisible();
    // Unlocked chapters should not have the Lock icon
    await expect(chapter.locator('[data-icon="lock"]')).not.toBeVisible();
  }

  async expectChapterLocked(index: number) {
    const chapter = this.getChapter(index);
    await expect(chapter).toBeVisible();
    // Locked chapters have Lock icon visible
    await expect(chapter.locator('[data-icon="lock"]')).toBeVisible();
  }

  async expectChapterCompleted(index: number) {
    const chapter = this.getChapter(index);
    await expect(chapter).toBeVisible();
    // Completed chapters show Trophy icon
    await expect(chapter.locator('[data-icon="trophy"]')).toBeVisible();
  }

  async expectStageUnlocked(stageNumber: number) {
    const stage = this.getStage(stageNumber);
    await expect(stage).toBeVisible();
    // Unlocked stages show the stage number
    await expect(stage).toContainText(stageNumber.toString());
    await expect(stage.locator('[data-icon="lock"]')).not.toBeVisible();
  }

  async expectStageLocked(stageNumber: number) {
    const stage = this.getStage(stageNumber);
    await expect(stage).toBeVisible();
    // Locked stages show Lock icon
    await expect(stage.locator('[data-icon="lock"]')).toBeVisible();
  }

  async expectStageCompleted(stageNumber: number) {
    const stage = this.getStage(stageNumber);
    await expect(stage).toBeVisible();
    // Completed stages show Trophy or Star icon
    const hasTrophy = await stage.locator('[data-icon="trophy"]').isVisible();
    const hasStar = await stage.locator('[data-icon="star"]').isVisible();
    expect(hasTrophy || hasStar).toBeTruthy();
  }

  async expectStageStarred(stageNumber: number) {
    const stage = this.getStage(stageNumber);
    await expect(stage).toBeVisible();
    // Starred stages show Star icon
    await expect(stage.locator('[data-icon="star"]')).toBeVisible();
  }

  async expectProgress(completedStages: number, totalStages: number) {
    const progressText = `${completedStages}/${totalStages}`;
    await expect(this.chapterProgress).toContainText(progressText);
  }

  async expectCompletionPercentage(percentage: number) {
    await expect(this.completionPercentage).toContainText(`${percentage}%`);
  }

  async expectStarCount(stars: number) {
    await expect(this.stageStars).toContainText(stars.toString());
  }

  async expectDifficulty(difficulty: "easy" | "medium" | "hard" | "extreme") {
    await expect(this.stageDifficulty).toHaveText(difficulty, { ignoreCase: true });
  }

  async expectReward(gold: number, xp: number) {
    await expect(this.storyDialogue.locator("..")).toContainText(`${gold} Gold`);
    await expect(this.storyDialogue.locator("..")).toContainText(`${xp} XP`);
  }

  async expectFirstClearBonus(bonus: number) {
    await expect(this.page.locator('text="First Clear Bonus"')).toBeVisible();
    await expect(this.page.locator(`text="+${bonus} Gold"`)).toBeVisible();
  }

  async expectNoFirstClearBonus() {
    await expect(this.page.locator('text="First Clear Bonus"')).not.toBeVisible();
  }

  // Utility methods
  async waitForChaptersLoaded() {
    await expect(this.page.locator('[data-testid="story-chapter"]').first()).toBeVisible({
      timeout: 10000,
    });
  }

  async waitForStagesLoaded() {
    await expect(this.page.locator('[data-testid="story-stage"]').first()).toBeVisible({
      timeout: 10000,
    });
  }

  async getChapterCount() {
    return await this.page.locator('[data-testid="story-chapter"]').count();
  }

  async getStageCount() {
    return await this.page.locator('[data-testid="story-stage"]').count();
  }

  async isChapterUnlocked(index: number) {
    const chapter = this.getChapter(index);
    const lockIcon = chapter.locator('[data-icon="lock"]');
    return !(await lockIcon.isVisible());
  }

  async isStageUnlocked(stageNumber: number) {
    const stage = this.getStage(stageNumber);
    const lockIcon = stage.locator('[data-icon="lock"]');
    return !(await lockIcon.isVisible());
  }
}
