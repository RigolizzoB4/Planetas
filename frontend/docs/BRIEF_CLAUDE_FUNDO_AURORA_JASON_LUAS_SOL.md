# Brief para Claude 4.5 Sonnet – Fundo estrelado, Olho de Deus, Aurora 7, Jason-2, Luas e Sol com logo

Use este documento como referência única para implementar as melhorias no projeto **Planetas** (React + Three.js). O código principal está em **`frontend/src/components/three/SolarSystemPhotorealistic.jsx`** e em **`frontend/src/store/solarSystemStore.js`**.

---

## 1. OBJETIVOS (o que implementar)

| # | Objetivo | Descrição |
|---|----------|-----------|
| 1 | **Fundo preto estrelado funcionar** | Garantir que o céu seja preto com estrelas visíveis (Via Láctea + pontos procedurais). Hoje pode aparecer branco no Netlify; corrigir carregamento/fallback e garantir que a cena e o canvas usem fundo escuro com estrelas. |
| 2 | **Olho de Deus** | Adicionar um **preset de câmera "Olho de Deus"** que ainda não existe no script. Normalmente é vista de cima (eixo Y), centralizada no Sol, mostrando todo o sistema. Incluir no store (cameraPreset), no ControlsPanel (botão) e no useEffect de presets em SolarSystemPhotorealistic. |
| 3 | **Aurora 7 e Jason-2 funcionando** | **Aurora 7:** existe no store (sidebar) mas não tem mesh 3D. Adicionar "Aurora 7" como objeto 3D na cena (satélite/nave), com órbita e tracejado como os outros. **Jason-2:** reativar o estilo "Jason-2" (cilindro + antena + painéis) e criar um objeto nomeado "Jason-2" na cena, com órbita e tracejado. Alinhar lista 3D (array SATELLITES) ao store (incluir Aurora 7 e Jason-2). |
| 4 | **Satélites e Aurora como no original** | Órbitas tracejadas para todos os satélites (incluindo Aurora 7 e Jason-2); manter ou restaurar anel tracejado e pontilhado já existente para a órbita dos satélites. |
| 5 | **Luas visíveis, proporcionais e maiores** | Luas (satélites) devem ser visíveis, com tamanho **proporcional aos planetas** que representam (ou ao contexto orbital), mas **maiores do que estão hoje**. Aumentar escala dos modelos em `createSatellites` / `createSatelliteModel` (ex.: `SATELLITE_SCALE_FACTOR` ou escala base) para que apareçam claramente na cena. |
| 6 | **Sol com logo no meio como no projeto inicial** | O Sol já tem estrutura para logo B4 (sprite no centro) e texto ERD-FX. O logo só carrega se `REACT_APP_BACKEND_URL` existir; senão usa texture 1x1. Garantir que o **logo apareça sempre**: usar imagem em `public/` (ex.: `public/textures/logo_b4.png` ou `public/logo_b4.png`) como fallback quando a API não estiver disponível, para o Sol exibir o logo no centro como no projeto inicial. |

---

## 2. ARQUIVOS E TRECHOS RELEVANTES

### 2.1 Fundo estrelado (preto + estrelas)

**Arquivo:** `frontend/src/components/three/SolarSystemPhotorealistic.jsx`

- **Constantes (linhas ~223–225):**
  - `MILKY_WAY_LOCAL` = `/textures/2k_stars_milky_way.jpg` (ou com `window.location.origin`)
  - `MILKY_WAY_EXTERNAL` = URL Solar System Scope para Via Láctea
- **Função `createStars(scene, loader)` (linhas ~317–366):**
  - Cria esfera de fundo com `MeshBasicMaterial` (side: BackSide) para Via Láctea; carrega textura: primeiro local, depois externo.
  - Cria ~15000 pontos (Points) com cores espectrais para estrelas.
