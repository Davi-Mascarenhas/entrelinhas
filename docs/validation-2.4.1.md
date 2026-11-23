# Validação da versão 2.4.1

A 2.4.1 adiciona um fundo sólido à barra inferior de formatação. Ao avançar sobre a lateral em janelas menores, ele cobre a divisória e o conteúdo por trás dos controles. A cor acompanha o editor nos três temas, e o acabamento arredondado mantém a posição dos botões e a centralização na janela inteira. O limite inferior do fundo preserva o texto de Configurações.

A 2.4.0 foi publicada antes dessa alteração. Esta correção mantém os nove catálogos de idioma, os atalhos, o Zen e os demais fluxos da versão anterior. Os pacotes de produção são compilados sem a feature `updater-test`.

| Camada | Resultado | Ambiente |
| --- | --- | --- |
| TypeScript / React / editor | 221 testes | Vitest |
| Backend Rust Linux | 20 testes | Ubuntu 26.10, Clippy e rustfmt |
| Backend Rust Windows | 19 testes | Windows Server 2025, Clippy e rustfmt |
| Aplicativo Linux empacotado | 70 verificações | Executável extraído do `.deb`, Tauri / WebKitGTK, sem servidor de desenvolvimento |
| Atualizador Linux | 10 verificações | Feed e chaves descartáveis; bytes do pacote final |
| Navegador padrão Linux | 3 verificações | Ctrl+clique real até Gio, com navegador falso sem rede |
| Instalador e aplicativo Windows | 54 verificações | NSIS x64, conta comum descartável, WebView2 e Edge WebDriver |

O [job Windows do código publicado](https://github.com/Davi-Mascarenhas/entrelinhas/actions/runs/45198087995) fornece instalador, logs e capturas. A [release 2.4.1](https://github.com/Davi-Mascarenhas/entrelinhas/releases/tag/v2.4.1) reúne os pacotes, assinaturas, hashes e relatórios. A cobertura anterior está na [validação 2.4.0](validation-2.4.0.md).

A matriz visual verifica 18 combinações em cada sistema: três temas, ferramentas embaixo/na lateral e janelas de 1180×780, 900×600 e 720×480, com projetos dos dois lados. Além da centralização, rolagem e acesso ao primeiro/último controle, verifica que o fundo inferior é opaco, segue a cor do tema e não encobre o texto de Configurações. Há capturas adicionais de 920×780 para comparar a correção com a 2.4.0 no mesmo documento fictício.

As suítes completas repetem as nove variantes de idioma, o wizard, os comandos com barra, blocos, links, atalhos, zoom, Esc, arquivos, projetos, renomeação, conflitos e atualizações assinadas. São conferidos consentimento, ausência de consultas automáticas, aviso de pré-release e rejeição de pacotes, chaves ou versões adulterados.

A automação aguarda a posição dos alvos estabilizar antes dos cliques e da digitação. A suíte Linux final foi executada na sessão Wayland, com o pacote de produção; tentativas anteriores e os diagnósticos foram preservados em `artifacts/linux-production-2.4.1`.

Os testes usam perfis e documentos descartáveis. A instalação Linux local é atualizada sem encerrar a janela existente e é conferida por versão, hash e execução isolada com origem `tauri://localhost`.

## Capturas dos pacotes finais

[Barra em janela de 920×780](screenshots/stable-2.4.1-toolbar-bottom.png) · [Claro em 720×480](screenshots/stable-2.4.1-toolbar-light.png) · [Escuro em 720×480](screenshots/stable-2.4.1-toolbar-dark.png) · [Windows](screenshots/stable-2.4.1-windows-toolbar.png) · [Barra lateral](screenshots/stable-2.4.1-toolbar-side.png) · [Zen](screenshots/stable-2.4.1-zen.png).

## Limites

Pinch usa eventos nos motores nativos; uma sessão completa com candidatos de IME e a conferência em dispositivos físicos permanecem na [lista manual Windows 11](windows-validation.md). A assinatura de atualização é Ed25519/Minisign; a situação de Authenticode permanece na [política de assinatura](code-signing-policy.md).
