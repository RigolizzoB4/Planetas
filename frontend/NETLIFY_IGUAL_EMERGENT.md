# Fazer o Netlify ficar igual ao Emergent (sem CORS, tudo certo)

No **Emergent** e no **localhost** (porta 3000) o site funciona porque o navegador consegue carregar as texturas. No **Netlify** o Solar System Scope **bloqueia** essas requisições (CORS). A solução é **servir as mesmas texturas do seu próprio site**.

O código segue o **truque do Emergent**: quando há backend (API), tenta primeiro **`/api/textures/...`** (ex.: `backend/textures/2k_stars_milky_way.jpg`); sem backend (ex.: Netlify), tenta **`/textures/...`** (ou seja, `frontend/public/textures/`). Assim não depende de CORS.

---

## O que VOCÊ precisa fazer (só uma vez)

### 0. Se já veio tudo do Emergent (texturas no backend)

Se você já tem os arquivos em **`backend/textures/`** (porque vieram no download do Emergent), **copie** para **`frontend/public/textures/`** — não precisa baixar de novo da web. No Netlify não existe backend, então o site usa só o que está em `public/`.

Na raiz do projeto você pode rodar o script que faz essa cópia:

```powershell
.\copy-textures-from-backend.ps1
```

Ou manualmente: `New-Item -ItemType Directory -Force -Path frontend/public/textures` e `Copy-Item backend/textures/* frontend/public/textures/ -Force`. Assim a Via Láctea e as texturas dos planetas passam a funcionar no Netlify usando os mesmos arquivos que você já tem.

### 1. Criar a pasta (se não existir)

```
frontend/public/textures/
```

### 2. Baixar e colocar estes arquivos em `frontend/public/textures/`

**Forma fácil:** abra no navegador o arquivo `frontend/public/textures/COMO_BAIXAR_TEXTURAS.html`. Clique em cada link e salve o arquivo que baixar **nesta mesma pasta** (`frontend/public/textures/`), com o nome exato indicado na página.

Ou baixe manualmente do Solar System Scope (uso com atribuição). Use **exatamente** estes nomes de arquivo:

| Arquivo | Link para baixar |
|---------|------------------|
| `2k_stars_milky_way.jpg` | https://www.solarsystemscope.com/textures/download/2k_stars_milky_way.jpg |
| `8k_sun.jpg` | https://www.solarsystemscope.com/textures/download/8k_sun.jpg |
| `2k_sun.jpg` | https://www.solarsystemscope.com/textures/download/2k_sun.jpg |
| `8k_mercury.jpg` | https://www.solarsystemscope.com/textures/download/8k_mercury.jpg |
| `8k_venus_surface.jpg` | https://www.solarsystemscope.com/textures/download/8k_venus_surface.jpg |
| `8k_earth_daymap.jpg` | https://www.solarsystemscope.com/textures/download/8k_earth_daymap.jpg |
| `8k_earth_clouds.jpg` | https://www.solarsystemscope.com/textures/download/8k_earth_clouds.jpg |
| `8k_mars.jpg` | https://www.solarsystemscope.com/textures/download/8k_mars.jpg |
| `8k_jupiter.jpg` | https://www.solarsystemscope.com/textures/download/8k_jupiter.jpg |
| `8k_saturn.jpg` | https://www.solarsystemscope.com/textures/download/8k_saturn.jpg |
| `8k_saturn_ring_alpha.png` | https://www.solarsystemscope.com/textures/download/8k_saturn_ring_alpha.png |
| `8k_uranus.jpg` | https://www.solarsystemscope.com/textures/download/8k_uranus.jpg |
| `8k_neptune.jpg` | https://www.solarsystemscope.com/textures/download/8k_neptune.jpg |
| `2k_pluto.jpg` | https://www.solarsystemscope.com/textures/download/2k_pluto.jpg |

(Opcional: pode baixar também as versões `2k_*` dos planetas para fallback; o código usa `2k_` quando o `8k_` falha.)

### 3. Logo do Sol

Já existe um arquivo em `frontend/public/logo-b4-branco.png` (placeholder). Se você tiver o logo real do Emergent/B4, **substitua** esse arquivo pelo seu (mesmo nome: `logo-b4-branco.png`). Recomendado: fundo transparente, logo branco ou claro, ex.: 256×256 ou 512×512 px.

### 4. Rodar no localhost (desenvolver e testar)

Na pasta **frontend**:

- `npm start` — abre em **http://localhost:3000**
- Se aparecer "Something is already running on port 3000", use: **`npm run start:3001`** — abre em **http://localhost:3001**

Assim você continua usando o localhost para desenvolver; o Netlify fica igual quando você fizer o deploy.

### 5. Fazer deploy

No terminal, na pasta **raiz do projeto** (onde está o `deploy.ps1`):

```powershell
npm run deploy
```

Ou:

```powershell
git add -A
git commit -m "Adicionar texturas locais para Netlify"
git push origin main
```

---

## Depois disso

- O Netlify vai usar as texturas de `public/textures/` (mesma origem).
- Não haverá bloqueio de CORS.
- Fundo com Via Láctea, planetas com textura, Sol com textura e logo devem aparecer como no Emergent.

**Atribuição:** Texturas cortesia de [Solar System Scope](https://www.solarsystemscope.com) – uso conforme licença deles (ex.: CC BY 4.0 com atribuição).

---

## Por que o Netlify pode estar diferente do Emergent?

- **Emergent** (solar-erdfx.preview.emergentagent.com) roda no ambiente deles, com backend e texturas que podem ser servidas por eles.
- **Netlify** (borealb4.netlify.app) faz o build a partir **deste repositório** no GitHub. Se as texturas não estiverem em `public/textures/`, o site tenta carregar do Solar System Scope e pode falhar por **CORS** (fundo sem Via Láctea, planetas com cor sólida). O **logo no Sol** e o **fundo preto** vêm do código e do arquivo `public/logo-b4-branco.png` — após o último deploy devem aparecer.

**Onde programar:** Pode continuar programando no **Cursor** (ou Anthropic, etc.) neste repositório. O Netlify usa o que está no GitHub. O Emergent pode usar o mesmo repo ou outro; para o Netlify ficar “completo e escuro” como o Emergent, basta seguir o checklist acima (logo + texturas em `public/`, deploy).

---

## E o fundo branco?

O código já força fundo **preto** (incl. renderer com `alpha: false`, clearColor e background a cada frame). Se ainda aparecer branco no Netlify:

1. **Limpe o cache** do navegador (Ctrl+Shift+Delete → limpar imagens e arquivos em cache) ou abra o site em **aba anônima**.
2. Confirme que o **último deploy** foi feito depois dessas alterações (`npm run deploy`).
3. Se usar o script do Emergent no mesmo domínio, ele pode desenhar por cima; teste abrindo a URL do Netlify direto (sem iframe do Emergent).
