import type { ReactNode } from 'react'
import { __ } from '@/core/i18n'
import { Badge, Button } from '@/design-system'
import { LoadingIndicator, PhoneIcon } from '@/shared/components/Icons'
import { SettingsLayoutBase } from '@/shared/components/Settings/SettingsPanel'

type AnyRecord = Record<string, any>

export interface IntegrationSettingsLayoutProps {
  title: string
  disabledTitle: string
  disabledDescription: string
  resource: AnyRecord | null
  isDirty: boolean
  saving: boolean
  onBack: () => void
  onEnable: () => void
  onDisable: () => void
  onUpdate: () => void
  onDiscard: () => void
  children: ReactNode
}

export function IntegrationSettingsLayout({
  title,
  disabledTitle,
  disabledDescription,
  resource,
  isDirty,
  saving,
  onBack,
  onEnable,
  onDisable,
  onUpdate,
  onDiscard,
  children,
}: IntegrationSettingsLayoutProps) {
  const doc: AnyRecord | null = resource?.doc ?? null
  const loading = Boolean(resource?.get?.loading)

  return (
    <SettingsLayoutBase
      title={
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            iconLeft="lucide-chevron-left"
            label={title}
            size="md"
            className="-ml-4 !max-w-96 cursor-pointer !justify-start !pr-0 text-2xl-semibold hover:bg-transparent hover:opacity-70 focus:bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 active:bg-transparent active:text-ink-gray-5 active:outline-none active:ring-0 active:ring-offset-0"
            onClick={onBack}
          />
          {doc?.enabled && isDirty && <Badge label={__('Not Saved')} variant="subtle" theme="orange" />}
        </div>
      }
      headerActions={
        doc?.enabled && !loading ? (
          <div className="flex gap-2">
            {isDirty && <Button label={__('Discard Changes')} variant="subtle" onClick={onDiscard} />}
            <Button label={__('Disable')} variant="subtle" onClick={onDisable} />
            <Button variant="solid" label={__('Update')} loading={saving} disabled={!isDirty} onClick={onUpdate} />
          </div>
        ) : undefined
      }
    >
      {doc ? (
        <div className="h-full">
          {doc.enabled ? (
            <div className="space-y-4">{children}</div>
          ) : (
            <div className="relative flex h-full w-full justify-center">
              <div
                className="absolute left-1/2 flex w-64 -translate-x-1/2 flex-col items-center gap-3"
                style={{ top: '35%' }}
              >
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <PhoneIcon className="size-7.5 text-ink-gray-7" />
                  <span className="text-lg-medium text-ink-gray-8">{disabledTitle}</span>
                  <span className="text-center text-p-base text-ink-gray-6">{disabledDescription}</span>
                  <Button label={__('Enable')} variant="solid" onClick={onEnable} />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        loading && (
          <div className="mt-[35%] flex items-center justify-center">
            <LoadingIndicator className="size-6" />
          </div>
        )
      )}
    </SettingsLayoutBase>
  )
}
