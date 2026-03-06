# Texturas para o fundo (Via Láctea) e uso em deploy

**Substituir cada item:** Sim. Qualquer textura pode ser trocada colocando aqui um arquivo com o **nome exato** abaixo. O código tenta sempre **local primeiro** (`/textures/...`); aceita `.jpg` ou `.png` (fallback automático para `.png`).

| Item no site | Nome do arquivo nesta pasta |
|--------------|-----------------------------|
| Sol | `8k_sun.jpg` ou `8k_sun.png` |
| Mercúrio | `8k_mercury.jpg` / `.png` |
| Vênus | `8k_venus_surface.jpg` / `.png` |
| Terra | `8k_earth_daymap.jpg` / `.png` |
| Nuvens da Terra | `8k_earth_clouds.jpg` / `.png` |
| Marte | `8k_mars.jpg` / `.png` |
| Júpiter | `8k_jupiter.jpg` / `.png` |
| Saturno | `8k_saturn.jpg` / `.png` |
| Anel de Saturno | `8k_saturn_ring_alpha.png` |
| Urano | `8k_uranus.jpg` / `.png` |
| Netuno | `8k_neptune.jpg` / `.png` |
| Plutão | `2k_pluto.jpg` / `.png` |
| **Skybox (4 camadas)** | Ver seção abaixo. |

A Lua (satélite) usa cor no código atual; para textura da Lua, coloque `8k_moon.png` (uso futuro). O modelo **Atlas 7 (Aurora 7)** fica em `public/models/aurora7.glb` (GLB local tem prioridade sobre a URL NASA).

---

## Skybox — 4 camadas (fundo estático 360°)

O fundo usa **apenas** estas texturas em `frontend/public/textures/`:

| Camada | Arquivo | Descrição |
|--------|---------|-----------|
| **1** | **`starmap_8k.jpg`** | Mapa de estrelas 8K equirectangular (obrigatório). Resolução mínima **8192×4096**. sRGB, sem repetição. |
| **2** | **`nebula_overlay.png`** | Nebulosas muito sutis (opacidade ~18%). Opcional. |
| **3** | *(partículas no código)* | Star particles pequenas (parallax). |
| **4** | **`milky_way_band.png`** | Leve brilho da Via Láctea (opacidade ~12%). Opcional. |

- **Esfera:** `SphereGeometry(5000, 64, 64)` — 360°, sem repetição de textura (`ClampToEdgeWrapping`).
- **Iluminação:** skybox não recebe luz (MeshBasicMaterial).
- Se `starmap_8k.jpg` não existir, o código tenta `starmap_8k.png` → `galaxy_hd_bg.jpg` → **estrelas procedurais** (canvas), então o fundo não fica totalmente preto.
- **Como obter um mapa 8K de verdade:** veja **`COMO_OBTER_STARMAP_8K.md`** nesta pasta (links NASA, Paul Bourke, etc.).

**Importante para Netlify:** No deploy (ex.: borealb4.netlify.app), o Solar System Scope **bloqueia** o carregamento de texturas por CORS. Por isso o fundo pode ficar preto sem Via Láctea e os planetas aparecem com **cores sólidas** (fallback) em vez de texturas. Com `fundo_via_lactea.png` ou `2k_stars_milky_way.jpg` nesta pasta, o fundo funciona. O logo do Sol usa `public/logo-b4-branco.png` quando o backend não está disponível.

Para o **fundo com Via Láctea** aparecer no site em produção (Netlify, Vercel, etc.), coloque aqui a textura. Assim ela é servida pelo mesmo domínio e não depende de CORS de sites externos.

## Via Láctea / fundo estelar

1. Baixe a textura **2K Stars Milky Way** do Solar System Scope (uso permitido com atribuição):
   - **URL direta:** https://www.solarsystemscope.com/textures/download/2k_stars_milky_way.jpg
2. Salve o arquivo neste pasta com o nome: **`2k_stars_milky_way.jpg`**
3. Caminho final: `frontend/public/textures/2k_stars_milky_way.jpg`

Se este arquivo existir, o site usará ele (incluindo no Netlify). Se não existir, o código tenta carregar do Solar System Scope; em alguns hosts isso pode falhar por CORS e o fundo fica só escuro.

Atribuição: Texturas cortesia de [Solar System Scope](https://www.solarsystemscope.com) - CC BY 4.0

---

## Texturas NASA (Terra, Júpiter, Saturno) e Parker Solar Probe

O projeto usa **texturas e modelos 3D da NASA** quando disponíveis (estilo [NASA Eyes](https://science.nasa.gov/eyes/)):

- **Terra, Júpiter, Saturno:** texturas do repositório [NASA 3D Resources](https://github.com/nasa/NASA-3D-Resources) (Images and Textures). Carregadas via GitHub raw; fallback para Solar System Scope.
- **Parker Solar Probe:** modelo 3D (GLB) oficial da NASA, do mesmo repositório. A sonda aparece em órbita próxima ao Sol na cena.

Uso conforme [NASA Media Usage Guidelines](https://www.nasa.gov/multimedia/guidelines/index.html).
