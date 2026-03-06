# Análise: configuração do plano de fundo e aparência do site

Mapeamento de onde o fundo e a aparência são definidos e por que o Netlify pode parecer diferente do repositório.

---

## 1. Onde o plano de fundo é definido (7 camadas)

O fundo preto (`#000000`) é forçado em vários pontos para evitar branco/cinza no deploy:

| # | Arquivo | O que faz |
|---|---------|-----------|
| 1 | `frontend/public/index.html` | `<style>` inline com `!important` em html, body, #root, main, canvas |
| 2 | `frontend/public/index.html` | `<body style="background:#000000">` |
| 3 | `frontend/public/index.html` | `<div id="root" style="background:#000000">` |
| 4 | `frontend/src/index.css` | CSS com `!important` em html, body, #root, main, canvas (linhas ~76, 81, 88–96) |
| 5 | `frontend/src/App.js` | Inline `style={{ background: '#000000' }}` nos wrappers (58, 70, 72, 74) |
| 6 | `SolarSystemPhotorealistic.jsx` | Three.js: `scene.background`, `renderer.setClearColor`, `domElement.style` |
| 7 | `SolarSystemPhotorealistic.jsx` | Reforço a cada frame: `setClearColor` + `scene.background.setHex(0x000000)` |

---

## 2. Paleta de cores (design system)

Em `frontend/src/index.css` (variáveis CSS):

| Variável      | Cor        | Uso                          |
|---------------|------------|------------------------------|
| --background  | Deep Space #05070B | Fundo geral dos painéis UI |
| --foreground | Desert Storm #EDEDEA | Texto principal         |
| --primary    | Saffron #F3AE3E | Destaque (laranja solar)     |
| --secondary  | Gray #818181 | Textos secundários           |
| --card       | Dark Card  | Fundo dos cards/painéis      |
| --border     | Dark Border | Bordas                      |
| --muted      | Muted      | Áreas desativadas            |
| Canvas 3D    | #000000    | Fundo do espaço 3D           |

---

## 3. Renderer 3D (Three.js)

Em `SolarSystemPhotorealistic.jsx`:

- **Tone mapping:** `THREE.ACESFilmicToneMapping`
- **Exposure:** `0.92`
- **Color space:** `THREE.SRGBColorSpace`
- **Shadow map:** PCFSoftShadowMap
- **Antialiasing:** true
- **Pixel ratio:** `min(devicePixelRatio, 2)`
- **Bloom:** `UnrealBloomPass(resolution, 0.15, 0.25, 0.96)` → strength **0.25**, radius **0.96**. O threshold pode ser definido em `bloomPass.threshold` (ex.: 0.92 para só o Sol brilhar).

---

## 4. Texturas e fundo estelar

- **Via Láctea:** ordem de carregamento em `SolarSystemPhotorealistic.jsx`: 1) `${API}/api/textures/2k_stars_milky_way.jpg`, 2) `/textures/2k_stars_milky_way.jpg` (public), 3) Solar System Scope (pode falhar por CORS no Netlify).
- **Planetas:** texturas do Solar System Scope (e NASA quando aplicável); fallback em `public/textures/` para evitar CORS no Netlify.
- **CORS:** se as texturas não carregam, os planetas usam cores sólidas de fallback.

---

## 5. Fontes

- **Corpo:** Space Grotesk (Google Fonts em `index.css`)
- **Títulos:** Exo 2 (Google Fonts em `index.css`)
- **Badge Emergent:** Inter (em `index.html`)

---

## 6. Framework CSS

- Tailwind CSS 3.x, `darkMode: "class"`
- `tailwind.config.js`, PostCSS, Autoprefixer
- Plugin: tailwindcss-animate

---

## 7. Por que o site pode estar diferente no Netlify

| Causa | Solução |
|-------|---------|
| **A) Cache Netlify/CDN** | Deploys → Trigger deploy → **Clear cache and deploy**. No navegador: Ctrl+Shift+R. |
| **B) Branch errada** | Netlify → Site settings → Build & deploy → conferir branch de produção (ex.: main). |
| **C) Build falhando** | Ver logs em Deploys. Build: `cd frontend && npm install --legacy-peer-deps && npm run build`. |
| **D) Scripts Emergent** | `index.html` carrega emergent-main.js, etc.; podem alterar estilos em iframe. |
| **E) Texturas (CORS)** | Colocar texturas em `frontend/public/textures/` ou rodar `.\copy-textures-from-backend.ps1`. |
| **F) Variáveis de ambiente** | Netlify → Environment variables: `REACT_APP_BACKEND_URL`, `REACT_APP_START_VIEW` se usadas. |

---

## Resumo: arquivos chave

| O que mudar              | Arquivo |
|--------------------------|---------|
| Paleta / tema            | `frontend/src/index.css` |
| Fundo preto do canvas 3D | `index.css` + `SolarSystemPhotorealistic.jsx` |
| Brilho/exposição         | `SolarSystemPhotorealistic.jsx` (toneMappingExposure) |
| Bloom do Sol            | `SolarSystemPhotorealistic.jsx` (UnrealBloomPass) |
| Fontes                  | `frontend/src/index.css` (imports Google Fonts) |
| Tema Tailwind            | `frontend/tailwind.config.js` |
| Build e deploy           | `netlify.toml` (raiz do repo) |
| HTML base                | `frontend/public/index.html` |
