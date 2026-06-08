import { useEffect, useRef } from 'react';
import './spotlight-card.css';

const glowColorMap = {
  // ── Identidade Shape Certo ──────────────────────────────────────────────────
  // #ff4d3d = HSL(5°, 100%, 62%) — vermelho puro da marca
  // spread mínimo: cursor desloca ±6° no máx (5→11°), permanece vermelho
  // lightness 45% + brightness 1.2 = ~54% percebido → vermelho vívido sem virar laranja
  brand:        { base: 5, spread: 5, saturation: 100, lightness: 45, bgOpacity: 0.10, borderOpacity: 1.0, glowBrightness: 1.2 },
  'brand-soft': { base: 5, spread: 3, saturation: 95,  lightness: 42, bgOpacity: 0.06, borderOpacity: 0.6, glowBrightness: 1.1 },

  // ── Genéricos (mantidos para outros usos) ───────────────────────────────────
  red:    { base: 0,   spread: 180 },
  orange: { base: 30,  spread: 200 },
  blue:   { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green:  { base: 120, spread: 200 },
};

/**
 * GlowCard — wrapper com efeito spotlight seguindo o cursor.
 *
 * Props:
 *  - children   — conteúdo interno
 *  - className  — classes extras para o wrapper
 *  - glowColor  — 'red' | 'orange' | 'blue' | 'purple' | 'green'  (default: 'red')
 *  - style      — estilos inline extras
 */
export function GlowCard({ children, className = '', glowColor = 'red', style = {} }) {
  const cardRef = useRef(null);

  useEffect(() => {
    function onPointerMove(e) {
      const { clientX: x, clientY: y } = e;
      if (!cardRef.current) return;
      cardRef.current.style.setProperty('--x',  x.toFixed(2));
      cardRef.current.style.setProperty('--xp', (x / window.innerWidth).toFixed(2));
      cardRef.current.style.setProperty('--y',  y.toFixed(2));
      cardRef.current.style.setProperty('--yp', (y / window.innerHeight).toFixed(2));
    }

    document.addEventListener('pointermove', onPointerMove);
    return () => document.removeEventListener('pointermove', onPointerMove);
  }, []);

  const colorDef = glowColorMap[glowColor] ?? glowColorMap['brand-soft'];
  const {
    base,
    spread,
    saturation    = 100,
    lightness     = 45,
    bgOpacity     = 0.08,
    borderOpacity = 1,
    glowBrightness = 1.2,
  } = colorDef;

  const glowStyle = {
    '--base':              base,
    '--spread':            spread,
    '--saturation':        saturation,
    '--lightness':         lightness,
    '--bg-spot-opacity':   bgOpacity,
    '--border-spot-opacity': borderOpacity,
    '--border-light-opacity': borderOpacity * 0.5,
    '--glow-brightness':     glowBrightness,
    '--radius':            '10',
    '--border':            '1.5',
    '--size':              '260',
    '--outer':             '1',
    '--backdrop':          'transparent',
    '--backup-border':     'transparent',
    '--border-size':       'calc(var(--border, 2) * 1px)',
    '--spotlight-size':    'calc(var(--size, 150) * 1px)',
    '--hue':               'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',

    backgroundImage: `radial-gradient(
      var(--spotlight-size) var(--spotlight-size) at
      calc(var(--x, 0) * 1px) calc(var(--y, 0) * 1px),
      hsl(
        var(--hue, 5)
        calc(var(--saturation, 100) * 1%)
        calc(var(--lightness, 60) * 1%) /
        var(--bg-spot-opacity, 0.10)
      ),
      transparent
    )`,
    backgroundSize: 'calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))',
    backgroundPosition: '50% 50%',
    backgroundAttachment: 'fixed',
    border: 'var(--border-size) solid var(--backup-border)',

    position: 'relative',
    touchAction: 'none',
    ...style,
  };

  return (
    <div
      ref={cardRef}
      data-glow
      style={glowStyle}
      className={`glow-card-wrapper ${className}`}
    >
      {/* inner glow div necessário para o efeito de borda */}
      <div data-glow />
      {children}
    </div>
  );
}

export default GlowCard;
