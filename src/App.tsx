import { useEffect, useState } from 'react';
import { REVEAL_ROUTE } from './domain/reveal';
import { RevealPage } from './components/RevealPage';
import { Wizard } from './components/Wizard';

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

/** Routing na hashu — działa na każdym statycznym hostingu bez konfiguracji serwera. */
export default function App() {
  const hash = useHash();
  if (hash.startsWith(REVEAL_ROUTE)) {
    return <RevealPage code={hash.slice(REVEAL_ROUTE.length)} />;
  }
  return <Wizard />;
}
