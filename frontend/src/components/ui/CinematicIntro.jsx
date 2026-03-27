import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSolarSystemStore } from '../../store/solarSystemStore';

const STAR_COUNT = 120;
const MIN_INTRO_MS = 5000;

function generateStars(count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2.5 + 0.5,
      delay: Math.random() * 4,
      duration: Math.random() * 3 + 2,
    });
  }
  return stars;
}

export default function CinematicIntro() {
  const { sceneReady, setIntroComplete } = useSolarSystemStore();
  const [phase, setPhase] = useState('logo');
  const [canEnter, setCanEnter] = useState(false);
  const [fading, setFading] = useState(false);

  const stars = useMemo(() => generateStars(STAR_COUNT), []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('tagline'), 1800);
    const t2 = setTimeout(() => setPhase('ready'), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const minTimer = setTimeout(() => {
      if (sceneReady) setCanEnter(true);
    }, MIN_INTRO_MS);
    return () => clearTimeout(minTimer);
  }, [sceneReady]);

  useEffect(() => {
    if (sceneReady && phase === 'ready') {
      const t = setTimeout(() => setCanEnter(true), 400);
      return () => clearTimeout(t);
    }
  }, [sceneReady, phase]);

  const handleEnter = useCallback(() => {
    if (!canEnter) return;
    setFading(true);
    setTimeout(() => setIntroComplete(true), 1200);
  }, [canEnter, setIntroComplete]);

  useEffect(() => {
    if (!canEnter) return;
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') handleEnter(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEnter, handleEnter]);

  return (
    <div
      className={`cinematic-intro ${fading ? 'cinematic-intro--fade-out' : ''}`}
      onClick={handleEnter}
      role="button"
      tabIndex={0}
    >
      {/* Star field */}
      <div className="cinematic-stars" aria-hidden="true">
        {stars.map((s) => (
          <span
            key={s.id}
            className="cinematic-star"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Central glow */}
      <div className="cinematic-sun-glow" aria-hidden="true" />

      {/* Content */}
      <div className="cinematic-content">
        <div className={`cinematic-logo ${phase !== 'logo' ? 'cinematic-logo--settled' : ''}`}>
          <span className="cinematic-b4">B4</span>
          <span className="cinematic-group">GROUP</span>
        </div>

        <h1 className={`cinematic-title ${phase === 'tagline' || phase === 'ready' ? 'cinematic-title--visible' : ''}`}>
          Sistema Solar Interativo
        </h1>

        <p className={`cinematic-subtitle ${phase === 'ready' ? 'cinematic-subtitle--visible' : ''}`}>
          Representação Stack Satélites de Tecnologia
        </p>

        <div className={`cinematic-enter ${canEnter ? 'cinematic-enter--visible' : ''}`}>
          <button className="cinematic-enter-btn" onClick={handleEnter} disabled={!canEnter}>
            Explorar
          </button>
          <span className="cinematic-enter-hint">pressione Enter ou clique</span>
        </div>

        {!canEnter && phase === 'ready' && (
          <div className="cinematic-loading-bar">
            <div className="cinematic-loading-bar__fill" />
          </div>
        )}
      </div>
    </div>
  );
}
