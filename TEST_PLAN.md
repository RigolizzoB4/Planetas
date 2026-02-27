# Plano de Testes - Sistema Solar B4

## 📋 Visão Geral
Este documento descreve os testes de validação para a aplicação Sistema Solar B4.

---

## 1. 🖱️ Testes de Click/Popups

### TC-1.1: Seleção de Planeta via 3D
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Carregar a aplicação | Cena 3D carrega com Sol e planetas |
| 2 | Clicar no planeta Terra na cena 3D | Popup lateral abre com informações da Terra |
| 3 | Verificar título do popup | "Earth" |
| 4 | Verificar badge de tipo | "planet" |
| 5 | Verificar módulo | "User Interface" |

### TC-1.2: Seleção via Sidebar
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Localizar sidebar à esquerda | Lista com Sol, planetas, satélites visível |
| 2 | Clicar em "Jupiter" na lista | Popup abre com informações de Júpiter |
| 3 | Clicar em "Satellite_1" | Popup muda para informações do satélite Auth API |

### TC-1.3: Fechamento de Popup
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Com popup aberto, clicar no X | Popup fecha |
| 2 | Selecionar outro objeto | Popup abre com novo conteúdo |

---

## 2. ✏️ Testes de Edit/Save Roundtrip

### TC-2.1: Edição de Descrição
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Selecionar planeta "Mars" | Popup abre |
| 2 | Clicar no botão de edição (lápis) | Campos tornam-se editáveis |
| 3 | Alterar descrição para "Teste de edição" | Campo atualiza |
| 4 | Clicar em "Salvar Alterações" | Toast de sucesso aparece |
| 5 | Recarregar página | Descrição mantém "Teste de edição" |

### TC-2.2: Edição de Endpoints
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Selecionar objeto em modo edição | Campos de endpoints visíveis |
| 2 | Adicionar endpoint "/api/novo/teste" | Endpoint adicionado à lista |
| 3 | Salvar alterações | Toast de sucesso |
| 4 | Verificar via API | `GET /api/objects/:id` retorna novo endpoint |

### TC-2.3: Upload de Imagem
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Entrar em modo edição | Área de imagem mostra overlay "Enviar Imagem" |
| 2 | Clicar e selecionar imagem | Imagem carrega no preview |
| 3 | Salvar | Imagem persiste após reload |

### TC-2.4: Versionamento
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Verificar badge de versão inicial | "v1" |
| 2 | Fazer edição e salvar | Versão incrementa |
| 3 | Verificar badge | "v2" |

---

## 3. 📦 Testes de Export

### TC-3.1: Export JSON
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Clicar no botão Download no header | Arquivo JSON baixado |
| 2 | Abrir arquivo | JSON contém `scene` e `objects` |
| 3 | Verificar objetos | 17 objetos (1 sol, 8 planetas, 8 satélites) |

### TC-3.2: Validação do Export
```json
{
  "scene": { "id": "...", "manifestJson": {...} },
  "objects": [
    { "name": "Sun", "type": "sun", ... },
    { "name": "Mercury", "type": "planet", ... },
    ...
  ],
  "exportedAt": "ISO date",
  "version": "1.0.0"
}
```

---

## 4. 📹 Testes de Camera Presets

### TC-4.1: Overview (🌌)
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Clicar no botão 🌌 | Câmera move para posição [0, 50, 100] |
| 2 | Verificar visão | Sistema solar completo visível |

### TC-4.2: Sun Focus (☀️)
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Clicar no botão ☀️ | Câmera aproxima do Sol |
| 2 | Verificar posição | [0, 10, 30] |
| 3 | Verificar visão | Sol em destaque, planetas internos visíveis |

### TC-4.3: Earth Focus (🌍)
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Clicar no botão 🌍 | Câmera foca na Terra |
| 2 | Verificar posição | [20, 10, 20] |

### TC-4.4: Satellite Ring (🛰️)
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Clicar no botão 🛰️ | Câmera foca no anel de satélites |
| 2 | Verificar | 8 satélites visíveis no anel pontilhado |

### TC-4.5: Top View (👁️)
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Clicar no botão 👁️ | Câmera move para visão superior |
| 2 | Verificar posição | [0, 120, 0.1] |
| 3 | Verificar visão | Vista 2D do sistema |

---

## 5. 🎮 Testes de Controles

### TC-5.1: Play/Pause
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Observar planetas orbitando | Animação ativa |
| 2 | Clicar Pause | Planetas param |
| 3 | Clicar Play | Animação retoma |

### TC-5.2: Velocidade
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Verificar velocidade inicial | 1.0x |
| 2 | Clicar ⏩ | Velocidade aumenta para 1.5x |
| 3 | Clicar ⏪ | Velocidade diminui para 1.0x |
| 4 | Testar range | 0.1x a 5.0x |

