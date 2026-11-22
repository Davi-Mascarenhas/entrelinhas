import type { Editor } from '@tiptap/core'

export function normalizeLink(input: string): string | null {
  const value = input.trim()
  if (!value || /[\s\\\u0000-\u001f\u007f]/u.test(value)) return null
  const email = /^[^@/:]+@[^@/:]+\.[^@/:]+$/.test(value)
  const hostPort = /^[^/:]+:\d+(?:\/|$)/.test(value)
  const explicit = /^[a-z][a-z\d+.-]*:/i.test(value) && !hostPort
  const address = email
    ? `mailto:${value}`
    : explicit
      ? value
      : `https://${value.replace(/^\/\//, '')}`
  if (!explicit && !email && /^[./]/.test(value) && !value.startsWith('//')) return null
  try {
    const url = new URL(address)
    if (url.username || url.password) return null
    if (url.protocol === 'mailto:') return /^[^@/]+@[^@/]+$/.test(url.pathname) ? url.href : null
    return ['https:', 'http:'].includes(url.protocol) && url.hostname ? url.href : null
  } catch {
    return null
  }
}

export function captureLinkSelection(editor: Editor) {
  const { from, to } = editor.state.selection
  return { editor, from, to, doc: editor.state.doc }
}
export type LinkSelection = ReturnType<typeof captureLinkSelection>

export function applyLinkSelection(target: LinkSelection, href: string) {
  const { editor, from, to, doc } = target
  const normalized = href.trim() ? normalizeLink(href) : ''
  if (normalized === null || editor.isDestroyed || !editor.state.doc.eq(doc)) return false
  const chain = editor.chain().setTextSelection({ from, to })
  if (from === to) chain.extendMarkRange('link')
  if (normalized) chain.setLink({ href: normalized })
  else chain.unsetLink()
  return chain.focus().run()
}
