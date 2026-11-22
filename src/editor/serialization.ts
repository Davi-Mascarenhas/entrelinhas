import type { JSONContent } from '@tiptap/core'
import { Editor } from '@tiptap/core'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import { editorExtensions } from './extensions'
import type { ImageAsset } from '../core/types'

const converter = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
})
converter.use(gfm)
// HTML é parte do Markdown. Assim, cores, tamanhos e alinhamento continuam reversíveis.
converter.addRule('rich-inline', {
  filter: ['span', 'u', 'mark'],
  replacement: (_content, node) => (node as HTMLElement).outerHTML,
})
converter.addRule('rich-block', {
  filter: (node) =>
    [
      'P',
      'H1',
      'H2',
      'H3',
      'H4',
      'H5',
      'H6',
      'TABLE',
      'UL',
      'OL',
      'LI',
      'BLOCKQUOTE',
      'DETAILS',
      'ASIDE',
    ].includes(node.nodeName) &&
    ((node as HTMLElement).hasAttribute('style') ||
      node.nodeName === 'TABLE' ||
      node.nodeName === 'DETAILS' ||
      (node as HTMLElement).getAttribute('data-type') === 'callout' ||
      (node as HTMLElement).getAttribute('data-type') === 'taskList'),
  replacement: (_content, node) => `\n\n${(node as HTMLElement).outerHTML}\n\n`,
})
converter.addRule('sized-image', {
  filter: (node) =>
    node.nodeName === 'IMG' &&
    ((node as HTMLElement).hasAttribute('width') || (node as HTMLElement).hasAttribute('height')),
  replacement: (_content, node) => (node as HTMLElement).outerHTML,
})

export function markdownToHtml(markdown: string): string {
  const html = marked.parse(markdown, { async: false, gfm: true, breaks: false }) as string
  const clean = DOMPurify.sanitize(html, {
    ADD_ATTR: ['data-type', 'data-checked'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'form', 'button'],
  })
  const container = document.createElement('div')
  container.innerHTML = clean
  // O GFM usa inputs; o TipTap identifica tarefas pelos atributos data-type.
  for (const checkbox of container.querySelectorAll('li > input[type="checkbox"]')) {
    const item = checkbox.parentElement!
    item.dataset.type = 'taskItem'
    item.dataset.checked = String((checkbox as HTMLInputElement).checked)
    item.parentElement!.dataset.type = 'taskList'
    checkbox.remove()
    const paragraph = document.createElement('p')
    while (item.firstChild && item.firstChild.nodeName !== 'UL')
      paragraph.appendChild(item.firstChild)
    item.prepend(paragraph)
  }
  for (const image of container.querySelectorAll('img')) {
    if (/^(https?:|\/\/)/i.test(image.getAttribute('src') ?? '')) image.dataset.remote = 'true'
  }
  return container.innerHTML
}

export function parseDocument(content: string, format: 'md' | 'txt'): JSONContent {
  const editor = new Editor({
    extensions: editorExtensions(false),
    content:
      format === 'md'
        ? markdownToHtml(content)
        : {
            type: 'doc',
            content: content.split(/\r?\n/).map((line) => ({
              type: 'paragraph',
              ...(line ? { content: [{ type: 'text', text: line }] } : {}),
            })),
          },
  })
  try {
    return editor.getJSON()
  } finally {
    editor.destroy()
  }
}

export function serializeHtml(html: string): { content: string; assets: ImageAsset[] } {
  const container = document.createElement('div')
  container.innerHTML = html
  const assets: ImageAsset[] = []
  for (const image of container.querySelectorAll('img')) {
    const src = image.getAttribute('src') ?? ''
    if (src.startsWith('data:image/')) {
      const token = `entrelinhas-asset:${crypto.randomUUID()}`
      assets.push({ token, dataUrl: src })
      image.setAttribute('src', token)
    }
    image.removeAttribute('data-remote')
  }
  return { content: converter.turndown(container.innerHTML) + '\n', assets }
}

export function documentHtml(content: JSONContent): string {
  const editor = new Editor({ extensions: editorExtensions(false), content })
  try {
    return editor.getHTML()
  } finally {
    editor.destroy()
  }
}
