# Texturas para o fundo (Via Láctea) e uso em deploy

Para o **fundo com Via Láctea** aparecer no site em produção (Netlify, Vercel, etc.), coloque aqui a textura. Assim ela é servida pelo mesmo domínio e não depende de CORS de sites externos.

## Via Láctea (obrigatório para o fundo estelar)

1. Baixe a textura **2K Stars Milky Way** do Solar System Scope (uso permitido com atribuição):
   - **URL direta:** https://www.solarsystemscope.com/textures/download/2k_stars_milky_way.jpg
2. Salve o arquivo neste pasta com o nome: **`2k_stars_milky_way.jpg`**
3. Caminho final: `frontend/public/textures/2k_stars_milky_way.jpg`

Se este arquivo existir, o site usará ele (incluindo no Netlify). Se não existir, o código tenta carregar do Solar System Scope; em alguns hosts isso pode falhar por CORS e o fundo fica só escuro.

Atribuição: Texturas cortesia de [Solar System Scope](https://www.solarsystemscope.com) - CC BY 4.0

---

## Texturas NASA (Terra, Júpiter, Saturno) e Parker Solar Probe

O projeto usa **texturas e modelos 3D da NASA** quando disponíveis (estilo [NASA Eyes](https://science.nasa.gov/eyes/)):

- **Terra, Júpiter, Saturno:** texturas do repositório [NASA 3D Resources](https://github.com/nasa/NASA-3D-Resources) (Images and Textures). Carregadas via GitHub raw; fallback para Solar System Scope.
- **Parker Solar Probe:** modelo 3D (GLB) oficial da NASA, do mesmo repositório. A sonda aparece em órbita próxima ao Sol na cena.

Uso conforme [NASA Media Usage Guidelines](https://www.nasa.gov/multimedia/guidelines/index.html).
