import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameDetail } from '../hooks/useGameDetail';
import { useCatalog } from '../hooks/useCatalog';
import { usePageTitle } from '../hooks/usePageTitle';
import { buildPgnFileUrl, buildImportUrl, buildFolder } from '../utils/import-url';
import { parseFirstTimestamp, resultClass } from '../utils/pgn-utils';
import BoardPreview from './BoardPreview';
import VideoExtract from './VideoExtract';
import './GameDetail.css';

export default function GameDetail() {
  const { id } = useParams<{ id: string }>();
  const { game, loading, error } = useGameDetail(id);
  const { catalog } = useCatalog();
  const { t } = useTranslation();

  const pageTitle = game ? `${game.headers['White']} vs ${game.headers['Black']}` : undefined;
  usePageTitle(pageTitle);

  if (loading) return <div className="detail-loading">{t('detail.loading')}</div>;
  if (error) return <div className="detail-error">Error: {error}</div>;
  if (!game) return <div className="detail-error">{t('detail.notFound')}</div>;

  // Find catalog entry for extra metadata
  const catalogGame = catalog?.games.find((g) => g.id === id);
  const orientation = (game.headers['Orientation'] as 'white' | 'black') ?? 'white';
  const videoUrl = game.headers['VideoURL'];
  const startSeconds = videoUrl ? parseFirstTimestamp(game.pgn) : 0;

  // Build URLs at runtime (uses current origin in dev, production domain in prod)
  const pgnFileUrl = buildPgnFileUrl(game.pgnPath);
  const folder = catalogGame ? buildFolder(catalogGame.youtuberDisplayName, catalogGame.playlistDisplayName) : '';
  const importUrl = buildImportUrl(game.pgnPath, folder);

  // Display-friendly headers (exclude internal ones)
  const hiddenHeaders = new Set([
    'VideoURL',
    'VideoTitle',
    'VideoPlaylist',
    'Orientation',
    'SetUp',
    'FEN',
    'Tags',
    'Difficulty',
    'Language',
    'PlyCount',
    'SourceVersionDate',
  ]);

  return (
    <div className="detail">
      <nav className="detail-breadcrumb">
        <Link to="/">{t('detail.home')}</Link>
        <span className="breadcrumb-sep">›</span>
        <Link to="/browse">{t('detail.browse')}</Link>
        {catalogGame && (
          <>
            <span className="breadcrumb-sep">›</span>
            <Link to={`/browse?youtuber=${catalogGame.youtuber}`} className="breadcrumb-youtuber">
              {catalog?.youtuberProfiles[catalogGame.youtuber]?.avatarUrl && (
                <img
                  src={catalog.youtuberProfiles[catalogGame.youtuber].avatarUrl}
                  alt=""
                  className="youtuber-avatar youtuber-avatar--sm"
                />
              )}
              {catalogGame.youtuberDisplayName}
            </Link>
            <span className="breadcrumb-sep">›</span>
            <span>{catalogGame.playlistDisplayName}</span>
          </>
        )}
      </nav>

      <div className="detail-layout">
        <div className="detail-preview">
          <BoardPreview fen={game.startingFen} pgn={game.pgn} orientation={orientation} />

          {videoUrl && <VideoExtract videoUrl={videoUrl} startSeconds={startSeconds} />}
        </div>

        <div className="detail-info">
          <h1 className="detail-title">
            {game.headers['White']} vs {game.headers['Black']}
          </h1>

          <div className="detail-result-row">
            <span className={`detail-result ${resultClass(game.headers['Result'])}`}>{game.headers['Result']}</span>
            {catalogGame?.variant && <span className="detail-variant">{catalogGame.variant}</span>}
          </div>

          {catalogGame && catalogGame.moveCount > 0 && (
            <div className="detail-annotations">
              <span className="annotation-badge annotation-badge--moves">♟ {t('annotations.moves')}</span>
              {catalogGame.hasTimestamps && (
                <span className="annotation-badge annotation-badge--timestamps">
                  ⏱ {t('annotations.timestamps')}{' '}
                  {Math.round((catalogGame.timestampedMoveCount / catalogGame.totalMoveCount) * 100)}%
                </span>
              )}
              {catalogGame.hasEvals && (
                <span className="annotation-badge annotation-badge--evals">
                  ⚙ {t('annotations.evals')}{' '}
                  {Math.round(
                    (catalogGame.evaluatedMoveCount / (catalogGame.totalMoveCount - catalogGame.checkmateMoveCount)) *
                      100,
                  )}
                  %
                </span>
              )}
            </div>
          )}

          {game.description && <p className="detail-description">{game.description}</p>}

          {catalogGame && catalogGame.tags.length > 0 && (
            <div className="detail-tags">
              {catalogGame.tags.map((tag) => (
                <Link key={tag} to={`/browse?tag=${tag}`} className="tag">
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <div className="detail-moves">
            <h3>{t('detail.openingMoves')}</h3>
            <p className="detail-moves-text">{game.firstMoves}</p>
          </div>

          <table className="detail-headers">
            <tbody>
              {Object.entries(game.headers)
                .filter(([key]) => !hiddenHeaders.has(key))
                .map(([key, value]) => (
                  <tr key={key}>
                    <th>{key}</th>
                    <td>{value}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="detail-actions">
            <a href={importUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-import">
              {t('detail.openInCh3ssVid5')}
            </a>
            <a href={pgnFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              {t('detail.downloadPgn')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
