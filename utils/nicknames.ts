import { useEffect, useState } from 'react';

// Fetched once per page load; any failure (e.g. Vite dev without Functions) counts as unavailable
let availability: Promise<boolean> | null = null;

const fetchAvailability = (): Promise<boolean> => {
  availability ??= fetch('/api/nicknames')
    .then(r => (r.ok ? r.json() : { enabled: false }))
    .then(data => data?.enabled === true)
    .catch(() => false);
  return availability;
};

/** Whether AI nickname generation is available (server has ANTHROPIC_API_KEY). False until confirmed. */
export const useNicknamesAvailable = (): boolean => {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    fetchAvailability().then(v => { if (active) setAvailable(v); });
    return () => { active = false; };
  }, []);
  return available;
};