- **Chamada:** `createStars(scene, loader)` é chamada na montagem da cena (~linha 1066).
- **Cena e renderer:** `scene.background = new THREE.Color('#05070B')`, `renderer.setClearColor(0x05070B, 1)`, `renderer.domElement.style.backgroundColor = '#05070B'`.
- **CSS/HTML:** Em `frontend/src/index.css` e `frontend/public/index.html` o fundo também é forçado para `#05070B` para evitar branco.

**O que fazer:** Garantir que, mesmo quando a textura da Via Láctea falhar (ex.: CORS no Netlify), o fundo permaneça preto e as estrelas procedurais (Points) sempre visíveis; evitar qualquer camada ou clear que deixe o fundo branco.

---

### 2.2 Olho de Deus (novo preset)

**Arquivo:** `frontend/src/components/three/SolarSystemPhotorealistic.jsx`

- **Presets atuais (~linhas 1410–1415):**
  - `'Overview': { pos: [0, 50, 120], target: [0, 0, 0] }`
  - `'Sun Focus': { pos: [0, 15, 35], target: [0, 0, 0] }`
  - `'Earth Focus': { pos: [25, 10, 25], target: [18, 0, 0] }`
  - `'Satellite Ring': { pos: [18, 8, 18], target: [12, 0, 0] }`
  - `'Top View': { pos: [0, 150, 1], target: [0, 0, 0] }`

**O que fazer:** Adicionar `'Olho de Deus': { pos: [0, 180, 0.01], target: [0, 0, 0] }` (ou similar: câmera bem no alto, olhando para o centro). Garantir que o preset seja aplicado no mesmo `useEffect` que usa `presets[cameraPreset]`.

**Arquivo:** `frontend/src/store/solarSystemStore.js`  
- `cameraPreset: 'Overview'` e `setCameraPreset`. Nenhuma alteração obrigatória; o novo valor só precisa ser uma chave existente em `presets`.

**Arquivo:** `frontend/src/components/ui/ControlsPanel.jsx`  
- `cameraPresets = ['Overview', 'Sun Focus', 'Earth Focus', 'Satellite Ring', 'Top View']` e `presetIcons`.  
- **O que fazer:** Incluir `'Olho de Deus'` em `cameraPresets` e um ícone em `presetIcons` (ex.: `ScanEye` ou outro que indique vista de cima / “god view”).

---

### 2.3 Aurora 7 e Jason-2 na cena 3D

**Store (lista de objetos):** `frontend/src/store/solarSystemStore.js`  
- `satelliteModules` (linhas ~45–55) já inclui `{ name: 'Aurora 7', moduleName: 'Nave B4 ERD-FX' }`. **Não inclui Jason-2.**  
- **O que fazer:** Adicionar `{ name: 'Jason-2', moduleName: '...' }` em `satelliteModules` (e gerar `satellites` a partir disso) para a sidebar e dados consistentes.

**Cena 3D (meshes):** `frontend/src/components/three/SolarSystemPhotorealistic.jsx`

- **Array `SATELLITES` (linhas ~248–257):** hoje só tem Phobos, Deimos, Europa, Ganymede, Callisto, Titan, Enceladus, Moon. **Não tem Aurora 7 nem Jason-2.**
- **O que fazer:** Incluir entradas para `Aurora 7` e `Jason-2` no array `SATELLITES` (com `name`, `module`, `color`, `size`, etc.), para que `createSatellites` crie os meshes. Definir órbitas (ex.: mesmo anel dos outros ou raios ligeiramente diferentes) para que tenham órbita tracejada como os demais.

- **Estilo Jason-2:** `SATELLITE_STYLE = 'compact'` (linha ~614); o estilo "Jason-2-like" está no `else` de `createSatelliteModel` (linhas ~667–681): cilindro + cone (dish) + painéis.  
- **O que fazer:** Permitir que um satélite use o estilo Jason-2 (ex.: por nome `cfg.name === 'Jason-2'` ou por uma propriedade `style: 'jason2'` em `SATELLITES`). Em `createSatelliteModel(cfg)` ou na criação do mesh, usar o modelo cilindro+dish+painéis para Jason-2 e o modelo compact para os outros (incluindo Aurora 7).

