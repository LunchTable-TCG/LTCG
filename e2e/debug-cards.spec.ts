import { test, expect } from "./setup/fixtures";

test.describe("Debug Cards", () => {
    test("should have cards after starter deck claim", async ({ authenticatedPage, page: _page }) => {
        // Capture browser logs
        authenticatedPage.on('console', msg => console.log('BROWSER LOG:', msg.text()));

        // authenticatedPage fixture should have triggered onboarding claim

        await authenticatedPage.goto("/binder");

        // Wait for loader to disappear
        await authenticatedPage.locator('text=Loading Collection...').waitFor({ state: 'detached', timeout: 15000 });

        // Log the text content of the stats
        // const stats = await authenticatedPage.locator('.text-[#a89f94].font-medium').textContent(); // Broken selector
        // console.log("Binder Stats:", stats);

        // Wait for at least one card to appear
        await authenticatedPage.waitForSelector('[data-testid="card-item"]', { timeout: 5000 });

        // Check if any cards exist
        const cardCount = await authenticatedPage.locator('[data-testid="card-item"]').count();
        console.log("Card Items Found in Binder:", cardCount);

        // Check if the deck was created in userDecks
        const deckCount = await authenticatedPage.locator('[data-testid="deck-item"]').count();
        console.log("Decks Found:", deckCount);

        expect(cardCount).toBeGreaterThan(0);
    });
});
