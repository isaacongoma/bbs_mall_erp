import { LucideIcon } from '../../icons'

export interface UploadProgressIndicatorProps {
  percent: number
  onCancel: () => void
}

export function UploadProgressIndicator({ percent, onCancel }: UploadProgressIndicatorProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-0.5" aria-live="polite">
      <div className="pointer-events-auto flex items-center gap-2 rounded bg-black/65 px-1.5 py-1">
        <span className="tabular-nums text-sm text-white">{percent}%</span>
        <button
          type="button"
          className="size-4 p-1 text-gray-500 hover:text-white"
          aria-label="Cancel upload"
          onClick={(event) => {
            event.stopPropagation()
            onCancel()
          }}
        >
          <LucideIcon name="lucide-x" className="size-full" />
        </button>
      </div>
    </div>
  )
}
