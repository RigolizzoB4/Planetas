# Passo a passo: publicar o Planetas no Cloudflare

O endereço que você quer usar é do **Cloudflare Workers & Pages** (projeto `planetas`). Para um site estático React como este, use **Cloudflare Pages** conectado ao GitHub.

---

## 1. Deixar o Git com a versão mais atual

Antes de conectar ao Cloudflare, envie tudo que ainda não foi para o GitHub:

```powershell
# Na pasta do projeto (onde está o README.md)
cd "c:\...\Planetas"

git add .
git status
git commit -m "README e handoff Claude"
git push origin main
```

Assim o repositório **RigolizzoB4/Planetas** fica com a última versão.

---

## 2. Abrir o Cloudflare e o projeto

1. Acesse: **https://dash.cloudflare.com**
2. No menu lateral: **Workers & Pages** (ou **Pages**).
3. Clique no projeto **planetas** (ou em **Create application** → **Pages** → **Connect to Git** se for criar do zero).

---

## 3. Conectar o repositório do GitHub

1. Em **Pages**, clique em **Create application** → **Pages** → **Connect to Git** (ou em **Create project**).
2. Escolha **GitHub** e autorize o Cloudflare se pedir.
3. Selecione a conta/organização e o repositório **RigolizzoB4/Planetas**.
4. Clique em **Begin setup**.

---

## 4. Configurar o build (igual ao Netlify)

Na tela de configuração do projeto:

| Campo | Valor |
|--------|--------|
| **Production branch** | `main` |
| **Build command** | `cd frontend && npm install --legacy-peer-deps && npm run build` |
| **Build output directory** | `frontend/build` |
| **Root directory** | Deixe em branco (raiz do repo). Se o Cloudflare pedir "Root directory (advanced)", pode deixar vazio. |

**Variáveis de ambiente (se houver opção):**

- **NODE_VERSION** = `18` (ou na interface: "Environment variables" → add `NODE_VERSION` = `18`).

Depois clique em **Save** / **Deploy**.

---

## 5. Esperar o primeiro deploy

- O Cloudflare vai clonar o repo, rodar o build e publicar a pasta `frontend/build`.
- O site ficará em um URL tipo:  
  `https://planetas.pages.dev`  
  ou o domínio customizado que você configurar no projeto.

---

## 6. Deploys seguintes (automático)

- Toda vez que você der **push** na branch `main` no GitHub, o Cloudflare refaz o build e atualiza o site.
- Não precisa fazer nada no dashboard; só manter o código no Git e dar push.

---

## Resumo rápido

| O quê | Onde |
|--------|--------|
| Código atualizado | GitHub **RigolizzoB4/Planetas** (branch `main`) |
| Build | `cd frontend && npm install --legacy-peer-deps && npm run build` |
| Pasta publicada | `frontend/build` |
| Node | 18 |

Se o projeto **planetas** no Cloudflare já existir e estiver como **Worker** (e não Pages), você pode criar um **novo projeto Pages** com outro nome (ex.: `planetas-site`), conectar o mesmo repo e usar o URL do Pages. O link que você passou pode ser tanto de um Worker quanto de um projeto Pages; a configuração acima serve para **Pages**.
