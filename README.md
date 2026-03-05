# Sistema Solar B4 - Visualização 3D Interativa

## 📌 Descrição
Simulação interativa 3D do Sistema Solar com metáfora ERP/APIs, construída com React, Three.js e FastAPI.

![B4 Solar System](https://customer-assets.emergentagent.com/job_9d3cd00b-137b-4850-a3b5-a70f94e501fc/artifacts/80iqqy5v_LOGO_GRUPO_B4_SF-removebg-preview.png)

## ✨ Funcionalidades

### 🌟 Cena 3D
- **Sol Central**: Representa o ERP Core com camadas internas (núcleo, zona radiativa, zona convectiva, fotosfera)
- **Corte Transversal**: Visualize a estrutura interna do Sol com logo B4 FX
- **8 Planetas**: Mercúrio → Netuno com órbitas elípticas e animação
- **8 Satélites**: Microserviços no anel pontilhado entre Mercúrio e Vênus
- **Cinturão de Asteroides**: Entre Marte e Júpiter

### 🎮 Controles
- **Tempo**: Play/Pause, velocidade ajustável (0.1x - 5x)
- **Câmera**: 5 presets (Visão Geral, Foco no Sol, Terra, Satélites, Top View)
- **Modo de Visualização**: 3D ou 2D (vista superior)
- **Orbit Controls**: Zoom, pan, rotação com mouse

### 📊 Painel de Informações
- Popup editável ao clicar em objetos
- Campos: Nome, Descrição, Imagem, Tipo de API, Endpoints
- Versionamento de edições
- Upload de imagens

### 💾 Backend API
- REST API completa para objetos e cena
- Persistência em MongoDB
- Export de cena em JSON

## 🌐 Ver online

- **Local (no seu PC):** depois de rodar `yarn start` no frontend, acesse **[http://localhost:3000](http://localhost:3000)**.
- **Produção:** o site está no **Netlify**. Toda vez que você publica (ver abaixo), o Netlify atualiza sozinho em 1–2 minutos.

---

## ☁️ Publicar o site (um comando)

Para colocar suas alterações no ar:

1. Abra o terminal na **pasta do projeto** (onde está este README).
2. Rode **um** destes comandos:

   ```powershell
   npm run deploy
   ```
   ou, no PowerShell:
   ```powershell
   .\deploy.ps1
   ```

3. (Opcional) Se quiser uma mensagem de commit: `.\deploy.ps1 "Descrição da alteração"`.

O script envia tudo para o GitHub; o **Netlify faz o deploy automaticamente** em seguida. Não precisa clicar em nada no Netlify — só dar push.

**Resumo:** você altera o código aqui → roda `npm run deploy` → o site na nuvem atualiza sozinho.

---

## 🚀 Como Executar

### Requisitos
- Node.js 18+
- Python 3.9+
- MongoDB

### Frontend
```bash
cd frontend
yarn install
yarn start
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Variáveis de Ambiente

Copie os exemplos e ajuste se necessário:

- **Frontend:** `cp frontend/.env.example frontend/.env`
- **Backend:** `cp backend/.env.example backend/.env`

**Frontend (.env)** — `REACT_APP_BACKEND_URL=http://localhost:8001`

**Backend (.env)** — `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS` (ver `backend/.env.example`). Se não definir, backend usa `mongodb://localhost:27017` e `solar_system_b4` por padrão.

## 🏗️ Arquitetura

```
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── three/
│   │   │   │   └── SolarSystem.jsx    # Cena 3D principal
│   │   │   └── ui/
│   │   │       ├── Header.jsx
│   │   │       ├── Sidebar.jsx
│   │   │       ├── ControlsPanel.jsx
│   │   │       └── InfoPopup.jsx
│   │   ├── store/
│   │   │   └── solarSystemStore.js    # Estado global (Zustand)
│   │   └── App.js
│   └── package.json
├── backend/
│   ├── server.py                       # FastAPI app
│   └── requirements.txt
└── README.md
```

## 🎨 Design System

- **Tema**: Espacial escuro
- **Cores primárias**: Laranja solar (#FDB813), Cyan (#4FC3F7)
- **Fontes**: Space Grotesk, Exo 2
- **UI**: Glass-morphism panels com backdrop-blur

## 📡 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/objects` | Lista todos os objetos |
| GET | `/api/objects/:id` | Objeto específico |
| POST | `/api/objects` | Criar/atualizar objeto |
| PUT | `/api/objects/:id` | Atualizar objeto |
| DELETE | `/api/objects/:id` | Remover objeto |
| GET | `/api/scene` | Manifesto da cena |
| POST | `/api/scene` | Salvar cena |
| POST | `/api/upload` | Upload de imagem |

## 🔗 Metáfora ERP

| Corpo Celeste | Módulo do Sistema |
|---------------|-------------------|
| Sol | ERP Core |
| Mercúrio | Fast Access Module |
| Vênus | Processing Engine |
| Terra | User Interface |
| Marte | Analytics Engine |
| Júpiter | Data Warehouse |
| Saturno | Integration Hub |
| Urano | Backup Service |
| Netuno | Archive Service |
| Satélites | Microserviços (Auth, Payment, etc.) |

## 📜 Atribuição

Texturas cortesia de [Solar System Scope](https://www.solarsystemscope.com) - CC BY 4.0

## 📄 Licença

MIT License - Grupo B4
