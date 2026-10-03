import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dialog, ErrorMessage, FormControl, toast } from '@/design-system'
import { WORKDAY_OPTIONS, formatTimeToHHMMSS, type SlaWorkday } from '../../utils/sla'

export interface WorkDayDialogState {
  show: boolean
  isEditing: boolean
  data: Partial<SlaWorkday>
}

export interface WorkDayModalProps {
  state: WorkDayDialogState
  workDays: SlaWorkday[]
  onClose: () => void
  onChange: (workDays: SlaWorkday[]) => void
}

type Form = { workday: string; start_time: string; end_time: string }

export function WorkDayModal({ state, workDays, onClose, onChange }: WorkDayModalProps) {
  const originalWorkday = state.data.workday ?? ''
  const [form, setForm] = useState<Form>(() =>
    state.isEditing
      ? {
          workday: state.data.workday ?? '',
          start_time: formatTimeToHHMMSS(state.data.start_time ?? ''),
          end_time: formatTimeToHHMMSS(state.data.end_time ?? ''),
        }
      : { workday: '', start_time: '', end_time: '' },
  )
  const [errors, setErrors] = useState<Form>({ workday: '', start_time: '', end_time: '' })
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const existing = workDays.map((item) => item.workday)
  const options = WORKDAY_OPTIONS.filter(
    (option) => !existing.includes(option.value) || (state.isEditing && option.value === originalWorkday),
  )

  function validateField(field: keyof Form, next: Form = form): boolean {
    if (!next[field]) {
      setErrors((current) => ({ ...current, [field]: __('This field is required') }))
      return false
    }
    setErrors((current) => ({ ...current, [field]: '' }))
    return true
  }

  function validateTimeRange(next: Form = form): boolean {
    const nextErrors = { ...errors }
    if (!next.start_time) nextErrors.start_time = __('Start time is required')
    if (!next.end_time) nextErrors.end_time = __('End time is required')
    if (!next.start_time || !next.end_time) {
      setErrors(nextErrors)
      return false
    }
    const [startHours = 0, startMinutes = 0] = next.start_time.split(':').map(Number)
    const [endHours = 0, endMinutes = 0] = next.end_time.split(':').map(Number)
    if (endHours * 60 + endMinutes <= startHours * 60 + startMinutes) {
      setErrors({ ...nextErrors, end_time: __('End time must be after start time') })
      return false
    }
    setErrors({ ...nextErrors, end_time: '' })
    return true
  }

  function validateForm(): boolean {
    const workday = validateField('workday')
    const start = validateField('start_time')
    const end = validateField('end_time') && validateTimeRange()
    return workday && start && end
  }

  function remove() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    onChange(workDays.filter((item) => item.workday !== originalWorkday))
    onClose()
  }

  function save() {
    if (!validateForm()) {
      toast.error(__('Please fix the errors in the form'))
      return
    }
    const formatted = {
      workday: form.workday,
      start_time: formatTimeToHHMMSS(form.start_time),
      end_time: formatTimeToHHMMSS(form.end_time),
    }
    if (state.isEditing) {
      onChange(workDays.map((item) => (item.workday === originalWorkday ? { ...item, ...formatted } : item)))
    } else {
      onChange([...workDays, formatted])
    }
    onClose()
  }

  return (
    <Dialog
      open={state.show}
      onOpenChange={(open) => !open && onClose()}
      title={__('Edit Workday')}
      actionsContent={() => (
        <div className={`flex ${state.isEditing ? 'justify-between' : 'justify-end'}`}>
          {state.isEditing && (
            <div>
              <Button
                variant="subtle"
                theme={confirmingDelete ? 'red' : 'gray'}
                label={confirmingDelete ? __('Confirm Delete') : __('Delete')}
                iconLeft="lucide-trash-2"
                onClick={remove}
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="subtle" theme="gray" label={__('Cancel')} onClick={onClose} />
            <Button variant="solid" label={__('Save')} onClick={save} />
          </div>
        </div>
      )}
    >
      <div className="flex flex-col gap-4">
        <div>
          <FormControl
            type="select"
            size="sm"
            variant="subtle"
            placeholder={__('Select Workday')}
            label={__('Workday')}
            options={options}
            className="text-ink-gray-8"
            value={form.workday}
            onChange={(value: string) => setForm((current) => ({ ...current, workday: value }))}
            onBlur={() => validateField('workday')}
          />
          <ErrorMessage message={errors.workday} className="mt-2" />
        </div>
        <div>
          <FormControl
            type="time"
            size="sm"
            variant="subtle"
            placeholder={__('Start Time')}
            label={__('Start Time')}
            value={form.start_time}
            onChange={(value: string) => setForm((current) => ({ ...current, start_time: value }))}
            onBlur={() => validateField('start_time')}
          />
          <ErrorMessage message={errors.start_time} className="mt-2" />
        </div>
        <div>
          <FormControl
            type="time"
            size="sm"
            variant="subtle"
            placeholder={__('End Time')}
            label={__('End Time')}
            value={form.end_time}
            onChange={(value: string) => setForm((current) => ({ ...current, end_time: value }))}
            onBlur={() => validateTimeRange()}
          />
          <ErrorMessage message={errors.end_time} className="mt-2" />
        </div>
      </div>
    </Dialog>
  )
}
