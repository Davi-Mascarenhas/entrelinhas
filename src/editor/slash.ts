import type { Editor } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import type { EditorState } from '@tiptap/pm/state'
import { tr } from '../i18n'

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
export function runSlashCommand(editor: Editor, range: SlashRange, id: SlashCommand['id']) {
  const fresh = slashRange(editor.state)
  if (!fresh || fresh.from !== range.from || fresh.to !== range.to || fresh.query !== range.query)
    return false
  // Uma única transação: desfazer devolve inclusive o texto do comando.
  const chain = editor
    .chain()
    .focus()
    .command(({ tr }) => {
      closeHistory(tr)
      return true
    })
    .deleteRange({ from: range.from, to: range.to })
  switch (id) {
    case 'tasks':
      return chain.toggleTaskList().run()
    case 'table':
      return chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    case 'bullet':
      return chain.toggleBulletList().run()
    case 'number':
      return chain.toggleOrderedList().run()
    case 'heading1':
      return chain.setHeading({ level: 1 }).run()
    case 'heading2':
      return chain.setHeading({ level: 2 }).run()
    case 'heading3':
      return chain.setHeading({ level: 3 }).run()
    case 'quote':
      return chain.toggleBlockquote().run()
    case 'code':
      return chain.toggleCodeBlock().run()
    case 'divider':
      return chain.setHorizontalRule().run()
    case 'text':
      return chain.setParagraph().run()
  }
}
