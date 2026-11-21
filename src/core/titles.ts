import { tr } from '../i18n'
import type { Note } from './types'

export function editableTitle(title: string): string {
  return title.replace(/\.(md|markdown|txt)$/i, '')
}

export function documentTitle(value: string): string {
  const title = editableTitle(value.trim()).trim()
  if (!title || title === '.' || title === '..')
    throw new Error('Digite um título para o documento.')
  if (/[\\/\u0000-\u001f\u007f]/.test(title))
    throw new Error('O título não pode conter barras ou caracteres de controle.')
  if (new TextEncoder().encode(title).length > 240)
    throw new Error('Esse título é longo demais. Use um nome mais curto.')
  return title
}

export function suggestedFilename(note: Pick<Note, 'title' | 'format' | 'titleIsDefault'>): string {
  return `${documentTitle(note.titleIsDefault ? tr('Sem título') : note.title)}.${note.format}`
}
