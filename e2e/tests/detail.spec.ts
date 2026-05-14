import { test, expect } from '@playwright/test';
import { HubPage } from '../pages/hub.page';

test.describe('Game Detail', () => {
  let hub: HubPage;

  test.beforeEach(async ({ page }) => {
    hub = new HubPage(page);
    // Navigate to browse and click the first game
    await hub.gotoBrowse();
    await hub.clickFirstGame();
    await expect(hub.detailTitle).toBeVisible();
  });

  test('shows game title with player names', async () => {
    const title = await hub.detailTitle.textContent();
    expect(title).toContain('vs');
  });

  test('shows result badge', async () => {
    await expect(hub.detailResult).toBeVisible();
  });

  test('shows breadcrumb navigation', async () => {
    await expect(hub.detailBreadcrumb).toBeVisible();
    // Should have at least Home and Browse links
    const links = hub.detailBreadcrumb.locator('a');
    expect(await links.count()).toBeGreaterThanOrEqual(2);
  });

  test('breadcrumb Home link navigates to landing', async ({ page }) => {
    await hub.detailBreadcrumb.locator('a').first().click();
    await expect(hub.landingHero).toBeVisible();
  });

  test('shows Open in Ch3ssVid5 button', async () => {
    await expect(hub.importButton).toBeVisible();
    const href = await hub.importButton.getAttribute('href');
    expect(href).toContain('?pgn=');
    expect(href).toContain('folder=');
  });

  test('shows Download PGN button', async () => {
    await expect(hub.downloadButton).toBeVisible();
    const href = await hub.downloadButton.getAttribute('href');
    expect(href).toContain('.pgn');
  });

  test('shows board preview with play button', async () => {
    await expect(hub.boardPreview).toBeVisible();
    await expect(hub.boardPlayButton).toBeVisible();
  });

  test('shows opening moves section', async ({ page }) => {
    // Navigate to a game known to have moves (first game may be a skeleton)
    const hubWithMoves = new HubPage(page);
    await hubWithMoves.gotoGame('alexbanzea-new-jobava-speedrun-2025-bypass-years-of-opening-study-with-this-system-0');
    await expect(hubWithMoves.detailMoves).toBeVisible();
    const movesText = await hubWithMoves.detailMoves.locator('.detail-moves-text').textContent();
    // Should contain at least one move number
    expect(movesText).toMatch(/\d+\./);
  });

  test('shows game metadata table', async () => {
    const headersTable = hub.page.locator('.detail-headers');
    await expect(headersTable).toBeVisible();
    // Should have at least a few rows
    const rows = headersTable.locator('tr');
    expect(await rows.count()).toBeGreaterThan(2);
  });
});

test.describe('Game Detail — Specific Games', () => {
  test('Chess960 game shows variant badge', async ({ page }) => {
    const hub = new HubPage(page);
    await hub.gotoGame('ericrosenextra-full-streams-serious-chess-960-0');
    await expect(hub.detailTitle).toBeVisible();
    const variant = page.locator('.detail-variant');
    await expect(variant).toBeVisible();
    await expect(variant).toContainText('Chess960');
  });

  test('game with video shows video extract', async ({ page }) => {
    const hub = new HubPage(page);
    await hub.gotoBrowse();
    await hub.clickFirstGame();
    await expect(hub.detailTitle).toBeVisible();
    // All games should have a video
    await expect(hub.videoExtract).toBeVisible();
  });
});
