import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, FormControl } from '@/design-system'
import { evaluateDependsOnValue } from '@/shared/utils/expressions'
import type { useFormBuilder } from '../../hooks/useFormBuilder'
import {
  BREAK_TYPES,
  TEXTAREA_TYPES,
  inputType,
  optionList,
  previewLayout,
  type FormField,
} from '../../utils/formBuilder'

type Builder = ReturnType<typeof useFormBuilder>
type Values = Record<string, any>

export interface FormBuilderPreviewProps {
  builder: Builder
}

export function FormBuilderPreview({ builder }: FormBuilderPreviewProps) {
  const { form, fields } = builder
  const [values, setValues] = useState<Values>({})
  const [submitted, setSubmitted] = useState(false)

  const layout = previewLayout(fields)
  const inputCount = fields.filter((field) => !BREAK_TYPES.includes(field.fieldtype)).length

  const evalRule = (expression: string | undefined, fallback: boolean): boolean =>
    expression ? Boolean(evaluateDependsOnValue(expression, values)) : fallback
  const visible = (field: FormField) => evalRule(field.depends_on, true)
  const required = (field: FormField) => (field.reqd ? true : evalRule(field.mandatory_depends_on, false))
  const readOnly = (field: FormField) => evalRule(field.read_only_depends_on, false)

  function reset() {
    setSubmitted(false)
    setValues({})
  }

  function set(fieldname: string, value: unknown) {
    setValues((current) => ({ ...current, [fieldname]: value }))
  }

  function selectOptions(field: FormField) {
    const options = field.fieldtype === 'Link' ? (builder.linkOptions[field.options ?? ''] ?? []) : optionList(field)
    return [
      { label: __('Select an option'), value: '' },
      ...options.map((option) => ({ label: option, value: option })),
    ]
  }

  function control(field: FormField) {
    const value = values[field.fieldname] ?? ''
    if (TEXTAREA_TYPES.includes(field.fieldtype)) {
      return (
        <FormControl
          type="textarea"
          placeholder={field.placeholder}
          disabled={readOnly(field)}
          value={value}
          onChange={(next: string) => set(field.fieldname, next)}
        />
      )
    }
    if (field.fieldtype === 'Select' || field.fieldtype === 'Link') {
      return (
        <FormControl
          type="select"
          options={selectOptions(field)}
          placeholder={field.placeholder || __('Select an option')}
          disabled={readOnly(field)}
          value={value}
          onChange={(next: string) => set(field.fieldname, next)}
        />
      )
    }
    if (field.fieldtype === 'Check') {
      return (
        <div className="flex items-center gap-2">
          <FormControl
            type="checkbox"
            disabled={readOnly(field)}
            value={Boolean(values[field.fieldname])}
            onChange={(next: boolean) => set(field.fieldname, next)}
          />
          <span className="text-sm text-ink-gray-5">
            {field.label}
            {required(field) && <span className="text-ink-red-5">*</span>}
          </span>
        </div>
      )
    }
    return (
      <FormControl
        type={inputType(field) as 'text'}
        placeholder={field.placeholder}
        disabled={readOnly(field)}
        value={value}
        onChange={(next: string) => set(field.fieldname, next)}
      />
    )
  }

  return (
    <div className="max-w-2xl pt-6">
      <div className="rounded-xl border bg-surface-white p-7">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-green-2 text-ink-green-3">
              <span className="lucide-check h-6 w-6" aria-hidden="true" />
            </div>
            <div className="text-lg font-semibold text-ink-gray-9">{form.success_message || __('Thank you!')}</div>
            <Button label={__('Preview again')} onClick={reset} />
          </div>
        ) : (
          <>
            <div className="text-xl font-semibold text-ink-gray-9">{form.title || __('Form title')}</div>
            {form.description && (
              <div className="mt-3.5 whitespace-pre-wrap text-sm text-ink-gray-6">{form.description}</div>
            )}
            <div className="mt-5 flex flex-col gap-5">
              {layout.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  {section.label && <div className="mb-3 text-sm font-semibold text-ink-gray-8">{section.label}</div>}
                  <div
                    className="grid gap-x-5"
                    style={{ gridTemplateColumns: `repeat(${section.columns.length}, minmax(0,1fr))` }}
                  >
                    {section.columns.map((column, columnIndex) => (
                      <div key={columnIndex} className="flex flex-col gap-4">
                        {column.map((field) => (
                          <div key={field.fieldname} hidden={!visible(field)}>
                            {field.fieldtype !== 'Check' && (
                              <div className="mb-1.5 text-sm text-ink-gray-5">
                                {field.label}
                                {required(field) && <span className="text-ink-red-5">*</span>}
                              </div>
                            )}
                            {control(field)}
                            {field.field_description && (
                              <div className="mt-1 text-sm text-ink-gray-4">{field.field_description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!inputCount && <div className="text-sm text-ink-gray-4">{__('Add fields to see them here.')}</div>}
              <div className="mt-1 flex justify-end gap-2.5">
                <Button variant="subtle" size="md" label={__('Discard')} onClick={reset} />
                <Button
                  variant="solid"
                  size="md"
                  label={form.submit_button_label || __('Submit')}
                  onClick={() => setSubmitted(true)}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
