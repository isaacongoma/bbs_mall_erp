import { cn } from '../../utils/cn'
import { Tooltip } from '../../components/Tooltip'
import type { ColorSwatch } from '../utils/swatches'

export interface ColorSwatchGridProps {
  swatches: ColorSwatch[]
  active: string | null
  variant: 'text' | 'highlight'
  onSelect: (value: string | null) => void
}

export function ColorSwatchGrid({ swatches, active, variant, onSelect }: ColorSwatchGridProps) {
  return (
    <div className="mt-2 grid grid-cols-6 gap-2">
      {swatches.map((swatch) => (
        <Tooltip key={swatch.label} text={swatch.label}>
          <button
            type="button"
            aria-label={swatch.label}
            aria-pressed={swatch.value === active}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-sm border text-base focus:outline-none focus-visible:ring focus-visible:ring-outline-gray-3',
              swatch.class,
              variant === 'highlight' && 'text-ink-gray-9',
              swatch.value === active && 'ring-2 ring-outline-gray-4',
            )}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(swatch.value)}
          >
            A
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
