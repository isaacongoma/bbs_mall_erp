import { useEffect, useEffectEvent, useState } from 'react'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { Badge, Button } from '@/design-system'
import { DataFieldsModal } from '@/shared/components/DataFieldsModal'
import { FieldLayout, type LayoutTab } from '@/shared/components/FieldLayout'
import { EditIcon, LoadingIndicator } from '@/shared/components/Icons'
import { useDocument } from '@/shared/hooks/useDocument'
import { useIsMobileView } from '@/shared/hooks/useIsMobileView'
import { useUsers } from '@/shared/hooks/useUsers'

type AnyRecord = Record<string, any>

export interface DataFieldsProps {
  doctype: string
  docname: string
  fieldLayoutTabIndex: number
  onFieldLayoutTabIndexChange: (index: number) => void
  fieldLayoutTabName: string
  onFieldLayoutTabNameChange: (name: string) => void
  onBeforeSave?: (changes: AnyRecord) => void
  onAfterSave?: (changes: AnyRecord) => void
}

export function DataFields({
  doctype,
  docname,
  fieldLayoutTabIndex,
  onFieldLayoutTabIndexChange,
  fieldLayoutTabName,
  onFieldLayoutTabNameChange,
  onBeforeSave,
  onAfterSave,
}: DataFieldsProps) {
  const { isManager } = useUsers()
  const isMobileView = useIsMobileView()
  const [showDataFieldsModal, setShowDataFieldsModal] = useState(false)
  const { document: documentResource } = useDocument(doctype, docname)
  const document = documentResource as unknown as AnyRecord

  const storageKey = `fieldLayoutTab:${doctype}:${docname}`

  const restoreTab = useEffectEvent(() => {
    const stored = sessionStorage.getItem(storageKey)
    if (stored) onFieldLayoutTabNameChange(stored)
  })

  useEffect(() => {
    restoreTab()
  }, [storageKey])

  useEffect(() => {
    if (fieldLayoutTabName) sessionStorage.setItem(storageKey, fieldLayoutTabName)
    else sessionStorage.removeItem(storageKey)
  }, [fieldLayoutTabName, storageKey])

  const tabs = useResource<LayoutTab[]>({
    url: 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout',
    cache: ['DataFields', doctype],
    params: { doctype, type: 'Data Fields' },
    auto: true,
  })

  const isDirty = Boolean(document.isDirty)

  function saveChanges() {
    if (!isDirty) return
    const updated = { ...document.doc }
    const original = { ...document.originalDoc }
    const changes: AnyRecord = {}
    for (const key of Object.keys(updated)) {
      if (JSON.stringify(updated[key]) !== JSON.stringify(original[key])) changes[key] = updated[key]
    }

    if (onBeforeSave) onBeforeSave(changes)
    else document.save.submit(null, { onSuccess: () => onAfterSave?.(changes) })
  }

  return (
    <>
      <div className="my-3 flex items-center justify-between text-lg-medium sm:mb-4 sm:mt-8">
        <div className="flex h-8 items-center text-2xl-semibold text-ink-gray-8">
          {__('Data')}
          {isDirty && <Badge className="ml-3" label={__('Not Saved')} theme="orange" />}
        </div>
        <div className="flex gap-1">
          {isManager() && !isMobileView && (
            <Button tooltip={__('Edit Fields Layout')} icon={EditIcon} onClick={() => setShowDataFieldsModal(true)} />
          )}
          <Button
            label="Save"
            disabled={!isDirty}
            variant="solid"
            loading={Boolean(document.save?.loading)}
            onClick={saveChanges}
          />
        </div>
      </div>
      {document.get?.loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-2xl-medium text-ink-gray-6">
          <LoadingIndicator className="h-6 w-6" />
          <span>{__('Loading...')}</span>
        </div>
      ) : (
        <div className="pb-8">
          {tabs.data && (
            <FieldLayout
              tabs={tabs.data}
              data={document.doc}
              doctype={doctype}
              tabIndex={fieldLayoutTabIndex}
              onTabIndexChange={onFieldLayoutTabIndexChange}
              tabName={fieldLayoutTabName}
              onTabNameChange={onFieldLayoutTabNameChange}
            />
          )}
        </div>
      )}
      {showDataFieldsModal && (
        <DataFieldsModal
          open={showDataFieldsModal}
          onOpenChange={setShowDataFieldsModal}
          doctype={doctype}
          onReload={() => {
            void tabs.reload().catch(() => undefined)
            void document.reload?.()
          }}
        />
      )}
    </>
  )
}
