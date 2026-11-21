import type { JSONContent } from '@tiptap/core'
import type { DocumentFormat, Note } from './types'
import { tr } from '../i18n'

export const noteTitle = (note: Note) =>
  note.titleIsDefault && note.title === 'Sem título' && !note.path ? tr('Sem título') : note.title

export function createNote(format: DocumentFormat = 'md', projectId: string | null = null): Note {
  return {
    id: crypto.randomUUID(),
    title: 'Sem título',
    titleIsDefault: true,
    path: null,
    format,
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    dirty: false,
    version: null,
    projectId,
    savedContent: '',
  }
}

export function updateNote(notes: Note[], id: string, change: Partial<Note>): Note[] {
  return notes.map((note) => (note.id === id ? { ...note, ...change } : note))
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return items
  const moved = [...items]
  moved.splice(to, 0, moved.splice(from, 1)[0])
  return moved
}

export function textFromDocument(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'hardBreak') return '\n'
  if (node.type === 'image') return node.attrs?.alt ?? ''
  const children = node.content ?? []
  return children
    .map(
      (child, index) =>
        textFromDocument(child) +
        (index < children.length - 1 && !['text', 'hardBreak', 'image'].includes(child.type ?? '')
          ? '\n'
          : ''),
    )
    .join('')
}

export function hasFormatting(node: JSONContent): boolean {
  if (
    node.marks?.length ||
    Object.values(node.attrs ?? {}).some((value) => value !== null && value !== undefined)
  )
    return true
  if (!['doc', 'paragraph', 'text', 'hardBreak'].includes(node.type ?? '')) return true
  return (node.content ?? []).some(hasFormatting)
}

export function countText(text: string): { words: number; characters: number } {
  const segments = new Intl.Segmenter('pt', { granularity: 'word' }).segment(text)
  let words = 0,
    characters = 0
  for (const segment of segments) if (segment.isWordLike) words++
  for (const _character of text) characters++
  return { words, characters }
}