### TC-5.3: Toggle 2D/3D
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Modo padrão | 3D (ícone Box) |
| 2 | Clicar toggle | Muda para 2D (vista superior) |
| 3 | Clicar novamente | Retorna ao 3D |

### TC-5.4: Corte Transversal do Sol
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Clicar botão Layers | Sol mostra corte transversal |
| 2 | Verificar camadas | Núcleo amarelo, zona radiativa dourada, zona convectiva laranja |
| 3 | Clicar novamente | Sol retorna ao normal |

---

## 6. 🔄 Testes de Orbit Controls

### TC-6.1: Zoom
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Usar scroll do mouse | Câmera aproxima/afasta |
| 2 | Testar limite mínimo | Não ultrapassa distância 10 |
| 3 | Testar limite máximo | Não ultrapassa distância 200 |

### TC-6.2: Pan
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Segurar botão direito + arrastar | Câmera desloca lateralmente |

### TC-6.3: Rotate
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Segurar botão esquerdo + arrastar | Câmera orbita ao redor do centro |
| 2 | Testar em modo 2D | Rotação limitada (maxPolarAngle: 0.1) |

---

## 7. 🔍 Testes de Busca

### TC-7.1: Busca por Nome
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Digitar "Earth" na busca | Apenas Earth aparece na lista |
| 2 | Limpar busca | Todos os objetos reaparecem |

### TC-7.2: Busca por Tipo
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Digitar "satellite" | 8 satélites listados |
| 2 | Digitar "planet" | 8 planetas listados |

### TC-7.3: Busca por Módulo
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Digitar "Auth" | Satellite_1 (Auth API) aparece |
| 2 | Digitar "Warehouse" | Jupiter (Data Warehouse) aparece |

---

## 8. 🌐 Testes de API Backend

### TC-8.1: GET /api/objects
```bash
curl -X GET http://localhost:8001/api/objects
```
**Esperado:** Array com 17 objetos

### TC-8.2: GET /api/objects/:id
```bash
curl -X GET http://localhost:8001/api/objects/{id}
```
**Esperado:** Objeto único com todos os campos

### TC-8.3: PUT /api/objects/:id
```bash
curl -X PUT http://localhost:8001/api/objects/{id} \
  -H "Content-Type: application/json" \
  -d '{"description": "Nova descrição"}'
```
**Esperado:** Objeto atualizado com versão incrementada

### TC-8.4: GET /api/scene
```bash
curl -X GET http://localhost:8001/api/scene
```
**Esperado:** Manifesto da cena com camera presets

### TC-8.5: POST /api/upload
```bash
curl -X POST http://localhost:8001/api/upload \
  -F "file=@image.png"
```
**Esperado:** `{ "url": "/api/uploads/uuid.png", "filename": "uuid.png" }`

---

## 9. 📱 Testes de Responsividade

### TC-9.1: Desktop (1920x1080)
- ✅ Sidebar visível
- ✅ Controles completos
- ✅ Popup lateral

### TC-9.2: Tablet (1024x768)
- ✅ Sidebar colapsável
- ✅ Controles adaptados
- ✅ Popup responsivo

### TC-9.3: Mobile (375x667)
- ✅ Sidebar oculta por padrão
- ✅ Controles empilhados
- ✅ Touch controls funcionam

---

## 10. ⚡ Testes de Performance

### TC-10.1: FPS
| Dispositivo | FPS Esperado |
|-------------|--------------|
| Desktop (GPU dedicada) | 60 FPS |
| Laptop (GPU integrada) | 30+ FPS |
| Tablet | 30+ FPS |
| Mobile | 24+ FPS |

### TC-10.2: Tempo de Carregamento
- Inicial: < 3s
- Com texturas: < 5s

### TC-10.3: Memória
- Desktop: < 500MB
- Mobile: < 200MB

---

## ✅ Checklist Final

- [ ] Todos os planetas orbitam corretamente
- [ ] Satélites no anel pontilhado
- [ ] Cinturão de asteroides visível
- [ ] Popup abre/fecha corretamente
- [ ] Edições são salvas no banco
- [ ] Export gera JSON válido
- [ ] Camera presets funcionam
- [ ] Controles de tempo funcionam
- [ ] Busca filtra corretamente
- [ ] API retorna dados corretos
- [ ] Responsivo em diferentes telas
- [ ] Performance aceitável

---

## 🐛 Bugs Conhecidos

1. **Nenhum bug crítico identificado**

---

## 📝 Notas

- Texturas são carregadas progressivamente
- Qualidade ajusta automaticamente baseado no dispositivo
- Cinturão de asteroides usa GPU instancing para performance
