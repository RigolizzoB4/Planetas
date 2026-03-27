import React, { useState, useEffect, useRef } from 'react';
import { useSolarSystemStore } from '../../store/solarSystemStore';

/**
 * Componente de Transição de Vídeo Híbrido (IA de Vídeo + 3D Interativo)
 * 
 * Este componente gerencia a reprodução do vídeo ultra-realista da IA (Runway/Sora)
 * e faz a transição suave para o motor 3D interativo quando o vídeo termina.
 */
export default function VideoIntroTransition({ videoUrl, onTransitionComplete }) {
  const [videoEnded, setVideoEnded] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const videoRef = useRef(null);
  const { setSceneReady } = useSolarSystemStore();

  useEffect(() => {
    // Inicia o vídeo assim que o componente monta
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.warn("Autoplay bloqueado pelo navegador. Aguardando interação do usuário.", err);
      });
    }
  }, []);

  const handleVideoEnd = () => {
    setFadeOut(true);
    // Pequeno delay para o fade-out ser suave antes de remover o vídeo
    setTimeout(() => {
      setVideoEnded(true);
      setSceneReady(true); // Ativa o motor 3D interativo
      if (onTransitionComplete) onTransitionComplete();
    }, 800); 
  };

  if (videoEnded) return null;

  return (
    <div className={`video-intro-container ${fadeOut ? 'fade-out' : ''}`} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999,
      backgroundColor: '#000',
      transition: 'opacity 0.8s ease-in-out'
    }}>
      <video
        ref={videoRef}
        src={videoUrl}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onEnded={handleVideoEnd}
        muted
        playsInline
      />
      
      {/* Overlay de carregamento sutil se o vídeo demorar a carregar */}
      <div className="video-loader-overlay" style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        color: '#fff',
        fontSize: '12px',
        opacity: 0.5
      }}>
        Sincronizando com a Nave Aurora...
      </div>
    </div>
  );
}
