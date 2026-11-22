import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RenameDocument } from './RenameDocument'
import { createNote } from '../core/notes'

afterEach(cleanup)

it('aplica o título da nota e fecha somente ao concluir', async () => {
  const rename = vi.fn().mockResolvedValue(undefined),
    close = vi.fn()
  render(<RenameDocument note={createNote()} onRename={rename} onClose={close} />)
  fireEvent.change(screen.getByLabelText('Título do documento'), {
    target: { value: 'Ideias novas.md' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar título' }))
  await waitFor(() => expect(rename).toHaveBeenCalledExactlyOnceWith('Ideias novas'))
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
})

it('mantém o título digitado quando o arquivo não pode ser renomeado', async () => {
  const rename = vi.fn().mockRejectedValue({ message: 'Já existe um arquivo com esse nome.' }),
    close = vi.fn()
  render(
    <RenameDocument
      note={{ ...createNote(), path: '/tmp/Original.md', title: 'Original.md' }}
      onRename={rename}
      onClose={close}
    />,
  )
  expect(screen.getByLabelText('Título do documento')).toHaveValue('Original')
  fireEvent.change(screen.getByLabelText('Título do documento'), { target: { value: 'Novo' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar título' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Já existe um arquivo')
  expect(screen.getByLabelText('Título do documento')).toHaveValue('Novo')
  expect(close).not.toHaveBeenCalled()
})

it('cancela no próprio título com Esc e não cria um diálogo', () => {
  const rename = vi.fn(),
    close = vi.fn()
  render(<RenameDocument note={createNote()} onRename={rename} onClose={close} />)
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.keyDown(screen.getByLabelText('Título do documento'), { key: 'Escape' })
  expect(close).toHaveBeenCalledOnce()
  expect(rename).not.toHaveBeenCalled()
})

it('perder foco mantém a edição sem renomear o arquivo automaticamente', () => {
  const rename = vi.fn(),
    close = vi.fn()
  render(<RenameDocument note={createNote()} onRename={rename} onClose={close} />)
  const input = screen.getByLabelText('Título do documento')
  fireEvent.change(input, { target: { value: 'Outro nome' } })
  fireEvent.blur(input)
  expect(input).toHaveValue('Outro nome')
  expect(rename).not.toHaveBeenCalled()
  expect(close).not.toHaveBeenCalled()
})
