import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCatalog } from '../hooks/useCatalog';
import { usePageTitle } from '../hooks/usePageTitle';
import GameCard from './GameCard';
import './LandingPage.css';

const RECENT_GAMES_COUNT = 6;

export default function LandingPage() {
  const { catalog, loading } = useCatalog();
  const { t } = useTranslation();
  usePageTitle();

  const recentGames = catalog
    ? catalog.games
        .filter((g) => g.lastUpdated)
        .sort((a, b) => b.lastUpdated!.localeCompare(a.lastUpdated!))
        .slice(0, RECENT_GAMES_COUNT)
    : [];

  return (
    <div className="landing">
      <section className="landing-hero">
        <h1>{t('app.title')}</h1>
        <p className="landing-tagline">
          {t('landing.tagline')}
          <br />
          {t('landing.tagline2')}
        </p>
      </section>

      {!loading && catalog && (
        <section className="landing-stats">
          <div className="stat">
            <span className="stat-value">{catalog.totalGames}</span>
            <span className="stat-label">{t('landing.games')}</span>
          </div>
          <div className="stat">
            <span className="stat-value">{catalog.youtubers.length}</span>
            <span className="stat-label">{t('landing.youtubers')}</span>
          </div>
          <div className="stat">
            <span className="stat-value">{catalog.openings.length}</span>
            <span className="stat-label">{t('landing.openings')}</span>
          </div>
          <div className="stat">
            <span className="stat-value">{catalog.tags.length}</span>
            <span className="stat-label">{t('landing.tags')}</span>
          </div>
        </section>
      )}

      <section className="landing-actions">
        <Link to="/browse" className="btn btn-primary">
          {t('landing.browseGames')}
        </Link>
      </section>

      {recentGames.length > 0 && (
        <section className="landing-recent">
          <h2>{t('landing.recentlyAnnotated')}</h2>
          <div className="landing-recent-grid">
            {recentGames.map((game) => (
              <GameCard key={game.id} game={game} avatarUrl={catalog?.youtuberProfiles[game.youtuber]?.avatarUrl} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
