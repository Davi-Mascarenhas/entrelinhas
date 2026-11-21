import { useCallback, useEffect, useRef, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { downloadDir, join } from '@tauri-apps/api/path'
import { save } from '@tauri-apps/plugin-dialog'
import { backend, errorMessage, type UpdateInfo } from './api'
import type { AskDialog } from '../components/useDialog'

type Phase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'installing'
  | 'current'
  | 'saved'
  | 'error'
interface State {
  phase: Phase
  info: UpdateInfo | null
  message: string
  progress: { received: number; total: number | null } | null
}
export type UpdatesController = ReturnType<typeof useUpdates>

export function useUpdates(
  ask: AskDialog,
  beforeInstall: () => Promise<boolean>,
  afterInstall: () => void,
) {
  const [state, setState] = useState<State>({
    phase: 'idle',
    info: null,
    message: '',
    progress: null,
  })
  const [requesting, setRequesting] = useState(false)
  const busy = useRef(false)
  const current = useRef({ state, ask, beforeInstall, afterInstall })
  current.current = { state, ask, beforeInstall, afterInstall }
  useEffect(() => {
    const subscription = listen<{ received: number; total: number | null }>(
      'entrelinhas://update-progress',
      ({ payload }) => {
        setState((value) =>
          value.phase === 'downloading' ? { ...value, progress: payload } : value,
        )
      },
    ).catch(() => () => {})
    return () => {
      void subscription.then((unsubscribe) => unsubscribe())
    }
  }, [])

  const check = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setRequesting(true)
    try {
      const choice = await current.current.ask({
        title: 'Permitir acesso à internet para procurar atualizações?',
        message:
          'O Entrelinhas consultará o GitHub. Nenhum documento será enviado. A autorização vale para esta consulta e para o download que você solicitar em seguida.',
        choices: [
          { id: 'cancel', label: 'Cancelar' },
          { id: 'allow', label: 'Permitir consulta', primary: true },
        ],
      })
      if (choice !== 'allow') return
      setState({ phase: 'checking', info: null, message: '', progress: null })
      const info = await backend.checkUpdate()
      setState({ phase: info ? 'available' : 'current', info, message: '', progress: null })
    } catch (error) {
      setState({ phase: 'error', info: null, message: errorMessage(error), progress: null })
    } finally {
      busy.current = false
      setRequesting(false)
    }
  }, [])

  const apply = useCallback(async () => {
    if (busy.current) return
    const previous = current.current.state
    if (!previous.info) return
    busy.current = true
    let preparing = false
    try {
      if (previous.phase !== 'ready') {
        let path: string | null = null
        if (previous.info.mode === 'package') {
          path = await save({
            title: 'Salvar atualização do Entrelinhas',
            defaultPath: await join(
              await downloadDir(),
              `Entrelinhas_${previous.info.version}_amd64.deb`,
            ),
            filters: [{ name: 'Pacote Debian', extensions: ['deb'] }],
          })
          if (!path) return
        }
        setState({ ...previous, phase: 'downloading', message: '', progress: null })
        const savedPath = await backend.downloadUpdate(path)
        if (previous.info.mode === 'package') {
          setState({
            ...previous,
            phase: 'saved',
            message: `Pacote verificado e salvo em ${savedPath}. Abra o arquivo pelo sistema para instalar.`,
            progress: null,
          })
          return
        }
      }
      setState({ ...previous, phase: 'ready', message: '', progress: null })
      preparing = true
      if (!(await current.current.beforeInstall())) return
      setState({ ...previous, phase: 'installing', message: '', progress: null })
      await backend.installUpdate()
    } catch (error) {
      setState({ ...previous, phase: 'error', message: errorMessage(error), progress: null })
    } finally {
      if (preparing) current.current.afterInstall()
      busy.current = false
    }
  }, [])
  return { ...state, requesting, check, apply }
}
