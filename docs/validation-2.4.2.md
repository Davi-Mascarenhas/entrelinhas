# Validação da versão 2.4.2

A 2.4.2 clareia a superfície da barra inferior, centraliza os controles e corrige o recuo da coluna quando os projetos desaparecem no modo Zen. A entrada libera a largura ocupada pela navegação e pelas guias ocultas; a saída restaura a coluna com uma transição de 200 ms. As preferências e o conteúdo do documento permanecem preservados.

| Camada | Resultado | Ambiente |
| --- | --- | --- |
| TypeScript / React / editor | 226 testes | Vitest, incluindo layouts Zen em quatro larguras |
| Backend Rust Linux | 20 testes | Ubuntu 26.10, Clippy e rustfmt |
| Backend Rust Windows | 19 testes | Windows Server 2025, Clippy e rustfmt |
| Aplicativo Linux empacotado | 71 verificações | Executável extraído do `.deb`, Tauri / WebKitGTK |
| Atualizador Linux | 10 verificações | Feed e chaves descartáveis; pacote final |
| Navegador padrão Linux | 3 verificações | Ctrl+clique real até Gio, sem acesso a sites |
| Instalador e aplicativo Windows | 55 verificações | NSIS x64, conta comum descartável, WebView2 e Edge WebDriver |

O [job Windows do código publicado](https://github.com/Davi-Mascarenhas/entrelinhas/actions/runs/45294985944) reúne instalador, logs e evidências.

A suíte Linux usa `scripts/test-desktop-direct.py`: o WebKitWebDriver nativo executa as mesmas ações diretamente no aplicativo, com o mesmo mapeamento de capacidades usado pelo tauri-driver 2.1.0. Isso evita as interrupções observadas no proxy HTTP local; nenhum comando que modifica o documento é repetido automaticamente.

Os pacotes de produção não incluem `updater-test`. A [release 2.4.2](https://github.com/Davi-Mascarenhas/entrelinhas/releases/tag/v2.4.2) reúne assinaturas, hashes, relatórios e capturas dos dois sistemas.

## Recuo no Zen

A reprodução usa janelas de 720×480 e 920×640, projetos à esquerda/direita e ferramentas embaixo/na lateral: oito combinações em cada sistema. Para cada uma, mede a coluna com projetos, mede a referência sem projetos, volta a mostrar a navegação e digita uma tecla real para entrar no Zen. Confere que a largura reservada aos projetos chega a zero e que o texto coincide com a referência sem navegação.

Ao sair por Esc, a coluna deve recuperar as mesmas coordenadas e largura. A preferência de projetos abertos continua verdadeira, e o documento mantém o texto digitado. A entrada e a saída também são repetidas por Esc. Os dados estão em `Zen-layout-results.json` na release.

Os testes de cálculo percorrem os dois lados, as três posições de guias, as duas posições de ferramentas e quatro larguras de janela, sem modificar o objeto de preferências. Também conferem que ferramentas ocultas no Zen liberam sua reserva.

## Barra de ferramentas

A matriz visual cobre três temas, duas posições e três tamanhos de janela. Verifica a superfície opaca no tom do tema, a ausência de borda/sombra, o centro vertical de botões, rótulos e ícones, a centralização horizontal na janela e o acesso a Configurações. A rolagem horizontal tem sua altura compensada no alinhamento dos controles.

A suíte completa repete idiomas, wizard, créditos, atalhos, vinte comandos com barra, blocos, Esc, links, zoom, arquivos, projetos, renomeação, conflitos e atualizações assinadas. Nenhuma consulta à internet é feita pelo aplicativo sem a autorização manual prevista na interface.

## Capturas dos pacotes finais

[Barra mais clara](screenshots/stable-2.4.2-toolbar-bottom.png) · [Claro](screenshots/stable-2.4.2-toolbar-light.png) · [Escuro](screenshots/stable-2.4.2-toolbar-dark.png) · [Projetos abertos](screenshots/stable-2.4.2-zen-before.png) · [Zen sem recuo residual](screenshots/stable-2.4.2-zen.png) · [Coluna restaurada](screenshots/stable-2.4.2-zen-restored.png) · [Windows](screenshots/stable-2.4.2-windows-toolbar.png).

## Limites e preservação

Os testes usam documentos e perfis descartáveis. A instalação Linux local é conferida por versão, hash e uma abertura isolada com origem `tauri://localhost`. A janela existente do usuário não é encerrada para trocar o executável.

Pinch e composição são exercitados por automação; dispositivos físicos, candidatos completos de IME e outras escalas de monitor permanecem na [conferência manual Windows 11](windows-validation.md). As assinaturas de atualização são Ed25519/Minisign; a situação de Authenticode está na [política de assinatura](code-signing-policy.md).
