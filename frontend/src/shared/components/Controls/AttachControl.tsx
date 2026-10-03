import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Tooltip, cn } from '@/design-system'
import { FilesUploader } from '../FilesUploader'

export interface AttachControlProps {
  value?: string | null
  doctype?: string
  docname?: string
  fieldname?: string
  disabled?: boolean
  imageOnly?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'subtle' | 'outline' | 'ghost'
  className?: string
  onChange?: (value: string | null) => void
}

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|avif|bmp|ico|tiff?)(\?.*)?$/i

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

function fileNameOf(value: string | null | undefined): string {
  if (!value) return ''
  const clean = value.split('?')[0]!.split('#')[0]!
  const raw = clean.split('/').pop() || value
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export function AttachControl({
  value = null,
  doctype = '',
  docname = '',
  fieldname = '',
  disabled = false,
  imageOnly = false,
  size = 'sm',
  variant = 'subtle',
  className,
  onChange,
}: AttachControlProps) {
  const [showUploader, setShowUploader] = useState(false)

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

  const filename = fileNameOf(value)
  const isImage = IMAGE_EXTENSIONS.test(value || '')

  const uploaderOptions = {
    folder: 'Home/Attachments',
    allowMultiple: false,
    restrictions: {
      maxNumberOfFiles: 1,
      ...(imageOnly ? { allowedFileTypes: ['image/*'] } : {}),
    },
  }

  return (
    <>
      {!value && !disabled ? (
        <div className={cn(containerClasses, 'cursor-pointer')} onClick={() => setShowUploader(true)}>
          <span className={cn('lucide-paperclip size-4 text-ink-gray-5', ICON_CLASSES[size])} aria-hidden="true" />
          <span className="whitespace-nowrap text-ink-gray-4">{__('Attach file…')}</span>
        </div>
      ) : !value ? (
        <div className={containerClasses}>
          <span className="text-ink-gray-4">—</span>
        </div>
      ) : (
        <div className={cn(containerClasses, '!pr-1')}>
          <span className={cn('lucide-paperclip size-4 text-ink-gray-7', ICON_CLASSES[size])} aria-hidden="true" />
          <Tooltip
            body={
              isImage ? (
                <div className="overflow-hidden rounded shadow-xl">
                  <img src={value} className="max-h-40 max-w-xs object-contain" alt={filename} />
                </div>
              ) : (
                <div className="rounded bg-surface-gray-10 px-2 py-1.5 text-xs text-ink-base shadow-xl">{filename}</div>
              )
            }
          >
            <a
              className="block min-w-0 flex-1 truncate text-ink-gray-8 hover:underline"
              href={value}
              target="_blank"
              rel="noopener noreferrer"
            >
              {filename}
            </a>
          </Tooltip>
          {!disabled && (
            <button
              className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-gray-4 hover:bg-surface-gray-2 hover:text-ink-gray-7 dark:hover:bg-surface-gray-4"
              title={__('Clear')}
              onClick={(event) => {
                event.preventDefault()
                onChange?.(null)
              }}
            >
              <span className="lucide-x h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {showUploader && (
        <FilesUploader
          open={showUploader}
          onOpenChange={setShowUploader}
          doctype={doctype}
          docname={docname}
          fieldname={fieldname}
          options={uploaderOptions}
          onAfter={(uploaded) => {
            if (uploaded.length) onChange?.(uploaded[0]!.file_url)
          }}
        />
      )}
    </>
  )
}
