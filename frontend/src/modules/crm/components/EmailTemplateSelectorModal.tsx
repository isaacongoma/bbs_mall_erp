import { useState } from 'react'
import { __ } from '@/core/i18n'
import { useListResource } from '@/core/resources'
import { Button, Dialog, TextInput } from '@/design-system'
import { useBroadcast } from '@/shared/hooks/useBroadcast'
import { useUiStore } from '@/shared/stores/uiStore'
import { sanitizeHTML } from '@/shared/utils/text'

type AnyRecord = Record<string, any>

export interface EmailTemplateSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype?: string
  onApply: (template: AnyRecord) => void
}

export function EmailTemplateSelectorModal({
  open,
  onOpenChange,
  doctype = '',
  onApply,
}: EmailTemplateSelectorModalProps) {
  const [search, setSearch] = useState('')
  const setUi = useUiStore((state) => state.set)

  const templates = useListResource({
    doctype: 'Email Template',
    cache: ['emailTemplates', doctype],
    fields: [
      'name',
      'enabled',
      'use_html',
      'reference_doctype',
      'subject',
      'response',
      'response_html',
      'modified',
      'owner',
    ],
    filters: { enabled: 1, reference_doctype: doctype },
    orderBy: 'modified desc',
    pageLength: 99999,
    auto: true,
  })

  const { send } = useBroadcast('refresh-email-templates', () => void templates.reload?.())

  function create() {
    onOpenChange(false)
    setUi({ showSettings: true, activeSettingsPage: 'Templates' })
    send('email_template_page', { page: 'new-template', reference_doctype: doctype })
  }

  const needle = search.toLowerCase()
  const filtered: AnyRecord[] =
    (templates.data as AnyRecord[] | null)?.filter(
      (template) =>
        template.name.toLowerCase().includes(needle) || (template.subject ?? '').toLowerCase().includes(needle),
    ) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={__('Email Templates')} size="4xl">
      <div className="flex items-center gap-2">
        <TextInput
          className="w-full"
          type="text"
          placeholder={__('Payment Reminder')}
          value={search}
          onChange={setSearch}
          prefix={<span className="lucide-search h-4 w-4 text-ink-gray-4" aria-hidden="true" />}
        />
        <Button label={__('Create')} iconLeft="lucide-plus" onClick={create} />
      </div>
      {filtered.length ? (
        <div className="mt-4 grid max-h-[560px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-3">
          {filtered.map((template) => (
            <div
              key={template.name}
              className="flex h-56 cursor-pointer flex-col gap-2 rounded-lg border p-3 hover:bg-surface-gray-2"
              onClick={() => onApply(template)}
            >
              <div className="border-b pb-2 text-base-semibold">{template.name}</div>
              {template.subject && (
                <div className="text-sm text-ink-gray-5">{__('Subject: {0}', [template.subject])}</div>
              )}
              {template.use_html && template.response_html ? (
                <div
                  className="prose-f prose-sm max-w-none flex-1 overflow-hidden !text-sm text-ink-gray-5"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(template.response_html) }}
                />
              ) : template.response ? (
                <div
                  className="prose-f prose-sm max-w-none flex-1 overflow-hidden !text-sm text-ink-gray-5"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(template.response) }}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2">
          <div className="flex h-56 flex-col items-center justify-center">
            <div className="text-lg text-ink-gray-4">{__('No Templates Found')}</div>
            <Button label={__('Create New')} className="mt-4" onClick={create} />
          </div>
        </div>
      )}
    </Dialog>
  )
}
