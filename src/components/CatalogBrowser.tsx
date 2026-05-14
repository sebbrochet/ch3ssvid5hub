import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Fuse from 'fuse.js';
import { useCatalog } from '../hooks/useCatalog';
import { usePageTitle } from '../hooks/usePageTitle';
import { filterGames, sortGames, paginate, buildPageNumbers } from '../utils/catalog-utils';
import type { AnnotationFilter } from '../utils/catalog-utils';
import GameCard from './GameCard';
import type { CatalogGame } from '../types/catalog';
import './CatalogBrowser.css';

const FUSE_OPTIONS = {
  keys: [
    { name: 'youtuberDisplayName', weight: 2 },
    { name: 'white', weight: 2 },
    { name: 'black', weight: 2 },
    { name: 'opening', weight: 2 },
    { name: 'playlist', weight: 1.5 },
    { name: 'event', weight: 1.5 },
    { name: 'tags', weight: 1.5 },
    { name: 'videoTitle', weight: 1.5 },
    { name: 'annotator', weight: 1 },
    { name: 'eco', weight: 0.5 },
  ],
  threshold: 0.3,
  ignoreLocation: true,
};

const GAMES_PER_PAGE = 12;

export default function CatalogBrowser() {
  const { catalog, loading, error } = useCatalog();
  const { t } = useTranslation();
  usePageTitle(t('header.browse'));
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const selectedYoutuber = searchParams.get('youtuber') ?? '';
  const selectedPlaylist = searchParams.get('playlist') ?? '';
  const selectedTag = searchParams.get('tag') ?? '';
  const selectedResult = searchParams.get('result') ?? '';
  const selectedVariant = searchParams.get('variant') ?? '';
  const selectedOpening = searchParams.get('opening') ?? '';
  const selectedLanguage = searchParams.get('language') ?? '';
  const filterMoves = (searchParams.get('moves') ?? '') as AnnotationFilter;
  const filterTimestamps = (searchParams.get('timestamps') ?? '') as AnnotationFilter;
  const filterEvals = (searchParams.get('evals') ?? '') as AnnotationFilter;
  const sortBy = searchParams.get('sort') ?? 'youtuber';
  const currentPage = parseInt(searchParams.get('page') ?? '1', 10);

  const [localQuery, setLocalQuery] = useState(query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts: / to focus search, Escape to clear
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        updateSearch('');
        searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const fuse = useMemo(() => {
    if (!catalog) return null;
    return new Fuse(catalog.games, FUSE_OPTIONS);
  }, [catalog]);

  const filteredGames = useMemo(() => {
    if (!catalog) return [];

    let games: CatalogGame[] = catalog.games;

    // Text search
    if (query && fuse) {
      games = fuse.search(query).map((r) => r.item);
    }

    return filterGames(games, {
      youtuber: selectedYoutuber,
      playlist: selectedPlaylist,
      tag: selectedTag,
      result: selectedResult,
      variant: selectedVariant,
      opening: selectedOpening,
      language: selectedLanguage,
      moves: filterMoves,
      timestamps: filterTimestamps,
      evals: filterEvals,
    });
  }, [
    catalog,
    query,
    selectedYoutuber,
    selectedPlaylist,
    selectedTag,
    selectedResult,
    selectedVariant,
    selectedOpening,
    selectedLanguage,
    filterMoves,
    filterTimestamps,
    filterEvals,
    fuse,
  ]);

  // Sort
  const sortedGames = useMemo(() => sortGames(filteredGames, sortBy), [filteredGames, sortBy]);

  // Pagination
  const { pagedItems: pagedGames, totalPages, safePage } = paginate(sortedGames, currentPage, GAMES_PER_PAGE);

  // Group openings by family (first part before ":" or ",")
  const openingFamilies = useMemo(() => {
    if (!catalog) return [];
    const familyMap = new Map<string, string[]>();
    for (const op of catalog.openings) {
      const family = op.split(/[:,]/)[0].trim();
      if (!familyMap.has(family)) familyMap.set(family, []);
      familyMap.get(family)!.push(op);
    }
    return [...familyMap.entries()]
      .map(([family, variants]) => ({ family, variants: variants.sort() }))
      .sort((a, b) => a.family.localeCompare(b.family));
  }, [catalog]);

  function updateSearch(newQuery: string) {
    setLocalQuery(newQuery);
    const params = new URLSearchParams(searchParams);
    if (newQuery) {
      params.set('q', newQuery);
    } else {
      params.delete('q');
    }
    params.delete('page');
    setSearchParams(params, { replace: true });
  }

  function toggleFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (params.get(key) === value) {
      params.delete(key);
      // Clear playlist sub-filter when youtuber is deselected
      if (key === 'youtuber') params.delete('playlist');
    } else {
      params.set(key, value);
      // Clear playlist sub-filter when switching youtuber
      if (key === 'youtuber') params.delete('playlist');
    }
    params.delete('page');
    setSearchParams(params, { replace: true });
  }

  function cycleAnnotationFilter(key: string) {
    const params = new URLSearchParams(searchParams);
    const current = params.get(key) ?? '';
    const next = current === '' ? 'has' : current === 'has' ? 'missing' : '';
    if (next) {
      params.set(key, next);
    } else {
      params.delete(key);
    }
    params.delete('page');
    setSearchParams(params, { replace: true });
  }

  function changeSort(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set('sort', value);
    params.delete('page');
    setSearchParams(params, { replace: true });
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams);
    if (page <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }
    setSearchParams(params, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (loading) {
    return (
      <div className="browse">
        <aside className="browse-filters">
          <div className="skeleton skeleton-title" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-filter" />
          ))}
        </aside>
        <main className="browse-main">
          <div className="skeleton skeleton-search" />
          <div className="browse-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton skeleton-card" />
            ))}
          </div>
        </main>
      </div>
    );
  }
  if (error) return <div className="browse-error">Error: {error}</div>;
  if (!catalog) return null;

  // Compute facet data
  const results = ['1-0', '0-1', '1/2-1/2', '*'];
  const variants = [...new Set(catalog.games.map((g) => g.variant ?? 'Standard'))].sort();
  // Build youtuber display name map
  const youtuberNames = new Map<string, string>();
  for (const g of catalog.games) {
    if (!youtuberNames.has(g.youtuber)) {
      youtuberNames.set(g.youtuber, g.youtuberDisplayName);
    }
  }

  // Build playlist display name map and list for selected youtuber
  const playlistNames = new Map<string, string>();
  const youtuberPlaylists = selectedYoutuber
    ? [...new Set(catalog.games.filter((g) => g.youtuber === selectedYoutuber).map((g) => g.playlist))].sort()
    : [];
  for (const g of catalog.games) {
    if (!playlistNames.has(g.playlist)) {
      playlistNames.set(g.playlist, g.playlistDisplayName);
    }
  }

  return (
    <div className="browse">
      <button className="browse-filter-toggle" onClick={() => setFiltersOpen(!filtersOpen)}>
        {filtersOpen ? `✕ ${t('browse.hideFilters')}` : `☰ ${t('browse.showFilters')}`}
      </button>
      <aside className={`browse-filters ${filtersOpen ? '' : 'collapsed'}`}>
        <h3>{t('browse.filters')}</h3>

        {catalog.youtubers.length > 0 && (
          <div className="filter-group">
            <h4>{t('browse.youtuber')}</h4>
            {[...catalog.youtubers]
              .sort((a, b) => (youtuberNames.get(a) ?? a).localeCompare(youtuberNames.get(b) ?? b))
              .map((yt) => {
                const profile = catalog.youtuberProfiles[yt];
                const isSelected = selectedYoutuber === yt;
                return (
                  <div key={yt}>
                    <label className={`filter-item ${isSelected ? 'active' : ''}`}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleFilter('youtuber', yt)} />
                      {profile?.avatarUrl && (
                        <img src={profile.avatarUrl} alt="" className="youtuber-avatar youtuber-avatar--sm" />
                      )}
                      {youtuberNames.get(yt) ?? yt}
                      <span className="filter-count">({catalog.games.filter((g) => g.youtuber === yt).length})</span>
                    </label>
                    {isSelected && youtuberPlaylists.length > 1 && (
                      <div className="filter-group--sub">
                        {youtuberPlaylists.map((pl) => {
                          const count = catalog.games.filter((g) => g.youtuber === yt && g.playlist === pl).length;
                          return (
                            <label key={pl} className={`filter-item ${selectedPlaylist === pl ? 'active' : ''}`}>
                              <input
                                type="checkbox"
                                checked={selectedPlaylist === pl}
                                onChange={() => toggleFilter('playlist', pl)}
                              />
                              {playlistNames.get(pl) ?? pl}
                              <span className="filter-count">({count})</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        <div className="filter-group">
          <h4>{t('browse.result')}</h4>
          {results.map((r) => {
            const count = catalog.games.filter((g) => g.result === r).length;
            if (count === 0) return null;
            return (
              <label key={r} className={`filter-item ${selectedResult === r ? 'active' : ''}`}>
                <input type="checkbox" checked={selectedResult === r} onChange={() => toggleFilter('result', r)} />
                {r}
                <span className="filter-count">({count})</span>
              </label>
            );
          })}
        </div>

        {variants.length > 1 && (
          <div className="filter-group">
            <h4>{t('browse.variant')}</h4>
            {variants.map((v) => {
              const count = catalog.games.filter((g) => (g.variant ?? 'Standard') === v).length;
              return (
                <label key={v} className={`filter-item ${selectedVariant === v ? 'active' : ''}`}>
                  <input type="checkbox" checked={selectedVariant === v} onChange={() => toggleFilter('variant', v)} />
                  {v}
                  <span className="filter-count">({count})</span>
                </label>
              );
            })}
          </div>
        )}

        {catalog.openings.length > 0 && (
          <div className="filter-group">
            <h4>{t('browse.opening')}</h4>
            {openingFamilies.map(({ family, variants }) => {
              const familyCount = catalog.games.filter((g) => g.opening?.startsWith(family)).length;
              const isExpanded = expandedFamilies.has(family);
              const hasVariants = variants.length > 1;

              if (!hasVariants) {
                // Single opening — render flat (no expand/collapse)
                const op = variants[0];
                return (
                  <label key={op} className={`filter-item ${selectedOpening === op ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedOpening === op}
                      onChange={() => toggleFilter('opening', op)}
                    />
                    {op}
                    <span className="filter-count">({familyCount})</span>
                  </label>
                );
              }

              return (
                <div key={family} className="opening-family">
                  <button
                    className={`opening-family-header ${variants.some((v) => v === selectedOpening) ? 'active' : ''}`}
                    onClick={() => {
                      setExpandedFamilies((prev) => {
                        const next = new Set(prev);
                        if (next.has(family)) next.delete(family);
                        else next.add(family);
                        return next;
                      });
                    }}
                  >
                    <span className={`opening-family-arrow ${isExpanded ? 'expanded' : ''}`}>▸</span>
                    {family}
                    <span className="filter-count">({familyCount})</span>
                  </button>
                  {isExpanded && (
                    <div className="opening-family-variants">
                      {variants.map((op) => {
                        const count = catalog.games.filter((g) => g.opening === op).length;
                        // Show only the variant part after the family name
                        const variantLabel = op.startsWith(family)
                          ? op.slice(family.length).replace(/^[,:]\s*/, '')
                          : op;
                        return (
                          <label key={op} className={`filter-item ${selectedOpening === op ? 'active' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selectedOpening === op}
                              onChange={() => toggleFilter('opening', op)}
                            />
                            {variantLabel || op}
                            <span className="filter-count">({count})</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {catalog.languages.length > 1 && (
          <div className="filter-group">
            <h4>{t('browse.language')}</h4>
            {catalog.languages.map((lang) => {
              const count = catalog.games.filter((g) => (g.language ?? '') === lang).length;
              return (
                <label key={lang} className={`filter-item ${selectedLanguage === lang ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedLanguage === lang}
                    onChange={() => toggleFilter('language', lang)}
                  />
                  {t(`languages.${lang}`, lang)}
                  <span className="filter-count">({count})</span>
                </label>
              );
            })}
          </div>
        )}

        {catalog.tags.length > 0 && (
          <div className="filter-group">
            <h4>{t('browse.tagsLabel')}</h4>
            {catalog.tags.map((tag) => (
              <label key={tag} className={`filter-item ${selectedTag === tag ? 'active' : ''}`}>
                <input type="checkbox" checked={selectedTag === tag} onChange={() => toggleFilter('tag', tag)} />
                {tag}
                <span className="filter-count">({catalog.games.filter((g) => g.tags.includes(tag)).length})</span>
              </label>
            ))}
          </div>
        )}

        <div className="filter-group">
          <h4>{t('browse.annotations')}</h4>
          {(['moves', 'timestamps', 'evals'] as const).map((key) => {
            const icon = key === 'moves' ? '♟' : key === 'timestamps' ? '⏱' : '⚙';
            const current = key === 'moves' ? filterMoves : key === 'timestamps' ? filterTimestamps : filterEvals;
            return (
              <button
                key={key}
                className={`filter-item annotation-filter ${current ? 'active' : ''}`}
                onClick={() => cycleAnnotationFilter(key)}
              >
                <span className={`annotation-filter-state annotation-filter-state--${current || 'off'}`}>
                  {current === 'has' ? '✓' : current === 'missing' ? '✗' : '○'}
                </span>
                {icon} {t(`annotations.${key}`)}
              </button>
            );
          })}
        </div>
      </aside>

      <main className="browse-main">
        <div className="browse-search">
          <input
            ref={searchRef}
            type="search"
            placeholder={t('browse.searchPlaceholder')}
            value={localQuery}
            onChange={(e) => updateSearch(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Active filter chips */}
        {(query ||
          selectedYoutuber ||
          selectedPlaylist ||
          selectedTag ||
          selectedResult ||
          selectedVariant ||
          selectedOpening ||
          selectedLanguage ||
          filterMoves ||
          filterTimestamps ||
          filterEvals) && (
          <div className="browse-chips">
            {query && (
              <button className="chip" onClick={() => updateSearch('')}>
                &quot;{query}&quot; ✕
              </button>
            )}
            {selectedYoutuber && (
              <button className="chip" onClick={() => toggleFilter('youtuber', selectedYoutuber)}>
                {youtuberNames.get(selectedYoutuber) ?? selectedYoutuber} ✕
              </button>
            )}
            {selectedPlaylist && (
              <button className="chip" onClick={() => toggleFilter('playlist', selectedPlaylist)}>
                {playlistNames.get(selectedPlaylist) ?? selectedPlaylist} ✕
              </button>
            )}
            {selectedResult && (
              <button className="chip" onClick={() => toggleFilter('result', selectedResult)}>
                {selectedResult} ✕
              </button>
            )}
            {selectedVariant && (
              <button className="chip" onClick={() => toggleFilter('variant', selectedVariant)}>
                {selectedVariant} ✕
              </button>
            )}
            {selectedOpening && (
              <button className="chip" onClick={() => toggleFilter('opening', selectedOpening)}>
                {selectedOpening} ✕
              </button>
            )}
            {selectedTag && (
              <button className="chip" onClick={() => toggleFilter('tag', selectedTag)}>
                {selectedTag} ✕
              </button>
            )}
            {selectedLanguage && (
              <button className="chip" onClick={() => toggleFilter('language', selectedLanguage)}>
                {t(`languages.${selectedLanguage}`, selectedLanguage)} ✕
              </button>
            )}
            {filterMoves && (
              <button className="chip" onClick={() => cycleAnnotationFilter('moves')}>
                ♟ {t('annotations.moves')}: {t(`browse.filter_${filterMoves}`)} ✕
              </button>
            )}
            {filterTimestamps && (
              <button className="chip" onClick={() => cycleAnnotationFilter('timestamps')}>
                ⏱ {t('annotations.timestamps')}: {t(`browse.filter_${filterTimestamps}`)} ✕
              </button>
            )}
            {filterEvals && (
              <button className="chip" onClick={() => cycleAnnotationFilter('evals')}>
                ⚙ {t('annotations.evals')}: {t(`browse.filter_${filterEvals}`)} ✕
              </button>
            )}
          </div>
        )}

        <div className="browse-toolbar">
          <div className="browse-results-info">{t('browse.gamesFound', { count: filteredGames.length })}</div>
          <select className="browse-sort" value={sortBy} onChange={(e) => changeSort(e.target.value)}>
            <option value="youtuber">{t('browse.sortYoutuber')}</option>
            <option value="date">{t('browse.sortDate')}</option>
            <option value="white">{t('browse.sortPlayer')}</option>
            <option value="opening">{t('browse.sortOpening')}</option>
          </select>
        </div>

        {pagedGames.length > 0 ? (
          <>
            <div className="browse-grid">
              {pagedGames.map((game) => (
                <GameCard key={game.id} game={game} avatarUrl={catalog.youtuberProfiles[game.youtuber]?.avatarUrl} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="browse-pagination">
                <button className="pagination-btn" disabled={safePage <= 1} onClick={() => goToPage(safePage - 1)}>
                  ‹
                </button>
                {buildPageNumbers(safePage, totalPages).map((p, i) =>
                  p === null ? (
                    <span key={`ellipsis-${i}`} className="pagination-ellipsis">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      className={`pagination-btn ${p === safePage ? 'active' : ''}`}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  className="pagination-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => goToPage(safePage + 1)}
                >
                  ›
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="browse-empty">
            <svg className="empty-icon" viewBox="0 0 100 100" width="80" height="80">
              <rect x="10" y="10" width="20" height="20" fill="#d4a76a" />
              <rect x="30" y="10" width="20" height="20" fill="#f0d9b5" />
              <rect x="50" y="10" width="20" height="20" fill="#d4a76a" />
              <rect x="70" y="10" width="20" height="20" fill="#f0d9b5" />
              <rect x="10" y="30" width="20" height="20" fill="#f0d9b5" />
              <rect x="30" y="30" width="20" height="20" fill="#d4a76a" />
              <rect x="50" y="30" width="20" height="20" fill="#f0d9b5" />
              <rect x="70" y="30" width="20" height="20" fill="#d4a76a" />
              <circle cx="50" cy="55" r="25" fill="none" stroke="#999" strokeWidth="4" />
              <line x1="68" y1="73" x2="85" y2="90" stroke="#999" strokeWidth="5" strokeLinecap="round" />
              <text x="50" y="62" textAnchor="middle" fontSize="18" fill="#999">
                ?
              </text>
            </svg>
            <p>{t('browse.noResults')}</p>
          </div>
        )}
      </main>
    </div>
  );
}