---

### 2.4 Órbitas e tracejados

**Planetas:** Em `createPlanet` (linhas ~694–702) cada planeta recebe uma **linha sólida** (LineBasicMaterial, opacidade 0.2) para a órbita.

**Satélites:** Em `createSatellites` (linhas ~798–831):
- Linha **tracejada** (LineDashedMaterial) com `dashSize`, `gapSize`, cor `#F3AE3E`, opacidade 0.6.
- Pontos (Points) ao longo da órbita.

**O que fazer:** Manter esse desenho; ao adicionar Aurora 7 e Jason-2 ao array `SATELLITES`, eles passam automaticamente a usar a mesma órbita tracejada (e pontos) já desenhada em `createSatellites`, pois a órbita é uma única para todos (`satOrbit`). Se quiser órbitas separadas para Aurora 7 ou Jason-2, será preciso desenhar linhas tracejadas adicionais para esses raios.

---

### 2.5 Luas (satélites) visíveis, proporcionais e maiores

**Arquivo:** `frontend/src/components/three/SolarSystemPhotorealistic.jsx`

- **Constante:** `SATELLITE_SCALE_FACTOR = 1/3` (linha ~615).
- **Escala do modelo:** Em `createSatelliteModel`, `scale = (0.6 + cfg.size) * SATELLITE_SCALE_FACTOR` (linha ~684). Em `createSatellites`, quando usa `satelliteModel`, `baseScale = PLANETS.Mars.size * 0.15` e `sat.scale.setScalar(baseScale * SATELLITE_SCALE_FACTOR)`.

**O que fazer:** Aumentar a escala para as luas ficarem visíveis e “proporcionais” aos planetas, mas maiores que hoje. Opções:
- Aumentar `SATELLITE_SCALE_FACTOR` (ex.: de 1/3 para 0.5 ou 0.6), ou
- Usar escala base proporcional ao planeta “mãe” ou ao raio orbital (ex.: tamanho base por `cfg.size` e um fator global maior), ou
- Aumentar `baseScale` em `createSatellites` (ex.: `PLANETS.Mars.size * 0.25` ou 0.3).  
Objetivo: luas claramente visíveis na cena, sem exagero.

---

### 2.6 Sol com logo no meio (projeto inicial)

**Arquivo:** `frontend/src/components/three/SolarSystemPhotorealistic.jsx`

- **API:** `const API = process.env.REACT_APP_BACKEND_URL || '';` (linha ~195).
- **Logo (linhas ~409–421):**  
  - Se `API` existe: carrega `${API}/api/textures/logo_b4.png`.  
  - Senão: cria CanvasTexture 1x1 (invisível).  
- **Sprites:** `logoSprite` (logo B4) e `fxSprite` (texto "ERD-FX") são filhos do `coreGroup` do Sol; posições e escalas já definidas.

**O que fazer:** Garantir logo sempre visível:
- Colocar `logo_b4.png` em `frontend/public/textures/` ou `frontend/public/` (ex.: `public/logo_b4.png`).
- No carregamento do logo, usar como fallback a URL pública: `${window.location.origin}/textures/logo_b4.png` ou `/logo_b4.png` (conforme onde o arquivo estiver), quando `!API` ou quando o load da API falhar. Assim o Sol terá o logo no centro mesmo sem backend (ex.: Netlify).

---

## 3. ESTRUTURA DO PROJETO (referência rápida)

```
frontend/
  public/
    index.html
    textures/          <- colocar 2k_stars_milky_way.jpg e logo_b4.png se necessário
  src/
    components/
      three/
        SolarSystemPhotorealistic.jsx   <- cena 3D, estrelas, Sol, planetas, satélites, presets
      ui/
        ControlsPanel.jsx              <- botões de preset (incluir Olho de Deus)
    store/
      solarSystemStore.js              <- objects, cameraPreset, satelliteModules (Aurora 7, Jason-2)
    index.css
    App.js
```

