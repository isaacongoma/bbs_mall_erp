import mime from 'mime'
import { useState, type ReactNode } from 'react'
import { Button, Dialog } from '@/design-system'
import { FileIcon, FileImageIcon, FileSpreadsheetIcon, FileTextIcon, FileTypeIcon } from './Icons'

export interface AttachmentItemProps {
  label?: string | null
  url?: string | null
  suffix?: ReactNode
}

export function AttachmentItem({ label = null, url = null, suffix }: AttachmentItemProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [content, setContent] = useState('')

  const mimeType = (label && mime.getType(label)) || ''
  const isImage = mimeType.startsWith('image/')
  const isPdf = mimeType === 'application/pdf'
  const isSpreadsheet = mimeType.includes('spreadsheet')
  const isText = mimeType === 'text/plain'
  const isShowable = Boolean(url && (isText || isImage))

  const icon = isText
    ? FileTypeIcon
    : isImage
      ? FileImageIcon
      : isPdf
        ? FileTextIcon
        : isSpreadsheet
          ? FileSpreadsheetIcon
          : FileIcon

  async function toggleDialog() {
    if (!isShowable) return
    if (isText && url) setContent(await (await fetch(url)).text())
    setShowDialog((current) => !current)
  }

  return (
    <span>
      <a href={isShowable ? undefined : (url ?? undefined)} target="_blank" rel="noreferrer">
        <Button
          label={label ?? undefined}
          theme="gray"
          variant="outline"
          iconLeft={icon}
          suffix={suffix}
          onClick={() => void toggleDialog()}
        />
      </a>
      <Dialog open={showDialog} onOpenChange={setShowDialog} title={label ?? undefined} size="4xl">
        {isText && <div className="prose prose-sm max-w-none whitespace-pre-wrap">{content}</div>}
        {isImage && url && <img src={url} className="m-auto rounded border" />}
      </Dialog>
    </span>
  )
}
