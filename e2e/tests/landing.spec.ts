import { test, expect } from '@playwright/test';
import { HubPage } from '../pages/hub.page';

test.describe('Landing Page', () => {
  let hub: HubPage;

  test.beforeEach(async ({ page }) => {
    hub = new HubPage(page);
    await hub.goto();
  });

  test('shows hero section with title', async () => {
    await expect(hub.landingHero).toBeVisible();
    await expect(hub.landingHero.locator('h1')).toContainText('Ch3ssVid5 Hub');
  });

  test('shows catalog stats', async () => {
    await expect(hub.landingStats).toBeVisible();
    // Should show at least 1 game
    const statValues = hub.landingStats.locator('.stat-value');
    await expect(statValues.first()).not.toHaveText('0');
  });

  test('browse button navigates to browse page', async ({ page }) => {
    await hub.browseButton.click();
    await expect(page).toHaveURL(/#\/browse/);
    await expect(hub.searchInput).toBeVisible();
  });

  test('header brand navigates home', async ({ page }) => {
    await hub.gotoBrowse();
    await hub.headerBrand.click();
    await expect(hub.landingHero).toBeVisible();
  });

  test('header browse link navigates to browse', async ({ page }) => {
    await hub.browseLink.click();
    await expect(page).toHaveURL(/#\/browse/);
  });
});
