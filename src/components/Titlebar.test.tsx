import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createNote } from '../core/notes'
import { Titlebar } from './Titlebar'

const actions = vi.hoisted(() => ({
  startDragging: vi.fn(),
  toggleMaximize: vi.fn(),
  minimize: vi.fn(),
  close: vi.fn(),
}))
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }))
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => actions }))
beforeEach(() => {
  for (const action of Object.values(actions)) action.mockReset().mockResolvedValue(undefined)
})
afterEach(cleanup)
const setup = () => {
  const rename = vi.fn(),
    error = vi.fn()
  const { unmount } = render(<Titlebar note={createNote()} onRename={rename} onError={error} />)
  return { rename, error, bar: screen.getByRole('banner'), unmount }
}

it('um clique parado não inicia arraste e o duplo clique alterna a maximização', () => {
  const { bar } = setup()
  fireEvent.mouseDown(screen.getByText('Entrelinhas'), { button: 0, detail: 1 })
  fireEvent.mouseUp(window, { button: 0 })
  expect(actions.startDragging).not.toHaveBeenCalled()
  fireEvent.doubleClick(screen.getByText('Entrelinhas'), { button: 0 })
  fireEvent.doubleClick(bar.querySelector('.window-controls')!, { button: 0 })
  expect(actions.toggleMaximize).toHaveBeenCalledTimes(2)
  expect(actions.startDragging).not.toHaveBeenCalled()
})

it('inicia um único arraste apenas depois de mover o mouse pressionado', () => {
  const { bar } = setup()
  fireEvent.mouseDown(bar, { button: 0, clientX: 100, clientY: 50 })
  fireEvent.mouseMove(window, { buttons: 1, clientX: 103, clientY: 52 })
  expect(actions.startDragging).not.toHaveBeenCalled()
  fireEvent.mouseMove(window, { buttons: 1, clientX: 110, clientY: 54 })
  fireEvent.mouseMove(window, { buttons: 1, clientX: 130, clientY: 54 })
  expect(actions.startDragging).toHaveBeenCalledOnce()
  expect(actions.toggleMaximize).not.toHaveBeenCalled()
})

it('cancela o arraste pendente ao soltar o mouse, perder foco ou desmontar a barra', () => {
  const { bar, unmount } = setup()
  const press = () => fireEvent.mouseDown(bar, { button: 0, clientX: 100, clientY: 50 })
  const move = () => fireEvent.mouseMove(window, { buttons: 1, clientX: 140, clientY: 50 })
  press()
  fireEvent.mouseUp(window, { button: 0 })
  move()
  press()
  fireEvent.blur(window)
  move()
  press()
  fireEvent.mouseMove(window, { buttons: 0, clientX: 100, clientY: 50 })
  move()
  press()
  unmount()
  move()
  expect(actions.startDragging).not.toHaveBeenCalled()
})

it('exclui botões e seus ícones do arraste e do duplo clique da barra', () => {
  const { rename } = setup()
  for (const button of screen.getAllByRole('button')) {
    const child = button.querySelector('svg path, svg rect, span') ?? button
    fireEvent.mouseDown(child, { button: 0, detail: 1 })
    fireEvent.mouseDown(child, { button: 0, detail: 2 })
    if (!button.classList.contains('window-title')) fireEvent.doubleClick(child, { button: 0 })
  }
  expect(actions.startDragging).not.toHaveBeenCalled()
  expect(actions.toggleMaximize).not.toHaveBeenCalled()
  fireEvent.doubleClick(
    screen.getByRole('button', { name: 'Editar título do documento' }).querySelector('span')!,
  )
  expect(rename).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'Minimizar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Maximizar ou restaurar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Fechar aplicativo' }))
  expect(actions.minimize).toHaveBeenCalledOnce()
  expect(actions.toggleMaximize).toHaveBeenCalledOnce()
  expect(actions.close).toHaveBeenCalledOnce()
})

it('ignora outros botões do mouse e mantém a edição do título pelo teclado', () => {
  const { bar, rename } = setup()
  fireEvent.mouseDown(bar, { button: 2, detail: 2 })
  fireEvent.mouseDown(bar, { button: 1, detail: 1 })
  fireEvent.mouseDown(bar, { button: 0, detail: 3 })
  fireEvent.doubleClick(bar, { button: 2 })
  expect(actions.startDragging).not.toHaveBeenCalled()
  expect(actions.toggleMaximize).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Editar título do documento' }), { detail: 0 })
  expect(rename).toHaveBeenCalledOnce()
})

it('informa uma falha do sistema ao tentar maximizar', async () => {
  const { bar, error } = setup()
  actions.toggleMaximize.mockRejectedValueOnce('Não foi possível maximizar a janela.')
  fireEvent.doubleClick(bar, { button: 0 })
  await waitFor(() =>
    expect(error).toHaveBeenCalledExactlyOnceWith('Não foi possível maximizar a janela.'),
  )
})
