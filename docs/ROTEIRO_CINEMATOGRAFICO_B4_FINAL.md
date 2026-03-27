# Roteiro Cinematográfico — Sistema Solar B4 (Versão Unificada)

**Projeto:** Planetas (Visualização de Ecossistema B4)  
**Objetivo:** Vídeo institucional de alto impacto que transiciona de forma imperceptível da geração por IA para a interface interativa em tempo real.  
**Duração:** 50–60 segundos  
**Estética:** Fotorrealismo NASA Eyes / PBR Cinematográfico.

---

## 🌌 A Filosofia da Transição "Invisível"

O sucesso deste vídeo depende de o espectador não perceber o corte entre o vídeo gerado por IA e o código Three.js. Para isso, utilizamos:
1.  **Match de Cores Exato:** Sincronização dos códigos Hexadecimais do shader do Sol e planetas.
2.  **Continuidade de Movimento:** A câmera IA termina em uma órbita estável que coincide com o `OrbitControls` do site.
3.  **Elemento-Ponte (Aurora 7):** A nave serve como o ponto focal que ancora o olhar durante o crossfade.

---

## 🎬 Estrutura em 5 Atos

### ATO 1 — Gênese (0:00 – 0:08)
**Conceito:** O nascimento do núcleo B4. Do vazio absoluto para a potência solar.
-   **Visual:** Tela preta (#000000). Um ponto de luz Warm Gold (#F59E1E) surge e explode suavemente em granulação convexa (Voronoi).
-   **Detalhes IA:** Superfície solar com vales em Deep Orange (#B8470A) e picos em Bright White-Yellow (#FFE08F). Movimento de plasma fractal lento.
-   **Áudio:** Silêncio absoluto → Sub-bass crescente (20-40 Hz) → Drone tonal quente.

### ATO 2 — O Ecossistema (0:08 – 0:20)
**Conceito:** Zoom-out revelando a escala do sistema. Os planetas como módulos integrados.
-   **Visual:** Câmera recua em arco. Revela Mercúrio, Vênus e a Terra com a Lua. O cinturão de asteroides surge como uma barreira natural antes dos gigantes gasosos.
-   **Destaque:** Entre Mercúrio e Vênus, vemos o **Anel de Satélites B4** (8 unidades) com trilhas tracejadas em tom Saffron (#F3AE3E).
-   **Prompt IA Chave:** "Continuous camera pull-back from a photorealistic sun. Planets appear in order. Orbital paths as thin elliptical lines. Deep space background (#05070B) with subtle Milky Way band. No lens flare."

### ATO 3 — A Aproximação e o Mergulho (0:20 – 0:32)
**Conceito:** A câmera mergulha de volta ao plano eclíptico, focando na Terra e na Aurora 7.
-   **Visual:** A câmera "cai" da vista top-down para o plano dos planetas. A Terra cresce no quadro com nuvens dinâmicas.
-   **A Transição (0:30-0:32):** Foco na **Aurora 7** (Nave B4 ERD-FX). No vídeo IA ela é fotorrealista com reflexos solares. No segundo 0:31, ocorre um *gaussiano dissolve* de 1 segundo para a captura do site, onde a nave é o modelo GLB.
-   **Configuração Técnica:** Câmera no site deve estar em `pos: [25, 10, 25]` olhando para a Terra para o match perfeito.

### ATO 4 — O Sistema Vivo (0:32 – 0:48)
**Conceito:** Demonstração da interatividade (Captura Real do Site).
-   **Visual:** Câmera orbita suavemente (OrbitControls). Cursor clica na Terra → Abre `InfoPopup` com efeito de vidro (Glass-morphism).
-   **Ação:** Troca de presets no painel lateral. O usuário vê que o que era "filme" agora é uma ferramenta de gestão e visualização em tempo real.
-   **Configuração de Gravação:** 4K, 60fps, `pixelRatio(2)`, `UnrealBloomPass` em 0.25.

### ATO 5 — Assinatura (0:48 – 0:55)
**Conceito:** Encerramento com a marca.
-   **Visual:** Zoom direto no Sol. O logo B4 no centro da fotosfera cresce até preencher a tela.
-   **Tagline:** "Seu sistema. Seu universo." sobre fundo espacial profundo.

---

## 🛠️ Especificações Técnicas de Cor (Obrigatórias)

| Elemento | Hex | Uso no Prompt / Código |
| :--- | :--- | :--- |
| **Sol (Picos)** | `#FFE08F` | Bright White-Yellow (Alta emissão) |
| **Sol (Domínio)** | `#F59E1E` | Warm Gold (Cor base) |
| **Sol (Vales)** | `#B8470A` | Deep Orange (Limb darkening) |
| **Espaço** | `#05070B` | Fundo do Universo B4 |
| **Órbitas/Acentos**| `#F3AE3E` | Saffron (Satélites e trilhas) |

---

## 🚫 O Que EVITAR (Para manter a continuidade)
-   **NÃO usar Lens Flare:** O Three.js no site não possui este efeito nativamente; usá-lo na IA quebraria a transição.
-   **NÃO usar Chromatic Aberration:** Mantemos a imagem limpa e técnica.
-   **NÃO usar Nebulosas Coloridas:** O fundo deve ser o preto profundo (#05070B) com a Via Láctea sutil, conforme o código atual.

---

> **Nota de Implementação:** Este roteiro agora serve como o "Documento Mestre" para a geração dos vídeos nas IAs (Runway/Kling) e para a direção da captura de tela do sistema interativo.
