import { type CSSProperties, useMemo } from 'react';

interface SnowProps {
  count?: number;
  /** Jak daleko spadają płatki (CSS), np. "100vh" albo "300px". */
  fall?: string;
}

/** Dekoracyjny, spadający śnieg. Wyłączany przy `prefers-reduced-motion`. */
export function Snow({ count = 30, fall = '100vh' }: SnowProps) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        size: 0.5 + Math.random() * 1.1,
        duration: 7 + Math.random() * 10,
        delay: -Math.random() * 17,
        drift: Math.random() * 80 - 40,
        opacity: 0.35 + Math.random() * 0.6,
      })),
    [count],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {flakes.map((f, i) => (
        <span
          key={i}
          className="snowflake"
          style={
            {
              left: `${f.left}%`,
              fontSize: `${f.size}rem`,
              opacity: f.opacity,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
              '--fall': fall,
              '--drift': `${f.drift}px`,
            } as CSSProperties
          }
        >
          {/* U+FE0E wymusza wersję tekstową (białą) zamiast kolorowego emoji */}
          {'❄︎'}
        </span>
      ))}
    </div>
  );
}
