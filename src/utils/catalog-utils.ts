import type { CatalogGame } from '../types/catalog';

export type AnnotationFilter = '' | 'has' | 'missing';

/**
 * Filter games by faceted criteria.
 */
export function filterGames(
  games: CatalogGame[],
  filters: {
    youtuber?: string;
    playlist?: string;
    tag?: string;
    result?: string;
    variant?: string;
    opening?: string;
    language?: string;
    moves?: AnnotationFilter;
    timestamps?: AnnotationFilter;
    evals?: AnnotationFilter;
  },
): CatalogGame[] {
  let filtered = games;

  if (filters.youtuber) {
    filtered = filtered.filter((g) => g.youtuber === filters.youtuber);
  }
  if (filters.playlist) {
    filtered = filtered.filter((g) => g.playlist === filters.playlist);
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
  if (filters.language) {
    filtered = filtered.filter((g) => (g.language ?? '') === filters.language);
  }
  if (filters.moves === 'has') {
    filtered = filtered.filter((g) => g.moveCount > 0);
  } else if (filters.moves === 'missing') {
    filtered = filtered.filter((g) => g.moveCount === 0);
  }
  if (filters.timestamps === 'has') {
    filtered = filtered.filter((g) => g.hasTimestamps);
  } else if (filters.timestamps === 'missing') {
    filtered = filtered.filter((g) => !g.hasTimestamps);
  }
  if (filters.evals === 'has') {
    filtered = filtered.filter((g) => g.hasEvals);
  } else if (filters.evals === 'missing') {
    filtered = filtered.filter((g) => !g.hasEvals);
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

/**
 * Build a truncated list of page numbers with ellipsis gaps.
 * Always shows first, last, and a window of ±siblings around the current page.
 * Returns numbers for page buttons and `null` for ellipsis placeholders.
 */
export function buildPageNumbers(currentPage: number, totalPages: number, siblings: number = 1): (number | null)[] {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let i = currentPage - siblings; i <= currentPage + siblings; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push(null);
    }
    result.push(sorted[i]);
  }
  return result;
}
