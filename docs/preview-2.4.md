# Prévia 2.4.0-rc.1

Esta prévia reúne o retorno visual ao abrir links, a restauração da lateral e novas variantes de idioma. A versão estável continua sendo a 2.3.0. Os documentos e as preferências existentes são preservados.

## Escrita e interface

Ctrl+clique informa imediatamente que está abrindo o navegador e confirma o envio do endereço. O aviso explica como alternar para o navegador quando o sistema não traz a janela à frente. Ele aparece também no Zen, sem cobrir os controles. Uma proteção de dois segundos evita aberturas repetidas do mesmo endereço; falhas permitem nova tentativa. A seleção e o cursor do editor permanecem onde estavam.

A lateral dos projetos volta a chegar ao fim da janela, com Configurações embaixo. O estado de salvamento, a contagem e o zoom ficam no rodapé da área do editor. A barra inferior de formatação continua centralizada em relação à janela inteira, com espaço reservado para não cobrir os últimos itens da lateral. A barra vertical permanece do lado oposto aos projetos; seus seletores agora mostram os ícones T/Aa por inteiro, inclusive com rolagem em janelas pequenas.

O recuo superior do texto no Zen foi dobrado de 28 para 56 px. A barra de formatação lateral começa a 48 px do alto; os recuos laterais e inferior continuam em 24 px.

## Seis grupos, nove variantes

| Grupo | Opções |
| --- | --- |
| Português | Português (Brasil), Português (Portugal) |
| Español | Español (Latinoamérica), Español (España) |
| 中文 | 简体中文, 繁體中文 |
| English | English |
| 日本語 | 日本語 |
| Deutsch | Deutsch |

Os três grupos com variantes abrem um pequeno menu junto ao botão, com os nomes no próprio idioma. Abrir ou cancelar esse menu não altera a escolha atual. As 461 mensagens incluem comandos, configurações, créditos, avisos e atalhos. As fontes japonesa e chinesas simplificada/tradicional acompanham o aplicativo; nenhuma fonte depende de consulta à internet.

O Windows oferece os mesmos grupos no wizard e uma segunda escolha quando há variantes; a escolha chega à primeira abertura do aplicativo. Instalações silenciosas e atualizações preservam as preferências existentes. No Linux, a escolha permanece na primeira das quatro telas de apresentação. As configurações dos dois sistemas permitem trocar de idioma depois. A troca não traduz nem modifica o conteúdo dos arquivos.

## Verificação

As verificações usam documentos fictícios, perfis descartáveis e os motores nativos. O aplicativo existente do usuário não é encerrado nem tem seus dados utilizados nos testes. O pacote de produção não inclui a feature `updater-test`.

| Camada | Resultado | Ambiente |
| --- | --- | --- |
| TypeScript / React / editor | 221 testes | Vitest |
| Backend Rust Linux | 20 testes | Ubuntu 26.10, Clippy e rustfmt |
| Backend Rust Windows | 19 testes | Windows Server 2025, Clippy e rustfmt |
| Aplicativo Linux empacotado | 70 verificações | Executável extraído do `.deb`, Tauri / WebKitGTK, sem servidor de desenvolvimento |
| Atualizador Linux | 10 verificações | Feed e chaves descartáveis; bytes do pacote final |
| Navegador padrão Linux | 3 verificações | Ctrl+clique real até Gio, com navegador falso sem rede |
| Instalador e aplicativo Windows | 54 verificações | NSIS x64, conta comum descartável, WebView2 e Edge WebDriver |

O [job Windows do código publicado](https://github.com/Davi-Mascarenhas/entrelinhas/actions/runs/45096546610) reúne logs, capturas e o instalador validado. Os relatórios JSON, hashes, assinaturas e capturas acompanham a [prévia](https://github.com/Davi-Mascarenhas/entrelinhas/releases/tag/v2.4.0-rc.1). A instalação Linux local também foi aberta em um perfil descartável: versão 2.4.0-rc.1, origem `tauri://localhost` e hash igual ao executável validado.

Uma execução Linux foi interrompida por queda da conexão WebDriver. A suíte completa passou em um novo processo; mais 30 alternâncias reais dos três cursores passaram na conferência específica, sem repetir a falha.

Os testes de idiomas percorrem as nove variantes: persistência, comandos, blocos recolhíveis, caixas, datas, créditos, atalhos e atualizações; também conferem o carregamento das três fontes CJK. Os testes de links verificam mensagens de início/sucesso/erro, bloqueio de repetição, seleção preservada e abertura real pelo navegador padrão no Linux, com um navegador falso sem acesso à rede.

A matriz visual cobre três temas, duas posições de ferramentas, três tamanhos de janela e navegação dos dois lados. Confere a centralização na janela inteira, o rodapé restrito à área de escrita, a lateral até o fim da janela e os limites dos ícones nos seletores. Os demais fluxos da [validação 2.3](validation-2.3.0.md) são repetidos, incluindo arquivos, projetos, atalhos, Esc, zoom e atualizações assinadas.

A atualização continua manual, com consentimento para consultar a internet. Prévias mostram aviso vermelho e destacam **Esperar versão estável**; a instalação exige escolha explícita.

## Capturas do pacote final

[Rodapé e lateral](screenshots/preview-2.4-footer.png) · [Confirmação do link](screenshots/preview-2.4-link.png) · [Recuo no Zen](screenshots/preview-2.4-zen.png) · [Ícones na barra lateral](screenshots/preview-2.4-toolbar-side.png).

[Variantes de português](screenshots/preview-2.4-language-pt.png) · [Variantes de espanhol](screenshots/preview-2.4-language-es.png) · [Escritas chinesas](screenshots/preview-2.4-language-zh.png) · [Interface em chinês tradicional](screenshots/preview-2.4-traditional.png) · [Variante no wizard Windows](screenshots/preview-2.4-windows-variant.png).

## Limites

As verificações automatizadas não substituem a conferência com todos os dispositivos, escalas de monitor e métodos de entrada. Pinch usa eventos nos motores nativos; uma sessão completa com candidatos de IME japonês/chinês e a conferência física no Windows 11 permanecem na [lista manual](windows-validation.md).

As assinaturas de atualização são Ed25519/Minisign, vinculadas à versão. A situação do certificado Authenticode Windows permanece descrita na [política de assinatura](code-signing-policy.md).
