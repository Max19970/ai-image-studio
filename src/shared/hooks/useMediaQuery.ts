import { useEffect, useState } from 'react';

export function useMediaQuery(queryText: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia(queryText).matches;
  });

  useEffect(() => {
    const query = window.matchMedia(queryText);
    const sync = () => setMatches(query.matches);

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, [queryText]);

  return matches;
}
