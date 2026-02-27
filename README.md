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

**Frontend (.env)**
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

**Backend (.env)**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=solar_system_b4
```

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
