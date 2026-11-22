import type { ChainedCommands, Editor } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import { Selection, TextSelection, type EditorState } from '@tiptap/pm/state'
import { getLanguage, tr } from '../i18n'

export interface SlashRange {
  from: number
  to: number
  query: string
}
export function slashRange(state: EditorState): SlashRange | null {
  const { empty, $from, from } = state.selection
  if (!empty || !$from.parent.isTextblock || $from.parent.type.spec.code) return null
  if ($from.marks().some((mark) => mark.type.name === 'code' || mark.type.name === 'link'))
    return null
  const before = $from.parent.textBetween(0, $from.parentOffset, '\n', '\ufffc')
  const match = /(?:^|\s)\/([^/\n\ufffc]{0,48})$/u.exec(before)
  return match ? { from: from - match[1].length - 1, to: from, query: match[1] } : null
}
export const slashCommands = [
  {
    id: 'tasks',
    label: 'Lista de tarefas',
    description: 'Uma lista para marcar o que falta fazer.',
    aliases: [
      'lista',
      'list',
      'checklist',
      'checkliste',
      'チェックリスト',
      '列表',
      '待办',
      'todo',
      'tasks',
      'リスト',
      'タスク',
      '清单',
      '任务',
      'liste',
      'aufgaben',
    ],
  },
  {
    id: 'table',
    label: 'Tabela',
    description: 'Organize informações em linhas e colunas.',
    aliases: ['tabela', 'table', 'テーブル', '表', '表格', 'tabelle'],
  },
  {
    id: 'bullet',
    label: 'Lista com marcadores',
    description: 'Ideias em uma lista simples.',
    aliases: ['marcadores', 'bullet', 'unordered', '箇条書き', '无序', 'aufzählung', 'stichpunkte'],
  },
  {
    id: 'number',
    label: 'Lista numerada',
    description: 'Uma sequência, passo a passo.',
    aliases: ['numerada', 'number', 'ordered', '番号', '有序', 'nummeriert'],
  },
  {
    id: 'heading1',
    label: 'Título 1',
    description: 'Um título grande para começar.',
    aliases: ['titulo', 'heading', 'h1', '見出し', '标题', 'überschrift'],
  },
  { id: 'heading2', label: 'Título 2', description: 'Divida o texto em seções.', aliases: ['h2'] },
  {
    id: 'heading3',
    label: 'Título 3',
    description: 'Um título menor para os detalhes.',
    aliases: ['h3'],
  },
  {
    id: 'quote',
    label: 'Citação',
    description: 'Dê espaço a uma passagem especial.',
    aliases: ['citacao', 'quote', '引用', 'zitat'],
  },
  {
    id: 'code',
    label: 'Bloco de código',
    description: 'Texto com espaçamento fixo.',
    aliases: ['codigo', 'code', 'コード', '代码'],
  },
  {
    id: 'divider',
    label: 'Inserir separador',
    description: 'Uma pausa entre duas ideias.',
    aliases: ['separador', 'divider', 'linha', '区切り', '分隔线', 'trennlinie'],
  },
  {
    id: 'text',
    label: 'Texto',
    description: 'Volte ao texto comum.',
    aliases: ['texto', 'text', 'paragraph', 'テキスト', '文本', 'absatz'],
  },
  {
    id: 'toggle',
    label: 'Lista recolhível',
    description: 'Um título que abre e fecha o conteúdo abaixo.',
    aliases: [
      'recolhivel',
      'toggle',
      'accordion',
      'alternar',
      'トグル',
      '折りたたみ',
      '折叠',
      'aufklappen',
      'klappliste',
    ],
  },
  {
    id: 'callout',
    label: 'Caixa informativa',
    description: 'Dê destaque a uma ideia ou dica.',
    aliases: [
      'caixa',
      'dica',
      'callout',
      'info',
      'コールアウト',
      'ヒント',
      '提示',
      '信息',
      'hinweis',
    ],
  },
  {
    id: 'warning',
    label: 'Aviso',
    description: 'Uma caixa para algo que merece atenção.',
    aliases: ['aviso', 'atencao', 'warning', 'alert', '警告', '注意', '警示', 'warnung'],
  },
  {
    id: 'image',
    label: 'Imagem',
    description: 'Escolha uma imagem do computador.',
    aliases: ['imagem', 'foto', 'image', 'photo', '画像', '写真', '图片', '图像', 'bild'],
  },
  {
    id: 'link',
    label: 'Link',
    description: 'Insira um endereço como link no texto.',
    aliases: ['link', 'endereco', 'url', 'リンク', '链接', 'verknüpfung'],
  },
  {
    id: 'date',
    label: 'Data de hoje',
    description: 'Insira a data no idioma do aplicativo.',
    aliases: ['data', 'hoje', 'date', 'today', '日付', '今日', '日期', '今天', 'datum', 'heute'],
  },
  {
    id: 'time',
    label: 'Hora atual',
    description: 'Insira a hora atual no texto.',
    aliases: ['hora', 'agora', 'time', 'now', '時刻', '時間', '时间', 'uhrzeit', 'jetzt'],
  },
  {
    id: 'duplicate',
    label: 'Duplicar bloco',
    description: 'Repita o bloco atual logo abaixo.',
    aliases: ['duplicar', 'duplicate', 'copy', '複製', '复制', 'duplizieren'],
  },
  {
    id: 'clear',
    label: 'Limpar formatação',
    description: 'Remova as marcas e o estilo deste parágrafo.',
    aliases: [
      'limpar',
      'clear',
      'formatacao',
      '書式をクリア',
      '清除格式',
      'formatierung entfernen',
    ],
  },
] as const
export type SlashCommand = (typeof slashCommands)[number]
const normalize = (value: string) =>
  value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim()
