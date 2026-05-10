import { test, expect } from '@playwright/test';
import { HubPage } from '../pages/hub.page';

test.describe('Browse & Search', () => {
  let hub: HubPage;

  test.beforeEach(async ({ page }) => {
    hub = new HubPage(page);
    await hub.gotoBrowse();
  });

  test('shows all games initially', async () => {
    const count = await hub.getGameCount();
    expect(count).toBeGreaterThan(0);
    await expect(hub.resultsInfo).toBeVisible();
  });

  test('search filters games', async () => {
    const initialCount = await hub.getGameCount();
    await hub.search('Eric Rosen');
    // Wait for results to update
    await hub.page.waitForTimeout(300);
    const filteredCount = await hub.getGameCount();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('search with no results shows empty message', async () => {
    await hub.search('xyznonexistent123');
    await hub.page.waitForTimeout(300);
    await expect(hub.emptyMessage).toBeVisible();
  });

  test('youtuber filter narrows results', async () => {
    const initialCount = await hub.getGameCount();
    // Click first youtuber filter
    await hub.page.locator('.filter-group').first().locator('.filter-item input').first().click();
    await hub.page.waitForTimeout(200);
    const filteredCount = await hub.getGameCount();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('filter state persists in URL', async ({ page }) => {
    await hub.search('Chess960');
    await page.waitForTimeout(300);
    const url = page.url();
    expect(url).toContain('q=Chess960');
  });

  test('clicking a game card navigates to detail', async ({ page }) => {
    await hub.clickFirstGame();
    await expect(hub.detailTitle).toBeVisible();
    await expect(page).toHaveURL(/#\/game\//);
  });

  test('game cards show player names', async () => {
    const firstCard = hub.gameCards.first();
    await expect(firstCard.locator('.game-card-white')).toBeVisible();
    await expect(firstCard.locator('.game-card-black')).toBeVisible();
  });

  test('game cards show result badge', async () => {
    const firstCard = hub.gameCards.first();
    await expect(firstCard.locator('.game-card-result')).toBeVisible();
  });
});
