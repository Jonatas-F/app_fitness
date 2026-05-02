/**
 * HeroVideoScroll
 *
 * Background de vídeo controlado por scroll para a hero section.
 * Três vídeos tocam em sequência conforme o usuário desce a página.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  COMO FUNCIONA                                                  │
 * │                                                                 │
 * │  .hvs-wrapper  →  div "alta" que cria o orçamento de scroll    │
 * │  .hvs-sticky   →  filho sticky que fica preso 100vh na tela    │
 * │  .hvs-bg       →  camada absoluta com os 3 vídeos              │
 * │  .hvs-content  →  camada de conteúdo (z-index acima do vídeo)  │
 * │                                                                 │
 * │  scroll → localY → progress (0..1) → globalTime (segundos) →  │
 * │  video.currentTime + opacity por vídeo                         │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Desktop: currentTime de cada vídeo acompanha o scroll (scrubbing).
 * Mobile : primeiro vídeo toca em loop autoplay (sem scrubbing).
 */

import { useEffect, useRef, useState, useCallback } from "react";
import "./HeroVideoScroll.css";

// ─── Configuração ─────────────────────────────────────────────────────────────

/**
 * Quantos pixels de scroll equivalem a 1 segundo de vídeo.
 *
 * Para ajustar a "quantidade de scroll" para passar pelos 3 vídeos:
 *   - Aumente este valor → mais scroll necessário (experiência mais imersiva)
 *   - Diminua este valor → menos scroll necessário (transição mais rápida)
 *
 * Exemplo: videos de 4s + 5s + 4s = 13 segundos totais
 *   PX_PER_SECOND = 250  →  orçamento de scroll = 3250px
 *   PX_PER_SECOND = 400  →  orçamento de scroll = 5200px
 */
const PX_PER_SECOND = 280;

/**
 * Janela de crossfade (segundos) — quanto tempo antes do fim de um vídeo
 * o próximo começa a aparecer gradualmente.
 */
const BLEND_S = 0.5;

/** Caminhos dos vídeos em /public/videos/ */
const VIDEO_SRCS = ["/videos/1.mp4", "/videos/2.mp4", "/videos/3.mp4"];

// ─── Utilitários ──────────────────────────────────────────────────────────────

/** Clamp entre min e max */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Detecta dispositivo que provavelmente não suporta scrubbing suave.
 * Usamos (hover:none && pointer:coarse) que captura todos os touch-primary devices.
 */
function detectMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * @param {object}  props
 * @param {React.ReactNode} props.children  – conteúdo da hero (texto, CTA, form)
 * @param {string}  [props.className]       – classe extra para .hvs-content
 */
