# Validação do Entrelinhas no Windows

O instalador é x64 e ainda não possui assinatura Authenticode. Os pacotes de atualização possuem assinatura criptográfica própria. O workflow `Windows installer` executa testes em Windows Server 2025 com WebView2. Ele publica o instalador somente como artefato validado quando todo o job passa; logs, capturas do wizard e das telas do app ficam em `windows-test-evidence`. O SHA do commit e os checksums acompanham o artefato.

## Teste automatizado

O wrapper da CI cria uma conta temporária comum, executa os testes nessa conta e a remove ao final. O acesso ao desktop de teste é restaurado ao terminar. Isso permite testar o WebView2 recente sem elevação e sem modificar políticas de depuração do Windows. O roteiro recusa execução sobre uma instalação ou biblioteca existente.

O roteiro abre o wizard nos seis grupos de idioma, percorre as nove variantes, captura os menus e as boas-vindas traduzidas e confirma o cancelamento. Português, espanhol e chinês têm uma segunda escolha de variante. Em seguida instala silenciosamente em uma pasta com espaços e acentos e verifica o registro de “Abrir com”, o atalho e a preservação dos padrões anteriores. As nove escolhas do wizard também são conferidas na primeira abertura do aplicativo.

O aplicativo instalado é operado pelo Microsoft Edge WebDriver na versão correspondente ao WebView2. São verificados: primeira abertura, Markdown/TXT, UTF-8 e nomes internacionais, salvamento manual, renomeação, rascunhos preservados na janela e descartados ao fechar, instância única, guias sem duplicação, temas, preferências e duplo clique na barra. Também verifica as nove variantes em seis idiomas, créditos, personalização de atalhos, comandos com barra, paleta de cores imediata, edição do título na barra, Esc e barra de formatação no modo Zen nas duas laterais. O roteiro também testa reinstalação e desinstalação, preservando biblioteca e documentos. A tela de padrões do Windows não é automatizada para forçar uma associação.

## Aprovação manual em Windows 11 x64

Para a conferência manual em uma máquina Windows 11, registrar edição/build do Windows, versão do WebView2, versão do app e SHA-256 do instalador e verificar:

- [ ] Instalar por usuário sem elevação do aplicativo; conferir os seis grupos e as nove variantes do wizard, logo e artes em escala de 100%, 150% e 200%.
- [ ] Cancelar antes de instalar e confirmar que o aplicativo não foi registrado.
- [ ] Testar instalação com WebView2 presente e em máquina limpa sem WebView2, com internet.
- [ ] Abrir o aplicativo pelo menu Iniciar e pelo explorador sem surgir console; confirmar que não depende de um terminal aberto. Escolher cada tema e recusar a alteração do padrão.
- [ ] Em Sobre, recusar e autorizar a consulta. Conferir que não consulta automaticamente nem baixa antes do clique. Testar atualização da versão instalada para outra versão assinada de teste, salvamento/cancelamento dos rascunhos e preservação de projetos/preferências.
- [ ] Conferir o Entrelinhas em “Abrir com” para MD, Markdown e TXT; abrir arquivos com espaços, acentos e caracteres japoneses com o app aberto e fechado.
- [ ] Usar “Abrir configurações do Windows”, selecionar os formatos na tela do sistema e voltar ao app; conferir que o status só indica padrão após a escolha.
- [ ] Abrir/salvar pelo explorador, salvar novamente, salvar como, renomear sem substituir outro arquivo, inserir imagem e reabrir Markdown com sua pasta de recursos.
- [ ] Confirmar arraste da janela e duplo clique nas duas regiões livres da barra, preservando botões e edição do título.
- [ ] Atualizar/reinstalar com projetos e preferências existentes; confirmar que documentos e padrões foram preservados.
- [ ] Desinstalar sem apagar dados; confirmar remoção de atalhos/registro e preservação da biblioteca e dos arquivos pessoais, inclusive um arquivo salvo na pasta de instalação.

A publicação segue a validação automatizada dos pacotes finais. O usuário autorizou a 2.4.2 estável após testar a barra de ferramentas e a correção da coluna no Zen. Outras versões durante a avaliação remota permanecem em pré-release até nova autorização. Assinatura Authenticode depende da aprovação e configuração de um provedor; veja a [política de assinatura](code-signing-policy.md). Não adicionar uma exceção permanente de segurança para executar testes.

A suíte também inspeciona o subsistema gráfico do PE e confirma que o processo não possui console. Dois instaladores exclusivos de teste validam a atualização real e o reinício; pacotes adulterados, chave desconhecida e versão adulterada são rejeitados. Os builds de teste nunca são publicados.
