import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { backend } from '../native/api'
import type { Theme } from '../core/types'
import { WelcomeTheme } from './WelcomeTheme'

beforeEach(() => {
  vi.spyOn(backend, 'defaultAppStatus').mockResolvedValue({
    supported: true,
    registered: true,
    markdown: false,
    text: false,
    requiresSettings: false,
  })
  vi.spyOn(backend, 'setDefaultApp').mockResolvedValue({
    supported: true,
    registered: true,
    markdown: true,
    text: true,
    requiresSettings: false,
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function Welcome({ complete = vi.fn(), preview = vi.fn() }) {
  const [theme, setTheme] = useState<Theme>('light')
  return (
    <WelcomeTheme
      chooseLanguage={false}
      theme={theme}
      onThemeChange={(next) => {
        setTheme(next)
        preview(next)
      }}
      onComplete={complete}
    />
  )
}

it.each([
  ['Claro', 'light'],
  ['Escuro', 'dark'],
  ['Sépia Noturno', 'sepia'],
])('apresenta boas-vindas, permite escolher %s e recusar o padrão', async (label, theme) => {
  const preview = vi.fn(),
    complete = vi.fn()
  render(<Welcome preview={preview} complete={complete} />)
  expect(screen.getByRole('heading', { name: 'Um espaço para suas palavras.' })).toBeInTheDocument()
  expect(screen.getByText('Etapa 1 de 3')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByText('Etapa 2 de 3')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: `Usar tema ${label}` }))
  expect(preview).toHaveBeenCalledWith(theme)
  expect(screen.getByRole('button', { name: `Usar tema ${label}` })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(complete).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  await screen.findByRole('button', { name: 'Usar como padrão' })
  expect(screen.getByText('Etapa 3 de 3')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
  expect(complete).toHaveBeenCalledOnce()
  expect(backend.setDefaultApp).not.toHaveBeenCalled()
})

it('permite voltar sem perder a escolha de tema e não conclui com Esc', () => {
  const complete = vi.fn()
  render(<Welcome complete={complete} />)
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Usar tema Escuro' }))
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByRole('button', { name: 'Usar tema Escuro' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(complete).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

it('apresenta quatro telas no Linux com idioma primeiro e permite voltar à escolha', () => {
  const language = vi.fn()
  render(
    <WelcomeTheme
      theme="dark"
      language="zh-CN"
      onLanguageChange={language}
      onThemeChange={vi.fn()}
      onComplete={vi.fn()}
    />,
  )
  expect(screen.getByText('Etapa 1 de 4')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '简体中文' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: '日本語' }))
  expect(language).toHaveBeenCalledWith('ja')
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByRole('heading', { name: 'Um espaço para suas palavras.' })).toBeInTheDocument()
  expect(screen.getByText('Etapa 2 de 4')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByText('Etapa 3 de 4')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.getByText('Etapa 1 de 4')).toBeInTheDocument()
})
