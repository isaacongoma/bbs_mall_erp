import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { cn } from '@/design-system'

export interface SignaturePadHandle {
  clear: () => void
  toDataUrl: () => string | null
  isEmpty: () => boolean
}

export function SignaturePad({ handleRef, className }: { handleRef?: Ref<SignaturePadHandle>; className?: string }) {
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(true)

  const context = useCallback(() => canvas.current?.getContext('2d') ?? null, [])

  useEffect(() => {
    const element = canvas.current
    if (!element) return undefined
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const rect = element.getBoundingClientRect()
      element.width = rect.width * ratio
      element.height = rect.height * ratio
      const ctx = element.getContext('2d')
      if (!ctx) return
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#1f2937'
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useImperativeHandle(handleRef, () => ({
    clear() {
      const element = canvas.current
      const ctx = context()
      if (element && ctx) ctx.clearRect(0, 0, element.width, element.height)
      setEmpty(true)
    },
    toDataUrl: () => (empty ? null : (canvas.current?.toDataURL('image/png') ?? null)),
    isEmpty: () => empty,
  }))

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = context()
    if (!ctx) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drawing.current = true
    const { x, y } = point(event)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 0.01, y + 0.01)
    ctx.stroke()
    setEmpty(false)
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = context()
    if (!ctx) return
    const { x, y } = point(event)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function stop() {
    drawing.current = false
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-dashed border-outline-gray-3 bg-white',
        className,
      )}
    >
      <canvas
        ref={canvas}
        className="block h-44 w-full touch-none"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerLeave={stop}
        aria-label="Signature area"
      />
      {empty && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">
          Sign here with your finger or mouse
        </span>
      )}
      <span className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-gray-300" />
    </div>
  )
}
