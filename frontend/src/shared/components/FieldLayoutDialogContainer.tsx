import { useFieldLayoutDialogStore } from '../stores/fieldLayoutDialogStore'
import { FieldLayoutDialog } from './FieldLayoutDialog'

export function FieldLayoutDialogContainer() {
  const dialogs = useFieldLayoutDialogStore((state) => state.dialogs)
  return (
    <>
      {dialogs.map((dialog) => (
        <FieldLayoutDialog key={dialog.key} {...dialog.props} />
      ))}
    </>
  )
}
