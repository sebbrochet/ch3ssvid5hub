import { useTranslation } from 'react-i18next';
import { getCh3ssVid5Url } from '../utils/import-url';
import './Footer.css';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="site-footer">
      <div className="footer-links">
        <a href={getCh3ssVid5Url()} target="_blank" rel="noopener noreferrer">
          {t('header.ch3ssvid5')}
        </a>
        <a href="https://github.com/sebbrochet/ch3ssvid5hub" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <a
          href="https://github.com/sebbrochet/ch3ssvid5hub/blob/main/CONTRIBUTING.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('footer.contribute')}
        </a>
      </div>
      <p className="footer-copy">{t('footer.license')}</p>
    </footer>
  );
}
