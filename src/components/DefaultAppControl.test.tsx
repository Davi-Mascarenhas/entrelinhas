import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { backend } from '../native/api'
import { DefaultAppControl } from './DefaultAppControl'

const available = {
  supported: true,
  registered: true,
  markdown: false,
  text: false,
  requiresSettings: false,
}
beforeEach(() => {
  vi.spyOn(backend, 'defaultAppStatus').mockResolvedValue(available)
  vi.spyOn(backend, 'setDefaultApp').mockResolvedValue({ ...available, markdown: true, text: true })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('consulta o padrão sem alterar as associações até um clique explícito', async () => {
  render(<DefaultAppControl />)
  const button = await screen.findByRole('button', { name: 'Usar como padrão' })
  expect(backend.setDefaultApp).not.toHaveBeenCalled()
  fireEvent.click(button)
  await screen.findByRole('button', { name: 'Já é o padrão' })
  expect(backend.setDefaultApp).toHaveBeenCalledOnce()
  expect(screen.getAllByText('É o padrão')).toHaveLength(2)
})

it('só conclui a apresentação após o sistema confirmar os dois tipos', async () => {
  vi.mocked(backend.setDefaultApp).mockRejectedValueOnce({ message: 'Permissão recusada.' })
  const done = vi.fn()
  render(<DefaultAppControl onComplete={done} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Usar como padrão' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Permissão recusada.')
  expect(done).not.toHaveBeenCalled()
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Usar como padrão' })).toBeEnabled(),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Usar como padrão' }))
  await waitFor(() => expect(done).toHaveBeenCalledOnce())
})

it('permite continuar quando o Entrelinhas já é padrão sem gravar novamente', async () => {
  vi.mocked(backend.defaultAppStatus).mockResolvedValue({
    ...available,
    markdown: true,
    text: true,
  })
  const done = vi.fn()
  render(<DefaultAppControl onComplete={done} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Começar a escrever' }))
  expect(done).toHaveBeenCalledOnce()
  expect(backend.setDefaultApp).not.toHaveBeenCalled()
})

it('explica quando a instalação ainda não está registrada no sistema', async () => {
  vi.mocked(backend.defaultAppStatus).mockResolvedValue({ ...available, registered: false })
  render(<DefaultAppControl />)
  expect(await screen.findByRole('button', { name: 'Usar como padrão' })).toBeDisabled()
  expect(screen.getByText(/Instale ou atualize/)).toBeInTheDocument()
  expect(backend.setDefaultApp).not.toHaveBeenCalled()
})

it('abre a escolha do Windows sem anunciar sucesso nem concluir a apresentação', async () => {
  const windows = { ...available, requiresSettings: true }
  vi.mocked(backend.defaultAppStatus).mockResolvedValue(windows)
  vi.mocked(backend.setDefaultApp).mockResolvedValue(windows)
  const done = vi.fn()
  render(<DefaultAppControl onComplete={done} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Abrir configurações do Windows' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Nas configurações do Windows')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(done).not.toHaveBeenCalled()
  vi.mocked(backend.defaultAppStatus).mockResolvedValue({ ...windows, markdown: true, text: true })
  fireEvent.focus(window)
  fireEvent.click(await screen.findByRole('button', { name: 'Começar a escrever' }))
  expect(done).toHaveBeenCalledOnce()
  expect(backend.setDefaultApp).toHaveBeenCalledOnce()
})
