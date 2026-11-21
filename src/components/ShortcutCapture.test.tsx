import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ShortcutCapture } from './ShortcutCapture'
import { defaultPreferences } from '../core/preferences'
import { eventShortcut, isAssignableShortcut, shortcutAction } from '../core/shortcuts'

afterEach(cleanup)
it('captura uma combinação, salva só com confirmação e cancela por Esc', () => {
  const save = vi.fn(),
    close = vi.fn()
  render(
    <ShortcutCapture
      action="settings"
      shortcuts={defaultPreferences.shortcuts}
      onSave={save}
      onClose={close}
    />,
  )
  const capture = screen.getByRole('group', { name: 'Capturar novo atalho' })
  fireEvent.keyDown(capture, { key: 'K', ctrlKey: true, shiftKey: true })
  expect(screen.getByText('Ctrl+Shift+K')).toBeInTheDocument()
  expect(save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(save).toHaveBeenCalledWith('Ctrl+Shift+K')
  expect(close).toHaveBeenCalledOnce()
})
it('bloqueia duplicatas, teclas de digitação e atalhos reservados; permite tentar de novo', () => {
  const save = vi.fn()
  render(
    <ShortcutCapture
      action="settings"
      shortcuts={defaultPreferences.shortcuts}
      onSave={save}
      onClose={vi.fn()}
    />,
  )
  const capture = screen.getByRole('group', { name: 'Capturar novo atalho' })
  fireEvent.keyDown(capture, { key: 's', ctrlKey: true })
  expect(screen.getByRole('alert')).toHaveTextContent('Atalho já utilizado por Salvar.')
  expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  fireEvent.keyDown(capture, { key: 'a' })
  expect(screen.getByRole('alert')).toHaveTextContent('reservada')
  fireEvent.keyDown(capture, { key: 'b', ctrlKey: true })
  expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  fireEvent.keyDown(capture, { key: 'F8' })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(save).not.toHaveBeenCalled()
})
it('não grava teclas de composição e fecha com Esc sem salvar', () => {
  const save = vi.fn(),
    close = vi.fn()
  render(
    <ShortcutCapture
      action="settings"
      shortcuts={defaultPreferences.shortcuts}
      onSave={save}
      onClose={close}
    />,
  )
  const capture = screen.getByRole('group', { name: 'Capturar novo atalho' })
  fireEvent.keyDown(capture, { key: 'k', ctrlKey: true, isComposing: true })
  expect(screen.getByText('Ctrl+,')).toBeInTheDocument()
  fireEvent.keyDown(capture, { key: 'Escape' })
  expect(close).toHaveBeenCalledOnce()
  expect(save).not.toHaveBeenCalled()
})
it('abre configurações com Ctrl+, e admite F8, Alt e combinações com Shift', () => {
  expect(
    shortcutAction(new KeyboardEvent('keydown', { key: ',', ctrlKey: true }), defaultPreferences),
  ).toBe('settings')
  for (const key of ['F8', 'Ctrl+Alt+K', 'Alt+M', 'Ctrl+Shift+,'])
    expect(isAssignableShortcut(key)).toBe(true)
  for (const key of ['A', 'Escape', 'Ctrl+B', 'Ctrl+Shift+TAB', 'Alt+F4', 'F11'])
    expect(isAssignableShortcut(key)).toBe(false)
  expect(eventShortcut(new KeyboardEvent('keydown', { key: 'Dead', ctrlKey: true }))).toBe('')
})
