import { tr } from '../i18n'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { FontSize, TextStyleKit } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import { SearchExtension } from './search'
import { Callout, Details, DetailsContent, DetailsSummary } from './blocks'

const ZoomableFontSize = FontSize.extend({
  addGlobalAttributes() {
    return (this.parent?.() ?? []).map((group) => ({
      ...group,
      attributes: {
        ...group.attributes,
        fontSize: {
          ...group.attributes.fontSize,
          renderHTML: (attrs) => {
            const rendered = group.attributes.fontSize?.renderHTML?.(attrs) ?? {}
            return /^\d+(?:\.\d+)?px$/.test(attrs.fontSize ?? '')
              ? {
                  ...rendered,
                  'data-editor-font-size': '',
                  style: `${rendered.style}; --written-font-size: ${attrs.fontSize}`,
                }
              : rendered
          },
        },
      },
    }))
  },
})

export function editorExtensions(placeholder = true) {
  return [
    StarterKit.configure({
      link: { openOnClick: false, autolink: true, protocols: ['https', 'http', 'mailto'] },
    }),
    TextStyleKit.configure({ fontSize: false }),
    ZoomableFontSize,
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
