import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCatalog } from '../hooks/useCatalog';
import { usePageTitle } from '../hooks/usePageTitle';
import './LandingPage.css';

export default function LandingPage() {
  const { catalog, loading } = useCatalog();
  const { t } = useTranslation();
  usePageTitle();

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
        <a
          href="https://github.com/sebbrochet/Ch3ssVid5-Hub"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
        >
          {t('landing.contribute')}
        </a>
      </section>
    </div>
  );
}
