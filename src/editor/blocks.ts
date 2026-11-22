import { Node, mergeAttributes, type Editor } from '@tiptap/core'
import { Fragment } from '@tiptap/pm/model'
import { Plugin, TextSelection } from '@tiptap/pm/state'

function unwrap(editor: Editor, type: 'details' | 'callout') {
  const { state, view } = editor
  const { $from, empty } = state.selection
  if (!empty || $from.parentOffset !== 0) return false
  for (let depth = $from.depth - 1; depth > 0; depth--) {
    const node = $from.node(depth)
    if (node.type.name !== type) continue
    const start = $from.before(depth)
    if ($from.pos !== start + 2) return false
    const content =
      type === 'details'
        ? Fragment.fromArray([
            state.schema.nodes.paragraph.create(null, node.firstChild!.content),
            ...node.lastChild!.content.content,
          ])
        : node.content
    const parent = $from.node(depth - 1)
    const index = $from.index(depth - 1)
    if (!parent.canReplace(index, index + 1, content)) return false
    const tr = state.tr.replaceWith(start, start + node.nodeSize, content)
    tr.setSelection(TextSelection.near(tr.doc.resolve(start + 1)))
    view.dispatch(tr.scrollIntoView())
    return true
  }
  return false
}

function exitEmpty(editor: Editor, type: 'details' | 'callout') {
  const { state, view } = editor
  const { $from, empty } = state.selection
  if (!empty || $from.parent.type.name !== 'paragraph' || $from.parent.content.size) return false
  const parent = $from.node($from.depth - 1)
  if ($from.index($from.depth - 1) !== parent.childCount - 1) return false
  const depth = $from.depth - (type === 'details' ? 2 : 1)
  if (depth < 1 || $from.node(depth).type.name !== type) return false
  const after = $from.after(depth)
  const paragraph = state.schema.nodes.paragraph.create()
  if (
    !$from
      .node(depth - 1)
      .canReplaceWith($from.indexAfter(depth - 1), $from.indexAfter(depth - 1), paragraph.type)
  )
    return false
  const tr = state.tr
  if (parent.childCount > 1) tr.delete($from.before(), $from.after())
  const position = tr.mapping.map(after)
  const next = tr.doc.nodeAt(position)
  if (next?.type.name !== 'paragraph' || next.content.size) tr.insert(position, paragraph)
  tr.setSelection(TextSelection.near(tr.doc.resolve(position + 1)))
  view.dispatch(tr.scrollIntoView())
  return true
}

export const DetailsSummary = Node.create({
  name: 'detailsSummary',
  content: 'inline*',
  defining: true,
  parseHTML: () => [{ tag: 'summary' }],
  renderHTML: () => ['summary', 0],
})

export const DetailsContent = Node.create({
  name: 'detailsContent',
  content: 'block+',
  parseHTML: () => [{ tag: 'div[data-type="detailsContent"]' }],
  renderHTML: () => ['div', { 'data-type': 'detailsContent' }, 0],
})

export const Details = Node.create({
  name: 'details',
  priority: 900,
  group: 'block',
  content: 'detailsSummary detailsContent',
  defining: true,
  isolating: true,
  addAttributes: () => ({
    open: {
      default: true,
      parseHTML: (element) => element.hasAttribute('open'),
      renderHTML: (attributes) => (attributes.open ? { open: '' } : {}),
    },
  }),
  parseHTML: () => [{ tag: 'details' }],
  renderHTML: ({ HTMLAttributes }) => [
    'details',
    mergeAttributes(HTMLAttributes, { 'data-type': 'details' }),
    0,
  ],
  addNodeView() {
    return ({ node: initial, editor, getPos }) => {
      const dom = document.createElement('details')
      dom.dataset.type = 'details'
      dom.open = Boolean(initial.attrs.open)
      const toggle = () => {
        const position = getPos()
        if (position === undefined || editor.isDestroyed) return
        const node = editor.state.doc.nodeAt(position)
        if (node?.type.name !== 'details' || node.attrs.open === dom.open) return
        const tr = editor.state.tr.setNodeMarkup(position, undefined, {
          ...node.attrs,
          open: dom.open,
        })
        const selection = tr.selection
        const bodyStart = position + 1 + node.firstChild!.nodeSize
        if (!dom.open && selection.from >= bodyStart && selection.from < position + node.nodeSize)
          tr.setSelection(TextSelection.near(tr.doc.resolve(position + node.firstChild!.nodeSize)))
        editor.view.dispatch(tr.setMeta('addToHistory', false))
      }
      dom.addEventListener('toggle', toggle)
      return {
        dom,
        contentDOM: dom,
        update(node) {
          if (node.type.name !== 'details') return false
          dom.open = Boolean(node.attrs.open)
          return true
        },
        ignoreMutation: (mutation) => mutation.type === 'attributes' && mutation.target === dom,
        destroy: () => dom.removeEventListener('toggle', toggle),
      }
    }
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (_transactions, _old, state) => {
          const { $from } = state.selection
          for (let depth = $from.depth - 1; depth > 0; depth--) {
            const node = $from.node(depth)
            if (node.type.name === 'details' && !node.attrs.open && $from.index(depth) > 0)
              return state.tr
                .setNodeMarkup($from.before(depth), undefined, { ...node.attrs, open: true })
                .setMeta('addToHistory', false)
          }
          return null
        },
      }),
    ]
  },
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state, view } = this.editor
        const { $from, empty } = state.selection
        if (empty && $from.parent.type.name === 'detailsSummary') {
          const depth = $from.depth - 1
          const position = $from.before(depth)
          const node = $from.node(depth)
          const tr = state.tr.setNodeMarkup(position, undefined, { ...node.attrs, open: true })
          tr.setSelection(
            TextSelection.near(tr.doc.resolve(position + 2 + node.firstChild!.nodeSize)),
          )
          view.dispatch(tr.scrollIntoView())
          return true
        }
        return exitEmpty(this.editor, 'details')
      },
      'Mod-Enter': () => {
        const { state, view } = this.editor
        const { $from } = state.selection
        for (let depth = $from.depth - 1; depth > 0; depth--) {
          const node = $from.node(depth)
          if (node.type.name !== 'details') continue
          const position = $from.before(depth)
          const tr = state.tr.setNodeMarkup(position, undefined, {
            ...node.attrs,
            open: !node.attrs.open,
          })
          if (node.attrs.open)
            tr.setSelection(
              TextSelection.near(tr.doc.resolve(position + node.firstChild!.nodeSize)),
            )
          view.dispatch(tr.scrollIntoView())
          return true
        }
        return false
      },
      Backspace: () => unwrap(this.editor, 'details'),
    }
  },
})

export const Callout = Node.create({
  name: 'callout',
  priority: 900,
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,
  addAttributes: () => ({
    kind: {
      default: 'info',
      parseHTML: (element) =>
        element.getAttribute('data-kind') === 'warning' ? 'warning' : 'info',
      renderHTML: (attributes) => ({
        'data-kind': attributes.kind === 'warning' ? 'warning' : 'info',
      }),
    },
  }),
  parseHTML: () => [{ tag: 'aside[data-type="callout"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    'aside',
    mergeAttributes(HTMLAttributes, { 'data-type': 'callout', role: 'note' }),
    0,
  ],
  addKeyboardShortcuts() {
    return {
      Enter: () => exitEmpty(this.editor, 'callout'),
      Backspace: () => unwrap(this.editor, 'callout'),
    }
  },
})
