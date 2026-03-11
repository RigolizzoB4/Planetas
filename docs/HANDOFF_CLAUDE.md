# Handoff para Claude (ou outro assistente)

Use este arquivo quando for passar o projeto **Planetas** para o Claude (ou outro assistente) continuar o trabalho. Basta abrir o projeto e dizer: *"Leia docs/HANDOFF_CLAUDE.md e continue a partir daí."*

---

## O que é o projeto

- **Sistema Solar 3D** interativo (metáfora ERP/APIs).
- **Stack:** React (Create React App / CRACO) + Three.js no frontend; backend opcional em Python/FastAPI; deploy no **Netlify**.
- **Repositório:** GitHub **RigolizzoB4/Planetas**.

---

## Estrutura rápida

| Onde | O quê |
|------|--------|
| Raiz | `README.md`, `netlify.toml`, `deploy.ps1`, `docs/` |
| `frontend/` | App React; comando de build: `npm run build` (dentro de `frontend/`) |
| `frontend/public/textures/` | Texturas do skybox e planetas (starmap_8k, nebula_overlay, milky_way_band, 8k_*.jpg, etc.) |
| `frontend/public/models/` | `aurora7.glb`, `jason2.glb` |
| `frontend/src/components/three/SolarSystemPhotorealistic.jsx` | **Coração da cena 3D:** Sol, planetas, satélites, skybox em 4 camadas, controles |

---

## Skybox (fundo) – 4 camadas

O fundo é feito em **4 camadas** em `SolarSystemPhotorealistic.jsx`:

1. **Layer 1 – Star map 8K** – `starmap_8k.jpg` ou `.png` → fallback `galaxy_hd_bg.jpg` → fallback **procedural** (canvas).
2. **Layer 2 – Nebula** – `nebula_overlay.png`.
3. **Layer 3 – Partículas** – estrelas (Points), textura procedural.
4. **Layer 4 – Via Láctea** – `milky_way_band.png`.

URLs dos assets usam `getBaseUrl()` = `window.location.origin + (process.env.PUBLIC_URL || '')` para funcionar no Netlify e com subpath. O fundo **sempre** aparece: primeiro o procedural + cor `#05070B`; quando as texturas carregam, elas substituem.

---

## Deploy (Netlify)

- **Build:** `cd frontend && npm install --legacy-peer-deps && npm run build`
- **Publish:** `frontend/build`
- **Node:** 18 (em `netlify.toml`).
- Push em `main` dispara deploy automático. Para publicar: `npm run deploy` na raiz ou `.\deploy.ps1`.

---

## Documentação útil

- **Arquitetura e nomes de arquivos:** `docs/ARQUITETURA_PROJETO.md`
- **Texturas (skybox e planetas):** `frontend/public/textures/README.md`
- **Como obter starmap 8K:** `frontend/public/textures/COMO_OBTER_STARMAP_8K.md`

---

## Como o Claude pode continuar

1. Ler este arquivo e, se precisar, `docs/ARQUITETURA_PROJETO.md`.
2. Para mudar o fundo: editar `createSkyboxLayers` e constantes `STARMAP_8K`, `NEBULA_OVERLAY`, `MILKY_WAY_BAND` em `SolarSystemPhotorealistic.jsx`.
3. Para mudar planetas/Sol: `PLANETS`, `TEX`, e funções `createPlanet` / `createSun` no mesmo arquivo.
4. Para deploy: garantir que `netlify.toml` está correto e fazer commit + push em `main`.

---

*Última atualização: handoff criado para transição para Claude.*
