# Aurora 7 — Programação completa (o que acontece no código)

Este documento descreve **toda** a lógica relacionada à nave Aurora 7 no projeto, para entender por que ela pode não aparecer e como corrigir.

---

## 1. Onde o arquivo GLB é buscado

**Constantes (linhas ~224–229):**

```javascript
const ATLAS_7_AURORA_7_GLB = `https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Atlas%207%20(Aurora%207)/Atlas%207%20(Aurora%207).glb`;

const getBaseUrl = () => (typeof window !== 'undefined' ? window.location.origin : '') + (process.env.PUBLIC_URL || '');

// Caminho LOCAL: o navegador pede este URL
const AURORA_7_GLB_LOCAL = `${getBaseUrl()}/models/Aurora_7.glb`;
```

- **Local (npm start):** `getBaseUrl()` = `http://localhost:3000` → URL = `http://localhost:3000/models/Aurora_7.glb`
- **Vercel:** `getBaseUrl()` = `https://planetas-taupe.vercel.app` (e `PUBLIC_URL` normalmente `''`) → URL = `https://planetas-taupe.vercel.app/models/Aurora_7.glb`

**Importante:** O arquivo precisa existir em `frontend/public/models/` com o **nome exato** que o código usa.  
Se na pasta estiver `aurora.glb` e o código pedir `Aurora_7.glb`, o servidor devolve **404** e a Aurora **não aparece**.  
Solução: renomear para `Aurora_7.glb` **ou** mudar no código para `/models/aurora.glb`.

---

## 2. Ordem de criação da cena (quando a Aurora é chamada)

No `useEffect` de inicialização (aprox. linhas 1386–1572):

1. `createSun(solarGroup, loader, R)`
2. `createSatellites(solarGroup, loader, R)` — satélites genéricos (Phobos, Moon, etc.)
3. `Object.entries(PLANETS).forEach(...)` → **createPlanet** para cada planeta, incluindo **Earth**
4. `createAsteroids(solarGroup, R)`
5. `createParkerSolarProbe(solarGroup, R)`
6. **createAtlasAurora7(solarGroup, loader, R)** ← aqui a Aurora 7 é iniciada

**Condição crítica:** `createAtlasAurora7` faz no início:

```javascript
const earthMesh = R.planets['Earth'];
if (!earthMesh) return;
```

Se a Terra ainda não estiver em `R.planets`, a função **sai sem fazer nada**. Como os planetas são criados antes da Aurora, normalmente `Earth` já existe. O risco é se houver mudança na ordem de execução.

---

## 3. Função createAtlasAurora7 — passo a passo

### 3.1 Intro cinemática (startIntro)

Definida **dentro** de `createAtlasAurora7`, usa `R.camera` e `R.controls` (preenchidos no mesmo `useEffect` antes de chamar `createAtlasAurora7`).

- Só roda **uma vez** (`if (R.introStarted) return`).
- Desliga os controles, anima a câmera até a posição da Aurora (ou da Terra + offset se a Aurora ainda não existir).
- Ao terminar: reativa controles, `target` do OrbitControls volta para (0,0,0), abre o painel Aurora com `R.latestSetAuroraPanelOpen(true)`.

Ela é chamada:
- no **sucesso** do carregamento do GLB (depois de adicionar a Aurora à cena), ou
- no **erro** do carregamento (para não travar a experiência).

### 3.2 Loaders (Draco + GLTF)

```javascript
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const aurora7Loader = new GLTFLoader();
aurora7Loader.setDRACOLoader(dracoLoader);

aurora7Loader.load(AURORA_7_GLB_LOCAL, onSuccess, undefined, onError);
```

- Se o GLB for **comprimido com Draco**, o GLTFLoader precisa do DRACOLoader; sem ele o modelo pode não decodificar e ficar vazio/invisível.
- **Ordem de tentativa (fallback):**
  1. `AURORA_7_GLB_LOCAL` = `/models/Aurora_7.glb`
  2. Se falhar → `AURORA_7_GLB_ALT` = `/models/aurora.glb`
  3. Se falhar → `ATLAS_7_AURORA_7_GLB` (NASA GitHub)
  4. Se todos falharem → `console.error` e `startIntro()` (Aurora não aparece).

### 3.3 Callback de sucesso (quando o GLB carrega)

1. **Evita duplicata:** `if (R.aurora7) return;` (React StrictMode pode montar duas vezes).
2. **Modelo:** `const model = gltf.scene;`
3. **Centralizar:** `Box3().setFromObject(model)` → `getCenter()` → `model.position.sub(center)`.
4. **Tamanho:** `size = box.getSize()`, `maxDim = max(size.x, size.y, size.z)`.
5. **Escala:** `model.scale.setScalar(AURORA_SCALE)` — constante `AURORA_SCALE = 0.5` para garantir visibilidade (antes 0.075).
6. **Materiais:** em cada mesh do modelo, define `castShadow`, `receiveShadow`, `userData` (clickable, name: 'Aurora 7') e ajusta cores/metalness/roughness conforme o nome do material (lambert2, blinn3, lambert6, lambert3, anisotropic, etc.).
7. **Grupo (a7Group):**
   - Nome `'Aurora7'`, `userData` clickable.
   - Adiciona: model, label "Aurora 7", PointLight (1.5, 6).
   - Posição inicial: ângulo 2.5 rad, raio 3.8 → `position.set(cos(2.5)*3.8, 0, sin(2.5)*3.8)`.
8. **Parent:** `earthMesh.add(a7Group)` — a Aurora fica como **filha da Terra** no grafo da cena. Ou seja, ela orbita **em torno da Terra**; a posição (3.8, 0, …) é em coordenadas locais da Terra.
9. **Refs:** `R.aurora7 = a7Group` e `R.moons.push({ mesh: a7Group, angle: 2.5, orbitRadius: 3.8, speed: 0.25 })`.
10. **Console:** `console.log('Aurora 7 carregada. Escala: 0.075');`
11. **Intro:** `startIntro();`