export function filterSlashCommands(query: string) {
  const needle = normalize(query)
  return slashCommands.filter((command) =>
    [tr(command.label), ...command.aliases].some((text) => normalize(text).includes(needle)),
  )
}
export interface SlashOptions {
  images?: { src: string; alt?: string }[]
  href?: string
  now?: Date
}
export function runSlashCommand(
  editor: Editor,
  range: SlashRange,
  id: SlashCommand['id'],
  options: SlashOptions = {},
) {
  if (editor.isDestroyed) return false
  const fresh = slashRange(editor.state)
  if (!fresh || fresh.from !== range.from || fresh.to !== range.to || fresh.query !== range.query)
    return false
  const href = options.href?.trim()
  if (id === 'link' && (!href || !/^(https?:\/\/|mailto:)/i.test(href))) return false
  if (id === 'image' && !options.images?.length) return false
  const now = options.now ?? new Date()
  // Simula antes de aplicar: um bloco incompatível nunca apaga o comando.
  const prepare = (start: ChainedCommands) => {
    const chain = start
      .command(({ tr }) => {
        closeHistory(tr)
        return true
      })
      .deleteRange({ from: range.from, to: range.to })
    switch (id) {
      case 'tasks':
        return chain.toggleTaskList()
      case 'table':
        return chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      case 'bullet':
        return chain.toggleBulletList()
      case 'number':
        return chain.toggleOrderedList()
      case 'heading1':
        return chain.setHeading({ level: 1 })
      case 'heading2':
        return chain.setHeading({ level: 2 })
      case 'heading3':
        return chain.setHeading({ level: 3 })
      case 'quote':
        return chain.toggleBlockquote()
      case 'code':
        return chain.toggleCodeBlock()
      case 'divider':
        return chain.setHorizontalRule()
      case 'text':
        return chain.setParagraph()
      case 'callout':
      case 'warning':
        return chain.wrapIn('callout', { kind: id === 'warning' ? 'warning' : 'info' })
      case 'toggle':
        return chain.command(({ tr, state }) => {
          const { $from } = tr.selection
          const parent = $from.node($from.depth - 1)
          const index = $from.index($from.depth - 1)
          if (!parent.canReplaceWith(index, index + 1, state.schema.nodes.details)) return false
          const node = state.schema.nodes.details.create({ open: true }, [
            state.schema.nodes.detailsSummary.create(null, $from.parent.content),
            state.schema.nodes.detailsContent.create(null, state.schema.nodes.paragraph.create()),
          ])
          const from = $from.before(),
            offset = $from.parentOffset
          tr.replaceWith(from, $from.after(), node)
          tr.setSelection(TextSelection.near(tr.doc.resolve(from + 2 + offset)))
          return true
        })
      case 'image':
        return chain.insertContent(
          options.images!.map((image) => ({ type: 'image', attrs: image })),
        )
      case 'link':
        return chain.insertContent({
          type: 'text',
          text: href!,
          marks: [{ type: 'link', attrs: { href } }],
        })
      case 'date':
        return chain.insertContent({
          type: 'text',
          text: new Intl.DateTimeFormat(getLanguage(), { dateStyle: 'long' }).format(now),
        })
      case 'time':
        return chain.insertContent({
          type: 'text',
          text: new Intl.DateTimeFormat(getLanguage(), { timeStyle: 'short' }).format(now),
        })
      case 'duplicate':
        return chain.command(({ tr }) => {
          const { $from } = tr.selection
          let depth = $from.depth
          for (let d = depth; d > 0; d--) {
            if (['listItem', 'taskItem', 'details'].includes($from.node(d).type.name)) {
              depth = d
              break
            }
          }
          const node = $from.node(depth)
          const parent = $from.node(depth - 1),
            index = $from.indexAfter(depth - 1)
          if (!parent.canReplaceWith(index, index, node.type)) return false
          const position = $from.after(depth)
          tr.insert(position, node.copy(node.content))
          tr.setSelection(Selection.near(tr.doc.resolve(position + 1)))
          return true
        })
      case 'clear':
        return chain.command(({ tr, state }) => {
          const { $from } = tr.selection
          tr.removeMark($from.start(), $from.end())
          if (['paragraph', 'heading'].includes($from.parent.type.name))
            tr.setNodeMarkup($from.before(), state.schema.nodes.paragraph, {})
          tr.setStoredMarks([])
          return true
        })
    }
  }
  if (!prepare(editor.can().chain()).run()) return false
  return prepare(editor.chain().focus()).scrollIntoView().run()
}
