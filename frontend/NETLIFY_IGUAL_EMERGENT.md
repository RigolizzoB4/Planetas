# Fazer o Netlify ficar igual ao Emergent (sem CORS, tudo certo)

No **Emergent** e no **localhost** (porta 3000) o site funciona porque o navegador consegue carregar as texturas. No **Netlify** o Solar System Scope **bloqueia** essas requisições (CORS). A solução é **servir as mesmas texturas do seu próprio site**.

O código **já está preparado**: ele tenta primeiro as texturas em `public/textures/`. Se os arquivos estiverem lá, o Netlify usa eles (mesma origem = sem CORS) e o site fica igual ao Emergent.

---

## O que VOCÊ precisa fazer (só uma vez)

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

## E o fundo branco?

O código já força fundo **preto** em vários pontos: HTML (inline), CSS, cena Three.js, clear do renderer e a cada frame no loop de animação. Se ainda aparecer branco no Netlify:

1. **Limpe o cache** do navegador (Ctrl+Shift+Delete → limpar imagens e arquivos em cache) ou abra o site em **aba anônima**.
2. Confirme que o **último deploy** foi feito depois dessas alterações (`npm run deploy`).
3. Se usar o script do Emergent no mesmo domínio, ele pode desenhar por cima; teste abrindo a URL do Netlify direto (sem iframe do Emergent).
