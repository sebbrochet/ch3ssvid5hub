import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCh3ssVid5Url } from '../utils/import-url';
import './Header.css';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
];

export default function Header() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('ch3ssvid5-hub-theme');
    if (stored) return stored === 'dark';
    return true; // dark by default
  });
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('ch3ssvid5-hub-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    if (!langOpen) return;
    const close = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [langOpen]);

  return (
    <header className="site-header">
      <div className="site-header-left">
        <Link to="/" className="site-header-brand">
          {t('app.title')}
        </Link>
        <span className="app-version">v{__APP_VERSION__}</span>
      </div>
      <nav className="site-header-nav">
        <Link to="/browse" className={location.pathname === '/browse' ? 'active' : ''}>
          {t('header.browse')}
        </Link>
        <a href={getCh3ssVid5Url()} target="_blank" rel="noopener noreferrer">
          {t('header.ch3ssvid5')}
        </a>
        <a
          className="github-link"
          href="https://github.com/sebbrochet/ch3ssvid5hub"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub"
        >
          <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
        <button className="theme-toggle" onClick={() => setDark(!dark)} title="Toggle theme">
          {dark ? '☀️' : '🌙'}
        </button>
        <div className="lang-switcher" ref={langRef}>
          <button className="lang-toggle" onClick={() => setLangOpen(!langOpen)} title="Language">
            🌐
          </button>
          {langOpen && (
            <div className="lang-dropdown">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`lang-option ${i18n.language === lang.code ? 'active' : ''}`}
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    setLangOpen(false);
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
