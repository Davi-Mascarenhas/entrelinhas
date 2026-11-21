# Code signing policy

## Estado atual

O Entrelinhas é um projeto MIT mantido em [Davi-Mascarenhas/entrelinhas](https://github.com/Davi-Mascarenhas/entrelinhas). Os instaladores Windows publicados até a prévia 1.2.0-rc.2 **não possuem assinatura Authenticode**. A candidatura à SignPath Foundation foi preparada, mas não foi enviada nem aprovada. Não há patrocínio ou certificado ativo confirmado.

Se a candidatura for aceita, a atribuição para as versões efetivamente assinadas será: **Free code signing provided by SignPath.io, certificate by SignPath Foundation**. Nesse programa, a identidade do certificado é SignPath Foundation; ela não deve ser apresentada como um certificado pessoal do mantenedor.

As assinaturas `.sig` das atualizações do Tauri são uma proteção independente. Elas verificam os bytes e a versão dos pacotes antes de instalar ou salvar o download. Não equivalem a Authenticode, não identificam um publicador reconhecido pelo Windows e não removem avisos do SmartScreen.

## Responsáveis e origem

- Autor, mantenedor e revisor: [Davi-Mascarenhas](https://github.com/Davi-Mascarenhas).
- Aprovador de solicitações de assinatura: o mesmo mantenedor, mediante aprovação manual de cada solicitação no serviço, caso o projeto seja aceito.
- Alterações de outros colaboradores precisam de revisão do mantenedor. As credenciais de assinatura não são disponibilizadas a builds de contribuições externas.

Somente executáveis próprios do Entrelinhas, incluindo aplicativo, instalador e desinstalador, construídos a partir deste repositório em runners hospedados pelo GitHub, poderão ser submetidos à assinatura. Não assinar componentes de terceiros com a identidade do projeto. A origem precisa ser verificada pela integração oficial da SignPath com o GitHub; o upload manual de um arquivo sem proveniência não substitui essa verificação.

Antes de ativar o programa, o titular deverá confirmar autenticação de dois fatores no GitHub e na SignPath, aceitar os termos e registrar os responsáveis na conta do serviço. Essa confirmação ainda está pendente.

## Privacidade

O programa não transfere documentos, rascunhos, projetos ou preferências para servidores. A busca de atualizações só ocorre após um pedido e autorização explícitos; o download depende de outra ação no mesmo fluxo. O GitHub recebe os dados normais da conexão, como endereço IP e agente HTTP. Não há consulta automática, conta do aplicativo, telemetria própria ou sincronização.

O instalador Windows pode baixar o bootstrapper oficial do WebView2 quando o runtime não estiver presente. O runtime e os serviços de atualização do sistema seguem suas próprias políticas; não são o atualizador do Entrelinhas. Recursos locais e fontes do aplicativo são incluídos no pacote.

Políticas dos serviços envolvidos: [GitHub](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement), [Microsoft](https://privacy.microsoft.com/privacystatement) e [SignPath](https://signpath.io/privacy-policy). O envio de artefatos para assinatura é uma atividade do mantenedor, não uma transferência feita pelo app instalado.

## Verificação das versões

Cada release informa se há Authenticode, os checksums e os testes executados. Somente arquivos cujo status de assinatura tenha sido conferido poderão ser anunciados como assinados. Uma assinatura reconhecida não garante a ausência imediata de avisos: o [SmartScreen também considera reputação](https://learn.microsoft.com/pt-br/windows/apps/package-and-deploy/smartscreen-reputation).

Fontes: [condições da Foundation](https://signpath.org/terms) e [integração GitHub](https://docs.signpath.io/trusted-build-systems/github).
