import { useRef } from 'react'
import { Popover } from '@/design-system'
import { __ } from '@/core/i18n'

const SWATCHES = [
  '#449CF0',
  '#ECAD4B',
  '#29CD42',
  '#761ACB',
  '#CB2929',
  '#ED6396',
  '#29CD42',
  '#4463F0',
  '#EC864B',
  '#4F9DD9',
  '#39E4A5',
  '#B4CD29',
]

type Hsv = [number, number, number]

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const value = parseInt(match[1]!, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((component) => Math.round(component).toString(16).padStart(2, '0')).join('')
}

function rgbToHsv(r: number, g: number, b: number): Hsv {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  let hue = 0
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta + (green < blue ? 6 : 0)) / 6
    else if (max === green) hue = ((blue - red) / delta + 2) / 6
    else hue = ((red - green) / delta + 4) / 6
  }
  return [Math.round(hue * 360), max === 0 ? 0 : delta / max, max]
}

function hsvToHex(hue: number, saturation: number, value: number): string {
  const h = (hue % 360) / 60
  const chroma = value * saturation
  const x = chroma * (1 - Math.abs((h % 2) - 1))
  const [r1, g1, b1] =
    h < 1
      ? [chroma, x, 0]
      : h < 2
        ? [x, chroma, 0]
        : h < 3
          ? [0, chroma, x]
          : h < 4
            ? [0, x, chroma]
            : h < 5
              ? [x, 0, chroma]
              : [chroma, 0, x]
  const offset = value - chroma
  return rgbToHex((r1 + offset) * 255, (g1 + offset) * 255, (b1 + offset) * 255)
}

function toHsv(hex: string | null | undefined): Hsv {
  const rgb = hex ? hexToRgb(hex) : null
  return rgb ? rgbToHsv(...rgb) : [0, 1, 1]
}

function drag(element: HTMLElement, onMove: (x: number, y: number) => void) {
  const rect = () => element.getBoundingClientRect()
  const handle = (event: PointerEvent) => {
    const box = rect()
    onMove(
      Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    )
  }
  const stop = () => {
    window.removeEventListener('pointermove', handle)
    window.removeEventListener('pointerup', stop)
  }
  window.addEventListener('pointermove', handle)
  window.addEventListener('pointerup', stop)
}

interface ColorPickerControlProps {
  value?: string | null
  disabled?: boolean
  onChange?: (value: string) => void
}

function Panel({ value, onChange }: { value: string | null | undefined; onChange: (value: string) => void }) {
  const [hue, saturation, brightness] = toHsv(value)
  const map = useRef<HTMLDivElement>(null)
  const strip = useRef<HTMLDivElement>(null)

  return (
    <div className="w-[300px] rounded-2xl bg-white p-4 text-xs uppercase tracking-wide text-ink-gray-7 shadow-2xl ring-1 ring-black/5">
      <div className="mb-3">{__('Swatches')}</div>
      <div className="mb-4 flex flex-wrap gap-3">
        {SWATCHES.map((color, index) => (
          <button
            key={index}
            type="button"
            aria-label={color}
            onClick={() => onChange(color)}
            className="size-[26px] rounded-full"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="mb-3">{__('Color picker')}</div>
      <div
        ref={map}
        className="relative h-[175px] cursor-crosshair rounded-md"
        style={{
          backgroundColor: `hsl(${hue}, 100%, 50%)`,
          backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
        }}
        onPointerDown={(event) => {
          event.preventDefault()
          const element = map.current!
          const apply = (x: number, y: number) => onChange(hsvToHex(hue, x, 1 - y))
          const box = element.getBoundingClientRect()
          apply(
            Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
            Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
          )
          drag(element, apply)
        }}
      >
        <span
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${saturation * 100}%`, top: `${(1 - brightness) * 100}%` }}
        />
      </div>
      <div
        ref={strip}
        className="relative mt-3 h-3 cursor-pointer rounded-full"
        style={{ backgroundImage: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
        onPointerDown={(event) => {
          event.preventDefault()
          const element = strip.current!
          const apply = (x: number) => onChange(hsvToHex(x * 360, saturation || 1, brightness || 1))
          const box = element.getBoundingClientRect()
          apply(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)))
          drag(element, (x) => apply(x))
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${(hue / 360) * 100}%`, backgroundColor: `hsl(${hue}, 100%, 50%)` }}
        />
      </div>
    </div>
  )
}

export function ColorPickerControl({ value, disabled = false, onChange }: ColorPickerControlProps) {
  return (
    <Popover
      placement="bottom-start"
      target={({ togglePopover }) => (
        <button
          type="button"
          disabled={disabled}
          onClick={() => togglePopover()}
          className="flex h-7 w-[calc(50%-10px)] min-w-[200px] items-center gap-2 rounded bg-surface-gray-2 px-2 text-left text-base disabled:cursor-not-allowed"
        >
          <span
            className="size-[18px] shrink-0 rounded-full"
            style={
              value
                ? { backgroundColor: value }
                : { backgroundImage: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }
            }
          />
          <span className={value ? 'text-ink-gray-8' : 'text-ink-gray-4'}>{value || __('Choose a color')}</span>
        </button>
      )}
      body={<Panel value={value} onChange={(next) => onChange?.(next)} />}
    />
  )
}