---

## 4. CHECKLIST PARA A OUTRA IA

- [ ] Fundo preto estrelado: Via Láctea com fallback; estrelas procedurais sempre; nenhum fundo branco (cena, clear, CSS).
- [ ] Preset "Olho de Deus": novo preset em SolarSystemPhotorealistic (posição alta, target no centro); adicionar em ControlsPanel e, se necessário, no store.
- [ ] Aurora 7: entrada no array `SATELLITES`; mesh criado por `createSatellites`; órbita tracejada (mesmo anel ou anel dedicado).
- [ ] Jason-2: entrada no array `SATELLITES`; em `createSatelliteModel` usar estilo "Jason-2" (else com cilindro + dish + painéis); entrada em `satelliteModules` no store; órbita tracejada.
- [ ] Órbitas e tracejados: todos os satélites (incluindo Aurora 7 e Jason-2) com órbita tracejada (e pontilhado) como no original.
- [ ] Luas visíveis: aumentar escala dos satélites (SATELLITE_SCALE_FACTOR ou baseScale) para ficarem proporcionais e maiores que antes.
- [ ] Sol com logo: fallback de imagem em `public` quando não houver API, para logo B4 sempre visível no centro do Sol.

---

## 6. Modelos 3D – Atlas 7 (Aurora 7) e Starlink

**Atlas 7 (Aurora 7):** o projeto **já usa** o GLB da NASA para a nave Aurora 7 na cena. Constante: `ATLAS_7_AURORA_7_GLB`; função `createAtlasAurora7(solarGroup, loader, R)`; órbita raio 22. O modelo tem cor (GLB da NASA). Ver `frontend/docs/NASA_3D_MODELOS_LINKS.md`.

**Outro satélite com cor (NASA):** além do Parker e do Atlas 7, no mesmo repositório NASA há ISS, Hubble, Curiosity, etc. Links em `NASA_3D_MODELOS_LINKS.md`.

