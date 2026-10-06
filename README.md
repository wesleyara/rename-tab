<div align="center">

<img src="icons/icon-128.png" alt="Rename Tab" width="96" height="96" />

# Rename Tab

**Dê nomes úteis às suas abas — automaticamente, por domínio ou rota.**

![Manifest V3](https://img.shields.io/badge/Manifest-V3-6d5dfc)
![Chrome](https://img.shields.io/badge/Chrome-Chromium-4285F4?logo=googlechrome&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?logo=javascript&logoColor=black)
![Sem dependências](https://img.shields.io/badge/depend%C3%AAncias-0-success)

</div>

---

Com dez abas de `localhost` abertas, todas com o mesmo título, ninguém se acha. O **Rename Tab** resolve isso: você cria regras como *"`localhost:3333` → `[API] {title}`"* e a extensão renomeia as abas sozinha, toda vez que você abrir a página.

## ✨ Funcionalidades

- 🎯 **Regras por domínio ou rota** — `localhost:3333` ou `localhost:3333/admin`
- 🃏 **Curingas** — `*.vercel.app`, `localhost:3333/users/*`
- 🧩 **Variável `{title}`** — mantenha o título original e só adicione um prefixo: `[DEV] {title}`
- 🏆 **Regra mais específica vence** — uma regra geral e uma de rota podem conviver
- ⚡ **Funciona em SPAs** — acompanha trocas de rota e mudanças de título em tempo real
- 🔵 **Indicador no ícone** — um `•` aparece quando a aba atual está renomeada
- 👀 **Prévia ao vivo** — veja o resultado enquanto edita a regra
- 💾 **Exportar / importar** regras em JSON
- 🔒 **100% local** — nada sai do seu navegador, sem servidores nem rastreamento

## 📦 Instalação

> A extensão ainda não está na Chrome Web Store, então a instalação é manual.

1. Baixe ou clone este repositório:
   ```bash
   git clone https://github.com/wesleyara/rename-tab.git
   ```
2. Abra `chrome://extensions`
3. Ative o **Modo do desenvolvedor** (canto superior direito)
4. Clique em **Carregar sem compactação** e selecione a pasta do projeto
5. (Opcional) Fixe a extensão na barra de ferramentas 📌

Funciona em qualquer navegador baseado em Chromium (Chrome, Edge, Brave, Opera, Arc…).

## 🚀 Como usar

1. Abra a página que você quer renomear e clique no ícone da extensão
2. Clique em **Criar regra** — o campo de rota já vem sugerido (*Esta página* ou *Este domínio*)
3. Digite o título desejado (use `{title}` para manter o original)
4. Salve. Pronto: a aba é renomeada na hora e em todas as próximas visitas.

## 📐 Como as regras funcionam

| Padrão                                   | Aplica em                                      |
| ---------------------------------------- | ---------------------------------------------- |
| `localhost:3333`                         | Todas as rotas do domínio                      |
| `localhost:3333/teste`                   | `/teste` e sub-rotas (`/teste/123`)            |
| `localhost:3333/teste` + *Rota exata*    | Somente `/teste`                               |
| `*.vercel.app`                           | Qualquer subdomínio de `vercel.app`            |
| `localhost:3333/users/*`                 | Qualquer rota dentro de `/users/`              |

**Exemplos de título**

| Título da regra   | Título original da página | Resultado da aba       |
| ----------------- | ------------------------- | ---------------------- |
| `Painel Admin`    | `Dashboard`               | `Painel Admin`         |
| `[DEV] {title}`   | `Dashboard`               | `[DEV] Dashboard`      |
| `🚧 {title}`      | `Login`                   | `🚧 Login`             |

**Detalhes**

- Se mais de uma regra casar com a URL, vence a **mais específica** (padrão mais longo; rota exata desempata).
- O protocolo (`http://`) e a barra final são ignorados, assim como o `#fragmento`.
- Páginas internas do navegador (`chrome://`, Chrome Web Store etc.) não podem ser alteradas por extensões.
- Regras podem ser desativadas sem precisar excluí-las.

## 💾 Backup das regras

No menu `⋯` do popup:

- **Exportar regras (.json)** — gera um arquivo com todas as suas regras
- **Importar regras** — restaura ou mescla regras de um arquivo exportado

## 🗂️ Estrutura do projeto

```
rename-tab/
├── manifest.json        # Configuração da extensão (Manifest V3)
├── icons/               # Ícones 16/32/48/128
├── popup/
│   ├── popup.html       # Interface
│   ├── popup.css        # Estilos
│   └── popup.js         # Lista, formulário, import/export
└── src/
    ├── background.js    # Service worker (indicador no ícone, injeção inicial)
    ├── content.js       # Aplica o título e observa mudanças na página
    └── shared.js        # Lógica de casamento de regras (compartilhada)
```

## 🔐 Permissões

| Permissão          | Por quê                                                             |
| ------------------ | ------------------------------------------------------------------- |
| `storage`          | Guardar suas regras                                                 |
| `tabs`             | Ler a URL/título da aba atual para sugerir regras                   |
| `scripting`        | Aplicar o título em abas que já estavam abertas ao instalar         |
| `<all_urls>`       | Permitir que as regras funcionem em qualquer site que você escolher |

Nenhum dado é coletado ou enviado para fora do seu navegador.

## 🛠️ Desenvolvimento

Não há build nem dependências: é JavaScript puro. Edite os arquivos e clique em **🔄 Recarregar** no card da extensão em `chrome://extensions` (ou recarregue a aba para mudanças no content script).

## 🤝 Contribuindo

Issues e pull requests são bem-vindos! Para mudanças maiores, abra uma issue antes para conversarmos.

## 📄 Licença

Distribuído sob a licença [MIT](LICENSE).
