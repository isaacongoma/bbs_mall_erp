import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Checkbox, Dialog, FormControl, FormLabel, toast } from '@/design-system'
import { DurationInput } from '@/shared/components/Controls/DurationInput'
import type { SlaPriority } from '../../utils/sla'

export interface EditResponseResolutionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  priority: SlaPriority
  priorityOptions: { label: string; value: string }[]
  onSave: (original: SlaPriority, next: SlaPriority) => void
  onDelete: (original: SlaPriority) => void
}

export function EditResponseResolutionModal({
  open,
  onOpenChange,
  priority,
  priorityOptions,
  onSave,
  onDelete,
}: EditResponseResolutionModalProps) {
  const [data, setData] = useState<SlaPriority>({ ...priority })
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function save() {
    if (!data.priority) {
      toast.error(__('Please select a priority'))
      return
    }
    const responseTime = parseInt(String(data.first_response_time))
    if (isNaN(responseTime) || responseTime <= 0) {
      toast.error(__('Response time is required'))
      return
    }
    onSave(priority, data)
    onOpenChange(false)
  }

  function remove() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    onDelete(priority)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={__('Edit Response & Resolution')}
      actionsContent={() => (
        <div className="flex justify-between">
          <div>
            <Button
              variant="subtle"
              theme={confirmingDelete ? 'red' : 'gray'}
              label={confirmingDelete ? __('Confirm Delete') : __('Delete')}
              iconLeft="lucide-trash-2"
              onClick={remove}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="subtle" theme="gray" label={__('Cancel')} onClick={() => onOpenChange(false)} />
            <Button variant="solid" label={__('Save')} onClick={save} />
          </div>
        </div>
      )}
    >
      <div className="flex flex-col gap-4">
        <FormControl
          type="select"
          size="sm"
          variant="subtle"
          placeholder={__('Select Priority')}
          label={__('Priority')}
          options={priorityOptions}
          required
          className="text-ink-gray-8"
          value={data.priority}
          onChange={(value: string) => setData((current) => ({ ...current, priority: value }))}
        />
        <div>
          <FormLabel label={__('First Response Time')} required />
          <div className="mt-2 w-full">
            <DurationInput
              value={data.first_response_time}
              longForm
              size="sm"
              variant="subtle"
              onChange={(value) => setData((current) => ({ ...current, first_response_time: value }))}
            />
          </div>
        </div>
        <Checkbox
          value={data.default_priority}
          label={__('Set Default Priority')}
          onChange={(value) => setData((current) => ({ ...current, default_priority: value }))}
        />
      </div>
    </Dialog>
  )
}
