# Arquitetura do projeto Planetas

Visão geral da estrutura de pastas e dos principais arquivos do **Sistema Solar 3D** (frontend React + Three.js, backend opcional, deploy Produção).

---

## Raiz do repositório (`Planetas/`)

```
Planetas/
├── .emergent/
│   └── emergent.yml              # Configuração do plugin Emergent
├── .gitignore
├── README.md
├── package.json                 # Scripts/workspace raiz (se houver)
├── Produção.toml                 # Build e publish do Produção
├── deploy.ps1                   # Script de deploy
├── copy-textures-from-backend.ps1
├── backend/                     # API opcional (Python)
├── frontend/                    # Aplicação React (Sistema Solar 3D)
├── tests/                       # Testes (ex.: pytest)
├── test_reports/
├── docs/                        # Documentação do repositório
│   └── ARQUITETURA_PROJETO.md   # Este arquivo
├── AVALIACAO_PROJETO.md
├── TEST_PLAN.md
└── test_result.md
```

---

## Backend (`backend/`)

API em Python (opcional; no Produção não roda — o frontend usa texturas em `public/`).

| Caminho | Descrição |
|--------|-----------|
| `server.py` | Servidor API (texturas, cena, etc.) |
| `requirements.txt` | Dependências Python |
| `.env.example` | Exemplo de variáveis de ambiente |
| `tests/test_solar_system_api.py` | Testes da API |
| `textures/` | Texturas servidas em `/api/textures/` (2k_*.jpg, logo_b4.png, etc.) |

**Nomes de textura no backend:** `2k_sun.jpg`, `2k_earth_daymap.jpg`, `2k_earth_clouds.jpg`, `2k_mercury.jpg`, `2k_venus_surface.jpg`, `2k_mars.jpg`, `2k_jupiter.jpg`, `2k_saturn.jpg`, `2k_saturn_ring_alpha.png`, `2k_uranus.jpg`, `2k_neptune.jpg`, `logo_b4.png`.

---

## Frontend (`frontend/`)

### Estrutura principal

```
frontend/
├── public/                      # Assets estáticos (servidos em /)
│   ├── index.html
│   ├── logo-b4-branco.png
│   ├── LOGO_README.txt
│   ├── fonts/
│   │   └── helvetiker_bold.typeface.json
│   ├── models/
│   │   ├── aurora7.glb          # Atlas 7 (Aurora 7)
│   │   └── jason2.glb
│   └── textures/               # Texturas do skybox e planetas (ver tabela abaixo)
├── src/
│   ├── index.js
│   ├── index.css
│   ├── App.js
│   ├── App.css
│   ├── config/
│   │   └── solarSystemConfig.js
│   ├── store/
│   │   └── solarSystemStore.js
│   ├── lib/
│   │   └── utils.js
│   ├── hooks/
│   │   └── use-toast.js
│   ├── utils/
│   │   └── textureManager.js
│   └── components/
│       ├── three/              # Cena 3D
│       │   ├── SolarSystem.jsx
│       │   └── SolarSystemPhotorealistic.jsx
│       └── ui/                 # Interface (Header, Sidebar, painéis, etc.)
├── docs/                        # Documentação do frontend
├── scripts/                     # Scripts auxiliares (ex.: download texturas)
├── package.json
├── craco.config.js
├── tailwind.config.js
├── postcss.config.js
├── jsconfig.json
├── components.json
├── .env / .env.example
├── README.md
├── EMERGENT_ALIGNMENT.md
└── Produção_IGUAL_EMERGENT.md
```

---

### Nomes de arquivos – `frontend/public/textures/`

| Nome do arquivo | Uso |
|-----------------|-----|
| **Skybox (4 camadas)** | |
| `starmap_8k.jpg` ou `starmap_8k.png` | Camada 1: mapa estelar 8K equirectangular |
| `nebula_overlay.png` | Camada 2: nebulosas sutis |
| `milky_way_band.png` | Camada 4: faixa Via Láctea leve |
| **Fallback / antigos** | |
| `galaxy_hd_bg.jpg` | Fallback da camada 1 se starmap não existir |
| `fundo_espaco_suave.png` | Fundo alternativo (reuso em cópias) |
| `fundo_via_lactea.png` | Via Láctea (reuso em cópias) |
| `2k_stars_milky_way.jpg` / `.png` | Estrelas/Via Láctea (reuso) |
| `HDR_multi_nebulae_2.hdr` | HDR (opcional; não usado no fluxo atual do skybox) |
| **Planetas e Sol** | |
| `8k_sun.jpg` / `8k_sun.png` | Sol |
| `8k_mercury.jpg` / `.png` | Mercúrio |
| `8k_venus_surface.jpg` / `.png` | Vênus |
| `8k_earth_daymap.jpg` / `.png` | Terra |
| `8k_earth_clouds.jpg` / `.png` | Nuvens da Terra |
| `8k_mars.jpg` / `.png` | Marte |
| `8k_jupiter.jpg` / `.png` | Júpiter |
| `8k_saturn.jpg` / `.png` | Saturno |
| `8k_saturn_ring_alpha.png` | Anel de Saturno |
| `8k_uranus.jpg` / `.png` | Urano |
| `8k_neptune.jpg` / `.png` | Netuno |
| `2k_pluto.jpg` / `.png` | Plutão |
| `8k_moon.jpg` / `.png` | Lua (uso futuro) |
| **Documentação e scripts** | |
| `README.md` | Instruções das texturas e skybox |
| `COMO_OBTER_STARMAP_8K.md` | Como obter mapa 8K (NASA, Paul Bourke, script) |
| `COMO_BAIXAR_TEXTURAS.html` | Página para baixar texturas (links) |
| `download-starmap-8k.ps1` | Script para baixar starmap 8K (Paul Bourke) |

