import React, { useEffect, useState } from 'react';
import SolarSystemPhotorealistic from './components/three/SolarSystemPhotorealistic';
import Header from './components/ui/Header';
import Sidebar from './components/ui/Sidebar';
import ControlsPanel from './components/ui/ControlsPanel';
import InfoPopup from './components/ui/InfoPopup';
import AuroraPanel from './components/ui/AuroraPanel';
import CinematicIntro from './components/ui/CinematicIntro';
import { Toaster } from './components/ui/sonner';
import { useSolarSystemStore } from './store/solarSystemStore';

function App() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { fetchObjects, fetchScene, isLoading, error, sidebarOpen, useOfflineFallback, auroraPanelOpen, introComplete } = useSolarSystemStore();

  useEffect(() => {
    fetchObjects();
    fetchScene();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  if (error) {
    return (
      <div className="w-screen h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 glass-panel rounded-xl">
          <h2 className="text-xl font-display font-semibold text-destructive mb-2">
            Erro ao carregar
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-background" style={{ background: '#000000' }}>
      {/* Cinematic intro overlay — 3D loads behind it */}
      {!introComplete && <CinematicIntro />}

      {/* Header (hidden during intro) */}
      {introComplete && <Header isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} />}

      {/* Offline fallback warning */}
      {introComplete && useOfflineFallback && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-lg text-sm shadow-lg" style={{ background: 'rgba(243, 174, 62, 0.15)', color: '#F3AE3E', border: '1px solid rgba(243, 174, 62, 0.4)' }}>
          <span>Backend indisponível — exibindo dados padrão.</span>
          <button onClick={() => fetchObjects()} className="px-2 py-1 rounded bg-primary/20 hover:bg-primary/30 transition-colors" style={{ color: '#F3AE3E' }}>Tentar novamente</button>
        </div>
      )}
      
      {/* 3D scene — always mounted so it loads behind the intro */}
      <main className={`absolute inset-0 transition-all duration-300 ${introComplete ? (sidebarOpen ? 'pt-14 pl-72' : 'pt-14 pl-0') : 'pt-0 pl-0'}`} style={{ background: '#000000' }}>
        <div className="w-full h-full" style={{ background: '#000000' }}>
          {!isLoading && <SolarSystemPhotorealistic />}
        </div>
      </main>
      
      {/* UI controls (hidden during intro) */}
      {introComplete && <Sidebar />}
      {introComplete && <ControlsPanel />}
      {introComplete && <InfoPopup />}
      {introComplete && auroraPanelOpen && <AuroraPanel />}

      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'glass-panel border-border/50',
        }}
      />
      
      {/* Attribution Footer */}
      {introComplete && (
        <footer className="fixed bottom-0 left-0 right-0 py-2 text-center text-xs pointer-events-none z-10" style={{ color: '#81818180' }}>
          <span className="px-4 py-1 rounded-full backdrop-blur-sm" style={{ background: '#05070B80' }}>
            <a
              href={process.env.REACT_APP_VIEW_ONLINE_URL || (typeof window !== 'undefined' ? window.location.origin : '#')}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline pointer-events-auto"
              style={{ color: '#F3AE3E90' }}
              title="Abrir a aplicação em produção (imagem online real)"
            >
              Ver imagem online real
            </a>
            {' '}&middot; Texturas:{' '}
            <a
              href="https://www.solarsystemscope.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline pointer-events-auto"
              style={{ color: '#F3AE3E90' }}
            >
              Solar System Scope
            </a>
            {' '}&middot;{' '}
            <a
              href="https://nasa3d.arc.nasa.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline pointer-events-auto"
              style={{ color: '#F3AE3E90' }}
            >
              NASA 3D Resources
            </a>
            {' '}&middot; Powered by B4 Group
          </span>
        </footer>
      )}
    </div>
  );
}

export default App;
