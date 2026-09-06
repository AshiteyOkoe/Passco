import { useCallback, useMemo, useState } from 'react';

export function usePagination<T>(items: T[], perPage: number) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * perPage, safePage * perPage),
    [items, safePage, perPage]
  );

  const startIndex = items.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const endIndex = Math.min(safePage * perPage, items.length);

  const goTo = useCallback(
    (next: number) => {
      setPage(Math.min(totalPages, Math.max(1, next)));
    },
    [totalPages]
  );

  const next = useCallback(() => {
    setPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const prev = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const reset = useCallback(() => setPage(1), []);

  return { page: safePage, totalPages, pageItems, startIndex, endIndex, goTo, next, prev, reset };
}