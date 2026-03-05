# Configuração Netlify e código de fundo/cores – referência para análise

Este documento reúne a configuração do Netlify e todo o código pertinente a **fundo escuro** e **cores dos planetas**, para avaliar em outra IA por que no deploy (Netlify) o fundo pode aparecer branco e as cores apagadas, enquanto localmente pode funcionar.

---

## 1. O que o Netlify aceita / como está configurado

Arquivo **`netlify.toml`** na raiz do repositório:

```toml
[build]
  command = "cd frontend && npm install --legacy-peer-deps && npm run build"
  publish = "frontend/build"
```

- **Build:** entra na pasta `frontend`, instala dependências com `--legacy-peer-deps` (resolve conflitos de peer deps, ex. ajv), e roda `npm run build` (React/CRA/CRACO).
- **Publish:** a pasta publicada é **`frontend/build`** (saída do `npm run build`). O Netlify serve os arquivos estáticos dessa pasta; não há servidor Node no runtime.
- **Variáveis de ambiente:** o Netlify não define `REACT_APP_*` por padrão; se a app usar `REACT_APP_BACKEND_URL`, precisa ser configurada no painel do Netlify (Site settings → Environment variables).
- **Cache:** o Netlify pode cachear builds e CDN; um “fundo branco” pode ser cache antigo até dar um novo deploy ou clear cache.

Resumo: o Netlify só executa esse comando e publica `frontend/build`. Não altera HTML/CSS/JS; o que está no build é o que foi gerado pelo `npm run build`.

---

## 2. HTML – fundo no carregamento

Arquivo **`frontend/public/index.html`** (trechos relevantes):

```html
<!doctype html>
<html lang="en">
<head>
  <meta name="theme-color" content="#000000" />
  <!-- ... -->
  <script src="https://assets.emergent.sh/scripts/emergent-main.js"></script>
  <!-- Em iframe: carrega Tailwind CDN com preflight: false -->
</head>
<body style="background:#05070B; margin:0; min-height:100vh;">
  <div id="root" style="background:#05070B; min-height:100vh;"></div>
  <!-- ... -->
</body>
</html>
```

- `body` e `#root` têm **inline** `background:#05070B` para o fundo escuro aparecer antes do React e mesmo se CSS falhar.
- O script **emergent-main.js** (externo) roda em todas as páginas; em iframe também carrega Tailwind CDN. Qualquer overlay ou estilo injetado por esses scripts pode cobrir a cena ou mudar o fundo.

---

## 3. CSS global – fundo e paleta

Arquivo **`frontend/src/index.css`** (trechos relevantes):

```css
@layer base {
  :root {
    /* Deep Space: #05070B → 220 38% 3% */
    --background: 220 38% 3%;
    --foreground: 60 8% 92%;
    /* ... */
  }

  html {
    scroll-behavior: smooth;
    background-color: #05070B;
  }

  body {
    @apply bg-background text-foreground antialiased;
    background-color: #05070B !important;
    /* ... */
  }

  /* Garantir fundo escuro na área 3D (evita branco no Netlify/iframe) */
  #root,
  main,
  main > div,
  [data-testid="solar-system-canvas"],
  [data-testid="solar-system-canvas"] canvas {
    background-color: #05070B !important;
    background: #05070B !important;
  }
}
```

- **html** e **body** com fundo `#05070B`; body ainda com `!important`.
- Regra extra para **#root**, **main**, **main > div**, container da cena 3D e **canvas** com `!important` para forçar fundo escuro mesmo com scripts/iframe.

---

## 4. App.js – estrutura e fundo da UI

Arquivo **`frontend/src/App.js`** (trechos relevantes):

```jsx
return (
  <div className="w-screen h-screen overflow-hidden bg-background" style={{ background: '#05070B' }}>
    <Header />
    {useOfflineFallback && (
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 ...">
        <span>Backend indisponível — exibindo dados padrão.</span>
        <button onClick={() => fetchObjects()}>Tentar novamente</button>
      </div>
    )}
    <main className={`absolute inset-0 pt-14 ...`} style={{ background: '#05070B' }}>
      <div className="w-full h-full" style={{ background: '#05070B' }}>
        {isLoading ? (
          <div className="w-full h-full ..." style={{ background: '#05070B' }}>
            <!-- loading spinner -->
          </div>
        ) : (
          <SolarSystemPhotorealistic />
        )}
      </div>
    </main>
    <Sidebar />
    <ControlsPanel />
    <!-- ... -->
  </div>
);
```

- Raiz, **main** e a div que envolve a cena 3D têm **inline** `background: '#05070B'` para não depender só de classes.
- Quando **backend indisponível**, apenas o banner laranja é exibido; a área atrás continua com o mesmo layout e fundo escuro.

