import { useState, useEffect } from 'react';

/** Subscribe to a CSS media query (e.g. `(max-width: 639px)`). */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mq.addEventListener('change', onChange);
    setMatches(mq.matches);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Narrow card layout (phones / small tiles). */
export function useCompactVitalCard() {
  return useMediaQuery('(max-width: 639px)');
}
