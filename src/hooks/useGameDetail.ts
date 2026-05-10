import { useState, useEffect } from 'react';
import type { GameDetail } from '../types/catalog';

export function useGameDetail(id: string | undefined): {
  game: GameDetail | null;
  loading: boolean;
  error: string | null;
} {
  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const url = `${import.meta.env.BASE_URL}catalog/games/${id}.json`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Game not found: ${res.status}`);
        return res.json();
      })
      .then((data: GameDetail) => setGame(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { game, loading, error };
}
