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
  const { sceneReady } = useSolarSystemStore();
  const stars = useMemo(() => generateStars(STAR_COUNT), []);

  if (sceneReady) return null;

  return (
    <div className="cin-overlay cin-overlay--opaque">
      <div className="cin-stars" aria-hidden="true">
        {stars.map(s => (
          <span key={s.id} className="cin-star" style={{
            left: s.left, top: s.top, width: s.size, height: s.size,
            animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s`,
          }} />
        ))}
      </div>
      <div className="cin-loader">
        <div className="cin-loader__sun" />
        <div className="cin-loader__ring" />
        <p className="cin-loader__text">Inicializando sistema solar...</p>
      </div>
    </div>
  );
}
