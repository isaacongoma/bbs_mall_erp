import { __ } from '@/core/i18n'
import { Button, ErrorMessage, FormControl, Switch } from '@/design-system'
import { RichTextField } from '@/shared/components/RichTextField'

type AnyRecord = Record<string, any>

export interface EmailTemplateFormProps {
  title: string
  template: AnyRecord
  onChange: (patch: AnyRecord) => void
  onBack: () => void
  saveLabel: string
  saveIcon?: string
  saveDisabled?: boolean
  saving?: boolean
  onSave: () => void
  errorMessage: string
  subjectPlaceholder: string
}

export function EmailTemplateForm({
  title,
  template,
  onChange,
  onBack,
  saveLabel,
  saveIcon,
  saveDisabled,
  saving,
  onSave,
  errorMessage,
  subjectPlaceholder,
}: EmailTemplateFormProps) {
  return (
    <div className="flex h-full flex-col gap-6 p-8 text-ink-gray-8">
      <div className="flex justify-between">
        <div className="-ml-4 flex w-9/12 gap-1">
          <Button
            variant="ghost"
            iconLeft="lucide-chevron-left"
            label={title}
            size="md"
            className="!max-w-96 cursor-pointer !justify-start !pr-0 text-2xl-semibold hover:bg-transparent hover:opacity-70 focus:bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 active:bg-transparent active:text-ink-gray-5 active:outline-none active:ring-0 active:ring-offset-0"
            onClick={onBack}
          />
        </div>
        <div className="item-center flex w-3/12 justify-end space-x-4">
          <div className="flex h-7 items-center space-x-2">
            <Switch value={Boolean(template.enabled)} size="sm" onChange={(value) => onChange({ enabled: value })} />
            <span className="text-sm text-ink-gray-7">{__('Enabled')}</span>
          </div>
          <Button
            label={saveLabel}
            iconLeft={saveIcon}
            variant="solid"
            disabled={saveDisabled}
            loading={saving}
            onClick={onSave}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <FormControl
              size="md"
              placeholder={__('Payment Reminder')}
              label={__('Name')}
              required
              value={template.name ?? ''}
              onChange={(value: string) => onChange({ name: value })}
            />
          </div>
          <div className="flex-1">
            <FormControl
              type="select"
              size="md"
              label={__('For')}
              options={[
                { label: __('Deal'), value: 'CRM Deal' },
                { label: __('Lead'), value: 'CRM Lead' },
              ]}
              placeholder={__('Deal')}
              value={template.reference_doctype}
              onChange={(value: string) => onChange({ reference_doctype: value })}
            />
          </div>
        </div>
        <div>
          <FormControl
            size="md"
            label={__('Subject')}
            placeholder={subjectPlaceholder}
            required
            value={template.subject ?? ''}
            onChange={(value: string) => onChange({ subject: value })}
          />
        </div>
        <div className="border-t pt-4">
          <FormControl
            type="select"
            size="md"
            label={__('Content Type')}
            options={['Rich Text', 'HTML']}
            placeholder={__('Rich Text')}
            value={template.content_type}
            onChange={(value: string) => onChange({ content_type: value })}
          />
        </div>
        <div>
          {template.content_type === 'HTML' ? (
            <FormControl
              size="md"
              type="textarea"
              label={__('Content')}
              required
              rows={10}
              placeholder={__(
                '<p>Dear {{ lead_name }},</p>\n\n<p>This is a reminder for the payment of {{ grand_total }}.</p>\n\n<p>Thanks,</p>\n<p>Frappé</p>',
              )}
              value={template.response_html ?? ''}
              onChange={(value: string) => onChange({ response_html: value })}
            />
          ) : (
            <div>
              <div className="mb-1.5 text-base text-ink-gray-5">
                {__('Content')}
                <span className="text-ink-red-6">*</span>
              </div>
              <RichTextField
                editorClass="!prose-sm max-w-full overflow-auto min-h-[180px] max-h-80 py-1.5 px-2 rounded border border-[--surface-gray-2] bg-surface-gray-2 placeholder-ink-gray-4 hover:border-outline-elevation-2 hover:bg-surface-gray-3 hover:shadow-sm focus:bg-surface-base focus:border-outline-gray-4 focus:ring-0 focus-visible:ring-2 focus-visible:ring-outline-gray-3 text-ink-gray-8 transition-colors"
                content={template.response}
                placeholder={__(
                  'Dear {{ lead_name }}, \n\nThis is a reminder for the payment of {{ grand_total }}. \n\nThanks, \nFrappé',
                )}
                onChange={(value) => onChange({ response: value })}
              />
            </div>
          )}
        </div>
      </div>
      {errorMessage && (
        <div>
          <ErrorMessage message={__(errorMessage)} />
        </div>
      )}
    </div>
  )
}
