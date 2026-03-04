import React from 'react';
import { Maximize2, Minimize2, Download, Menu, ExternalLink } from 'lucide-react';
import { Button } from './button';
import { useSolarSystemStore } from '../../store/solarSystemStore';

const API = process.env.REACT_APP_BACKEND_URL;
const VIEW_ONLINE_URL = process.env.REACT_APP_VIEW_ONLINE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

export default function Header({ isFullscreen, toggleFullscreen }) {
  const { toggleSidebar } = useSolarSystemStore();

  const handleExport = async () => {
    try {
      const response = await fetch(`${API}/api/scene`);
      const sceneData = await response.json();
      const objectsResponse = await fetch(`${API}/api/objects`);
      const objectsData = await objectsResponse.json();
      const exportData = { scene: sceneData, objects: objectsData, exportedAt: new Date().toISOString(), version: '1.0.0' };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'b4_solar_system_export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <header
      data-testid="app-header"
      className="fixed top-0 left-0 right-0 z-50 h-14 glass-panel border-b border-border/30"
    >
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: hamburger + logo + title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="control-btn"
            data-testid="sidebar-toggle"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3">
            <img
              src={`${API}/api/textures/logo_b4.png`}
              alt="Grupo B4"
              className="h-10 w-auto"
              data-testid="header-logo"
            />
            <div className="hidden sm:block leading-tight">
              <h1
                className="text-sm font-display font-semibold tracking-wide"
                data-testid="header-title"
                style={{ color: '#FFFFFF' }}
              >
                Representação STACK SATÉLITES DE TECNOLOGIA — Sistema Solar B4-ERD-FX
              </h1>
            </div>
          </div>
        </div>

        {/* Mobile title */}
        <div className="sm:hidden">
          <h1 className="text-xs font-display font-semibold" style={{ color: '#FFFFFF' }}>
            Representação STACK SATÉLITES — B4-ERD-FX
          </h1>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {VIEW_ONLINE_URL && (
            <a
              href={VIEW_ONLINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:opacity-90"
              style={{ color: '#F3AE3E', background: 'rgba(243, 174, 62, 0.12)' }}
              title="Ver online"
            >
              <ExternalLink className="w-4 h-4" />
              Ver online
            </a>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExport}
            className="control-btn"
            title="Exportar Cena"
            data-testid="export-btn"
          >
            <Download className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="control-btn"
            title={isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}
            data-testid="fullscreen-btn"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
