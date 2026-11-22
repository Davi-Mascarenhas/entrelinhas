import { tr } from '../i18n'
import { Download, RefreshCw, TriangleAlert } from 'lucide-react'
import type { UpdatesController } from '../native/useUpdates'
import { useEffect, useRef } from 'react'
export function UpdateControl({ updates: u }: { updates: UpdatesController }) {
  const section = useRef<HTMLElement>(null)
  useEffect(() => {
    if (u.phase !== 'available' || !u.info) return
    const frame = requestAnimationFrame(() =>
      section.current?.scrollIntoView?.({ block: 'nearest' }),
    )
    return () => cancelAnimationFrame(frame)
  }, [u.phase, u.info?.version])
  const busy =
    u.requesting || ['checking', 'choosing', 'downloading', 'installing'].includes(u.phase)
  const progress = u.progress?.total
    ? Math.min(100, Math.round((u.progress.received / u.progress.total) * 100))
    : null
  const preview = Boolean(u.info?.prerelease)
  const offering = preview && ['available', 'ready', 'error'].includes(u.phase)
  return (
    <section
      ref={section}
      className="update-control"
      aria-label={tr('Atualizações')}
      aria-busy={busy}
    >
      <h4>{tr('Atualizações')}</h4>
      <p className="muted small">
        {tr('Você escolhe quando procurar. Sem consultas automáticas.')}
      </p>
      <div role="status" aria-live="polite">
        {u.phase === 'checking' && <p>{tr('Procurando atualização…')}</p>}
        {u.phase === 'choosing' && <p>{tr('Escolha onde salvar o pacote.')}</p>}
        {u.phase === 'current' && <p>{tr('Não encontramos uma atualização mais recente.')}</p>}
        {u.phase === 'waiting' && (
          <p>{tr('Você escolheu esperar a versão estável. O aplicativo não foi alterado.')}</p>
        )}
        {u.info && (
          <p className="update-version">
            {tr('Versão {version} disponível', { version: u.info.version })}
          </p>
        )}
        {u.info?.notes && <p className="update-notes">{u.info.notes}</p>}
        {preview && (
          <div
            className="update-preview-warning"
            role="note"
            aria-label={tr('Aviso de pré-release')}
          >
            <strong>
              <TriangleAlert size={17} aria-hidden="true" />
              {tr('Esta atualização é uma pré-release.')}
            </strong>
            <p>{tr('Esta versão ainda está em avaliação.')}</p>
            {offering && <p>{tr('Tem certeza de que deseja baixar esta pré-release?')}</p>}
          </div>
        )}
        {u.phase === 'downloading' && (
          <>
            <p>
              {tr('Baixando atualização')}
              {progress !== null ? ` · ${progress}%` : '…'}
            </p>
            <progress
              aria-label={tr('Download da atualização')}
              max={100}
              value={progress ?? undefined}
            />
          </>
        )}
        {u.phase === 'installing' && (
          <p>{tr('Instalando atualização. O aplicativo será reaberto.')}</p>
        )}
        {u.phase === 'saved' && <p>{tr(u.message)}</p>}
      </div>
      {u.phase === 'error' && (
        <p role="alert" className="form-error">
          {tr(u.message)}
        </p>
      )}
      {u.info?.mode === 'install' && (
        <p className="muted small">
          {tr(
            'A instalação fechará e reabrirá o Entrelinhas. Você poderá salvar as alterações antes de continuar.',
          )}
        </p>
      )}
      <div className="update-actions">
        <button type="button" disabled={busy} onClick={() => void u.check()}>
          <RefreshCw size={15} aria-hidden="true" />{' '}
          {u.phase === 'error' && !u.info ? tr('Tentar novamente') : tr('Procurar atualização')}
        </button>
        {preview && u.info && u.phase !== 'saved' && (
          <button
            type="button"
            className="primary"
            data-update-action="wait"
            disabled={busy}
            onClick={() => void u.waitForStable()}
          >
            {tr('Esperar versão estável')}
          </button>
        )}
        {u.info && u.phase !== 'saved' && (
          <button
            type="button"
            data-update-action="apply"
            className={preview ? 'update-preview-action' : 'primary'}
            disabled={busy}
            onClick={() => void u.apply()}
          >
            {!preview && <Download size={15} aria-hidden="true" />}{' '}
            {preview
              ? tr('Atualizar para pré-release')
              : u.info.mode === 'package'
                ? tr('Baixar pacote .deb')
                : u.phase === 'ready'
                  ? tr('Instalar e reiniciar')
                  : tr('Baixar e instalar')}
          </button>
        )}
      </div>
    </section>
  )
}
