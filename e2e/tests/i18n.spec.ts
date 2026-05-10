import { test, expect } from '@playwright/test';
import { HubPage } from '../pages/hub.page';

test.describe('Internationalization', () => {
  let hub: HubPage;

  test.beforeEach(async ({ page }) => {
    hub = new HubPage(page);
    await hub.goto();
  });

  test('language switcher is visible', async () => {
    await expect(hub.langToggle).toBeVisible();
  });

  test('switching to French translates the UI', async () => {
    await hub.changeLanguage('Français');
    await expect(hub.browseButton).toContainText('Parcourir');
  });

  test('switching to Spanish translates the UI', async () => {
    await hub.changeLanguage('Español');
    await expect(hub.browseButton).toContainText('Explorar');
  });

  test('switching to German translates the UI', async () => {
    await hub.changeLanguage('Deutsch');
    await expect(hub.browseButton).toContainText('durchsuchen');
  });

  test('switching to Portuguese translates the UI', async () => {
    await hub.changeLanguage('Português');
    await expect(hub.browseButton).toContainText('Explorar');
  });

  test('switching back to English restores UI', async () => {
    await hub.changeLanguage('Français');
    await expect(hub.browseButton).toContainText('Parcourir');
    await hub.changeLanguage('English');
    await expect(hub.browseButton).toContainText('Browse');
  });

  test('browse page search placeholder translates', async () => {
    await hub.gotoBrowse();
    await hub.changeLanguage('Français');
    const placeholder = await hub.searchInput.getAttribute('placeholder');
    expect(placeholder).toContain('Rechercher');
  });
});
