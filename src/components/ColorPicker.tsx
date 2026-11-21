import { tr } from '../i18n'
import { useState, type PointerEvent } from 'react'
import { Check, Palette } from 'lucide-react'
import { hexToHsv, hsvToHex, normalizeColor, type HsvColor } from '../core/colors'
import { Modal } from './ui'
const palette = [
  '#768c66',
  '#be9a69',
  '#6f94b5',
  '#d99c66',
  '#a97190',
  '#c26f67',
  '#8d7bb3',
  '#a0a0a5',
  '#f7f7f5',
  '#ddbf6c',
  '#57a3a5',
  '#405c45',
  '#844b49',
  '#426585',
  '#55595e',
  '#242424',
]
interface Props {
  label: string
  value: string
  onChange: (color: string) => void
  onClear?: () => void
  onDone?: () => void
  textTool?: boolean
}
export function ColorPicker({ label, value, onChange, onClear, onDone, textTool = false }: Props) {
  const [open, setOpen] = useState(false)
  const [hsv, setHsv] = useState(() => hexToHsv(value))
  const [hex, setHex] = useState(normalizeColor(value) ?? '#768c66')
  const selected = normalizeColor(hex)
  const close = () => {
    setOpen(false)
    if (onDone)
      requestAnimationFrame(() => {
        if (!document.querySelector('[role=dialog]')) onDone()
      })
  }
  const update = (color: HsvColor) => {
    setHsv(color)
    setHex(hsvToHex(color))
  }
  const choose = (color: string) => {
    setHex(color)
    setHsv(hexToHsv(color))
  }
  const point = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    update({
      ...hsv,
      s: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      v: 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    })
  }
  return (
    <>
      <button
        type="button"
        className={textTool ? 'color-tool' : 'color-picker-trigger'}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-tooltip={label}
        style={
          textTool
            ? {
                borderBottomColor: normalizeColor(value) ?? 'var(--accent)',
              }
            : undefined
        }
        onClick={() => {
          choose(normalizeColor(value) ?? '#768c66')
          setOpen(true)
        }}
      >
        {textTool ? (
          'A'
        ) : (
          <>
            <span
              className="color-preview-dot"
              style={{
                backgroundColor: normalizeColor(value) ?? '#768c66',
              }}
            />
            <span>{(normalizeColor(value) ?? '#768c66').toUpperCase()}</span>
            <Palette size={14} />
          </>
        )}
      </button>
      {open && (
        <Modal title={label} onClose={close}>
          <div className="color-picker-body">
            <button
              type="button"
              className="color-plane"
              aria-label={tr('Saturação e brilho: use as setas para ajustar')}
              style={{
                backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId)
                point(event)
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) point(event)
              }}
              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId))
                  event.currentTarget.releasePointerCapture(event.pointerId)
              }}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
                event.preventDefault()
                const step = event.shiftKey ? 0.1 : 0.01
                update({
                  ...hsv,
                  s: Math.max(
                    0,
                    Math.min(
                      1,
                      hsv.s +
                        (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
                    ),
                  ),
                  v: Math.max(
                    0,
                    Math.min(
                      1,
                      hsv.v +
                        (event.key === 'ArrowDown' ? -step : event.key === 'ArrowUp' ? step : 0),
                    ),
                  ),
                })
              }}
            >
              <span
                className="color-plane-marker"
                style={{
                  left: `${hsv.s * 100}%`,
                  top: `${(1 - hsv.v) * 100}%`,
                }}
              />
            </button>
            <label className="color-hue">
              <span>{tr('Matiz')}</span>
              <input
                type="range"
                aria-label={tr('Matiz da cor')}
                min="0"
                max="359"
                value={Math.round(hsv.h)}
                onChange={(event) =>
                  update({
                    ...hsv,
                    h: Number(event.target.value),
                  })
                }
              />
            </label>
            <div className="color-swatches" role="group" aria-label={tr('Paleta de cores')}>
              {palette.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={tr('Usar cor {0}', {
                    0: color,
                  })}
                  aria-pressed={selected === color}
                  style={{
                    backgroundColor: color,
                  }}
                  onClick={() => choose(color)}
                >
                  {selected === color && (
                    <Check size={14} color={hexToHsv(color).v > 0.85 ? '#242424' : '#ffffff'} />
                  )}
                </button>
              ))}
            </div>
            <label className="color-hex-field">
              <span
                className="color-preview"
                style={{
                  backgroundColor: selected ?? hsvToHex(hsv),
                }}
              />
              <span>
                <small>HEX</small>
                <input
                  autoFocus
                  type="text"
                  aria-label={tr('Cor em hexadecimal')}
                  spellCheck={false}
                  value={hex}
                  aria-invalid={!selected}
                  onChange={(event) => {
                    setHex(event.target.value)
                    const color = normalizeColor(event.target.value)
                    if (color) setHsv(hexToHsv(color))
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && selected) {
                      event.preventDefault()
                      event.stopPropagation()
                      onChange(selected)
                      close()
                    }
                  }}
                />
              </span>
            </label>
            {!selected && (
              <p className="error-text" role="status">
                {tr('Use um código como #768C66.')}
              </p>
            )}
            <div className="modal-actions">
              {onClear && (
                <button
                  className="color-reset"
                  type="button"
                  onClick={() => {
                    onClear()
                    close()
                  }}
                >
                  {tr('Cor do tema')}
                </button>
              )}
              <button type="button" onClick={close}>
                {tr('Cancelar')}
              </button>
              <button
                type="button"
                className="primary"
                disabled={!selected}
                onClick={() => {
                  if (selected) {
                    onChange(selected)
                    close()
                  }
                }}
              >
                {tr('Aplicar cor')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
