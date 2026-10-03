import { useEffect, useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dialog, cn } from '@/design-system'
import { createGeoMap, type GeoMapController } from '../../utils/geoMap'

export interface GeolocationControlProps {
  value?: string | null
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'subtle' | 'outline' | 'ghost'
  className?: string
  onChange?: (value: string | null) => void
}

const SIZE_CLASSES = {
  sm: 'h-7 text-base rounded',
  md: 'h-8 text-base rounded',
  lg: 'h-10 text-lg rounded-md',
  xl: 'h-10 text-2xl rounded-md',
} as const

const PADDING_CLASSES = { sm: 'px-2', md: 'px-2.5', lg: 'px-3', xl: 'px-3' } as const

const ICON_CLASSES = {
  sm: 'h-3 w-3 shrink-0',
  md: 'h-3.5 w-3.5 shrink-0',
  lg: 'h-4 w-4 shrink-0',
  xl: 'h-4 w-4 shrink-0',
} as const

const VARIANT_CLASSES = {
  subtle: 'border border-[--surface-gray-2] bg-surface-gray-2 hover:border-outline-elevation-2 hover:bg-surface-gray-3',
  outline: 'border border-outline-gray-2 bg-surface-base hover:border-outline-gray-3 hover:shadow-sm',
  ghost: 'border-0',
} as const

interface GeoFeature {
  geometry?: { type?: string; coordinates?: [number, number] }
}

function summarize(value: string | null | undefined): string {
  if (!value) return ''
  try {
    const geo = JSON.parse(value) as { type?: string; features?: GeoFeature[] } & GeoFeature
    const features: GeoFeature[] = geo.type === 'FeatureCollection' ? (geo.features ?? []) : [geo]
    const points = features.filter((feature) => feature.geometry?.type === 'Point')
    if (features.length === 1 && points.length === 1) {
      const [lng, lat] = points[0]!.geometry!.coordinates!
      const latText = `${Math.abs(lat).toFixed(5)}°${lat >= 0 ? 'N' : 'S'}`
      const lngText = `${Math.abs(lng).toFixed(5)}°${lng >= 0 ? 'E' : 'W'}`
      return `${latText}, ${lngText}`
    }
    return __(`{0} ${features.length === 1 ? 'feature' : 'features'}`, [features.length])
  } catch {
    return __('Invalid GeoJSON')
  }
}

function currentPosition(): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve([coords.latitude, coords.longitude]),
      () => resolve(null),
      { timeout: 3000 },
    )
  })
}

export function GeolocationControl({
  value = null,
  disabled = false,
  size = 'sm',
  variant = 'subtle',
  className,
  onChange,
}: GeolocationControlProps) {
  const [showModal, setShowModal] = useState(false)
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [controller, setController] = useState<GeoMapController | null>(null)

  useEffect(() => {
    if (!showModal || !container) return
    let cancelled = false
    let created: GeoMapController | null = null

    void (async () => {
      const center = await currentPosition()
      if (cancelled) return
      const map = await createGeoMap(container, { value, disabled, center })
      if (cancelled) {
        map.destroy()
        return
      }
      created = map
      setController(map)
    })()

    return () => {
      cancelled = true
      created?.destroy()
      setController(null)
    }
  }, [showModal, container, value, disabled])

  const variantClasses = disabled
    ? cn(
        'border bg-surface-gray-1 text-ink-gray-5',
        variant === 'outline' ? 'border-outline-gray-2' : 'border-transparent',
      )
    : VARIANT_CLASSES[variant]

  const containerClasses = cn(
    'flex w-full items-center gap-1.5 overflow-hidden transition-colors',
    SIZE_CLASSES[size],
    PADDING_CLASSES[size],
    variantClasses,
    className,
  )

  function saveLocation() {
    onChange?.(controller ? controller.toGeoJson() : (value ?? null))
    setShowModal(false)
  }

  return (
    <>
      {!value && !disabled ? (
        <div className={cn(containerClasses, 'cursor-pointer')} onClick={() => setShowModal(true)}>
          <span className={cn('lucide-map-pin size-4 text-ink-gray-5', ICON_CLASSES[size])} aria-hidden="true" />
          <span className="whitespace-nowrap text-ink-gray-4">{__('Set location…')}</span>
        </div>
      ) : !value ? (
        <div className={containerClasses}>
          <span className="text-ink-gray-4">—</span>
        </div>
      ) : (
        <div className={cn(containerClasses, '!pr-1 cursor-pointer')} onClick={() => setShowModal(true)}>
          <span className={cn('lucide-map-pin size-4 text-ink-gray-7', ICON_CLASSES[size])} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm text-ink-gray-8">{summarize(value)}</span>
          {!disabled && (
            <button
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-gray-4 hover:bg-surface-gray-2 hover:text-ink-gray-7 dark:hover:bg-surface-gray-4"
              title={__('Clear')}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onChange?.(null)
              }}
            >
              <span className="lucide-x h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <Dialog
        open={showModal}
        onOpenChange={setShowModal}
        title={disabled ? __('View Location') : __('Set Location')}
        size="4xl"
        actionsContent={() => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              label={disabled ? __('Close') : __('Cancel')}
              onClick={() => setShowModal(false)}
            />
            {!disabled && <Button variant="solid" label={__('Save')} onClick={saveLocation} />}
          </div>
        )}
      >
        <div ref={setContainer} className="h-[500px] w-full rounded" />
      </Dialog>
    </>
  )
}
