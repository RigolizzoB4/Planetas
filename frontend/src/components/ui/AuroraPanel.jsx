import React from 'react';
import { useSolarSystemStore } from '../../store/solarSystemStore';

const AuroraPanel = () => {
  const setAuroraPanelOpen = useSolarSystemStore((s) => s.setAuroraPanelOpen);

  return (
    <div
      data-testid="aurora-panel"
      style={{
        position: 'fixed',
        top: '120px',
        left: '40px',
        width: '420px',
        padding: '24px 26px',
        background: 'rgba(3, 5, 8, 0.88)',
        border: '1px solid rgba(243, 174, 62, 0.35)',
        borderRadius: '14px',
        color: '#EDEDED',
        fontFamily: '"Inter", sans-serif',
        fontSize: '15px',
        zIndex: 9000,
        boxShadow: '0 0 20px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(12px)'
      }}
    >
      <div style={{
        fontSize: '20px',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#F3AE3E',
        marginBottom: '8px'
      }}>
        Aurora 7
      </div>

      <div style={{
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#A0A6B8',
        marginBottom: '18px'
      }}>
        TRANSMISSÃO: INICIADA <span className="aurora-pulse" style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          marginLeft: '8px',
          background: '#F3AE3E',
          borderRadius: '50%'
        }} />
      </div>

      <div style={{ lineHeight: '1.6' }}>
        Bem-vindo ao Programa Aurora. Uma iniciativa interplanetária dedicada à representação simbólica da nova arquitetura empresarial. Cada satélite representa um módulo tecnológico essencial que orbita o núcleo ERD-FX — um sistema vivo, integrado e inteligente.
      </div>

      <div style={{ marginTop: '12px', lineHeight: '1.6', color: '#C5C5C5' }}>
        Inicie sua exploração livremente após a leitura. Clique em qualquer planeta, satélite ou módulo para acessar seus dados e editar seu conteúdo.
      </div>

      <button
        data-testid="aurora-panel-close-button"
        onClick={() => setAuroraPanelOpen(false)}
        style={{
          marginTop: '22px',
          width: '100%',
          padding: '10px 0',
          background: '#F3AE3E',
          border: 'none',
          borderRadius: '6px',
          color: '#111',
          fontWeight: 600,
          letterSpacing: '0.08em',
          cursor: 'pointer'
        }}
      >
        CERRAR
      </button>
    </div>
  );
};

export default AuroraPanel;