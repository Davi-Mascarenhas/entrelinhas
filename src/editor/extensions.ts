import { tr } from '../i18n'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { TextStyleKit } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import { SearchExtension } from './search'
import { Callout, Details, DetailsContent, DetailsSummary } from './blocks'

export function editorExtensions(placeholder = true) {
  return [
    StarterKit.configure({
      link: { openOnClick: false, autolink: true, protocols: ['https', 'http', 'mailto'] },
    }),
    TextStyleKit,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight.configure({ multicolor: true }),
    Image.configure({
      allowBase64: true,
      resize: {
        enabled: true,
        directions: ['bottom-right', 'bottom-left'],
        minWidth: 60,
        minHeight: 40,
        alwaysPreserveAspectRatio: true,
      },
    }),
    TableKit.configure({ table: { resizable: true } }),
    TaskList,
    TaskItem.configure({
      nested: true,
      HTMLAttributes: { 'data-type': 'taskItem' },
      a11y: {
        checkboxLabel: (node) =>
          tr('Marcar tarefa: {text}', { text: node.textContent || tr('sem texto') }),
      },
    }),
    SearchExtension,
    Callout,
    Details,
    DetailsSummary,
    DetailsContent,
    ...(placeholder
      ? [
          Placeholder.configure({
            placeholder: ({ node }) =>
              tr(node.type.name === 'detailsSummary' ? 'Título recolhível' : 'Comece a escrever…'),
            includeChildren: true,
            emptyEditorClass: 'is-editor-empty',
          }),
        ]
      : []),
  ]
}
