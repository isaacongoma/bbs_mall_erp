import { useState } from 'react'
import { __ } from '@/core/i18n'
import { useListResource } from '@/core/resources'
import { Button, Dialog, TextInput } from '@/design-system'
import { sanitizeHTML } from '@/shared/utils/text'

type AnyRecord = Record<string, any>

export interface WhatsappTemplateSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype?: string
  onSend: (templateName: string) => void
}

export function WhatsappTemplateSelectorModal({
  open,
  onOpenChange,
  doctype = '',
  onSend,
}: WhatsappTemplateSelectorModalProps) {
  const [search, setSearch] = useState('')

  const templates = useListResource({
    doctype: 'WhatsApp Templates',
    cache: ['whatsappTemplates'],
    fields: ['name', 'template', 'footer'],
    filters: { status: 'APPROVED', for_doctype: ['in', [doctype, '']] },
    orderBy: 'modified desc',
    pageLength: 99999,
    auto: true,
  })

  function create() {
    onOpenChange(false)
    window.open('/app/whatsapp-templates/new')
  }

  const needle = search.toLowerCase()
  const filtered: AnyRecord[] =
    (templates.data as AnyRecord[] | null)?.filter((template) => template.name.toLowerCase().includes(needle)) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={__('WhatsApp Templates')} size="4xl">
      <div className="flex w-full items-center gap-2">
        <TextInput
          className="w-full"
          type="text"
          autoFocus
          placeholder={__('Welcome Message')}
          value={search}
          onChange={setSearch}
          prefix={<span className="lucide-search h-4 w-4 text-ink-gray-4" aria-hidden="true" />}
        />
        <Button label={__('Create New Template')} variant="solid" iconLeft="lucide-plus" onClick={create} />
      </div>
      {filtered.length ? (
        <div className="mt-2 grid max-h-[560px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-3">
          {filtered.map((template) => (
            <div
              key={template.name}
              className="flex h-56 cursor-pointer flex-col gap-2 rounded-lg border p-3 hover:bg-surface-gray-2"
              onClick={() => onSend(template.name)}
            >
              <div className="truncate border-b pb-2 text-base-semibold" title={template.name}>
                {template.name}
              </div>
              {template.template && (
                <div
                  className="prose-f prose-sm max-w-none flex-1 overflow-hidden !text-sm text-ink-gray-5"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(template.template) }}
                />
              )}
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
