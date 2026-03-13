# Aurora 7 no Vercel — Avaliação ponto a ponto

Avaliação de **cada** item do checklist (Gemini) e do código de referência, usando o estado real do repositório e do código.

---

## Checklist Gemini (6 itens)

### 1. ARQUIVO GLB NÃO ESTÁ NO GIT  
**Status: PARCIALMENTE — este é o problema principal**

- No repositório estão versionados:
  - `frontend/public/models/aurora.glb`
  - `frontend/public/models/jason2.glb`
- **Não existe** `frontend/public/models/Aurora_7.glb` no Git.
- O código tenta primeiro `Aurora_7.glb` (404 no Vercel) e depois `aurora.glb` (que existe).
- No Vercel (Linux), `Aurora_7.glb` ≠ `aurora.glb` (case-sensitive). Quem existe no deploy é `aurora.glb`.

**Conclusão:** O nome no código e o nome no repositório não batem na primeira tentativa. A segunda URL (`aurora.glb`) deveria funcionar **se** o fallback estiver correto. Para evitar 404 e qualquer falha no fallback, o ideal é tentar **primeiro** o arquivo que existe: `aurora.glb`.

---

### 2. CAMINHO INCORRETO / CASE-SENSITIVE  
**Status: PROBLEMA**

- Referência usa: `'/models/Aurora_7.glb'` (caminho absoluto do site).
- Código atual usa: `getBaseUrl() + '/models/Aurora_7.glb'` e depois `getBaseUrl() + '/models/aurora.glb'`.
- No Vercel, `getBaseUrl()` = `https://planetas-taupe.vercel.app` (e `PUBLIC_URL` normalmente `''`), então o caminho está correto para o deploy.
- O problema é só o **nome do arquivo**: no servidor existe `aurora.glb`, não `Aurora_7.glb`. Por isso a primeira requisição falha.

**Conclusão:** Ajustar a **ordem** das URLs para tentar primeiro `aurora.glb` (o que está no repo).

---

### 3. ARQUIVO MUITO GRANDE  
**Status: OK (não verificado, mas .gitignore não exclui .glb)**

- `.gitignore` não ignora `*.glb` nem `public/models/`.
- Se o arquivo estivesse > 100 MB, o GitHub avisaria. Como `aurora.glb` está versionado, assume-se tamanho aceitável.

**Conclusão:** Não é bloqueante.

---

### 4. PASTA PUBLIC NÃO CONFIGURADA  
**Status: OK**

- Estrutura correta: `frontend/public/models/aurora.glb`.
- Create React App copia `public/` para a raiz do `build/`, então a URL `/models/aurora.glb` no deploy está correta.

**Conclusão:** Não é o problema.

---

### 5. DRACO DECODER NÃO CARREGA  
**Status: POSSÍVEL (secundário)**

- Código usa: `https://www.gstatic.com/draco/versioned/decoders/1.5.6/`
- Se o modelo for comprimido com Draco e esse CDN falhar (rede, firewall, bloqueio), o GLB pode “carregar” mas a cena ficar vazia ou dar erro no console.
- Se aparecer erro de Draco no Console (F12) no Vercel, dá para trocar para um decoder alternativo (ex.: jsDelivr).

**Conclusão:** Só investigar se, após corrigir o nome/ordem do arquivo, a Aurora ainda não aparecer.

---

### 6. ERROS NO CONSOLE NA VERCEL  
**Status: CORS NÃO É DA AURORA**

- Os erros que você colou são de **CORS** em texturas do Solar System Scope (ex.: `8k_mercury.jpg`). Isso afeta planetas, **não** o carregamento do GLB da Aurora 7.
- Para a Aurora, o que importa é:
  - 404 em `/models/Aurora_7.glb` ou `/models/aurora.glb`
  - Erro de DRACO
  - Erro de GLTFLoader

**Conclusão:** CORS das texturas é outro tema. Para a Aurora, o ponto crítico é o item 1/2 (nome e ordem do arquivo).

---

## Itens do “código completo” de referência (10 itens)

| # | Item | No seu código | Avaliação |
|---|------|----------------|-----------|
| 1 | Arquivo em `frontend/public/models/Aurora_7.glb` | Repo tem `aurora.glb`, não `Aurora_7.glb` | **Problema:** primeiro load pede arquivo que não existe; fallback usa `aurora.glb`. Solução: tentar `aurora.glb` primeiro. |
| 2 | Import DRACOLoader | `import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';` | OK |
| 3 | Bloco de carregamento (load, materiais, grupo, Earth, moons) | Implementado em `createAtlasAurora7`, com fallback em 3 URLs | OK (só ordem das URLs a ajustar) |
| 4 | Intro cinemática (`startIntro`, `setAuroraPanelOpen`) | `startIntro` dentro de `createAtlasAurora7`, usa `R.latestSetAuroraPanelOpen` | OK (referência usa `setAuroraPanelOpen` direto; no React usa ref do store, equivalente) |
| 5 | Animação de órbita (`R.moons.forEach`) | `R.moons.forEach(m => { m.angle += ...; m.mesh.position.set(...) })` no useEffect de animação | OK |
| 6 | Approach ao clicar | `approachObject(intersected)`; `getCollisionBodies` retorna `{ center, radius }` (referência fala em `body.pos`, no seu código é `center`) | OK (nomes diferentes, mesma lógica) |
| 7 | Outline no hover | `R.outlinePass.selectedObjects = intersected ? [intersected] : []` | OK |
| 8 | Popup (onClick, `objects.find`, `setSelectedObject`) | `list.find(o => o.name === intersected.userData.name)`, `setSelectedObject(obj)`, `approachObject(intersected)` | OK |
| 9 | Backend — Aurora 7 no seed | `server.py` tem `("Aurora 7", "Nave B4 ERD-FX")` em `satellite_data` | OK |
| 10 | AuroraPanel (abre 1x na intro) | `R.latestSetAuroraPanelOpen(true)` no `onComplete` da intro; `{auroraPanelOpen && <AuroraPanel />}` no App | OK |

---

## Onde está o problema (resumo)

1. **Principal:** No Vercel o arquivo que existe no Git é **`aurora.glb`**, mas o código tenta primeiro **`Aurora_7.glb`** (404). O fallback para `aurora.glb` existe, mas para evitar qualquer falha de rede/ordem, o código deve tentar **primeiro** o arquivo que está no repositório: **`/models/aurora.glb`**.
2. **Secundário (se ainda não aparecer):** Possível falha do decoder Draco (CDN do Google). Aí vale testar decoder alternativo (ex.: jsDelivr) ou modelo não-Draco.

---

## Correção aplicada no código

- Ordem de carregamento alterada para:
  1. **Primeiro:** `aurora.glb` (arquivo que está no Git e no Vercel)
  2. **Depois:** `Aurora_7.glb` (caso você adicione no futuro)
  3. **Por último:** modelo NASA (GitHub)

Assim a primeira requisição no Vercel já é para um arquivo que existe, e a Aurora 7 tende a aparecer sem depender do fallback após 404.
