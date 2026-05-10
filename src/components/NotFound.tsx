import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './NotFound.css';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="not-found">
      <svg className="not-found-icon" viewBox="0 0 120 120" width="120" height="120">
        <rect x="10" y="10" width="25" height="25" fill="#d4a76a" />
        <rect x="35" y="10" width="25" height="25" fill="#f0d9b5" />
        <rect x="60" y="10" width="25" height="25" fill="#d4a76a" />
        <rect x="85" y="10" width="25" height="25" fill="#f0d9b5" />
        <rect x="10" y="35" width="25" height="25" fill="#f0d9b5" />
        <rect x="35" y="35" width="25" height="25" fill="#d4a76a" />
        <rect x="60" y="35" width="25" height="25" fill="#f0d9b5" />
        <rect x="85" y="35" width="25" height="25" fill="#d4a76a" />
        <text x="60" y="95" textAnchor="middle" fontSize="36" fontWeight="bold" fill="#999">
          404
        </text>
      </svg>
      <h1 className="not-found-title">{t('notFound.title')}</h1>
      <p className="not-found-text">{t('notFound.text')}</p>
      <div className="not-found-actions">
        <Link to="/" className="btn btn-primary">
          {t('notFound.home')}
        </Link>
        <Link to="/browse" className="btn btn-secondary">
          {t('notFound.browse')}
        </Link>
      </div>
    </div>
  );
}
