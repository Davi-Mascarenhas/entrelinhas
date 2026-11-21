# Candidatura à SignPath Foundation

**Rascunho para revisão e envio pelo titular. Não enviado. Aprovação não garantida.**

O programa avalia manutenção, código aberto e reputação pública verificável. O Entrelinhas é recente; a existência de código MIT e de uma release não garante admissão. Não há contratação paga nem criação de conta em nome do usuário nesta preparação.

## Dados para o formulário

- Project name: **Entrelinhas**
- Repository / project home: https://github.com/Davi-Mascarenhas/entrelinhas
- License: **MIT** — https://github.com/Davi-Mascarenhas/entrelinhas/blob/main/LICENSE
- Downloads: https://github.com/Davi-Mascarenhas/entrelinhas/releases
- Maintainer / author / reviewer / signing approver: **Davi-Mascarenhas** — https://github.com/Davi-Mascarenhas
- Code signing policy: https://github.com/Davi-Mascarenhas/entrelinhas/blob/main/docs/code-signing-policy.md
- Build system: **GitHub Actions, GitHub-hosted Windows Server 2025 runner**.
- Workflow: https://github.com/Davi-Mascarenhas/entrelinhas/actions/workflows/windows.yml
- Windows artifacts: **Entrelinhas x64 application, NSIS setup and uninstaller**.
- Contact email: **preencher pelo titular no formulário**. Não inferir endereço privado ou usar endereço noreply automaticamente.
- MFA: **o titular deve confirmar e habilitar no GitHub e na SignPath antes de enviar**.

## Descrição em inglês

Entrelinhas is an open-source, local-first desktop writing application built with Tauri, Rust, React and TypeScript. It edits Markdown and UTF-8 text files, organizes references to documents in optional projects, and offers distraction-free writing with light, dark and night-sepia themes. Saving is manual. Unsaved drafts remain in memory and are not recovered after the application closes.

The Windows distribution is a per-user NSIS installer. It registers optional Open With integration for Markdown and text files without overriding existing default applications. It includes an uninstaller and preserves personal documents and application data by default. The application checks for updates only after the user explicitly requests and authorizes a connection to GitHub. Downloads are verified using the Tauri updater's package signature and signed version. No documents or drafts are transmitted.

We request free code signing for the application's own Windows executables and installer, built from this public repository on GitHub-hosted runners. We will use origin verification, MFA and manual approval for every production signing request, and publish the required attribution once approval and production signing are actually active. No third-party executables will be signed under the project's certificate policy.

## Envio e ativação

1. Revisar os dados, confirmar email/MFA e os [termos](https://signpath.org/terms). Abrir o [formulário oficial](https://signpath.org/apply) e enviar a candidatura como titular.
2. Após aceite, instalar a GitHub App somente no repositório necessário, vincular o projeto ao build system GitHub.com, configurar os responsáveis e a política de aprovação manual.
3. Registrar organização, project slug, signing-policy slug e artifact-configuration slug do serviço; guardar o token em `SIGNPATH_API_TOKEN` nos secrets do GitHub. Não colocar tokens ou certificados privados no repositório.
4. Usar o hook `bundle.windows.signCommand` do Tauri para a assinatura dos executáveis próprios durante o empacotamento. A configuração deve cobrir aplicativo, desinstalador gerado e instalador final. O NSIS não aparece como formato composto com assinatura interna na referência da SignPath: assinar apenas o setup externo não prova que os executáveis internos estão assinados.
5. Para cada arquivo solicitado pelo hook, publicar o artefato intermediário no GitHub Actions e usar a [ação oficial de solicitação](https://docs.signpath.io/trusted-build-systems/github) com o artifact ID e verificação de origem. Aguardar aprovação manual, baixar o resultado e só então continuar o empacotamento. Revisar a configuração de artefatos gerada para restringir nomes e metadados aos arquivos do Entrelinhas.
6. Conferir `Get-AuthenticodeSignature` com status `Valid`, certificado confiável e carimbo de tempo no aplicativo, desinstalador instalado e setup final; repetir os testes de instalação/atualização/desinstalação nos bytes assinados.
7. Gerar a assinatura `.sig` do atualizador **depois** de Authenticode, pois a assinatura Windows altera os bytes do setup. Publicar esses mesmos bytes, checksums e manifesto por último. Não reutilizar o checksum ou a `.sig` de um setup ainda não assinado.

O workflow atual permanece sem solicitação à SignPath até a aprovação e a integração revisada. Não habilitar uma etapa que anuncie assinatura com credenciais ausentes, certificado de teste ou somente assinatura externa parcial.
