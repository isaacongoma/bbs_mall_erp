import { __ } from '@/core/i18n'
import { Button, Popover, toast } from '@/design-system'
import { useDocument } from '../hooks/useDocument'
import { useAssigneeSync, type AssignOnUpdate } from '../hooks/useAssigneeSync'
import { AssignToBody } from './AssignToBody'
import type { Assignee } from './AssignmentModal'
import { MultipleAvatar } from './MultipleAvatar'

export interface AssignToProps {
  doctype?: string
  docname?: string
  ownerField?: string | null
  assignees: Assignee[]
  onAssigneesChange: (assignees: Assignee[]) => void
}

export function AssignTo({
  doctype = '',
  docname = '',
  ownerField = null,
  assignees,
  onAssigneesChange,
}: AssignToProps) {
  const { document } = useDocument(doctype, docname)
  const doc = (document as unknown as { doc: Record<string, any> }).doc
  const typedDocument = document as unknown as {
    setField: (key: string, value: unknown) => void
    save: { submit: () => unknown }
  }

  const saveAssignees: AssignOnUpdate | null = ownerField
    ? async (added, removed, { addAssignees, removeAssignees }) => {
        if (removed.length) await removeAssignees(removed)
        if (added.length) await addAssignees(added)

        const nextAssignee = assignees.find((assignee) => assignee.name !== doc[ownerField])
        const owner = ownerField.replace('_', ' ')

        if (doc[ownerField] && removed.includes(doc[ownerField])) {
          typedDocument.setField(ownerField, nextAssignee ? nextAssignee.name : '')
          typedDocument.save.submit()
          if (nextAssignee) {
            toast.info(
              __(
                'Since you removed {0} from the assignee, the {0} has been changed to the next available assignee {1}.',
                [owner, nextAssignee.label || nextAssignee.name],
              ),
            )
          } else {
            toast.info(__('Since you removed {0} from the assignee, the {0} has also been removed.', [owner]))
          }
        } else if (!doc[ownerField] && nextAssignee) {
          typedDocument.setField(ownerField, nextAssignee.name)
          toast.info(
            __('Since you added a new assignee, the {0} has been set to {1}.', [
              owner,
              nextAssignee.label || nextAssignee.name,
            ]),
          )
        }
      }
    : null

  const sync = useAssigneeSync({ doctype, docname, assignees, onUpdate: saveAssignees })

  return (
    <Popover
      placement="bottom-end"
      open={sync.open}
      onOpenChange={sync.onOpenChange}
      target={({ togglePopover }) => (
        <div className="flex items-center" onClick={() => togglePopover()}>
          {assignees.length === 1 ? (
            <Button>
              <MultipleAvatar avatars={assignees} />
            </Button>
          ) : assignees.length ? (
            <div>
              <MultipleAvatar avatars={assignees} />
            </div>
          ) : (
            <Button label={__('Assign To')} />
          )}
        </div>
      )}
      body={() => <AssignToBody assignees={assignees} onAssigneesChange={onAssigneesChange} />}
    />
  )
}
