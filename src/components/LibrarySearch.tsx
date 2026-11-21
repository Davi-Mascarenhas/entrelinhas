import { tr } from '../i18n'
import { useEffect, useState } from 'react'
import { Search, FileText, AlertCircle, ArrowUpRight } from 'lucide-react'
import { backend, errorMessage } from '../native/api'
import type { SearchResult } from '../core/types'
import { Modal } from './ui'
export function LibrarySearch({
  onClose,
  onOpen,
}: {
  onClose: () => void
  onOpen: (path: string) => Promise<boolean>
}) {
  const [query, setQuery] = useState(''),
    [results, setResults] = useState<SearchResult[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    setBusy(true)
    const timer = setTimeout(() => {
      void backend
        .search(query)
        .then((found) => {
          if (!cancelled) {
            setResults(found)
            setError('')
          }
        })
        .catch((error) => {
          if (!cancelled) setError(errorMessage(error))
        })
        .finally(() => {
          if (!cancelled) setBusy(false)
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])
  return (
    <Modal title={tr('Buscar documentos')} onClose={onClose} wide>
      <div className="library-search">
        <label className="global-search-input">
          <Search size={19} />
          <input
            autoFocus
            aria-label={tr('Buscar documentos salvos')}
            placeholder={tr('Um nome, uma palavra, uma ideia…')}
            value={query}
            maxLength={512}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <p className="muted small">
          {busy
            ? tr('Buscando nos arquivos…')
            : tr('{0} resultado(s)', {
                0: results.length,
              })}
          {tr('· Somente documentos salvos da biblioteca.')}
        </p>
        <div className="search-results">
          {error && (
            <p role="alert" className="error-text">
              {tr(error)}
            </p>
          )}
          {!busy && !error && !results.length && (
            <div className="empty-search">
              <Search size={28} strokeWidth={1.3} />
              <p>{tr('Nenhum documento encontrado.')}</p>
            </div>
          )}
          {results.map((result) => (
            <button
              className="search-result"
              key={result.path}
              onClick={() => {
                onClose()
                void onOpen(result.path)
              }}
            >
              {result.missing ? <AlertCircle size={19} /> : <FileText size={19} />}
              <span>
                <strong>{result.title}</strong>
                <small>
                  {result.error
                    ? tr('Indisponível · {0}', {
                        0: result.error,
                      })
                    : result.excerpt || result.path}
                </small>
                <em>{result.path}</em>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