export default function HeroVideoScroll({ children, className = "" }) {
  const wrapperRef = useRef(null);  // div external (define o orçamento de scroll)
  const videoRefs  = [useRef(null), useRef(null), useRef(null)]; // um ref por vídeo

  const rafRef      = useRef(null); // ID do rAF pendente (evita enfileiramento)
  const durRef      = useRef([0, 0, 0]); // durações em segundos após loadedmetadata
  const readyRef    = useRef(0);    // contador de vídeos com metadata carregada

  // Avaliado uma única vez na montagem — isMobile nunca muda em runtime
  const [isMobile] = useState(detectMobile);

  // ─── Função de scrubbing ────────────────────────────────────────────────────
  //
  // Esta é a função "quente" — chamada via rAF a cada scroll.
  // Escreve diretamente no DOM (style.opacity, .currentTime) para evitar
  // re-renders do React a cada frame.

  const scrub = useCallback(() => {
    rafRef.current = null;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const [d1, d2, d3] = durRef.current;
    const total = d1 + d2 + d3;
    if (total === 0) return; // metadata ainda não carregou

    // Quanto de scroll está disponível dentro do wrapper
    const budget = total * PX_PER_SECOND;

    // Posição do topo do wrapper em relação ao documento
    const wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY;

    // Quantos pixels o usuário scrollou DENTRO do wrapper
    const localY = clamp(window.scrollY - wrapperTop, 0, budget);

    // Progresso 0..1 → convertido para "segundo global" nos 3 vídeos concatenados
    const globalTime = (localY / budget) * total;

    const [v1, v2, v3] = videoRefs.map((r) => r.current);
    if (!v1 || !v2 || !v3) return;

    // ── Calcula opacidade e currentTime de cada vídeo ────────────────────────

    let op1 = 0, op2 = 0, op3 = 0;

    if (globalTime <= d1) {
      // ── Zona do vídeo 1 ──────────────────────────────────────────────────
      op1 = 1;
      v1.currentTime = clamp(globalTime, 0, d1 - 0.001);

      // Crossfade para o vídeo 2 próximo do final do vídeo 1
      if (d1 - globalTime < BLEND_S && d2 > 0) {
        op2 = clamp(1 - (d1 - globalTime) / BLEND_S, 0, 1);
        // Garante que o v2 já está no frame inicial durante o blend
        if (v2.currentTime > 0.05) v2.currentTime = 0;
      }

    } else if (globalTime <= d1 + d2) {
      // ── Zona do vídeo 2 ──────────────────────────────────────────────────
      const t2 = globalTime - d1;
      op2 = 1;
      v2.currentTime = clamp(t2, 0, d2 - 0.001);

      // Fade out do vídeo 1 no início da zona 2
      if (t2 < BLEND_S) {
        op1 = clamp(1 - t2 / BLEND_S, 0, 1);
      }

      // Crossfade para o vídeo 3 próximo do final do vídeo 2
      if (d2 - t2 < BLEND_S && d3 > 0) {
        op3 = clamp(1 - (d2 - t2) / BLEND_S, 0, 1);
        if (v3.currentTime > 0.05) v3.currentTime = 0;
      }

    } else {
      // ── Zona do vídeo 3 ──────────────────────────────────────────────────
      const t3 = globalTime - d1 - d2;
      op3 = 1;
      v3.currentTime = clamp(t3, 0, d3 - 0.001);

      // Fade out do vídeo 2 no início da zona 3
      if (t3 < BLEND_S) {
        op2 = clamp(1 - t3 / BLEND_S, 0, 1);
      }
    }

    // Mutação direta no DOM — bypassa o ciclo do React intencionalmente
    v1.style.opacity = String(op1);
    v2.style.opacity = String(op2);
    v3.style.opacity = String(op3);
  }, []); // sem dependências — acessa apenas refs

  // ─── Listener de scroll ─────────────────────────────────────────────────────

  useEffect(() => {
    if (isMobile) return; // mobile usa fallback autoplay

    const onScroll = () => {
      // Throttle: só enfileira um rAF por burst de eventos de scroll
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(scrub);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    // Roda uma vez ao montar (caso a página já esteja scrollada)
    scrub();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isMobile, scrub]);

  // ─── Handler de metadata ────────────────────────────────────────────────────

  /**
   * Chamado quando cada vídeo termina de carregar seu header (duração disponível).
   * Quando todos os 3 estiverem prontos, calcula e aplica a altura do wrapper.
   */
  const onMetaLoaded = useCallback(
    (index) => {
      const video = videoRefs[index].current;
      if (video?.duration) {
        durRef.current[index] = video.duration;
      }

      readyRef.current += 1;

      if (readyRef.current < 3) return; // espera os 3

      // ── Todos os vídeos carregados: define a altura real do wrapper ────────
      const [d1, d2, d3] = durRef.current;
      const total  = d1 + d2 + d3;
      const budget = total * PX_PER_SECOND;

      // Altura do wrapper = 100vh (zona sticky) + orçamento de scroll
      if (wrapperRef.current) {
        wrapperRef.current.style.height = `calc(100vh + ${budget}px)`;
      }

      // Re-scrubbing com durações corretas
      scrub();
    },
    [scrub]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    /**
     * Wrapper externo: define o "trilho" de scroll.
     * Altura inicial conservadora (evita CLS antes das durações carregarem).
     * Atualizada para o valor exato em onMetaLoaded.
     */
    <div
      ref={wrapperRef}
      className="hvs-wrapper"
      style={{ height: isMobile ? "100svh" : "calc(100vh + 3000px)" }}
    >
      {/* Filho sticky: fica preso no viewport durante todo o orçamento de scroll */}
      <div className="hvs-sticky">

        {/* ── Camada de vídeo (atrás do conteúdo) ─────────────────────────── */}
        <div className="hvs-bg" aria-hidden="true">

          {isMobile ? (
            /**
             * Mobile: um único vídeo em loop autoplay.
             * Scrubbing é desabilitado — não escala bem em dispositivos touch.
             */
            <video
              src={VIDEO_SRCS[0]}
              className="hvs-video"
              style={{ opacity: 1 }}
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            /**
             * Desktop: 3 vídeos empilhados.
             * O scrub() controla opacity e currentTime via rAF.
             * preload="auto" instrui o browser a bufferizar o arquivo inteiro.
             */
            VIDEO_SRCS.map((src, i) => (
              <video
                key={src}
                ref={videoRefs[i]}
                src={src}
                className="hvs-video"
                style={{ opacity: i === 0 ? 1 : 0 }}
                muted
                playsInline
                preload="auto"
                onLoadedMetadata={() => onMetaLoaded(i)}
              />
            ))
          )}

        </div>

        {/* ── Camada de conteúdo (hero section) ───────────────────────────── */}
        <div className={`hvs-content ${className}`}>
          {children}
        </div>

      </div>
    </div>
  );
}
