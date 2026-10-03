import type { Editor } from '@tiptap/core'
import { useEffect, useRef } from 'react'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Textarea } from '../../components/Textarea'
import { platformByName } from '../extensions/iframe/iframe-embed-utils'
import { useIframeDialog } from '../hooks/useIframeDialog'

export interface IframeInsertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editor: Editor
  getReplacePos?: () => number | undefined
  initialUrl?: string
  platform?: string
}

export function IframeInsertDialog({
  open,
  onOpenChange,
  editor,
  getReplacePos,
  initialUrl,
  platform,
}: IframeInsertDialogProps) {
  const dialog = useIframeDialog(editor, { getReplacePos, initialUrl })
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isEditing = !!getReplacePos
  const platformConfig = platform ? platformByName(platform) : null

  const title = isEditing ? 'Edit Embed' : platformConfig ? `Embed ${platformConfig.name}` : 'Insert Embed'
  const placeholder = platformConfig?.example ?? 'https://youtube.com/watch?v=… or <iframe src=…>'

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [open])

  const submit = () => {
    if (dialog.insert()) onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      options={{ title, size: 'md' }}
      bodyContent={
        <div>
          <label className="mb-2 block text-base text-ink-gray-5">URL or Embed Code</label>
          <Textarea
            textareaRef={inputRef}
            value={dialog.embedInput}
            onChange={dialog.setEmbedInput}
            placeholder={placeholder}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submit()
              }
            }}
          />
          {dialog.urlError ? (
            <p className="mt-1 text-sm text-ink-red-6">{dialog.urlError}</p>
          ) : dialog.embedInput && dialog.isValidUrl ? (
            <p className="mt-1 text-sm text-ink-green-6">✓ Valid {dialog.platformName} URL</p>
          ) : null}
        </div>
      }
      actionsContent={() => (
        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="solid" disabled={!dialog.isValidUrl} onClick={submit}>
            {isEditing ? 'Update Embed' : 'Insert Embed'}
          </Button>
        </div>
      )}
    />
  )
}
