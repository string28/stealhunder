# Steam Deal Hunter // Official Keys

Extensão para navegadores baseados em Chromium (**Chrome, Brave, Edge, Opera**) e Web App para rastreamento de **preços regionais exatos da Steam** e comparação em tempo real com distribuidores oficiais de chaves Steam (`steamworks=1`).

![Version](https://img.shields.io/badge/version-2.0.0-e11d48?style=for-the-badge)
![Manifest](https://img.shields.io/badge/Manifest-V3-a855f7?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-10b981?style=for-the-badge)

---

## ✨ Funcionalidades Principais

* **Preço Regional 100% Exato (Zero CORS):** Consulta diretamente a API oficial da loja Steam (`store.steampowered.com/api/appdetails`) na moeda selecionada (`BRL`, `USD`, `EUR`, `GBP`, `ARS`, `JPY`), garantindo que o preço exibido bata centavo por centavo com a página da Steam.
* **Filtro Estrito de Lojas Oficiais (`steamworks=1`):** Compara preços apenas em revendedores homologados pelas publishers (Nuuvem, Green Man Gaming, Fanatical, Humble Store, GamersGate), ignorando mercados cinzas.
* **Auto-Detecção de Aba da Steam:** Ao abrir o popup da extensão enquanto navega em um jogo na Steam, o `AppID` é detectado e escaneado automaticamente.
* **Widget Injetado na Loja Steam (`content.js`):** Injeta uma barra **Obsidian Liquid Glass** diretamente acima do botão de compra nas páginas da Steam (`store.steampowered.com/app/*`) indicando a menor chave oficial externa e atalho para a **Nuuvem**.
* **Scanner de Wishlist Pública:** Permite colar links de jogos ou o `SteamID64` do perfil para cruzar toda a Lista de Desejos de uma só vez.
* **Design Obsidian Liquid Glass (60-30-10):** Interface construída sob a regra 60-30-10 da teoria das cores:
  * **60% Dominante:** Obsidian Black (`#050507`) com translucidez e `backdrop-filter`.
  * **30% Secundário:** Stark White & Silver (`#f8fafc` / `#94a3b8`) para tipografia e bordas especulares.
  * **10% Acento Focal:** Crimson Red (`#e11d48`) harmonizado com Violeta Íris (`#a855f7`).

---

## 🚀 Como Instalar no Navegador (Modo Desenvolvedor)

Como o projeto é distribuído diretamente via GitHub, você pode instalá-lo gratuitamente em segundos:

1. Baixe este repositório (clique em **Code -> Download ZIP** ou faça `git clone`).
2. Extraia a pasta no seu computador.
3. No navegador (Chrome, Brave, Edge ou Opera), acesse:
   ```text
   chrome://extensions/
   ```
4. Ative a chave **Modo do desenvolvedor** (*Developer mode*) no canto superior direito.
5. Clique em **Carregar sem compactação** (*Load unpacked*) no canto superior esquerdo.
6. Selecione a pasta raiz deste repositório (onde está o arquivo `manifest.json`).

---

## 📁 Estrutura do Repositório

```text
├── icons/
│   ├── icon16.png       # Ícone da barra de ferramentas (16x16)
│   ├── icon48.png       # Ícone de gerenciamento de extensões (48x48)
│   └── icon128.png      # Ícone de alta definição (128x128)
├── manifest.json        # Configuração Manifest V3 e permissões de host
├── popup.html           # Estrutura da interface principal da extensão
├── popup.css            # Estilização Obsidian Liquid Glass (60-30-10)
├── popup.js             # Motor de busca Steam API + CheapShark + Câmbio
├── content.js           # Script que injeta o comparador dentro da página da Steam
└── README.md            # Documentação do projeto
```

---

## 🛠️ Tecnologias & APIs Utilizadas

* **JavaScript (ES6+) / HTML5 / CSS3** (Glassmorphism & CSS Variables)
* **Chrome Extensions API (Manifest V3):** `chrome.tabs`, `chrome.storage.local`
* **Steam Storefront API:** `storesearch`, `appdetails` e `IWishlistService`
* **CheapShark API:** Indexação de ofertas com parâmetro `steamworks=1`
* **AwesomeAPI / Open Exchange Rates:** Conversão cambial comercial atualizada

---

## 📄 Licença

Distribuído sob a licença MIT. Sinta-se livre para fazer *fork*, customizar e abrir *pull requests*!
