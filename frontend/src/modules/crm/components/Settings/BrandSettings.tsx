import { __ } from '@/core/i18n'
import { Button, FormControl } from '@/design-system'
import { ImageUploader } from '@/shared/components/Controls/ImageUploader'
import { SettingsPanel } from '@/shared/components/Settings/SettingsPanel'
import { useUiStore } from '@/shared/stores/uiStore'
import { useSettings } from '../../hooks/useSettings'
import { setupBrand } from '../../stores/settingsStore'

type AnyRecord = Record<string, any>

function BrandImage({
  title,
  description,
  url,
  alt,
  onUpload,
  onRemove,
}: {
  title: string
  description: string
  url?: string
  alt: string
  onUpload: (url: string) => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-col justify-between gap-4">
      <div className="flex flex-1 items-center gap-5">
        <div className="flex size-20 items-center justify-center rounded border border-outline-elevation-2">
          {url ? (
            <img src={url} alt={alt} className="size-8 rounded" />
          ) : (
            <span className="lucide-image size-5 text-ink-gray-4" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-base-medium">{title}</span>
          <span className="text-p-base text-ink-gray-6">{description}</span>
        </div>
        <div>
          <ImageUploader imageType="image/ico" imageUrl={url} onUpload={onUpload} onRemove={onRemove} />
        </div>
      </div>
    </div>
  )
}

export function BrandSettings() {
  const { _settings } = useSettings()
  const settings = _settings as unknown as AnyRecord
  const doc: AnyRecord = settings.doc ?? {}
  const setUi = useUiStore((state) => state.set)

  function update() {
    settings.save.submit(null, {
      onSuccess: () => {
        setUi({ showSettings: false })
        setupBrand()
      },
    })
  }

  return (
    <SettingsPanel
      title={__('Brand Settings')}
      description={__('Configure your brand name, logo and favicon')}
      actions={
        settings.isDirty ? (
          <Button label={__('Update')} variant="solid" loading={Boolean(settings.save?.loading)} onClick={update} />
        ) : null
      }
    >
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-2">
        <div className="flex items-center justify-between gap-8">
          <div className="flex flex-col">
            <div className="truncate text-p-base-medium text-ink-gray-7">{__('Brand Name')}</div>
            <div className="text-p-sm text-ink-gray-5">
              {__('Set the name of your brand. Appears in the left sidebar.')}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FormControl
              type="text"
              size="md"
              value={doc.brand_name ?? ''}
              placeholder={__('Enter Brand Name')}
              onChange={(value: string) => settings.setField('brand_name', value)}
            />
          </div>
        </div>
        <div className="h-px border-t border-outline-elevation-2" />
        <BrandImage
          title={__('Brand Logo')}
          description={__('Appears in the left sidebar. Recommended size is 32x32 px in PNG or SVG')}
          url={doc.brand_logo}
          alt="Logo"
          onUpload={(url) => settings.setField('brand_logo', url)}
          onRemove={() => settings.setField('brand_logo', '')}
        />
        <BrandImage
          title={__('Favicon')}
          description={__('Appears next to the title in your browser tab. Recommended size is 32x32 px in PNG or ICO')}
          url={doc.favicon}
          alt="Favicon"
          onUpload={(url) => settings.setField('favicon', url)}
          onRemove={() => settings.setField('favicon', '')}
        />
      </div>
    </SettingsPanel>
  )
}
