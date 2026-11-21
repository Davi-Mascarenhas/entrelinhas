import { Download, RefreshCw } from 'lucide-react'
import type { UpdatesController } from '../native/useUpdates'

export function UpdateControl({ updates: u }: { updates: UpdatesController }) {
  const busy = u.requesting || ['checking', 'downloading', 'installing'].includes(u.phase)
  const progress = u.progress?.total
    ? Math.min(100, Math.round((u.progress.received / u.progress.total) * 100))
    : null
  return (
    <section className="update-control" aria-label="Atualizações" aria-busy={busy}>
      <h4>Atualizações</h4>
      <p className="muted small">Você escolhe quando procurar. Sem consultas automáticas.</p>
      <div role="status" aria-live="polite">
        {u.phase === 'checking' && <p>Procurando atualização…</p>}
        {u.phase === 'current' && <p>Você está com a versão mais recente deste canal.</p>}
        {u.info && <p className="update-version">Versão {u.info.version} disponível</p>}
        {u.info?.notes && <p className="update-notes">{u.info.notes}</p>}
        {u.phase === 'downloading' && (
          <>
            <p>Baixando atualização{progress !== null ? ` · ${progress}%` : '…'}</p>
            <progress
              aria-label="Download da atualização"
              max={100}
              value={progress ?? undefined}
            />
          </>
        )}
        {u.phase === 'installing' && <p>Instalando atualização. O aplicativo será reaberto.</p>}
        {u.phase === 'saved' && <p>{u.message}</p>}
      </div>
      {u.phase === 'error' && (
        <p role="alert" className="form-error">
          {u.message}
        </p>
      )}
      {u.info?.mode === 'install' && (
        <p className="muted small">
          A instalação fechará e reabrirá o Entrelinhas. Você poderá salvar as alterações antes de
          continuar.
        </p>
      )}
      <div className="update-actions">
        <button type="button" disabled={busy} onClick={() => void u.check()}>
          <RefreshCw size={15} aria-hidden="true" />{' '}
          {u.phase === 'error' && !u.info ? 'Tentar novamente' : 'Procurar atualização'}
        </button>
        {u.info && u.phase !== 'saved' && (
          <button type="button" className="primary" disabled={busy} onClick={() => void u.apply()}>
            <Download size={15} aria-hidden="true" />{' '}
            {u.info.mode === 'package'
              ? 'Baixar pacote .deb'
              : u.phase === 'ready'
                ? 'Instalar e reiniciar'
                : 'Baixar e instalar'}
          </button>
        )}
      </div>
    </section>
  )
}
