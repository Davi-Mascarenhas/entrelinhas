# Atualizações manuais

Em **Configurações → Sobre**, **Procurar atualização** pede autorização para acessar o GitHub. Recusar não faz requisições. Cada nova consulta exige outra autorização; abrir o app ou as configurações não procura versões automaticamente.

Uma versão disponível é apresentada antes de baixar. No Windows, **Baixar e instalar** verifica o pacote, resolve alterações não salvas e inicia a atualização NSIS. O app é fechado e reaberto em uma nota vazia. O reinício não reapassa os argumentos dos documentos da abertura original ao instalador. Cancelar a decisão sobre um rascunho mantém o pacote verificado em memória para tentar novamente, sem perder o texto. Nenhum rascunho é escrito em uma recuperação automática.

No Linux, **Baixar pacote .deb** solicita o destino, verifica a assinatura e salva o pacote atomicamente. O sistema continua responsável pela instalação; o aplicativo não executa sudo nem substitui um binário em execução. Quem usa a instalação local pelo script deve seguir o mesmo método de instalação para evitar atalhos duplicados.

A versão 1.2.0-rc.1 ainda não possui esse mecanismo e precisa receber o instalador novo manualmente uma vez.

## Manifestos e assinatura

Os arquivos `updates/preview.json` e `updates/stable.json` usam o formato estático do Tauri: versão SemVer, descrição, data e entradas `windows-x86_64` / `linux-x86_64` com URL e conteúdo da assinatura `.sig`. Builds de prévia consultam o primeiro; estáveis consultam o segundo. Uma promoção estável atualiza ambos; uma nova prévia nunca deve substituir o manifesto estável. Versões iguais ou antigas não são oferecidas. Versões estáveis rejeitam prévias.

O backend acessa exclusivamente os endpoints HTTPS do repositório oficial. URLs e metadados vêm da consulta guardada no backend, não de um caminho de instalador enviado pela interface. O pacote precisa ser verificado pela chave pública incluída no app e a assinatura precisa vincular a mesma versão anunciada. Falhas não são anunciadas como “atualizado”.

A chave pública está em `updates/public.key`. A chave privada criptografada e a senha estão nos secrets `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. A cópia local protegida fica em `~/.local/share/entrelinhas-signing/`, fora do repositório; o titular deve manter um backup privado dessa pasta. Não perder ou substituir a chave ao atualizar: clientes já instalados confiam na chave pública existente.

O Windows gera `.sig` no build. Para o `.deb`, usar `tauri signer sign --app-version <versão>` com a chave nos secrets/ambiente, sem imprimir seu conteúdo. Essa assinatura não é Authenticode: veja a [política de assinatura Windows](code-signing-policy.md).

## Publicação

Durante a avaliação remota solicitada pelo usuário, publicar novas alterações somente como pré-release. A promoção para estável depende da aprovação explícita depois dos testes em casa. Manter o canal estável e a release mais recente na versão 2.2.0 até essa aprovação.

1. Compilar, testar e verificar os pacotes finais. Confirmar que builds publicados não habilitam a feature `updater-test` nem transporte inseguro.
   Para prévias Debian, executar `python3 scripts/prepare-deb-preview.py` depois de `npm run package` e antes de assinar. O campo Debian usa `~` (ex.: `2.3.0~rc.1`), mantendo o SemVer do aplicativo e o nome do arquivo. Isso garante que a futura `2.3.0` seja considerada mais nova pelo gerenciador de pacotes; o script verifica que o executável não foi alterado.
2. Publicar a release e os pacotes `.exe` / `.deb`, suas `.sig`, SHA256SUMS e relatórios. Conferir os downloads e versões.
3. Atualizar os manifestos somente após os arquivos públicos estarem disponíveis. O gerador de manifestos deve conferir hashes, assinaturas e versão; publicar o commit incremental e verificar o endpoint remoto.
4. Para uma prévia, atualizar apenas `preview.json`. Para uma estável, atualizar ambos; manter as entradas completas por plataforma.

O gerador está em `scripts/prepare-update-manifest.py` e requer as dependências de `scripts/requirements-release.txt`. Exemplo após publicar os artefatos: `python3 scripts/prepare-update-manifest.py --version 2.2.0 --assets artifacts/release-2.2.0 --channel stable --notes "Comandos de escrita, edição direta e modo Zen."`. Ele verifica as assinaturas Ed25519/Minisign, a versão assinada e os hashes publicados pelo GitHub antes de escrever o manifesto.

O canal estável aponta para a 2.2.0 e o canal de prévias para a 2.3.0-rc.1, ambos com Windows e Linux. Clientes estáveis não recebem a prévia automaticamente. Para avaliá-la, instalar o pacote da pré-release; as próximas consultas manuais dessa instalação acompanham o canal de prévias.

## Testes

A suíte de interface testa autorização, progresso, duplicações, erros e preparação para reiniciar. Os testes nativos usam servidor loopback, chaves descartáveis, perfis isolados e pacotes de teste. Recusam bytes adulterados, chave errada e versão alterada. No Windows, duas versões próprias de teste exercitam instalação e reinício reais, além de preservação dos documentos, projetos e preferências.

Overrides de endpoint/chave só existem em builds de desenvolvimento ou com a feature explícita `updater-test`. A feature e o transporte HTTP são exclusivos dos instaladores de teste da CI e não podem ser usados nos arquivos de release.