**Starlink (painéis que estendem/recolhem):** a NASA não tem Starlink. Opções:
- **FetchCFD:** [Starlink 3D Model](https://fetchcfd.com/view-project/2300-starlink-3d-model) — download .glb gratuito.
- **CGTrader:** [SpaceX Starlink Satellite](https://www.cgtrader.com/free-3d-models/space/other/spacex-starlink-satellite-5c01e411-db05-44e8-8bac-1fe6cc3388b5) — GLTF com **rig e animação de painéis solares** (estender/recolher). Baixar e colocar em `public/models/starlink.glb`; carregar com GLTFLoader; usar `AnimationMixer` e `gltf.animations` para animar os painéis.

Use este brief junto com o código em `SolarSystemPhotorealistic.jsx` e `solarSystemStore.js` para implementar as mudanças de forma consistente.

---

## 5. APÊNDICE – Trechos de código exatos

### 5.1 Constantes Via Láctea e API (SolarSystemPhotorealistic.jsx)

```javascript
const API = process.env.REACT_APP_BACKEND_URL || '';
// ...
const MILKY_WAY_EXTERNAL = `${SOLAR_SCOPE_8K}2k_stars_milky_way.jpg`;
const MILKY_WAY_LOCAL = `${typeof window !== 'undefined' ? window.location.origin : ''}/textures/2k_stars_milky_way.jpg`;
```

### 5.2 Array SATELLITES atual (adicionar Aurora 7 e Jason-2)

```javascript
const SATELLITES = [
  { name: 'Phobos',    module: 'Auth API',             color: 0x8B7355, size: 0.10, rough: 0.95, metal: 0.05, irregular: true },
  { name: 'Deimos',    module: 'Payment Gateway',      color: 0x7A6B5A, size: 0.07, rough: 0.95, metal: 0.05, irregular: true },
  { name: 'Europa',    module: 'Notification Service', color: 0xC4BCA0, size: 0.18, rough: 0.25, metal: 0.05, irregular: false },
  { name: 'Ganymede',  module: 'Search Engine',        color: 0x9A8B7A, size: 0.22, rough: 0.70, metal: 0.10, irregular: false },
  { name: 'Callisto',  module: 'Cache Layer',          color: 0x6B5E4F, size: 0.20, rough: 0.85, metal: 0.05, irregular: false },
  { name: 'Titan',     module: 'Message Queue',        color: 0xE0A848, size: 0.22, rough: 0.45, metal: 0.00, irregular: false },
  { name: 'Enceladus', module: 'Log Aggregator',       color: 0xDEDEDE, size: 0.10, rough: 0.15, metal: 0.10, irregular: false },
  { name: 'Moon',      module: 'Config Server',        color: 0xA0A0A0, size: 0.27, rough: 0.90, metal: 0.05, irregular: false }
  // ADICIONAR: { name: 'Aurora 7', module: 'Nave B4 ERD-FX', color: 0x..., size: 0.2, ... }
  // ADICIONAR: { name: 'Jason-2', module: '...', color: 0x..., size: 0.2, style: 'jason2' }  ou usar cfg.name === 'Jason-2'
];
```

### 5.3 Estilo Jason-2 em createSatelliteModel (já existe no else)

```javascript
} else {
  // Fallback estilo legado (Jason-2-like)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.1, 32), bodyMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);
  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.55, 32, 1, true), accentMat);
  dish.rotation.x = Math.PI / 2;
  dish.position.z = 0.8;
  group.add(dish);
  const panelGeo = new THREE.BoxGeometry(1.6, 0.05, 0.8);
  const pl = new THREE.Mesh(panelGeo, panelMat);
  pl.position.set(-1.25, 0, 0);
  const pr = new THREE.Mesh(panelGeo, panelMat);
  pr.position.set(1.25, 0, 0);
  group.add(pl, pr);
}
```

Use `cfg.name === 'Jason-2'` (ou `cfg.style === 'jason2'`) para escolher este branch em vez do `if (SATELLITE_STYLE === 'compact')`.

### 5.4 Presets de câmera (adicionar Olho de Deus)

```javascript
const presets = {
  'Overview': { pos: [0, 50, 120], target: [0, 0, 0] },
  'Sun Focus': { pos: [0, 15, 35], target: [0, 0, 0] },
  'Earth Focus': { pos: [25, 10, 25], target: [18, 0, 0] },
  'Satellite Ring': { pos: [18, 8, 18], target: [12, 0, 0] },
  'Top View': { pos: [0, 150, 1], target: [0, 0, 0] },
  'Olho de Deus': { pos: [0, 180, 0.01], target: [0, 0, 0] }  // ADICIONAR
};
```

### 5.5 Store – satelliteModules (adicionar Jason-2)

```javascript
const satelliteModules = [
  { name: 'Phobos', moduleName: 'Auth API' },
  // ... outros ...
  { name: 'Aurora 7', moduleName: 'Nave B4 ERD-FX' },
  { name: 'Jason-2', moduleName: 'Altímetro oceânico / NOAA' }  // ADICIONAR
];
```

### 5.6 Logo do Sol – fallback para public

Trecho atual (resumido):

```javascript
const logoTex = API
  ? loader.load(`${API}/api/textures/logo_b4.png`, (t) => { t.colorSpace = THREE.SRGBColorSpace; })
  : (() => { const c = document.createElement('canvas'); c.width = 1; c.height = 1; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
```

Alterar para: quando não houver API (ou load falhar), carregar `/textures/logo_b4.png` ou `/logo_b4.png` via `loader.load(publicUrl, ...)` (com fallback para o canvas 1x1 em caso de erro). Exemplo de URL pública: `${window.location.origin}/textures/logo_b4.png`.