### 3.4 Callback de erro

```javascript
(err) => {
  console.error('Erro ao carregar Aurora 7:', err);
  startIntro();
}
```

Só loga e chama a intro; **não** adiciona nenhum objeto à cena. Por isso, se o carregamento falhar, a Aurora **não aparece** e você só vê a câmera indo até perto da Terra.

---

## 4. Animação da órbita (moons)

Num **outro** `useEffect` (animação, aprox. linhas 1734–1774), a cada frame:

```javascript
if (R.moons && R.moons.length) {
  R.moons.forEach(m => {
    m.angle += m.speed * timeSpeed * dt;
    m.mesh.position.set(
      Math.cos(m.angle) * m.orbitRadius,
      0,
      Math.sin(m.angle) * m.orbitRadius
    );
  });
}
```

Para a Aurora 7: `orbitRadius = 3.8`, `speed = 0.25`. O grupo `a7Group` já está filho da Terra; essa atualização só muda a `position` local (x, z) em torno da Terra. Ou seja, a Aurora **orbita a Terra** continuamente.

---

## 5. Clique e hover (raycaster)

- No **mousemove**, o raycaster testa objetos com `userData.clickable`. Os meshes da Aurora têm `userData = { clickable: true, name: 'Aurora 7', moduleName: 'Nave B4 ERD-FX' }`, então entram no hit.
- O **OutlinePass** usa `R.outlinePass.selectedObjects = intersected ? [intersected] : []` — ou seja, outline no hover.
- No **click**, se o objeto clicado tiver `userData.name`, o código busca em `R.latestObjects` um objeto com esse `name` (ex.: "Aurora 7") e chama `setSelectedObject(obj)` e `approachObject(intersected)` (câmera voa até o objeto).

Se a Aurora **não estiver na cena** (carregamento falhou), ela nunca será intersectada e não haverá outline nem approach.

---

## 6. Por que a Aurora pode não aparecer — checklist

| Causa | O que verificar |
|-------|------------------|
| **Nome do arquivo** | Em `public/models/` o arquivo deve ser o que o código pede. Hoje o código pede `Aurora_7.glb`. Se só existir `aurora.glb`, dá 404. Renomeie para `Aurora_7.glb` ou mude no código para `/models/aurora.glb`. |
| **404 no GLB** | Abra F12 → Network, recarregue a página e veja se a requisição a `/models/Aurora_7.glb` (ou `/models/aurora.glb`) retorna 200 ou 404. |
| **GLB com Draco sem decoder** | Se o modelo for Draco e o DRACOLoader não estiver configurado ou o decoder falhar, o GLB pode “carregar” mas a cena ficar vazia. Verifique erros no Console (F12). |
| **Terra não existe** | Se `R.planets['Earth']` for undefined quando `createAtlasAurora7` roda, a função dá `return` e nada é criado. Confirme a ordem: planetas criados antes de `createAtlasAurora7`. |
| **Escala muito pequena** | `scale.setScalar(0.075)` deixa a nave bem pequena. Se a câmera estiver longe, pode parecer que não está lá. Aumentar a escala (ex.: 0.5 ou 1) ajuda a debug. |
| **Só fallback de intro** | Se o **erro** do loader for chamado, a intro ainda roda (câmera vai até perto da Terra), mas nenhum mesh da Aurora é adicionado. Verifique sempre o Console: "Erro ao carregar Aurora 7" indica falha de rede/404/Draco. |

---

## 7. Resumo do fluxo em código (sequência real)

```
1. useEffect init roda
2. R.planets = {}, R.moons = [], R.aurora7 = null, …
3. createSun, createSatellites, createPlanet (Earth criado → R.planets['Earth'] existe)
4. createAtlasAurora7(solarGroup, loader, R)
   ├─ earthMesh = R.planets['Earth']  → ok
   ├─ startIntro definida (será chamada no success ou error do load)
   ├─ aurora7Loader.load(AURORA_7_GLB_LOCAL, ...)
   │    ├─ Se OK:
   │    │   → model centralizado, scale 0.075, materiais ajustados
   │    │   → a7Group (model + label + light), position (cos(2.5)*3.8, 0, sin(2.5)*3.8)
   │    │   → earthMesh.add(a7Group)
   │    │   → R.aurora7 = a7Group, R.moons.push(...)
   │    │   → startIntro()
   │    └─ Se ERRO:
   │         → console.error('Erro ao carregar Aurora 7:', err)
   │         → startIntro()  (Aurora não está na cena)
   └─ (load é assíncrono; o resto da init segue)
5. Loop de animação: R.moons.forEach → atualiza position da Aurora em torno da Terra
6. Raycaster: hover/click em objetos com userData.clickable (inclui Aurora 7 se estiver na cena)
```

---

## 8. Constantes e refs usadas só para Aurora 7

- **URLs:** `AURORA_7_GLB_LOCAL`, `ATLAS_7_AURORA_7_GLB`
- **Refs:** `R.aurora7`, `R.moons`, `R.introStarted`, `R.auroraPanelShown`, `R.latestSetAuroraPanelOpen`
- **Parâmetros de órbita:** ângulo inicial `2.5`, raio `3.8`, `speed` `0.25`
- **Escala do modelo:** `AURORA_SCALE = 0.5` (constante no início do loader)

Com este texto você tem toda a programação que a Aurora 7 tem no projeto; use o checklist da seção 6 para achar por que ela não está aparecendo (em geral: nome do arquivo em `public/models/` ou falha no carregamento do GLB).