---

## 5. Three.js – cena, renderer, canvas e luz (cores)

Arquivo **`frontend/src/components/three/SolarSystemPhotorealistic.jsx`**.

**5.1 Scene e background:**

```javascript
const scene = new THREE.Scene();
scene.background = new THREE.Color('#05070B');
```

**5.2 Renderer e clear color:**

```javascript
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  logarithmicDepthBuffer: true,
  stencil: false
});
renderer.setSize(w, h);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x05070B, 1);   // cor de clear do buffer (alpha 1 = opaco)
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.touchAction = 'none';
renderer.domElement.style.pointerEvents = 'auto';
renderer.domElement.style.backgroundColor = '#05070B';   // fallback CSS do canvas
container.appendChild(renderer.domElement);
```

**5.3 Iluminação (influência nas cores dos planetas):**

```javascript
const sunLight = new THREE.PointLight(0xFFF8E8, 18000, 0, 2);  // intensidade 18000, decay 2
scene.add(sunLight);
const hemilight = new THREE.HemisphereLight(0x4488cc, 0x0a0e14, 0.15);
scene.add(hemilight);
```

**5.4 Materiais dos planetas (cores sólidas + texturas):**

```javascript
const mat = new THREE.MeshStandardMaterial({
  color: cfg.color,  // ex.: Earth 0x6b93d6, Mars 0xc1440e, etc.
  roughness: cfg.rough,
  metalness: cfg.metal,
  envMapIntensity: 0.3
});

const ensureColor = () => { mat.color.setHex(cfg.color); mat.needsUpdate = true; };

if (TEX[name]) {
  const applyTex = (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    mat.map = tex;
    mat.color.setHex(cfg.color);
    // normalMap, roughnessMap gerados a partir da textura...
    mat.needsUpdate = true;
  };
  const primaryUrl = TEX_NASA[name] || TEX[name];  // NASA ou Solar System Scope
  loader.load(primaryUrl, applyTex, undefined, () => {
    ensureColor();  // se falhar, garante cor sólida
    tryFallbackSSS();
  });
}
```

- **cfg.color** vem de `PLANETS` (ex.: Mercury 0x8c7853, Venus 0xffc649, Earth 0x6b93d6, Mars 0xc1440e, Jupiter 0xd8ca9d, etc.).
- Se as texturas (NASA/SSS) falharem ao carregar (CORS, rede, domínio no Netlify), o callback de erro chama **ensureColor()** para manter a cor sólida do planeta.
- **TEX_NASA** e **TEX** são URLs externas (GitHub NASA, Solar System Scope); no Netlify podem estar sujeitas a CORS ou bloqueio, daí a importância do fallback de cor.

---

## 6. Container da cena 3D (div do React)

No **return** do mesmo componente:

```jsx
return (
  <div
    ref={containerRef}
    data-testid="solar-system-canvas"
    style={{
      width: '100%',
      height: '100%',
      background: '#05070B',
      position: 'relative',
      pointerEvents: 'auto',
      isolation: 'isolate'
    }}
  />
);
```

- O **canvas** do Three é inserido via `container.appendChild(renderer.domElement)` dentro desse div.
- O div tem **data-testid="solar-system-canvas"**, alvo da regra CSS com `!important` para fundo `#05070B`.

---

## 7. Resumo para outra IA

- **Netlify:** build = `cd frontend && npm install --legacy-peer-deps && npm run build`, publish = `frontend/build`. Não modifica o código; só executa o build e serve os estáticos.
- **Fundo escuro** está definido em: (1) `index.html` em body e #root, (2) `index.css` em html, body e em #root, main, container da cena e canvas com `!important`, (3) `App.js` com inline em raiz, main e div da cena, (4) Three.js com `scene.background`, `renderer.setClearColor(0x05070B, 1)` e `renderer.domElement.style.backgroundColor`, (5) div do componente com `background: '#05070B'`.
- **Cores dos planetas:** materiais com `cfg.color`; se a textura falhar, `ensureColor()` mantém a cor sólida; luz do sol com intensidade 18000; tone mapping ACES com exposure 1.05 e outputColorSpace sRGB.
- **Possíveis causas do fundo branco no Netlify:** cache (build ou CDN), script externo (ex.: emergent-main.js) injetando overlay ou estilo, ou ordem/carregamento de CSS em produção. **Cores apagadas:** texturas não carregando (CORS/domínio) e fallback de cor ou iluminação insuficiente em algum dispositivo/navegador.

Use este documento como contexto completo para outra IA analisar o comportamento no Netlify versus local.
