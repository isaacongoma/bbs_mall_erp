import { __ } from '@/core/i18n'
import { Button, TextInput } from '@/design-system'
import { copyToClipboard } from '@/shared/utils/platform'
import type { useFormBuilder } from '../../hooks/useFormBuilder'
import { embeddingDomains, invalidEmbeddingDomains } from '../../utils/formBuilder'

type Builder = ReturnType<typeof useFormBuilder>

export interface FormBuilderShareProps {
  builder: Builder
}

export function FormBuilderShare({ builder }: FormBuilderShareProps) {
  const { form } = builder
  const publicUrl = `${window.location.origin}/crm-form/${form.route}`
  const iframeSnippet = `<iframe src="${publicUrl}?embed=1" width="100%" height="640" style="border:0" title="${form.title || 'Web form'}"></iframe>`
  const domains = embeddingDomains(form.allowed_embedding_domains)
  const invalid = invalidEmbeddingDomains(form.allowed_embedding_domains)

  return (
    <div className="flex flex-col pt-5">
      {!form.published && (
        <p className="mb-5 text-p-sm text-ink-gray-5">
          {__('This form isn’t published yet. Turn on Publish to make the link and embeds live.')}
        </p>
      )}

      <div>
        <div className="flex flex-col gap-1">
          <span className="text-lg-semibold text-ink-gray-8">{__('Link')}</span>
          <span className="text-p-sm text-ink-gray-6">{__('Send people straight to the hosted form.')}</span>
        </div>
        <div className="mt-3.5 flex items-center gap-2">
          <TextInput
            className="flex-1"
            size="sm"
            readOnly
            value={publicUrl}
            suffix={
              <button
                className="flex text-ink-gray-5 transition-colors hover:text-ink-gray-8"
                title={__('Copy link')}
                onClick={() => copyToClipboard(publicUrl)}
              >
                <span className="lucide-copy h-4 w-4" aria-hidden="true" />
              </button>
            }
          />
          <a href={publicUrl} target="_blank" rel="noreferrer">
            <Button label={__('Open')} iconLeft="lucide-external-link" />
          </a>
        </div>
      </div>

      <hr className="my-8 border-outline-gray-2" />

      <div>
        <div className="flex flex-col gap-1">
          <span className="text-lg-semibold text-ink-gray-8">{__('Embed')}</span>
          <span className="text-p-sm text-ink-gray-6">{__('Drop the form into your own website.')}</span>
        </div>
        <div className="mt-3.5 flex flex-col gap-5">
          <div>
            <div className="mb-1 text-base text-ink-gray-5">{__('iframe')}</div>
            <p className="mb-2 text-p-sm text-ink-gray-5">
              {__('Sandboxed in a frame. Simplest, but a fixed height and its own styling.')}
            </p>
            <div className="relative">
              <textarea
                readOnly
                rows={3}
                className="w-full resize-none rounded-md border border-outline-gray-2 bg-surface-gray-1 py-2 pl-3 pr-10 font-mono text-xs text-ink-gray-7 focus:border-outline-gray-4 focus:outline-none focus:ring-0 focus-visible:outline-none"
                value={iframeSnippet}
              />
              <button
                className="absolute right-2 top-2 flex text-ink-gray-5 transition-colors hover:text-ink-gray-8"
                title={__('Copy')}
                onClick={() => copyToClipboard(iframeSnippet)}
              >
                <span className="lucide-copy h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <hr className="my-8 border-outline-gray-2" />

      <div>
        <div className="flex flex-col gap-1">
          <span className="text-lg-semibold text-ink-gray-8">{__('Allowed domains')}</span>
          <span className="text-p-sm text-ink-gray-6">
            {__(
              'Sites where this form may be embedded, one per line. Browsers block the iframe on any site not listed here.',
            )}
          </span>
        </div>
        <textarea
          value={form.allowed_embedding_domains}
          rows={3}
          spellCheck={false}
          placeholder="https://www.example.com"
          className="mt-3.5 w-full resize-none rounded-md border border-outline-gray-2 px-3 py-2 font-mono text-xs text-ink-gray-8 focus:border-outline-gray-4 focus:outline-none focus:ring-0 focus-visible:outline-none"
          onChange={(event) => builder.patchForm({ allowed_embedding_domains: event.target.value })}
        />
        {invalid.length > 0 ? (
          <p className="mt-1.5 text-xs text-ink-red-6">
            {__('Not a valid domain and will be ignored: {0}', [invalid.join(', ')])}
          </p>
        ) : (
          !domains.length && (
            <p className="mt-1.5 text-xs text-ink-gray-5">
              {__('No domains added. The embed will only work on this site until you add one.')}
            </p>
          )
        )}
      </div>
    </div>
  )
}
