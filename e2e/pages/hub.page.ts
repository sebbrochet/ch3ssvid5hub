import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Ch3ssVid5 Hub.
 * Centralizes selectors and common navigation actions.
 */
export class HubPage {
  readonly page: Page;

  // Header
  readonly headerBrand: Locator;
  readonly browseLink: Locator;
  readonly langToggle: Locator;

  // Landing
  readonly landingHero: Locator;
  readonly landingStats: Locator;
  readonly browseButton: Locator;
  readonly contributeButton: Locator;

  // Browse
  readonly searchInput: Locator;
  readonly filterToggle: Locator;
  readonly filterPanel: Locator;
  readonly resultsInfo: Locator;
  readonly gameCards: Locator;
  readonly emptyMessage: Locator;

  // Game Detail
  readonly detailTitle: Locator;
  readonly detailResult: Locator;
  readonly detailBreadcrumb: Locator;
  readonly importButton: Locator;
  readonly downloadButton: Locator;
  readonly boardPreview: Locator;
  readonly boardPlayButton: Locator;
  readonly videoExtract: Locator;
  readonly detailTags: Locator;
  readonly detailMoves: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.headerBrand = page.locator('.site-header-brand');
    this.browseLink = page.locator('.site-header-nav a').first();
    this.langToggle = page.locator('.lang-toggle');

    // Landing
    this.landingHero = page.locator('.landing-hero');
    this.landingStats = page.locator('.landing-stats');
    this.browseButton = page.locator('.landing-actions .btn-primary');
    this.contributeButton = page.locator('.landing-actions .btn-secondary');

    // Browse
    this.searchInput = page.locator('.search-input');
    this.filterToggle = page.locator('.browse-filter-toggle');
    this.filterPanel = page.locator('.browse-filters');
    this.resultsInfo = page.locator('.browse-results-info');
    this.gameCards = page.locator('.game-card');
    this.emptyMessage = page.locator('.browse-empty');

    // Game Detail
    this.detailTitle = page.locator('.detail-title');
    this.detailResult = page.locator('.detail-result');
    this.detailBreadcrumb = page.locator('.detail-breadcrumb');
    this.importButton = page.locator('.btn-import');
    this.downloadButton = page.locator('.detail-actions .btn-secondary');
    this.boardPreview = page.locator('.board-preview');
    this.boardPlayButton = page.locator('.board-preview-play');
    this.videoExtract = page.locator('.video-extract');
    this.detailTags = page.locator('.detail-tags');
    this.detailMoves = page.locator('.detail-moves');
  }

  /** Navigate to the landing page. */
  async goto() {
    await this.page.goto('/');
    await this.headerBrand.waitFor({ state: 'visible' });
  }

  /** Navigate to the browse page and wait for games to load. */
  async gotoBrowse() {
    await this.page.goto('/#/browse');
    await this.searchInput.waitFor({ state: 'visible' });
    // Wait for catalog data to load (results info appears after fetch)
    await this.resultsInfo.waitFor({ state: 'visible' });
  }

  /** Navigate to a specific game detail page. */
  async gotoGame(id: string) {
    await this.page.goto(`/#/game/${id}`);
    await this.detailTitle.waitFor({ state: 'visible', timeout: 15000 });
  }

  /** Click the first game card to navigate to its detail page. */
  async clickFirstGame() {
    await this.gameCards.first().click();
  }

  /** Type a search query into the search bar. */
  async search(query: string) {
    await this.searchInput.fill(query);
  }

  /** Toggle a filter checkbox by its label text. */
  async toggleFilter(label: string) {
    await this.page.locator('.filter-item').filter({ hasText: label }).locator('input').click();
  }

  /** Get the count of visible game cards. */
  async getGameCount(): Promise<number> {
    return this.gameCards.count();
  }

  /** Change the language via the language switcher. */
  async changeLanguage(langLabel: string) {
    await this.langToggle.click();
    await this.page.locator('.lang-option').filter({ hasText: langLabel }).click();
  }
}
