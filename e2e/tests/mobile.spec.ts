import { test, expect } from '@playwright/test';
import { HubPage } from '../pages/hub.page';

test.describe('Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 }, isMobile: true });

  let hub: HubPage;

  test.beforeEach(async ({ page }) => {
    hub = new HubPage(page);
  });

  test('landing page is usable on mobile', async () => {
    await hub.goto();
    await expect(hub.landingHero).toBeVisible();
    await expect(hub.browseButton).toBeVisible();
  });

  test('browse page shows filter toggle on mobile', async () => {
    await hub.gotoBrowse();
    await expect(hub.filterToggle).toBeVisible();
    // Filters should be hidden by default
    await expect(hub.filterPanel).not.toBeVisible();
  });

  test('filter toggle shows/hides filters', async () => {
    await hub.gotoBrowse();
    // Open filters
    await hub.filterToggle.click();
    await expect(hub.filterPanel).toBeVisible();
    // Close filters
    await hub.filterToggle.click();
    await expect(hub.filterPanel).not.toBeVisible();
  });

  test('game cards stack vertically on mobile', async () => {
    await hub.gotoBrowse();
    const cards = hub.gameCards;
    const count = await cards.count();
    if (count >= 2) {
      const firstBox = await cards.first().boundingBox();
      const secondBox = await cards.nth(1).boundingBox();
      // Cards should be stacked (second card below first)
      expect(secondBox!.y).toBeGreaterThan(firstBox!.y);
      // Cards should be roughly same width (full width)
      expect(Math.abs(firstBox!.width - secondBox!.width)).toBeLessThan(10);
    }
  });

  test('game detail stacks layout on mobile', async () => {
    await hub.gotoBrowse();
    await hub.clickFirstGame();
    await expect(hub.detailTitle).toBeVisible();
    // Board preview and info should both be visible
    await expect(hub.boardPreview).toBeVisible();
    await expect(hub.importButton).toBeVisible();
  });

  test('search works on mobile', async () => {
    await hub.gotoBrowse();
    await hub.search('Chess960');
    await hub.page.waitForTimeout(300);
    const count = await hub.getGameCount();
    expect(count).toBeGreaterThan(0);
  });
});
