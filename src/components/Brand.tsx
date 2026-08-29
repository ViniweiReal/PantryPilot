import { ChefHat } from 'lucide-react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a className={`brand ${compact ? 'brand--compact' : ''}`} href="#top" aria-label="PantryPilot home">
      <span className="brand__mark"><ChefHat aria-hidden="true" strokeWidth={2.3} /></span>
      <span className="brand__word">Pantry<span>Pilot</span></span>
      {!compact && <span className="brand__beta">BETA</span>}
    </a>
  );
}

export type DecalKind = 'basil' | 'tomato' | 'egg' | 'spoon' | 'sparkles' | 'arrow';

export function Decal({ kind, className = '' }: { kind: DecalKind; className?: string }) {
  return <span className={`decal decal--${kind} ${className}`} aria-hidden="true" />;
}
