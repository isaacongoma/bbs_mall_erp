import { useRef, useState, type KeyboardEvent } from 'react'
import { __ } from '@/core/i18n'
import { Button, ErrorMessage, ItemListRow, TextInput, Tooltip, cn } from '@/design-system'

export interface PrimaryDropdownOption {
  name?: string
  value: string
  selected?: boolean
  onClick?: () => void
  onSave?: (option: PrimaryDropdownOption, isNew: boolean) => Promise<unknown> | unknown
  onDelete?: (option: PrimaryDropdownOption, isNew: boolean) => void
}

export interface PrimaryDropdownItemProps {
  option: PrimaryDropdownOption
  placeholder?: string
  validate?: ((value: string) => string | undefined | void) | null
}

export function PrimaryDropdownItem({ option, placeholder = '', validate = null }: PrimaryDropdownItemProps) {
  const isInitiallyNew = !option.value
  const [editMode, setEditMode] = useState(isInitiallyNew)
  const [isNew, setIsNew] = useState(isInitiallyNew)
  const [localValue, setLocalValue] = useState(option.value)
  const [syncedValue, setSyncedValue] = useState(option.value)
  const [errorMessage, setErrorMessage] = useState('')
  const saving = useRef(false)
  const [input, setInput] = useState<HTMLInputElement | null>(null)

  if (syncedValue !== option.value) {
    setSyncedValue(option.value)
    setLocalValue(option.value)
  }

  const focusInput = () => requestAnimationFrame(() => input?.focus())

  function selectRow() {
    if (editMode || isNew) return
    if (!option.selected) option.onClick?.()
  }

  function selectRowOnKey(event: KeyboardEvent) {
    if (editMode || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    selectRow()
  }

  function toggleEditMode() {
    setEditMode((current) => !current)
    if (!editMode) focusInput()
  }

  function cancelEdit() {
    setEditMode(false)
    if (isNew) {
      option.onDelete?.(option, true)
      return
    }
    setLocalValue(option.value)
  }

  async function saveOption() {
    if (saving.current || !editMode) return
    const value = localValue?.trim()
    if (!value) return

    const error = validate?.(value)
    if (error) {
      setErrorMessage(error)
      focusInput()
      return
    }

    saving.current = true
    try {
      const saved = await option.onSave?.({ ...option, value }, isNew)
      if (!saved) {
        setErrorMessage(__('Could not save, try again'))
        focusInput()
        return
      }
      setEditMode(false)
      setIsNew(false)
    } catch {
      setErrorMessage(__('Could not save, try again'))
      focusInput()
    } finally {
      saving.current = false
    }
  }

  return (
    <div>
      <ItemListRow
        className={cn('group', !editMode && 'cursor-pointer hover:bg-surface-gray-2')}
        size="sm"
        selected={option.selected}
        tabIndex={editMode ? -1 : 0}
        onClick={selectRow}
        onKeyDown={selectRowOnKey}
        prefix={
          option.selected ? (
            <Tooltip text={__('Primary')}>
              <span className="lucide-check size-4 text-ink-gray-8" aria-hidden="true" />
            </Tooltip>
          ) : (
            <span className="size-4" aria-hidden="true" />
          )
        }
        suffix={
          !editMode ? (
            <div className="-my-1 flex items-center gap-1 transition-opacity [&:has(:focus-visible)]:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
              <Button
                variant="ghost"
                icon="lucide-square-pen"
                tooltip={__('Edit')}
                onClick={(event) => {
                  event.stopPropagation()
                  toggleEditMode()
                }}
              />
              <Button
                variant="ghost"
                theme="red"
                icon="lucide-trash-2"
                tooltip={__('Delete')}
                onClick={(event) => {
                  event.stopPropagation()
                  option.onDelete?.(option, isNew)
                }}
              />
            </div>
          ) : (
            <div className="-my-1 flex items-center gap-1">
              <Button
                variant="outline"
                iconLeft="lucide-check"
                size="sm"
                label={__('Save')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation()
                  void saveOption()
                }}
              />
              <Button
                variant="outline"
                icon="lucide-x"
                tooltip={__('Cancel')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation()
                  cancelEdit()
                }}
              />
            </div>
          )
        }
      >
        {!editMode ? (
          <div className="truncate">{localValue}</div>
        ) : (
          <TextInput
            inputRef={setInput}
            value={localValue}
            size="sm"
            variant="ghost"
            className="[&_input]:bg-transparent"
            wrapperClassName="-mx-2 -my-1"
            placeholder={placeholder}
            onChange={(next) => {
              setLocalValue(next)
              setErrorMessage('')
            }}
            onBlur={(event) => {
              event.stopPropagation()
              void saveOption()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.stopPropagation()
                ;(event.target as HTMLInputElement).blur()
              }
            }}
          />
        )}
      </ItemListRow>
      {errorMessage && <ErrorMessage className="pl-8 pr-2 pt-1" message={errorMessage} />}
    </div>
  )
}
