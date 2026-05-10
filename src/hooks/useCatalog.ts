import { useState, useEffect } from 'react';
import type { CatalogIndex } from '../types/catalog';

const CATALOG_URL = `${import.meta.env.BASE_URL}catalog/index.json`;

export function useCatalog(): { catalog: CatalogIndex | null; loading: boolean; error: string | null } {
  const [catalog, setCatalog] = useState<CatalogIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(CATALOG_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load catalog: ${res.status}`);
        return res.json();
      })
      .then((data: CatalogIndex) => setCatalog(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { catalog, loading, error };
}