---

### Nomes de arquivos – `frontend/src/`

| Pasta / arquivo | Descrição |
|-----------------|-----------|
| **config/** | |
| `solarSystemConfig.js` | URLs de texturas (SSS/NASA), presets de qualidade, dados físicos dos planetas |
| **store/** | |
| `solarSystemStore.js` | Estado global (objetos, painel Aurora, sidebar, velocidade, etc.) |
| **components/three/** | |
| `SolarSystemPhotorealistic.jsx` | Cena principal: skybox 4 camadas, Sol, planetas, satélites, Parker, Aurora 7, controles, intro |
| `SolarSystem.jsx` | Versão alternativa/simples da cena 3D |
| **components/ui/** | |
| `Header.jsx` | Cabeçalho do site (logo, etc.) |
| `Sidebar.jsx` | Barra lateral com lista de objetos |
| `AuroraPanel.jsx` | Painel “Aurora 7” (abre após intro) |
| `InfoPopup.jsx` | Popup de informação ao clicar em corpo celeste |
| `ControlsPanel.jsx` | Controles de visualização/velocidade |
| `button.jsx`, `card.jsx`, `dialog.jsx`, etc. | Componentes UI reutilizáveis (shadcn/ui style) |
| **lib/** | |
| `utils.js` | Utilitários (ex.: `cn` para classes CSS) |
| **hooks/** | |
| `use-toast.js` | Hook para toasts |
| **utils/** | |
| `textureManager.js` | Utilitários de textura (se usado) |

---

### Nomes de arquivos – `frontend/docs/`

| Arquivo | Descrição |
|---------|-----------|
| `NASA_3D_MODELOS_LINKS.md` | Links para modelos 3D NASA (Parker, Aurora 7, etc.) |
| `BRIEF_CLAUDE_FUNDO_AURORA_JASON_LUAS_SOL.md` | Brief de fundo, Aurora, Jason, luas, Sol |
| `FUNDO_E_APARENCIA_SITE.md` | Fundo e aparência do site |
| `Produção_E_CORES_REFERENCIA.md` | Produção e cores de referência |

---

### Nomes de arquivos – `frontend/scripts/`

| Arquivo | Descrição |
|---------|-----------|
| `download-milky-way.ps1` | Baixa textura Via Láctea (Solar System Scope) para `public/textures/` |

---

## Build e deploy

| Caminho | Descrição |
|--------|-----------|
| `frontend/build/` | Saída do `npm run build` / `yarn build` (não versionado; gerado no CI) |
| `Produção.toml` | Comando de build e pasta de publish para o Produção |
| `frontend/.env` | Variáveis (ex.: `REACT_APP_BACKEND_URL`); não versionar segredos |

---

## Convenções de nomes

- **Texturas:** `8k_*` ou `2k_*` + nome do corpo (ex.: `8k_earth_daymap.jpg`). Skybox: `starmap_8k.*`, `nebula_overlay.png`, `milky_way_band.png`.
- **Modelos 3D:** `aurora7.glb`, `jason2.glb` em `public/models/`.
- **Componentes React:** PascalCase (ex.: `SolarSystemPhotorealistic.jsx`, `AuroraPanel.jsx`).
- **Componentes UI genéricos:** minúsculo com hífen em nomes de arquivo (ex.: `button.jsx`, `alert-dialog.jsx`).
- **Config e store:** camelCase (ex.: `solarSystemConfig.js`, `solarSystemStore.js`).
- **Documentação:** UPPERCASE ou Title Case, `.md` (ex.: `README.md`, `COMO_OBTER_STARMAP_8K.md`).
- **Scripts:** minúsculo, hífen quando fizer sentido, `.ps1` para PowerShell (ex.: `download-starmap-8k.ps1`).

---

## Fluxo de carregamento do fundo (skybox)

1. Tenta **starmap_8k.jpg** → depois **starmap_8k.png** → depois **galaxy_hd_bg.jpg** → por fim **estrelas procedurais** (canvas).
2. Em paralelo: **nebula_overlay.png** (camada 2) e **milky_way_band.png** (camada 4); se não existirem, as camadas ficam vazias.
3. Camada 3 é sempre **partículas (points)** geradas no código.

Todos os arquivos de textura são servidos a partir de **frontend/public/** no build; no Produção não há backend, então tudo vem de `public/`.
