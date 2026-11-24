import { tr } from '../i18n'
import { useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Check, Palette } from 'lucide-react'
import { hexToHsv, hsvToHex, normalizeColor, type HsvColor } from '../core/colors'
import { AnchoredPanel } from './AnchoredPanel'
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
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [hsv, setHsv] = useState(() => hexToHsv(value))
  const [hex, setHex] = useState(normalizeColor(value) ?? '#768c66')
  const selected = normalizeColor(hex)
  const close = (restore = false) => {
    setOpen(false)
    if (restore)
      requestAnimationFrame(() => {
        if (onDone) onDone()
        else trigger.current?.focus()
      })
  }
  const update = (color: HsvColor) => {
    setHsv(color)
    const value = hsvToHex(color)
    setHex(value)
    onChange(value)
  }
  const choose = (color: string, apply = true) => {
    setHex(color)
    setHsv(hexToHsv(color))
    if (apply) onChange(color)
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
        ref={trigger}
        type="button"
        className={textTool ? 'color-tool' : 'color-picker-trigger'}
        aria-label={label}
        aria-expanded={open}
        data-tooltip={label}
        style={
          textTool
            ? ({ '--color-tool-value': normalizeColor(value) ?? 'var(--accent)' } as CSSProperties)
            : undefined
        }
        onClick={() => {
          if (open) {
            close(true)
            return
          }
          choose(normalizeColor(value) ?? '#768c66', false)
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
        <AnchoredPanel
          anchor={trigger}
          label={label}
          className="color-palette"
          onClose={(reason) => close(reason === 'escape')}
        >
          <h3>{label}</h3>
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
                    if (color) {
                      setHsv(hexToHsv(color))
                      onChange(color)
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && selected) {
                      event.preventDefault()
                      event.stopPropagation()
                      close(true)
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
            {onClear && (
              <button
                className="color-reset"
                type="button"
                onClick={() => {
                  onClear()
                  close(true)
                }}
              >
                {tr('Cor do tema')}
              </button>
            )}
          </div>
        </AnchoredPanel>
      )}
    </>
  )
}
