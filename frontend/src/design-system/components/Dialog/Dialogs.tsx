import DOMPurify from 'dompurify'
import { useMemo } from 'react'
import { ErrorMessage } from '../ErrorMessage'
import { Dialog } from './Dialog'
import { useDialogStore, type ImperativeDialog } from '../../stores/dialogStore'

function SanitizedHtml({ html }: { html: string }) {
  const clean = useMemo(() => DOMPurify.sanitize(html), [html])
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}

function ImperativeDialogView({ dialog }: { dialog: ImperativeDialog }) {
  const setShow = useDialogStore((state) => state.setShow)
  const remove = useDialogStore((state) => state.remove)

  return (
    <Dialog
      title={dialog.title}
      size={dialog.size}
      icon={dialog.icon}
      position={dialog.position}
      actions={dialog.actions}
      dismissible={dialog.dismissible}
      open={dialog.show}
      onOpenChange={(open) => setShow(dialog.id, open)}
      onClose={dialog.onClose}
      onAfterLeave={() => remove(dialog.id)}
    >
      {dialog.message && <p className="text-p-base text-ink-gray-7">{dialog.message}</p>}
      {dialog.html && <SanitizedHtml html={dialog.html} />}
      <ErrorMessage className="mt-2" message={dialog.error} />
    </Dialog>
  )
}

export function Dialogs() {
  const dialogs = useDialogStore((state) => state.dialogs)
  return (
    <>
      {dialogs.map((dialog) => (
        <ImperativeDialogView key={dialog.id} dialog={dialog} />
      ))}
    </>
  )
}
