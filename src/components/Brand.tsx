import type { CSSProperties } from 'react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a className={`brand ${compact ? 'brand--compact' : ''}`} href="#top" aria-label="PantryPilot home">
      <span className="brand__mark">
        <svg viewBox="270 210 600 790" aria-hidden="true">
          <path className="brand__flame" d="M560 250C515 390 308 480 315 690C320 920 595 1000 770 815C908 670 759 447 650 330C635 460 560 468 560 250Z" />
          <path className="brand__leaf" d="M526 710C432 607 509 501 618 476C650 603 609 692 526 710Z" />
          <path className="brand__spoon" d="M530 720L620 520" />
          <ellipse className="brand__spoon-bowl" cx="527" cy="751" rx="41" ry="53" />
          <ellipse className="brand__yolk" cx="527" cy="747" rx="29" ry="34" />
        </svg>
      </span>
      <span className="brand__word">Pantry<span>Pilot</span></span>
    </a>
  );
}

export type DecalKind = 'basil' | 'tomato' | 'egg' | 'spoon' | 'sparkles' | 'arrow';

export function Decal({ kind, className = '' }: { kind: DecalKind; className?: string }) {
  const style = {
    '--decal-image': `url('${import.meta.env.BASE_URL}images/pantry-decals.webp')`,
    '--agent-arrow-image': `url('${import.meta.env.BASE_URL}images/agent-arrow.webp')`,
  } as CSSProperties;

  return <span className={`decal decal--${kind} ${className}`} style={style} aria-hidden="true" />;
}
