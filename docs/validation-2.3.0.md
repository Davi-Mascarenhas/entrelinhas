# Validação da versão 2.3.0

Os testes usam documentos fictícios, diretórios descartáveis e perfis isolados. O aplicativo existente do usuário não é encerrado nem tem sua biblioteca usada nos testes. O instalador publicado é produzido sem a feature `updater-test`.

| Camada | Resultado | Ambiente |
| --- | --- | --- |
| TypeScript / React / editor | 198 testes | Vitest, incluindo seleção, Markdown, blocos, atalhos, i18n, diálogos e atualizador |
| Backend Rust Linux | 20 testes | Ubuntu 26.10, Clippy e rustfmt |
| Backend Rust Windows | 19 testes | Windows Server 2025, Clippy e rustfmt |
| Aplicativo Linux empacotado | 70 verificações | Executável extraído do `.deb`, Tauri / WebKitGTK, sem servidor de desenvolvimento |
| Atualizador Linux | 10 verificações | Feed e chaves de teste isolados; bytes reais do pacote final |
| Navegador padrão Linux | 3 verificações | Ctrl+clique real até Gio, com navegador falso que registra a URL sem acessar a rede |
| Instalador e aplicativo Windows | 54 verificações | NSIS x64, conta comum descartável, WebView2 e Edge WebDriver |

O [job Windows do código publicado](https://github.com/Davi-Mascarenhas/entrelinhas/actions/runs/45075701101) reúne logs, capturas e o instalador validado. Os relatórios JSON, hashes, assinaturas e capturas também acompanham a [release 2.3.0](https://github.com/Davi-Mascarenhas/entrelinhas/releases/tag/v2.3.0).

## Regressões corrigidas

- **Esc / Zen:** 24 pressionamentos reais em parágrafo, lista, checklist, caixa informativa, bloco recolhível e tabela, alternando a interface sem modificar o documento. Busca, comandos com barra, prévia de links, cores e edição do título recebem Esc primeiro.
- **Links:** endereço sem prefixo, aplicação na seleção original, cancelamento, desfazer, gravação/leitura, edição/remoção e rejeição de protocolos executáveis. Mouse e clique simples mostram a prévia local; Ctrl+clique real solicita abertura no navegador padrão. O transporte desse comando é interceptado nos testes comuns para não abrir sites; no Linux há o teste adicional da integração real com o SO.
- **Zoom:** botão percorre até 200%, Ctrl+0 restaura 100%, Ctrl+roda reais aumentam e reduzem o texto e respeitam 50–200%. Deltas pequenos de pinch são acumulados; gestos WebKit são tratados sem somar o mesmo gesto duas vezes. Tamanhos explícitos acompanham a ampliação; os controles mantêm seu tamanho.
- **Barras:** 18 combinações por plataforma: três temas, duas posições e janelas de 1180×780, 900×600 e 720×480. Navegação dos dois lados, ocultação do painel de projetos, centralização na janela inteira, uma linha na posição inferior e acesso ao primeiro/último controle. A rolagem usa as cores do aplicativo e não mostra setas do sistema.
- **Blocos e idiomas:** vinte comandos com barra, busca traduzida, mouse e teclado real nos cinco idiomas. Recolher/reabrir preserva o conteúdo; Enter no título abre o corpo, linhas vazias permitem sair dos blocos; desfazer/refazer e Markdown preservam estrutura e marcas. Imagens só são gravadas após salvar.
- **Atualizações:** ausência de consultas automáticas, consentimento recusado/aceito, estável com prioridade, versões iguais/antigas, manifesto inválido, falha de servidor, aviso vermelho de prévia e ação segura destacada. Esperar não baixa, descarta inclusive uma prévia já baixada e impede instalação posterior sem nova consulta. Confirmação explícita baixa pacote assinado; bytes, chave ou versão adulterados são rejeitados.

## Demais fluxos

A suíte também verifica primeira abertura, seleção de idioma/tema, créditos, atalhos editáveis e conflitos entre combinações, abertura de Markdown/TXT pelo explorador, associação opcional de formatos, instância única, guias sem duplicação, salvar/salvar como, renomear, conflitos externos, arquivos somente leitura, busca/substituição, projetos, formatação, cores, tabelas, imagens relativas, cursores, janela e tela cheia. Um documento de 280 mil caracteres é incluído no teste Linux.

No Windows são operados o wizard nos cinco idiomas e o aplicativo instalado, incluindo ausência de console. Reinstalação, desinstalação e atualização assinada real usam instaladores de teste isolados e preservam documentos, projetos e preferências. Padrões de arquivo do usuário não são forçados.

## Capturas do pacote final

[Barra inferior](screenshots/stable-2.3-toolbar-bottom.png) · [Barra lateral no Windows, sem setas do sistema](screenshots/stable-2.3-windows-toolbar.png) · [Links](screenshots/stable-2.3-links.png) · [Configurações da barra](screenshots/stable-2.3-settings.png). O aviso de atualização nas capturas da release usa uma versão fictícia de teste.

## Limites

Pinch foi validado com eventos automatizados nos motores reais, sem um trackpad físico. Uma sessão completa com candidatos de IME japonês/chinês, escalas variadas de monitor, uma máquina limpa sem WebView2 e a tela interativa de aplicativos padrão permanecem na [conferência manual de Windows 11](windows-validation.md). A validação não comprova todos os dispositivos e configurações possíveis.

As assinaturas dos pacotes de atualização são Ed25519/Minisign e vinculadas à versão. Elas não são Authenticode; a situação do certificado Windows continua documentada na [política de assinatura](code-signing-policy.md).
