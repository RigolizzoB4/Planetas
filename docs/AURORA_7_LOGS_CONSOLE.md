# Aurora 7 — O que procurar no Console (F12)

Depois de dar push nos logs de debug, abra o site (local ou Vercel), pressione **F12** → aba **Console** e use o filtro:

```
aurora
```

ou

```
Aurora
```

---

## Mensagens que podem aparecer

| Log | Significado |
|-----|-------------|
| `🚀 Iniciando carregamento Aurora 7...` | O código começou a carregar a Aurora. |
| `URL (1ª tentativa): https://.../models/aurora.glb` | Confirma qual URL está sendo usada. |
| `📥 Aurora: 50%` | Progresso do download (se o loader reportar total). |
| `✅ AURORA CARREGOU!` + `Modelo:` + `Meshes/children:` | **Sucesso:** o GLB carregou; veja se `children.length` > 0. |
| `Aurora 7 carregada. Escala: 0.5` | Modelo foi adicionado à cena e intro foi chamada. |
| `R.aurora7 já existe? true` + `⚠️ Aurora já carregada, pulando...` | StrictMode montou 2x; segunda vez ignorada (normal). |
| `❌ ERRO AURORA (aurora.glb):` | Falha na 1ª URL (404, rede, CORS, etc.). |
| `🔄 Tentando fallback 2: Aurora_7.glb` | Está tentando a segunda URL. |
| `❌ ERRO AURORA (Aurora_7.glb):` | Falha na 2ª URL. |
| `🔄 Tentando fallback 3: NASA GitHub` | Está tentando o modelo da NASA. |
| `❌ ERRO AURORA (todos os caminhos):` | Nenhuma das 3 URLs funcionou. |

---

## Erros de DRACO

Se aparecer algo como:

- `THREE.GLTFLoader: No DRACOLoader instance provided`
- `DRACO` / `decoder` / `decompression` em vermelho

o modelo pode estar em Draco e o decoder não carregou. Nesse caso, no código troque o caminho do decoder para:

```js
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
```

(Comentário no código indica onde fazer essa troca.)

---

## O que me enviar

Depois de recarregar a página (Ctrl+F5) e filtrar por `aurora` no Console:

1. **Copie e cole aqui todas as linhas** que aparecerem (ou um print).
2. Se houver **erro em vermelho**, copie a mensagem completa.

Com isso dá para saber se o problema é 404, DRACO, modelo vazio ou outro.
