import { useRef, useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dialog, ErrorMessage } from '@/design-system'
import { createDocument } from '@/shared/utils/documents'
import { Link, type LinkHandle } from '@/shared/components/Controls/Link'
import { CommitTextarea } from '@/shared/components/Controls/CommitInput'

export interface LostReasonPayload {
  lost_reason: string
  lost_notes: string
}

interface LostReasonDocument {
  doc: Record<string, any> | null
  originalDoc?: Record<string, any> | null
  setField: (key: string, value: unknown) => void
  save: { submit: () => unknown }
}

export interface LostReasonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype?: string
  document?: LostReasonDocument | null
  onSave?: (payload: LostReasonPayload) => void
  onCancel?: () => void
}

export function LostReasonModal({
  open,
  onOpenChange,
  doctype = 'CRM Lead',
  document = null,
  onSave,
  onCancel,
}: LostReasonModalProps) {
  const doc = document?.doc
  const linkRef = useRef<LinkHandle>(null)
  const [lostReason, setLostReason] = useState<string>(doc?.lost_reason || '')
  const [lostNotes, setLostNotes] = useState<string>(doc?.lost_notes || '')
  const [error, setError] = useState('')

  function cancel() {
    onOpenChange(false)
    setError('')
    setLostReason('')
    setLostNotes('')
    if (document && document.originalDoc) document.setField('status', document.originalDoc.status)
    onCancel?.()
  }

  function save() {
    if (!lostReason) {
      setError(__('Lost Reason is required'))
      return
    }
    if (lostReason === 'Other' && !lostNotes) {
      setError(__('Lost Notes are required when Lost Reason is "Other"'))
      return
    }
    setError('')
    onOpenChange(false)

    if (document) {
      document.setField('lost_reason', lostReason)
      document.setField('lost_notes', lostNotes)
      document.save.submit()
    }
    onSave?.({ lost_reason: lostReason, lost_notes: lostNotes })
    setLostReason('')
    setLostNotes('')
  }

  function onCreate(value: string, close: () => void) {
    void createDocument('CRM Lost Reason', { lost_reason: value }, close, (created: { name: string }) => {
      setLostReason(created.name)
      linkRef.current?.reload()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) cancel()
        else onOpenChange(next)
      }}
      title={__('Lost Reason')}
      actionsContent={() => (
        <div className="flex items-center justify-between gap-2">
          <div>
            <ErrorMessage message={error} />
          </div>
          <div className="flex gap-2">
            <Button label={__('Cancel')} onClick={cancel} />
            <Button variant="solid" label={__('Save')} onClick={save} />
          </div>
        </div>
      )}
    >
      <div className="-mt-3 mb-4 text-p-base text-ink-gray-7">
        {__('Please provide a reason for marking this {0} as lost', [doctype.toLowerCase().replace('crm ', '')])}
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <div className="mb-2 text-sm text-ink-gray-5">
            {__('Lost Reason')}
            <span className="text-ink-red-5">*</span>
          </div>
          <Link
            handleRef={linkRef}
            className="form-control flex-1 truncate"
            value={lostReason}
            doctype="CRM Lost Reason"
            onCreate={onCreate}
            onChange={setLostReason}
          />
        </div>
        <div>
          <div className="mb-2 text-sm text-ink-gray-5">
            {__('Lost Notes')}
            {lostReason === 'Other' && <span className="text-ink-red-5">*</span>}
          </div>
          <CommitTextarea className="form-control flex-1 truncate" value={lostNotes} onCommit={setLostNotes} />
        </div>
      </div>
    </Dialog>
  )
}
