import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import { editorExtensions } from './extensions'
import { LinkPreview } from './LinkPreview'
import { backend } from '../native/api'

vi.mock('../native/api', () => ({
  backend: { openLink: vi.fn() },
  errorMessage: (error: { message: string }) => error.message,
}))
let editor: Editor
afterEach(() => {
  cleanup()
  editor?.destroy()
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.resetAllMocks()
})
function setup() {
  const element = document.body.appendChild(document.createElement('div'))
  editor = new Editor({
    element,
    extensions: editorExtensions(false),
    content: '<p><a href="https://example.com/">Site</a></p>',
  })
  const notice = vi.fn()
  render(<LinkPreview editor={editor} onNotice={notice} />)
  return { notice, click: () => fireEvent.click(element.querySelector('a')!, { ctrlKey: true }) }
}
it('mostra retorno imediato e confirmação; cliques repetidos não abrem várias janelas', async () => {
  vi.useFakeTimers()
  let resolve!: () => void
  vi.mocked(backend.openLink).mockReturnValue(
    new Promise<void>((done) => {
      resolve = done
    }),
  )
  const { notice, click } = setup()
  click()
  expect(notice).toHaveBeenLastCalledWith('Abrindo no navegador padrão…')
  click()
  expect(backend.openLink).toHaveBeenCalledOnce()
  expect(notice.mock.lastCall?.[0]).toContain('já foi enviado')
  await act(async () => {
    resolve()
    await Promise.resolve()
  })
  expect(notice.mock.lastCall?.[0]).toContain('Se a janela não aparecer')
  click()
  expect(backend.openLink).toHaveBeenCalledOnce()
  vi.mocked(backend.openLink).mockResolvedValue()
  act(() => {
    vi.advanceTimersByTime(2100)
  })
  click()
  await act(async () => {
    await Promise.resolve()
  })
  expect(backend.openLink).toHaveBeenCalledTimes(2)
  expect(editor.getText()).toBe('Site')
})
it('mostra falha sem confirmação falsa e permite tentar novamente imediatamente', async () => {
  vi.mocked(backend.openLink)
    .mockRejectedValueOnce({ message: 'Navegador indisponível.' })
    .mockResolvedValue()
  const { notice, click } = setup()
  click()
  await act(async () => {
    await Promise.resolve()
  })
  expect(notice).toHaveBeenLastCalledWith('Navegador indisponível.')
  click()
  await act(async () => {
    await Promise.resolve()
  })
  expect(backend.openLink).toHaveBeenCalledTimes(2)
  expect(notice.mock.lastCall?.[0]).toContain('Link enviado')
})
