import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { backend } from './api'
import { useUpdates } from './useUpdates'
import { UpdateControl } from '../components/UpdateControl'
import { save } from '@tauri-apps/plugin-dialog'

let progress: (event: { payload: { received: number; total: number | null } }) => void
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((_event, callback) => {
    progress = callback
    return Promise.resolve(vi.fn())
  }),
}))
vi.mock('@tauri-apps/api/path', () => ({
  downloadDir: vi.fn().mockResolvedValue('/downloads'),
  join: vi.fn().mockImplementation((...args: string[]) => Promise.resolve(args.join('/'))),
}))
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }))
const info = { version: '1.3.0', notes: 'Melhorias na escrita.', mode: 'install' as const }
beforeEach(() => {
  vi.spyOn(backend, 'checkUpdate').mockResolvedValue(info)
  vi.spyOn(backend, 'downloadUpdate').mockResolvedValue(null)
  vi.spyOn(backend, 'installUpdate').mockResolvedValue()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('não consulta ao montar; recusa e cliques duplicados não acessam a rede', async () => {
  let answer!: (value: string) => void
  const ask = vi.fn(
    () =>
      new Promise<string>((resolve) => {
        answer = resolve
      }),
  )
  const { result, rerender } = renderHook(() => useUpdates(ask, vi.fn(), vi.fn()))
  rerender()
  expect(backend.checkUpdate).not.toHaveBeenCalled()
  let first!: Promise<void>
  act(() => {
    first = result.current.check()
  })
  await act(async () => {
    await result.current.check()
  })
  expect(ask).toHaveBeenCalledOnce()
  await act(async () => {
    answer('cancel')
    await first
  })
  expect(backend.checkUpdate).not.toHaveBeenCalled()
  expect(result.current.phase).toBe('idle')
})

it('pede autorização em cada consulta e diferencia atualizado de falha de rede', async () => {
  const ask = vi.fn().mockResolvedValue('allow')
  const { result } = renderHook(() => useUpdates(ask, vi.fn(), vi.fn()))
  vi.mocked(backend.checkUpdate).mockResolvedValueOnce(null)
  await act(async () => {
    await result.current.check()
  })
  expect(result.current.phase).toBe('current')
  vi.mocked(backend.checkUpdate).mockRejectedValueOnce({ message: 'Sem conexão.' })
  await act(async () => {
    await result.current.check()
  })
  expect(result.current.phase).toBe('error')
  expect(result.current.message).toBe('Sem conexão.')
  expect(ask).toHaveBeenCalledTimes(2)
})

it('mantém o resultado ao reabrir o painel, sem nova consulta automática', async () => {
  const ask = vi.fn().mockResolvedValue('allow')
  function Harness() {
    const updates = useUpdates(ask, vi.fn(), vi.fn())
    return <UpdateControl updates={updates} />
  }
  const view = render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Procurar atualização' }))
  await screen.findByText('Versão 1.3.0 disponível')
  view.rerender(<Harness />)
  expect(screen.getByText(info.notes)).toBeInTheDocument()
  expect(backend.checkUpdate).toHaveBeenCalledOnce()
})

it('cancela a instalação com rascunhos e permite continuar sem baixar outra vez', async () => {
  const before = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true),
    after = vi.fn()
  const { result } = renderHook(() => useUpdates(vi.fn().mockResolvedValue('allow'), before, after))
  await act(async () => {
    await result.current.check()
  })
  await act(async () => {
    await result.current.apply()
  })
  expect(result.current.phase).toBe('ready')
  expect(backend.installUpdate).not.toHaveBeenCalled()
  await act(async () => {
    await result.current.apply()
  })
  expect(backend.downloadUpdate).toHaveBeenCalledOnce()
  expect(backend.installUpdate).toHaveBeenCalledOnce()
  expect(after).toHaveBeenCalledTimes(2)
})

it('aguarda a preparação e impede operações duplicadas durante download/instalação', async () => {
  let ready!: (value: boolean) => void
  const before = vi.fn(
    () =>
      new Promise<boolean>((resolve) => {
        ready = resolve
      }),
  )
  const { result } = renderHook(() =>
    useUpdates(vi.fn().mockResolvedValue('allow'), before, vi.fn()),
  )
  await act(async () => {
    await result.current.check()
  })
  let first!: Promise<void>
  act(() => {
    first = result.current.apply()
  })
  await waitFor(() => expect(before).toHaveBeenCalledOnce())
  await act(async () => {
    await result.current.apply()
    await result.current.check()
  })
  expect(backend.downloadUpdate).toHaveBeenCalledOnce()
  expect(backend.installUpdate).not.toHaveBeenCalled()
  await act(async () => {
    ready(true)
    await first
  })
  expect(backend.installUpdate).toHaveBeenCalledOnce()
})

it('erro na preparação não instala nem deixa a escrita bloqueada', async () => {
  const after = vi.fn()
  const { result } = renderHook(() =>
    useUpdates(
      vi.fn().mockResolvedValue('allow'),
      vi.fn().mockRejectedValue(new Error('Falha ao salvar.')),
      after,
    ),
  )
  await act(async () => {
    await result.current.check()
  })
  await act(async () => {
    await result.current.apply()
  })
  expect(result.current.phase).toBe('error')
  expect(backend.installUpdate).not.toHaveBeenCalled()
  expect(after).toHaveBeenCalledOnce()
})

it('falha na assinatura do pacote não fecha o app nem inicia a instalação', async () => {
  const before = vi.fn()
  vi.mocked(backend.downloadUpdate).mockRejectedValue({ message: 'Assinatura inválida.' })
  const { result } = renderHook(() =>
    useUpdates(vi.fn().mockResolvedValue('allow'), before, vi.fn()),
  )
  await act(async () => {
    await result.current.check()
  })
  await act(async () => {
    await result.current.apply()
  })
  expect(result.current.message).toBe('Assinatura inválida.')
  expect(before).not.toHaveBeenCalled()
  expect(backend.installUpdate).not.toHaveBeenCalled()
})

it('Linux escolhe o destino e salva o pacote sem executar um instalador', async () => {
  vi.mocked(backend.checkUpdate).mockResolvedValue({ ...info, mode: 'package' })
  vi.mocked(save).mockResolvedValueOnce(null).mockResolvedValueOnce('/downloads/Entrelinhas.deb')
  vi.mocked(backend.downloadUpdate).mockImplementation(async (path) => {
    progress({ payload: { received: 10, total: 10 } })
    return path
  })
  const before = vi.fn()
  const { result } = renderHook(() =>
    useUpdates(vi.fn().mockResolvedValue('allow'), before, vi.fn()),
  )
  await act(async () => {
    await result.current.check()
  })
  await act(async () => {
    await result.current.apply()
  })
  expect(backend.downloadUpdate).not.toHaveBeenCalled()
  await act(async () => {
    await result.current.apply()
  })
  expect(result.current.phase).toBe('saved')
  expect(result.current.message).toContain('/downloads/Entrelinhas.deb')
  expect(before).not.toHaveBeenCalled()
  expect(backend.installUpdate).not.toHaveBeenCalled()
})
