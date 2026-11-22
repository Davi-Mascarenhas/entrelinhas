# Preferências de manutenção do Entrelinhas

- O usuário quer manter a instalação Linux local deste computador na versão mais recente validada durante o desenvolvimento, inclusive prévias autorizadas.
- Ao concluir uma versão nova, compilar e executar as verificações apropriadas antes de atualizar a instalação local com `scripts/install-local.sh`. Conferir a versão instalada e o hash do executável.
- Preservar projetos, preferências e documentos. Não encerrar ou reiniciar uma janela existente que possa conter alterações não salvas. Atualizar o executável para a próxima abertura e avisar quando uma janela aberta ainda estiver executando a versão anterior.
- Essa preferência não autoriza consultas automáticas à internet pelo aplicativo: a busca de atualizações continua manual e depende da autorização apresentada na interface.
- Durante o uso remoto, publicar novas alterações somente como pré-release. A promoção a estável depende da aprovação explícita do usuário depois de testar em casa; esta preferência substitui a publicação estável por padrão anterior.
- Enviar capturas reais das mudanças visuais ao longo do trabalho, usando perfis e documentos de teste para preservar a privacidade. Incluir capturas e resultados na entrega da prévia.
- Continuar com commits incrementais `uN - descrição curta` e pushes sem force. Não promover uma prévia a estável sem a validação acordada.
