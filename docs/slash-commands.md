# Comandos de escrita

A partir da **2.3.0 estável**, digite `/` no início de uma linha ou depois de um espaço. Continue digitando para filtrar as vinte opções. Use as setas e Enter ou clique na opção. Esc fecha o menu e preserva o texto; desfazer restaura o comando aplicado.

| Comando em português | O que faz |
| --- | --- |
| `/lista` | Checklist com tarefas marcáveis. |
| `/tabela` | Tabela de três linhas e três colunas, com cabeçalho. |
| `/marcadores` | Lista com marcadores. |
| `/numerada` | Lista numerada. |
| `/titulo` ou `/h1` | Título grande. |
| `/h2` | Título médio. |
| `/h3` | Título pequeno. |
| `/citacao` | Bloco de citação. |
| `/codigo` | Bloco de código. |
| `/separador` | Linha entre duas ideias. |
| `/texto` | Parágrafo comum. |
| `/recolhivel` | Título que abre e fecha conteúdo editável. |
| `/dica` | Caixa informativa. |
| `/aviso` | Caixa de aviso. |
| `/imagem` | Explorador para escolher uma ou mais imagens locais. |
| `/link` | Insere um endereço confirmado como link. |
| `/hoje` | Data de hoje, no idioma escolhido. |
| `/hora` | Hora atual, no idioma escolhido. |
| `/duplicar` | Repete o bloco atual com suas marcas e conteúdo. |
| `/limpar` | Limpa marcas e estilo do parágrafo atual. |

## Nos outros idiomas

Os nomes exibidos e as descrições acompanham o idioma do aplicativo. A busca aceita o nome traduzido e atalhos equivalentes, inclusive os exemplos abaixo:

| Português | English | 日本語 | 简体中文 | Deutsch |
| --- | --- | --- | --- | --- |
| `/lista` | `/list` | `/リスト` | `/清单` | `/liste` |
| `/tabela` | `/table` | `/テーブル` | `/表格` | `/tabelle` |
| `/recolhivel` | `/toggle` | `/トグル` | `/折叠` | `/klappliste` |
| `/dica` | `/callout` | `/コールアウト` | `/提示` | `/hinweis` |
| `/aviso` | `/warning` | `/警告` | `/警告` | `/warnung` |
| `/imagem` | `/image` | `/画像` | `/图片` | `/bild` |
| `/link` | `/link` | `/リンク` | `/链接` | `/link` |
| `/hoje` | `/today` | `/日付` | `/日期` | `/datum` |
| `/hora` | `/time` | `/時刻` | `/时间` | `/uhrzeit` |
| `/duplicar` | `/duplicate` | `/複製` | `/复制` | `/duplizieren` |
| `/limpar` | `/clear` | `/書式をクリア` | `/清除格式` | `/formatierung entfernen` |

## Editar sem perder conteúdo

Nos blocos recolhíveis, Enter no título vai ao conteúdo. Uma linha vazia seguida de Enter sai do bloco. Ctrl+Enter abre ou fecha; Backspace no começo do título remove a moldura e preserva o conteúdo. A mesma saída por linha vazia e remoção com Backspace funcionam nas caixas informativas e de aviso.

Recolher um bloco apenas o esconde. Seu conteúdo e o estado aberto/fechado são preservados ao salvar em Markdown. Esses blocos usam HTML compatível dentro do `.md`, assim como as tabelas e a formatação rica. TXT continua sendo uma exportação de texto simples.

Cancelar o explorador de imagens ou o campo de link mantém o comando original. As imagens ficam em memória até o salvamento manual. A data e a hora são inseridas como texto daquele instante, sem notificações ou relógio em segundo plano.

Links e trechos de código não abrem o menu de comandos. Nenhuma dessas funções consulta a internet automaticamente.
