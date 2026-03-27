# Alinhamento com o Emergent

Este documento descreve o que está **igual** ou **equivalente** ao que você vê no Emergent, para evitar refazer trabalho.

## Elementos alinhados ao Emergent

| Elemento | Onde está no código | Observação |
|----------|---------------------|------------|
| **Navegação** | `OrbitControls` em `SolarSystemPhotorealistic.jsx` (rotate, zoom, pan) | Mesmo tipo de controle 3D; presets de câmera: Overview, Sun Focus, Earth Focus, Satellite Ring, Top View. |
| **Logo dentro do Sol** | `createSun()` → `coreGroup` com `logoSprite` (logo B4) + sprite "ERD-FX" | Logo carregada de `${API}/api/textures/logo_b4.png`; posicionada no núcleo escuro do Sol. |
| **Cinturão de asteroides** | `createAsteroids()` — `ASTEROID_BELT_INNER=30`, `ASTEROID_BELT_OUTER=38`, ~3000 instâncias | Entre Marte e Júpiter; geometria dodecaédrica, rotação contínua. |
| **Via Láctea** | `createStars(scene, loader)` — esfera de fundo com textura `2k_stars_milky_way.jpg` | Fundo realista (Solar System Scope) + estrelas procedurais na frente. |
| **Iluminação** | `PointLight` principal (Sol) + `HemisphereLight`; sombras PCF; tone mapping ACES | Luz principal única (Sol); decay 2 (inverse-square); bloom no pós-processamento. |

## Texturas (estilo “papel de parede” NASA)

- **Fonte principal:** Solar System Scope 8K (`solarsystemscope.com/textures/download/`), compatível com uso NASA/ESA.
- **Planetas:** 8K com fallback 2K; mapas de normal e roughness gerados a partir da diffuse para mais realismo.
- **Sol:** textura 8k_sun + shader com granulação e sunspots.
- **Via Láctea:** `2k_stars_milky_way.jpg` no fundo da cena.

## Satélites artificiais

- **Estilo:** alterado de Jason-2 (antena grande, dish) para **compacto**: corpo em caixa, painéis menores, antena e sensor discretos.
- **Tamanho:** **1/3** do tamanho anterior (constante `SATELLITE_SCALE_FACTOR = 1/3`).
- Para voltar ao estilo antigo (Jason-2-like), altere `SATELLITE_STYLE` para `'legacy'` em `SolarSystemPhotorealistic.jsx`.

## Onde desenvolver: aqui (React) vs Elementor

- **Este repositório (React/Three.js)** é o lugar certo para:
  - Toda a lógica 3D (planetas, satélites, asteroides, Sol, Via Láctea).
  - Controles de câmera, velocidade, presets.
  - Integração com o backend (API de objetos/cena).
  - Texturas, iluminação e pós-processamento.

- **Elementor** é ideal para:
  - Layout da página (header, footer, botões, seções).
  - Embutir este app via iframe ou embed (URL do build React).
  - Não é necessário “refazer” a cena 3D no Elementor; basta apontar para a URL publicada deste projeto.

**Recomendação:** manter o projeto 3D **todo aqui**. Publicar o build (ex.: Vercel, Produção, ou o host do Emergent) e no Elementor apenas **incorporar** essa URL. Assim você não refaz a cena e mantém uma única fonte de verdade.
