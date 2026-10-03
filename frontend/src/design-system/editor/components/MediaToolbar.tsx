import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { useEffect, useRef, useState } from 'react'
import { Tooltip } from '../../components/Tooltip'
import { LucideIcon } from '../../icons'
import { cn } from '../../utils/cn'
import type { MediaAlign } from '../utils/media-node-view-utils'

export type MediaToolbarType = 'image' | 'video' | 'embed'

type VideoOptionKey = 'autoplay' | 'loop' | 'muted'

export interface MediaToolbarProps {
  node: ProseMirrorNode
  mediaType: MediaToolbarType
  isEditable: boolean
  selected: boolean
  showCaption: boolean
  onToggleCaption: () => void
  onSetAlign: (align: MediaAlign) => void
  onReplace: () => void
  onSetVideoOptions?: (options: Partial<Record<VideoOptionKey, boolean>>) => void
}

const VIDEO_OPTION_KEYS: readonly VideoOptionKey[] = ['autoplay', 'loop', 'muted']

const ALIGN_OPTIONS: ReadonlyArray<{ value: MediaAlign; label: string; icon: string }> = [
  { value: 'left', label: 'Align left', icon: 'lucide-align-left' },
  { value: 'center', label: 'Align center', icon: 'lucide-align-center' },
  { value: 'right', label: 'Align right', icon: 'lucide-align-right' },
]

const REPLACE_LABELS: Record<MediaToolbarType, string> = {
  image: 'Replace image',
  video: 'Replace video',
  embed: 'Change link',
}

export function MediaToolbar({
  node,
  mediaType,
  isEditable,
  selected,
  showCaption,
  onToggleCaption,
  onSetAlign,
  onReplace,
  onSetVideoOptions,
}: MediaToolbarProps) {
  const [showVideoOptions, setShowVideoOptions] = useState(false)
  const optionsRef = useRef<HTMLDivElement>(null)
  const isVideo = mediaType === 'video'
  const isVisible = selected && isEditable
  const replaceLabel = REPLACE_LABELS[mediaType]

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as HTMLElement)) {
        setShowVideoOptions(false)
      }
    }
    document.addEventListener('click', onClickOutside)
    return () => document.removeEventListener('click', onClickOutside)
  }, [])

  return (
    <div
      className={cn(
        'absolute right-2 top-2 z-20 items-center gap-2 rounded bg-black/65 px-1.5 py-1',
        isVisible ? 'flex' : 'hidden',
      )}
    >
      <Tooltip text="Toggle caption">
        <button
          type="button"
          className="h-5"
          aria-label="Toggle caption"
          aria-pressed={showCaption}
          onClick={(event) => {
            event.stopPropagation()
            onToggleCaption()
          }}
        >
          <LucideIcon name="lucide-captions" className={cn('size-4', showCaption ? 'text-white' : 'text-white/60')} />
        </button>
      </Tooltip>

      <Tooltip text={replaceLabel}>
        <button
          type="button"
          className="h-5"
          aria-label={replaceLabel}
          onClick={(event) => {
            event.stopPropagation()
            onReplace()
          }}
        >
          <LucideIcon
            name={mediaType === 'embed' ? 'lucide-link' : 'lucide-refresh-cw'}
            className="size-4 text-white/60 hover:text-white"
          />
        </button>
      </Tooltip>

      {ALIGN_OPTIONS.map((align) => (
        <Tooltip key={align.value} text={align.label}>
          <button
            type="button"
            className={cn('h-5 hover:text-white', node.attrs.align === align.value ? 'text-white' : 'text-white/60')}
            aria-label={align.label}
            aria-pressed={node.attrs.align === align.value}
            onClick={(event) => {
              event.stopPropagation()
              onSetAlign(align.value)
            }}
          >
            <LucideIcon name={align.icon} className="size-4" />
          </button>
        </Tooltip>
      ))}

      {isVideo && (
        <button
          type="button"
          className={cn('hover:text-white', showVideoOptions ? 'text-white' : 'text-white/60')}
          aria-label="Video options"
          onClick={(event) => {
            event.stopPropagation()
            setShowVideoOptions((value) => !value)
          }}
        >
          <LucideIcon name="lucide-settings-2" className="size-4" />
        </button>
      )}

      {showVideoOptions && isVideo && (
        <div ref={optionsRef} className="absolute right-0 top-full z-50 mt-1 w-40 rounded bg-black/80 p-1 shadow-lg">
          {VIDEO_OPTION_KEYS.map((option) => (
            <button
              key={option}
              type="button"
              className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs text-white/80 hover:bg-white/10 hover:text-white"
              aria-pressed={Boolean(node.attrs[option])}
              onClick={(event) => {
                event.stopPropagation()
                onSetVideoOptions?.({ [option]: !node.attrs[option] })
              }}
            >
              <span className="capitalize">{option}</span>
              {node.attrs[option] && <LucideIcon name="lucide-check" className="size-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
