import React, { useMemo } from 'react';
import { useSolarSystemStore } from '../../store/solarSystemStore';

const STAR_COUNT = 90;

function generateStars(count) {
  const s = [];
  for (let i = 0; i < count; i++) s.push({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 0.5,
    delay: Math.random() * 4,
    duration: Math.random() * 3 + 2,
  });
  return s;
}

export default function CinematicIntro() {
  const { introPhase, introSubtitle, sceneReady, triggerExplore } = useSolarSystemStore();
  const stars = useMemo(() => generateStars(STAR_COUNT), []);

  if (introPhase === 'free') return null;

  const isLoading = !sceneReady;
  const isCockpit = introPhase === 'cockpit';
  const isExiting = introPhase === 'exiting';
  const isCinematic = introPhase === 'cinematic';

  return (
    <div className={`cin-overlay ${isLoading ? 'cin-overlay--opaque' : 'cin-overlay--transparent'} ${isExiting ? 'cin-overlay--hide' : ''}`}>
      {/* CSS star field — visible only during loading */}
      {isLoading && (
        <div className="cin-stars" aria-hidden="true">
          {stars.map(s => (
            <span key={s.id} className="cin-star" style={{
              left: s.left, top: s.top, width: s.size, height: s.size,
              animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s`,
            }} />
          ))}
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div className="cin-loader">
          <div className="cin-loader__sun" />
          <div className="cin-loader__ring" />
          <p className="cin-loader__text">Inicializando sistema solar...</p>
        </div>
      )}

      {/* Subtitle bar (during cinematic fly-through) */}
      {isCinematic && introSubtitle && (
        <div className="cin-subtitle">
          <span>{introSubtitle}</span>
        </div>
      )}

      {/* Cockpit panel overlay */}
      {isCockpit && (
        <div className="cin-cockpit-panel">
          <div className="cin-panel__inner">
            <div className="cin-panel__header">
              <span className="cin-panel__b4">B4</span>
              <span className="cin-panel__title">Sistema Solar ERD-FX</span>
            </div>
            <div className="cin-panel__divider" />
            <p className="cin-panel__desc">
              Representação interativa da stack de tecnologia B4 Group como um sistema solar.
              Cada planeta representa um módulo, satélites são microsserviços.
            </p>
            <ul className="cin-panel__features">
              <li>Orbite livremente com o mouse</li>
              <li>Clique em qualquer planeta ou satélite para detalhes</li>
              <li>Use os controles para ajustar velocidade e visualização</li>
            </ul>
            <button className="cin-panel__btn" onClick={() => triggerExplore && triggerExplore()}>
              EXPLORAR
            </button>
            <span className="cin-panel__hint">ou pressione Enter</span>
          </div>
        </div>
      )}
    </div>
  );
}
