import { __ } from '@/core/i18n'
import { FormControl } from '@/design-system'
import type { useFormBuilder } from '../../hooks/useFormBuilder'
import { TARGET_OPTIONS, focusRouteEnd } from '../../utils/formBuilder'

type Builder = ReturnType<typeof useFormBuilder>

export interface FormBuilderSettingsProps {
  builder: Builder
  onRequestDoctype: (doctype: string) => void
}

export function FormBuilderSettings({ builder, onRequestDoctype }: FormBuilderSettingsProps) {
  const { form } = builder
  return (
    <div className="flex flex-col pt-5">
      <div>
        <div className="flex flex-col gap-1">
          <span className="text-lg-semibold text-ink-gray-8">{__('Form details')}</span>
          <span className="text-p-sm text-ink-gray-6">{__('Basic settings for this form.')}</span>
        </div>
        <div className="mt-3.5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-1.5 text-sm text-ink-gray-5">{__('Route')}</div>
              <div
                className="flex h-7 cursor-text items-center rounded border border-transparent bg-surface-gray-2 px-2.5 text-base transition-colors focus-within:border-outline-gray-4 focus-within:bg-surface-base hover:bg-surface-gray-3"
                onClick={focusRouteEnd}
              >
                <span className="shrink-0 text-ink-gray-4">/crm-form/</span>
                <input
                  value={form.route}
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-ink-gray-8 placeholder:text-ink-gray-4 focus:outline-none focus:ring-0"
                  onChange={(event) => builder.onRouteChange(event.target.value)}
                />
              </div>
            </div>
            <FormControl
              type="select"
              label={__('Maps to')}
              options={TARGET_OPTIONS}
              value={form.document_type}
              onChange={(value: string) => onRequestDoctype(value)}
            />
            <FormControl
              type="text"
              label={__('Submit button label')}
              value={form.submit_button_label}
              onChange={(value: string) => builder.patchForm({ submit_button_label: value })}
            />
          </div>
          <FormControl
            type="textarea"
            label={__('Success message')}
            rows={4}
            placeholder={__('Shown after a successful submission')}
            value={form.success_message}
            onChange={(value: string) => builder.patchForm({ success_message: value })}
          />
          <div>
            <FormControl
              type="text"
              label={__('Redirect URL')}
              placeholder={__('https://example.com/thank-you')}
              value={form.redirect_url}
              onChange={(value: string) => builder.patchForm({ redirect_url: value })}
            />
            <p className="mt-1.5 text-p-sm text-ink-gray-5">
              {__('Send visitors here after they submit. Leave blank to show the success message.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
