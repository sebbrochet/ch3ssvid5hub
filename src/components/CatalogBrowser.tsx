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
  const DELIM = '|';
  const query = searchParams.get('q') ?? '';
  const selectedYoutubers = (searchParams.get('youtuber') ?? '').split(DELIM).filter(Boolean);
  // Playlists are stored as "youtuber/playlist" pairs in the URL
  const rawPlaylists = (searchParams.get('playlist') ?? '').split(DELIM).filter(Boolean);
  const selectedPlaylistPairs = rawPlaylists.map((p) => {
    const sep = p.indexOf('/');
    return { youtuber: p.slice(0, sep), playlist: p.slice(sep + 1) };
  });
  const selectedPlaylistValues = selectedPlaylistPairs.map((p) => p.playlist);
  const selectedTags = (searchParams.get('tag') ?? '').split(DELIM).filter(Boolean);
  const selectedResults = (searchParams.get('result') ?? '').split(DELIM).filter(Boolean);
  const selectedVariants = (searchParams.get('variant') ?? '').split(DELIM).filter(Boolean);
  const selectedOpenings = (searchParams.get('opening') ?? '').split(DELIM).filter(Boolean);
  const selectedLanguages = (searchParams.get('language') ?? '').split(DELIM).filter(Boolean);
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
      youtuber: selectedYoutubers,
      playlist: selectedPlaylistValues,
      tag: selectedTags,
      result: selectedResults,
      variant: selectedVariants,
      opening: selectedOpenings,
      language: selectedLanguages,
      moves: filterMoves,
      timestamps: filterTimestamps,
      evals: filterEvals,
    });
  }, [
    catalog,
    query,
    selectedYoutubers,
    selectedPlaylistValues,
    selectedTags,
    selectedResults,
    selectedVariants,
    selectedOpenings,
    selectedLanguages,
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
    const current = (params.get(key) ?? '').split(DELIM).filter(Boolean);
    const idx = current.indexOf(value);
    if (idx >= 0) {
      current.splice(idx, 1);
      // When unchecking a youtuber, remove their scoped playlists
      if (key === 'youtuber') {
        const playlists = (params.get('playlist') ?? '').split(DELIM).filter(Boolean);
        const remaining = playlists.filter((p) => !p.startsWith(value + '/'));
        if (remaining.length > 0) {
          params.set('playlist', remaining.join(DELIM));
        } else {
          params.delete('playlist');
        }
      }
    } else {
      current.push(value);
    }
    if (current.length > 0) {
      params.set(key, current.join(DELIM));
    } else {
      params.delete(key);
    }
    params.delete('page');
    setSearchParams(params, { replace: true });
  }

  function togglePlaylist(youtuber: string, playlist: string) {
    const params = new URLSearchParams(searchParams);
    const scoped = `${youtuber}/${playlist}`;
    const current = (params.get('playlist') ?? '').split(DELIM).filter(Boolean);
    const idx = current.indexOf(scoped);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(scoped);
    }
    if (current.length > 0) {
      params.set('playlist', current.join(DELIM));
    } else {
      params.delete('playlist');
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

  // Build playlist display name map
  const playlistNames = new Map<string, string>();
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
                const isSelected = selectedYoutubers.includes(yt);
                const ytPlaylists = isSelected
                  ? [...new Set(catalog.games.filter((g) => g.youtuber === yt).map((g) => g.playlist))].sort()
                  : [];
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
                    {isSelected && ytPlaylists.length > 1 && (
                      <div className="filter-group--sub">
                        {ytPlaylists.map((pl) => {
                          const count = catalog.games.filter((g) => g.youtuber === yt && g.playlist === pl).length;
                          const isPlSelected = selectedPlaylistPairs.some(
                            (p) => p.youtuber === yt && p.playlist === pl,
                          );
                          return (
                            <label key={pl} className={`filter-item ${isPlSelected ? 'active' : ''}`}>
                              <input type="checkbox" checked={isPlSelected} onChange={() => togglePlaylist(yt, pl)} />
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
              <label key={r} className={`filter-item ${selectedResults.includes(r) ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedResults.includes(r)}
                  onChange={() => toggleFilter('result', r)}
                />
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
                <label key={v} className={`filter-item ${selectedVariants.includes(v) ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedVariants.includes(v)}
                    onChange={() => toggleFilter('variant', v)}
                  />
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
                  <label key={op} className={`filter-item ${selectedOpenings.includes(op) ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedOpenings.includes(op)}
                      onChange={() => toggleFilter('opening', op)}
                    />
                    {op}
                    <span className="filter-count">({familyCount})</span>
                  </label>
                );
              }

              const selectedVariantCount = variants.filter((v) => selectedOpenings.includes(v)).length;
              const allSelected = selectedVariantCount === variants.length;
              const someSelected = selectedVariantCount > 0;

              return (
                <div key={family} className="opening-family">
                  <div className={`opening-family-header ${someSelected ? 'active' : ''}`}>
                    <label className="filter-item opening-family-label">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected && !allSelected;
                        }}
                        onChange={() => {
                          const params = new URLSearchParams(searchParams);
                          const current = (params.get('opening') ?? '').split(DELIM).filter(Boolean);
                          if (someSelected) {
                            // Remove all variants of this family
                            const remaining = current.filter((o) => !variants.includes(o));
                            if (remaining.length > 0) {
                              params.set('opening', remaining.join(DELIM));
                            } else {
                              params.delete('opening');
                            }
                          } else {
                            // Add all variants of this family
                            const merged = [...new Set([...current, ...variants])];
                            params.set('opening', merged.join(DELIM));
                          }
                          params.delete('page');
                          setSearchParams(params, { replace: true });
                        }}
                      />
                      {family}
                      <span className="filter-count">({familyCount})</span>
                    </label>
                    <button
                      className="opening-family-toggle"
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
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="opening-family-variants">
                      {variants.map((op) => {
                        const count = catalog.games.filter((g) => g.opening === op).length;
                        // Show only the variant part after the family name
                        const variantLabel = op.startsWith(family)
                          ? op.slice(family.length).replace(/^[,:]\s*/, '')
                          : op;
                        return (
                          <label key={op} className={`filter-item ${selectedOpenings.includes(op) ? 'active' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selectedOpenings.includes(op)}
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
                <label key={lang} className={`filter-item ${selectedLanguages.includes(lang) ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedLanguages.includes(lang)}
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
              <label key={tag} className={`filter-item ${selectedTags.includes(tag) ? 'active' : ''}`}>
                <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggleFilter('tag', tag)} />
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
          selectedYoutubers.length > 0 ||
          selectedPlaylistPairs.length > 0 ||
          selectedTags.length > 0 ||
          selectedResults.length > 0 ||
          selectedVariants.length > 0 ||
          selectedOpenings.length > 0 ||
          selectedLanguages.length > 0 ||
          filterMoves ||
          filterTimestamps ||
          filterEvals) && (
          <div className="browse-chips">
            {query && (
              <button className="chip" onClick={() => updateSearch('')}>
                &quot;{query}&quot; ✕
              </button>
            )}
            {selectedYoutubers.map((yt) => (
              <button key={yt} className="chip" onClick={() => toggleFilter('youtuber', yt)}>
                {youtuberNames.get(yt) ?? yt} ✕
              </button>
            ))}
            {selectedPlaylistPairs.map(({ youtuber, playlist }) => (
              <button
                key={`${youtuber}/${playlist}`}
                className="chip"
                onClick={() => togglePlaylist(youtuber, playlist)}
              >
                {youtuberNames.get(youtuber) ?? youtuber} / {playlistNames.get(playlist) ?? playlist} ✕
              </button>
            ))}
            {selectedResults.map((r) => (
              <button key={r} className="chip" onClick={() => toggleFilter('result', r)}>
                {r} ✕
              </button>
            ))}
            {selectedVariants.map((v) => (
              <button key={v} className="chip" onClick={() => toggleFilter('variant', v)}>
                {v} ✕
              </button>
            ))}
            {selectedOpenings.map((op) => (
              <button key={op} className="chip" onClick={() => toggleFilter('opening', op)}>
                {op} ✕
              </button>
            ))}
            {selectedTags.map((tag) => (
              <button key={tag} className="chip" onClick={() => toggleFilter('tag', tag)}>
                {tag} ✕
              </button>
            ))}
            {selectedLanguages.map((lang) => (
              <button key={lang} className="chip" onClick={() => toggleFilter('language', lang)}>
                {t(`languages.${lang}`, lang)} ✕
              </button>
            ))}
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
