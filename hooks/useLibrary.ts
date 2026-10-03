import { useCallback, useEffect, useState } from 'react';
import { librarySaveError, listTournaments, onLibraryChange, type LibraryEntry } from '../utils/library/localLibrary.ts';

/** Saved tournaments list, refreshed on changes (any tab) and when the window regains focus */
export const useLibrary = () => {
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const refresh = useCallback(() => {
    setSaveFailed(!!librarySaveError());
    listTournaments().then(
      list => { setEntries(list); setUnavailable(false); },
      () => { setEntries([]); setUnavailable(true); },
    );
  }, []);

  useEffect(() => {
    refresh();
    const off = onLibraryChange(refresh);
    window.addEventListener('focus', refresh);
    return () => {
      off();
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  return { entries, unavailable, saveFailed, refresh };
};
