# Atualizações manuais

A 2.4.3-rc.1 está no canal de prévias; a 2.4.2 permanece no canal estável. A confirmação de pré-release e a ação principal **Esperar versão estável** foram revalidadas no Linux e no Windows. [Relatório da prévia](validation-2.4.3-rc.1.md).

Em **Configurações → Sobre**, **Procurar atualização** pede autorização para consultar versões estáveis e pré-releases no GitHub. Recusar não faz requisições. Cada nova consulta exige outra autorização; abrir o app ou as configurações não procura versões automaticamente.

A partir da 2.3.0-rc.2, uma atualização estável mais nova tem prioridade. Na ausência dela, uma pré-release mais nova pode ser oferecida, com aviso vermelho, pergunta explícita e **Esperar versão estável** como ação principal. **Atualizar para pré-release** aparece como uma ação de texto secundária. Esperar descarta a oferta e qualquer pacote pendente, inclusive os bytes já baixados após uma instalação cancelada. Não baixa nem instala nesse clique e não agenda consultas.

Uma versão disponível é apresentada antes de baixar. No Windows, **Baixar e instalar** verifica o pacote, resolve alterações não salvas e inicia a atualização NSIS. O app é fechado e reaberto em uma nota vazia. O reinício não reapassa os argumentos dos documentos da abertura original ao instalador. Cancelar a decisão sobre um rascunho mantém o pacote verificado em memória para tentar novamente, sem perder o texto. Nenhum rascunho é escrito em uma recuperação automática.

No Linux, **Baixar pacote .deb** solicita o destino, verifica a assinatura e salva o pacote atomicamente. O sistema continua responsável pela instalação; o aplicativo não executa sudo nem substitui um binário em execução. Quem usa a instalação local pelo script deve seguir o mesmo método de instalação para evitar atalhos duplicados.

A versão 1.2.0-rc.1 ainda não possui esse mecanismo e precisa receber o instalador novo manualmente uma vez.

## Manifestos e assinatura

Os arquivos `updates/preview.json` e `updates/stable.json` usam o formato estático do Tauri: versão SemVer, descrição, data e entradas `windows-x86_64` / `linux-x86_64` com URL e conteúdo da assinatura `.sig`. A partir da rc.2, a consulta verifica o estável primeiro e consulta o canal de prévias quando não há uma estável mais nova. O canal estável aceita somente versões estáveis. Uma promoção estável atualiza ambos; uma nova prévia nunca substitui o manifesto estável. Versões iguais ou antigas não são oferecidas. Clientes até a 2.2 estável mantêm a busca apenas por estáveis e recebem a 2.3.0 estável normalmente. Depois dessa atualização, passam a consultar os dois canais.

O backend acessa exclusivamente os endpoints HTTPS do repositório oficial. URLs e metadados vêm da consulta guardada no backend, não de um caminho de instalador enviado pela interface. O pacote precisa ser verificado pela chave pública incluída no app e a assinatura precisa vincular a mesma versão anunciada. Falhas não são anunciadas como “atualizado”.

A chave pública está em `updates/public.key`. A chave privada criptografada e a senha estão nos secrets `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. A cópia local protegida fica em `~/.local/share/entrelinhas-signing/`, fora do repositório; o titular deve manter um backup privado dessa pasta. Não perder ou substituir a chave ao atualizar: clientes já instalados confiam na chave pública existente.

O Windows gera `.sig` no build. Para o `.deb`, usar `tauri signer sign --app-version <versão>` com a chave nos secrets/ambiente, sem imprimir seu conteúdo. Essa assinatura não é Authenticode: veja a [política de assinatura Windows](code-signing-policy.md).

## Publicação

O usuário autorizou publicar a 2.4.2 estável após os testes dos pacotes finais, com a barra mais clara e centralizada e a correção do recuo ao entrar e sair do Zen. Para outras versões durante avaliações remotas, manter novas alterações em pré-release até nova autorização de promoção.

1. Compilar, testar e verificar os pacotes finais. Confirmar que builds publicados não habilitam a feature `updater-test` nem transporte inseguro.
   Para prévias Debian, executar `python3 scripts/prepare-deb-preview.py` depois de `npm run package` e antes de assinar. O campo Debian usa `~` (ex.: `2.3.0~rc.1`), mantendo o SemVer do aplicativo e o nome do arquivo. Isso garante que a futura `2.3.0` seja considerada mais nova pelo gerenciador de pacotes; o script verifica que o executável não foi alterado.
2. Publicar a release e os pacotes `.exe` / `.deb`, suas `.sig`, SHA256SUMS e relatórios. Conferir os downloads e versões.
3. Atualizar os manifestos somente após os arquivos públicos estarem disponíveis. O gerador de manifestos deve conferir hashes, assinaturas e versão; publicar o commit incremental e verificar o endpoint remoto.
4. Para uma prévia, atualizar apenas `preview.json`. Para uma estável, atualizar ambos; manter as entradas completas por plataforma.

O gerador está em `scripts/prepare-update-manifest.py` e requer as dependências de `scripts/requirements-release.txt`. Exemplo após publicar os artefatos: `python3 scripts/prepare-update-manifest.py --version 2.3.0 --assets artifacts/release-2.3.0 --channel stable --notes "Comandos de escrita, edição direta e modo Zen."`. Ele verifica as assinaturas Ed25519/Minisign, a versão assinada e os hashes publicados pelo GitHub antes de escrever o manifesto.

Os canais estável e de prévias oferecem a 2.4.2 estável, com Windows e Linux. Isso permite atualizar da prévia para a versão final. Uma próxima prévia atualizará somente o seu canal e preservará a indicação de versão estável mais recente no GitHub. Nenhuma prévia é baixada automaticamente; ela exige a escolha explícita na ação secundária.
