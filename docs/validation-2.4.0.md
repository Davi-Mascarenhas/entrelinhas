# Validação da versão 2.4.0

A 2.4.0 estável reúne os nove catálogos de idioma em seis grupos, o retorno visual ao abrir links, o recuo de 56 px no Zen, a lateral até o fim da janela e a formatação centralizada. Os pacotes de produção são compilados sem a feature `updater-test`.

| Camada | Resultado | Ambiente |
| --- | --- | --- |
| TypeScript / React / editor | 221 testes | Vitest, incluindo os menus de variantes |
| Backend Rust Linux | 20 testes | Ubuntu 26.10, Clippy e rustfmt |
| Backend Rust Windows | 19 testes | Windows Server 2025, Clippy e rustfmt |
| Aplicativo Linux empacotado | 70 verificações | Executável extraído do `.deb`, Tauri / WebKitGTK, sem servidor de desenvolvimento |
| Atualizador Linux | 10 verificações | Feed e chaves descartáveis; bytes do pacote final |
| Navegador padrão Linux | 3 verificações | Ctrl+clique real até Gio, com navegador falso sem rede |
| Instalador e aplicativo Windows | 54 verificações | NSIS x64, conta comum descartável, WebView2 e Edge WebDriver |

O [job Windows do código publicado](https://github.com/Davi-Mascarenhas/entrelinhas/actions/runs/45177861658) fornece o instalador validado, os logs e as capturas. A [release 2.4.0](https://github.com/Davi-Mascarenhas/entrelinhas/releases/tag/v2.4.0) contém pacotes, assinaturas, hashes e relatórios dos dois sistemas.

As suítes percorrem as nove variantes de idioma no aplicativo e no wizard Windows, carregam as fontes CJK locais e preservam documento e histórico ao trocar a interface. Repetem os vinte comandos com barra, blocos recolhíveis, caixas, datas, links, atalhos editáveis, Esc, zoom, projetos, arquivos, conflitos externos, renomeação e abertura pelo sistema.

A matriz de barras verifica três temas, duas posições e três tamanhos de janela, com projetos dos dois lados. O atualizador verifica consentimento, ausência de consultas automáticas, prioridade da estável, aviso de prévia, cancelamento e rejeição de pacotes, chaves ou versões adulterados. No Windows, a atualização assinada real usa instaladores de teste isolados e preserva arquivos e preferências.

Os testes Linux aguardam a posição do link estabilizar após a animação do Zen antes de enviar Ctrl+clique. Esse ajuste afeta somente a automação. Os commits do código de produção e dos testes usados estão registrados nos metadados da release.

Todos os documentos e perfis são descartáveis. A janela existente do usuário é preservada. A instalação Linux local tem versão e hash conferidos e é aberta em um perfil separado, com origem `tauri://localhost`.

## Capturas

[Aplicativo](screenshots/stable-2.4.0-main.png) · [Barra inferior](screenshots/stable-2.4.0-toolbar-bottom.png) · [Barra lateral](screenshots/stable-2.4.0-toolbar-side.png) · [Español](screenshots/stable-2.4.0-language-es.png) · [繁體中文](screenshots/stable-2.4.0-language-zh-TW.png) · [Zen](screenshots/stable-2.4.0-zen.png) · [Windows](screenshots/stable-2.4.0-windows-toolbar.png).

## Limites

Pinch usa eventos nos motores nativos; uma sessão completa com candidatos de IME e a conferência em dispositivos físicos permanecem na [lista manual Windows 11](windows-validation.md). Os testes não cobrem todas as configurações de monitor e sistema. A assinatura de atualização é Ed25519/Minisign; a situação de Authenticode está na [política de assinatura](code-signing-policy.md).
