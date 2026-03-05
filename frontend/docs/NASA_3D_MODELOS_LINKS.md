# Modelos 3D e texturas NASA — links para ver qualidade

Repositório oficial: **[nasa/NASA-3D-Resources](https://github.com/nasa/NASA-3D-Resources)**

Use os links abaixo para abrir no GitHub e ver preview/arquivos (GLB, texturas). Todos são de domínio público (NASA Media Guidelines).

---

## Estação Espacial e satélites (3D Models)

| Modelo | Pasta no GitHub | GLB (download direto) | Observação |
|--------|------------------|------------------------|------------|
| **ISS (B)** | [International Space Station (ISS) (B)](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/International%20Space%20Station%20(ISS)%20(B)) | [ISS (B).glb](https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/International%20Space%20Station%20(ISS)%20(B)/International%20Space%20Station%20(ISS)%20(B).glb) (~465 KB) | Bom para web |
| **ISS (C) High Res** | [ISS (C) (High Res)](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/International%20Space%20Station%20(ISS)%20(C)%20(High%20Res)) | Ver pasta para .glb | Mais detalhado |
| **Hubble (B)** | [Hubble Space Telescope (B)](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Hubble%20Space%20Telescope%20(B)) | [Hubble (B).glb](https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Hubble%20Space%20Telescope%20(B)/Hubble%20Space%20Telescope%20(B).glb) (~5 MB) | Telescópio espacial |
| **Parker Solar Probe** | [Parker Solar Probe](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Parker%20Solar%20Probe) | [Parker Solar Probe.glb](https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Parker%20Solar%20Probe/Parker%20Solar%20Probe.glb) | Já usado no projeto |
| **Atlas 7 (Aurora 7)** | [Atlas 7 (Aurora 7)](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Atlas%207%20(Aurora%207)) | [Atlas 7 (Aurora 7).glb](https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Atlas%207%20(Aurora%207)/Atlas%207%20(Aurora%207).glb) (~1 MB) | Nave Mercury/Atlas 7, com cor; ideal para “Aurora 7” na cena |

---

## Starlink (painéis solares que estendem/recolhem)

O repositório NASA **não** tem modelo Starlink. Opções com modelo em GLB/GLTF e painéis solares:

| Fonte | Link | Formato | Observação |
|-------|------|--------|------------|
| **FetchCFD** | [Starlink 3D Model](https://fetchcfd.com/view-project/2300-starlink-3d-model) | .glb / .gltf | Download gratuito; inclui projeto Blender; baseado em langgesagt/Just_Jory. |
| **CGTrader** | [SpaceX Starlink Satellite](https://www.cgtrader.com/free-3d-models/space/other/spacex-starlink-satellite-5c01e411-db05-44e8-8bac-1fe6cc3388b5) | GLTF, FBX, OBJ, BLEND | Gratuito; **rig com animação de painéis solares** (estender/recolher); PBR; baixo e alto poly. |

**Uso no projeto:** baixar o .glb, colocar em `frontend/public/models/starlink.glb` (ou outro nome) e carregar com GLTFLoader; para animação dos painéis, usar `gltf.animations` e `AnimationMixer` do Three.js.

---

## Navegar todos os modelos 3D

- **Lista completa (3D Models):**  
  https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models  
- **Lista completa (Images and Textures):**  
  https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures  

Inclui: Curiosity, Perseverance, Juno, Cassini, Voyager, Apollo LM, SLS, Orion, e dezenas de satélites e estações.

---

## Texturas planetas (fotorrealistas)

| Corpo | Pasta no GitHub | Uso no projeto |
|-------|------------------|----------------|
| Earth (A) | [Earth (A)](https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Earth%20(A)) | Terra |
| Venus | [Venus](https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Venus) | Vênus |
| Mars | [Mars](https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Mars) | Marte |
| Jupiter | [Jupiter](https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Jupiter) | Júpiter |
| Saturn | [Saturn](https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Saturn) | Saturno |
| Neptune | [Neptune](https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Neptune) | Netuno |
| Pluto | [Pluto](https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Pluto) | Plutão |

**Mercury e Uranus:** a NASA 3D Resources não tem textura global do planeta (só luas). O projeto usa Solar System Scope como fallback para Mercúrio e Urano.

---

## Portal oficial NASA 3D

- **nasa3d.arc.nasa.gov** — filtros por tipo (3D Models, Textures, 3D Printing):  
  https://nasa3d.arc.nasa.gov
