import { afterEach, describe, expect, it } from 'vitest'
import rows from './messages.json'
import { languages, setLanguage, tr, formatShortcut } from './index'
import { createNote, noteTitle } from '../core/notes'
import { readPreferences } from '../core/preferences'
import { suggestedFilename } from '../core/titles'

afterEach(() => setLanguage('pt-BR'))
describe('catálogos completos e dados preservados', () => {
  it('tem cinco traduções por mensagem, sem chaves duplicadas nem parâmetros perdidos', () => {
    expect(new Set(rows.map((row) => row[0])).size).toBe(rows.length)
    for (const row of rows) {
      expect(row).toHaveLength(languages.length)
      const slots = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
      for (const message of row) {
        expect(message.trim()).not.toBe('')
        expect(slots(message)).toEqual(slots(row[0]))
      }
    }
  })
  it.each(languages)(
    'traduz a interface para $id sem alterar nomes e texto de documentos',
    ({ id }) => {
      setLanguage(id)
      const index = languages.findIndex((l) => l.id === id)
      for (const row of rows) expect(tr(row[0])).toBe(row[index])
      const note = {
        ...createNote(),
        title: 'Salvar 日本語 & {nome}',
        titleIsDefault: false,
        content: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Minha história 中文' }] },
          ],
        },
      }
      expect(noteTitle(note)).toBe(note.title)
      expect(suggestedFilename(note)).toBe('Salvar 日本語 & {nome}.md')
      expect(note.content.content[0].content[0].text).toBe('Minha história 中文')
    },
  )
  it('traduz apenas o título gerado de notas novas e as frases ao redor de nomes de arquivos', () => {
    setLanguage('ja')
    const fresh = createNote()
    expect(noteTitle(fresh)).toBe('無題')
    expect(suggestedFilename(fresh)).toBe('無題.md')
    expect(noteTitle({ ...fresh, title: 'Relatório' })).toBe('Relatório')
    expect(tr('Fechar {0}', { 0: 'Salvar.md' })).toBe('Salvar.mdを閉じる')
    expect(tr('Salvo · /meus arquivos/Salvar.md')).toBe('保存しました · /meus arquivos/Salvar.md')
  })
  it('normaliza espaços de texto JSX, preserva valores e atualiza o cache ao trocar idioma', () => {
    setLanguage('en')
    expect(tr('  Seu espaço,\n sua luz. ')).toBe('Your space, your light.')
    expect(tr('Etapa {current} de {total}', { current: 1, total: 4 })).toBe('Step 1 of 4')
    expect(tr('Fechar Arquivo {nome}.md')).toBe('Close Arquivo {nome}.md')
    setLanguage('de')
    expect(tr('Fechar Arquivo {nome}.md')).toBe('Arquivo {nome}.md schließen')
    expect(formatShortcut('Ctrl+Shift+K')).toBe('Strg+Umschalt+K')
  })
  it('migra preferências antigas, respeita a escolha do usuário e valida idiomas', () => {
    expect(readPreferences({ theme: 'sepia' })).toMatchObject({
      language: 'pt-BR',
      languageChosen: true,
      onboardingCompleted: true,
    })
    expect(readPreferences({ language: 'ja', theme: 'dark' }).language).toBe('ja')
    expect(readPreferences({ language: 'zh-TW' }).language).toBe('pt-BR')
    expect(
      readPreferences({ language: 'zh-CN', onboardingCompleted: false }).onboardingCompleted,
    ).toBe(false)
  })
})
