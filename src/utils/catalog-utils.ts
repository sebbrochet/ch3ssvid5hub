import type { CatalogGame } from '../types/catalog';

/**
 * Filter games by faceted criteria.
 */
export function filterGames(
  games: CatalogGame[],
  filters: {
    youtuber?: string;
    tag?: string;
    result?: string;
    variant?: string;
    opening?: string;
  },
): CatalogGame[] {
  let filtered = games;

  if (filters.youtuber) {
    filtered = filtered.filter((g) => g.youtuber === filters.youtuber);
  }
  if (filters.tag) {
    const tag = filters.tag;
    filtered = filtered.filter((g) => g.tags.includes(tag));
  }
  if (filters.result) {
    filtered = filtered.filter((g) => g.result === filters.result);
  }
  if (filters.variant) {
    filtered = filtered.filter((g) => (g.variant ?? 'Standard') === filters.variant);
  }
  if (filters.opening) {
    filtered = filtered.filter((g) => g.opening === filters.opening);
  }

  return filtered;
}

/**
 * Sort games by the given key.
 */
export function sortGames(games: CatalogGame[], sortBy: string): CatalogGame[] {
  const sorted = [...games];
  switch (sortBy) {
    case 'date':
      return sorted.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    case 'white':
      return sorted.sort((a, b) => a.white.localeCompare(b.white));
    case 'opening':
      return sorted.sort((a, b) => (a.opening ?? '').localeCompare(b.opening ?? ''));
    case 'youtuber':
    default:
      return sorted.sort((a, b) => a.youtuberDisplayName.localeCompare(b.youtuberDisplayName));
  }
}

/**
 * Paginate a list of items.
 */
export function paginate<T>(
  items: T[],
  page: number,
  itemsPerPage: number,
): { pagedItems: T[]; totalPages: number; safePage: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedItems = items.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  return { pagedItems, totalPages, safePage };
}
