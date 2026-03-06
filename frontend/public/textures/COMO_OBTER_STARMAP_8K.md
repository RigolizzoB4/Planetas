# Como obter mapa estelar 8K (starmap_8k)

O skybox usa **starmap_8k.jpg** ou **starmap_8k.png** na camada 1. Resolução recomendada: **8192×4096** (equirectangular, 360°).

---

## Opção 1: Script automático (Paul Bourke 8K PNG)

Na pasta do projeto (raiz do frontend ou do Planetas), execute no PowerShell:

```powershell
.\frontend\public\textures\download-starmap-8k.ps1
```

Ou, estando em `frontend/public/textures/`:

```powershell
.\download-starmap-8k.ps1
```

O script baixa o mapa **8192×4096** do site do Paul Bourke (posições reais de estrelas) e salva como **starmap_8k.png** nesta pasta. O código já carrega `.png` se `.jpg` não existir.

---

## Opção 2: Download manual – Paul Bourke (PNG 8K)

- **Link direto do mapa 8K:**  
  https://paulbourke.net/miscellaneous/astronomy/8192x4096.png  

- **Página com outros tamanhos:**  
  https://paulbourke.net/miscellaneous/astronomy/  

1. Abra o link direto no navegador (ou botão direito → “Salvar link como”).
2. Salve o arquivo em **frontend/public/textures/** com o nome **starmap_8k.png**.

O projeto já usa **starmap_8k.png** automaticamente (fallback após starmap_8k.jpg).

---

## Opção 3: NASA (domínio público, EXR 8K)

- **NASA SVS – Deep Star Maps 2020:**  
  https://svs.gsfc.nasa.gov/4851  

Mapas baseados em ~1,7 bilhão de estrelas (Gaia, Hipparcos, Tycho). Formato **EXR** (8K).

1. Na página, localize o arquivo **8K** (ex.: starmap_2020_8k.exr) e baixe.
2. Abra o EXR em **GIMP** ou **Photoshop** (ou outro editor que suporte EXR).
3. Exporte como **JPG** ou **PNG** e salve em **frontend/public/textures/** como **starmap_8k.jpg** ou **starmap_8k.png**.

---

## Opção 4: Usar o que já está na pasta

O projeto pode estar usando uma cópia de **galaxy_hd_bg.jpg** como **starmap_8k.jpg**. Para trocar por um mapa 8K “de verdade”, basta substituir o arquivo **starmap_8k.jpg** ou **starmap_8k.png** nesta pasta pelo que você baixar.

---

## Resumo

| Fonte        | Formato | Resolução   | Como usar |
|-------------|---------|-------------|-----------|
| **Script**  | PNG     | 8192×4096   | Rodar `download-starmap-8k.ps1` |
| Paul Bourke | PNG     | 8192×4096   | Baixar [8192x4096.png](https://paulbourke.net/miscellaneous/astronomy/8192x4096.png) → salvar como **starmap_8k.png** |
| NASA SVS    | EXR     | 8K          | Baixar EXR → converter para JPG/PNG → **starmap_8k.jpg** ou **starmap_8k.png** |

**Pasta final:** `frontend/public/textures/`  
**Nomes aceitos:** `starmap_8k.jpg` ou `starmap_8k.png`
