import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { languages, languageFamilies, setLanguage, type Language } from '../i18n'
import { LanguageChoices } from './LanguageChoices'

afterEach(() => {
  cleanup()
  setLanguage('pt-BR')
})
it('agrupa nove variantes em seis idiomas, sem duplicar os nomes principais', () => {
  render(<LanguageChoices value="pt-BR" onChange={vi.fn()} />)
  expect(screen.getAllByRole('combobox')).toHaveLength(3)
  expect(screen.getAllByRole('button')).toHaveLength(3)
  expect(languageFamilies.flatMap((family) => family.locales).sort()).toEqual(
    languages.map((l) => l.id).sort(),
  )
  expect(screen.queryByRole('button', { name: 'Português (Brasil)' })).toBeNull()
})
it.each([
  ['Português', 'Português (Portugal)', 'pt-PT'],
  ['Español', 'Español (Latinoamérica)', 'es-419'],
  ['Español', 'Español (España)', 'es-ES'],
  ['中文', '简体中文', 'zh-CN'],
  ['中文', '繁體中文', 'zh-TW'],
] as const)('o menu %s permite escolher %s no próprio idioma', (family, label, locale) => {
  const change = vi.fn()
  render(<LanguageChoices value="en" onChange={change} />)
  fireEvent.click(screen.getByRole('combobox', { name: family }))
  expect(change).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).toBeNull()
  const option = screen.getByRole('option', { name: label })
  expect(option).toHaveAttribute('lang', locale)
  fireEvent.click(option)
  expect(change).toHaveBeenCalledWith(locale)
  expect(screen.queryByRole('listbox')).toBeNull()
})
it('Esc cancela só o menu de variantes; teclado confirma e mantém o nome do grupo', () => {
  function Harness() {
    const [language, choose] = useState<Language>('pt-BR')
    return <LanguageChoices value={language} onChange={choose} />
  }
  render(<Harness />)
  const trigger = screen.getByRole('combobox', { name: 'Português' })
  fireEvent.click(trigger)
  fireEvent.keyDown(trigger, { key: 'Escape' })
  expect(trigger).toHaveAttribute('aria-description', 'Português (Brasil)')
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  fireEvent.keyDown(trigger, { key: 'End' })
  fireEvent.keyDown(trigger, { key: 'Enter' })
  expect(trigger).toHaveAttribute('aria-description', 'Português (Portugal)')
  expect(trigger).toHaveTextContent('Português')
})
