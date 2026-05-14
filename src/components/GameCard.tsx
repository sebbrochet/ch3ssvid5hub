import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CatalogGame } from '../types/catalog';
import { resultClass } from '../utils/pgn-utils';
import './GameCard.css';

interface GameCardProps {
  game: CatalogGame;
  avatarUrl?: string;
}

export default function GameCard({ game, avatarUrl }: GameCardProps) {
  const rClass = resultClass(game.result);
  const { t } = useTranslation();

  return (
    <Link to={`/game/${game.id}`} className={`game-card${game.moveCount === 0 ? ' game-card--skeleton' : ''}`}>
      <div className="game-card-header">
        {avatarUrl && <img src={avatarUrl} alt="" className="youtuber-avatar youtuber-avatar--xs" />}
        <span className="game-card-youtuber">{game.youtuberDisplayName}</span>
        {game.variant && <span className="game-card-variant">{game.variant}</span>}
      </div>

      <div className="game-card-players">
        <span className="game-card-white">♔ {game.white}</span>
        <span className={`game-card-result ${rClass}`}>{game.result}</span>
        <span className="game-card-black">♚ {game.black}</span>
      </div>

      {game.opening && <div className="game-card-opening">{game.opening}</div>}

      {game.event && <div className="game-card-event">{game.event}</div>}

      <div className="game-card-meta">
        {game.videoTitle && (
          <span className="game-card-video" title={game.videoTitle}>
            ▶ {game.videoTitle}
          </span>
        )}
      </div>

      {game.tags.length > 0 && (
        <div className="game-card-tags">
          {game.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
          {game.tags.length > 4 && <span className="tag tag-more">+{game.tags.length - 4}</span>}
        </div>
      )}

      {game.moveCount > 0 && (
        <div className="game-card-annotations">
          <span className="annotation-badge annotation-badge--moves">♟ {t('annotations.moves')}</span>
          {game.hasTimestamps && (
            <span className="annotation-badge annotation-badge--timestamps">⏱ {t('annotations.timestamps')}</span>
          )}
          {game.hasEvals && (
            <span className="annotation-badge annotation-badge--evals">⚙ {t('annotations.evals')}</span>
          )}
        </div>
      )}
    </Link>
  );
}
