/**
 * useGlowEffect — aplica o efeito de spotlight diretamente a um elemento DOM
 * via ref, sem precisar de um wrapper div extra.
 *
 * Uso:
 *   const glowRef = useGlowEffect('brand-soft');
 *   return <section ref={glowRef} ...>...</section>
 */
import { useEffect, useRef } from 'react';

const glowColorMap = {
  brand: {
    base: 5, spread: 5,
    saturation: 100, lightness: 45,
    bgOpacity: 0.10, borderOpacity: 1.0, glowBrightness: 1.2,
  },
  'brand-soft': {
    base: 5, spread: 3,
    saturation: 95, lightness: 42,
    bgOpacity: 0.06, borderOpacity: 0.6, glowBrightness: 1.1,
  },
};

export function useGlowEffect(glowColor = 'brand-soft') {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const def = glowColorMap[glowColor] ?? glowColorMap['brand-soft'];
    const {
      base, spread,
      saturation = 95, lightness = 42,
      bgOpacity = 0.06, borderOpacity = 0.6,
      glowBrightness = 1.1,
    } = def;

    // Ativa os pseudo-elementos ::before / ::after de spotlight-card.css
    el.setAttribute('data-glow', '');

    // CSS variables consumidas pelo CSS
    const vars = {
      '--base':                 String(base),
      '--spread':               String(spread),
      '--saturation':           String(saturation),
      '--lightness':            String(lightness),
      '--bg-spot-opacity':      String(bgOpacity),
      '--border-spot-opacity':  String(borderOpacity),
      '--border-light-opacity': String(borderOpacity * 0.5),
      '--glow-brightness':      String(glowBrightness),
      '--radius':               '8',
      '--border':               '1',
      '--size':                 '220',
      '--outer':                '1',
      '--border-size':          'calc(var(--border, 1) * 1px)',
      '--spotlight-size':       'calc(var(--size, 220) * 1px)',
      '--hue':                  'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
    };
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);

    // Spotlight de fundo (segue o cursor)
    el.style.backgroundImage = [
      'radial-gradient(',
      '  var(--spotlight-size) var(--spotlight-size) at',
      '  calc(var(--x, 0) * 1px) calc(var(--y, 0) * 1px),',
      '  hsl(var(--hue, 5) calc(var(--saturation, 95) * 1%) calc(var(--lightness, 42) * 1%) / var(--bg-spot-opacity, 0.06)),',
      '  transparent',
      ')',
    ].join('');
    el.style.backgroundAttachment = 'fixed';
    el.style.backgroundSize       = 'calc(100% + 2px) calc(100% + 2px)';
    el.style.backgroundPosition   = '50% 50%';
    el.style.backgroundRepeat     = 'no-repeat';
    el.style.position             = 'relative';

    function onPointerMove(e) {
      el.style.setProperty('--x',  e.clientX.toFixed(2));
      el.style.setProperty('--xp', (e.clientX / window.innerWidth).toFixed(2));
      el.style.setProperty('--y',  e.clientY.toFixed(2));
      el.style.setProperty('--yp', (e.clientY / window.innerHeight).toFixed(2));
    }

    document.addEventListener('pointermove', onPointerMove);

    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      // Limpa os estilos aplicados pelo hook
      el.removeAttribute('data-glow');
      el.style.backgroundImage     = '';
      el.style.backgroundAttachment = '';
      el.style.backgroundSize      = '';
      el.style.backgroundPosition  = '';
      el.style.backgroundRepeat    = '';
      for (const k of Object.keys(vars)) el.style.removeProperty(k);
    };
  }, [glowColor]);

  return ref;
}
