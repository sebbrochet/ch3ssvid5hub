import './VideoExtract.css';

interface VideoExtractProps {
  /** YouTube video URL */
  videoUrl: string;
  /** Start time in seconds (from first [%ts] annotation) */
  startSeconds?: number;
}

/** Extract YouTube video ID from various URL formats. */
function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
  return match ? match[1] : null;
}

export default function VideoExtract({ videoUrl, startSeconds = 0 }: VideoExtractProps) {
  const videoId = extractYoutubeId(videoUrl);
  if (!videoId) return null;

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?start=${Math.floor(startSeconds)}&rel=0`;

  return (
    <div className="video-extract">
      <div className="video-extract-container">
        <iframe
          src={embedUrl}
          title="Video preview"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="video-extract-iframe"
        />
      </div>
    </div>
  );
}
