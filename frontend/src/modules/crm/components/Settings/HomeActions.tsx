import { __ } from '@/core/i18n'
import { Button } from '@/design-system'
import { FieldLayout, type LayoutTab } from '@/shared/components/FieldLayout'
import { SettingsPanel } from '@/shared/components/Settings/SettingsPanel'
import { useDocument } from '@/shared/hooks/useDocument'
import { useUiStore } from '@/shared/stores/uiStore'

type AnyRecord = Record<string, any>

const TABS = [
  {
    name: 'home_actions_tab',
    sections: [
      {
        name: 'home_actions_section',
        hideBorder: true,
        columns: [
          {
            name: 'home_actions_column',
            fields: [{ fieldname: 'dropdown_items', fieldtype: 'Table', options: 'CRM Dropdown Item', label: '' }],
          },
        ],
      },
    ],
  },
] as unknown as LayoutTab[]

export function HomeActions() {
  const setUi = useUiStore((state) => state.set)
  const bundle = useDocument('FCRM Settings', 'FCRM Settings')
  const document = bundle.document as unknown as AnyRecord
  const doc: AnyRecord = document.doc ?? {}

  function updateSettings() {
    document.save.submit(null, { onSuccess: () => setUi({ showSettings: false }) })
  }

  return (
    <SettingsPanel
      title={__('Home Actions')}
      description={__('Configure actions that appear on the home dropdown')}
      actions={
        document.isDirty ? (
          <Button
            label={__('Update')}
            variant="solid"
            loading={Boolean(document.save?.loading)}
            onClick={updateSettings}
          />
        ) : null
      }
    >
      {document.doc && <FieldLayout tabs={TABS} data={doc} doctype="FCRM Settings" docname="FCRM Settings" />}
    </SettingsPanel>
  )
}
