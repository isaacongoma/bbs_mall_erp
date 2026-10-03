import { useEffect, useEffectEvent, useState } from 'react'
import { useIsMobileView } from '@/shared/hooks/useIsMobileView'
import { DetailsIcon } from '@/shared/components/Icons'
import { Avatar } from '@/design-system'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { useRoute } from '@/core/navigation'
import { capture } from '@/core/telemetry'
import { Breadcrumbs, Button, ErrorMessage, Tabs, toast, usePageMeta } from '@/design-system'
import { CustomActions } from '@/shared/components/CustomActions'
import { DeleteLinkedDocModal } from '@/shared/components/DeleteLinkedDocModal'
import { ErrorPage } from '@/shared/components/ErrorPage'
import { Icon } from '@/shared/components/Icon'
import { PhoneIcon } from '@/shared/components/Icons'
import { LayoutHeader } from '@/shared/components/LayoutHeader'
import { RecordImage } from '@/shared/components/RecordImage'
import { Resizer } from '@/shared/components/Resizer'
import { SidePanelLayout } from '@/shared/components/SidePanelLayout'
import { useDocument } from '@/shared/hooks/useDocument'
import { useFormScriptActions } from '@/shared/hooks/useFormScriptActions'
import { useMeta } from '@/shared/hooks/useMeta'
import { useUsers } from '@/shared/hooks/useUsers'
import { useGlobalStore } from '@/shared/stores/globalStore'
import { useUiStore } from '@/shared/stores/uiStore'
import { describeRecordError, RECORD_TABS_CLASS } from '@/shared/utils/recordPage'
import { DealsIcon } from '../components/Icons'
import { LinkedRecordsList, LinkedTabItem } from '../components/LinkedRecordsList'
import { useContactFields } from '../hooks/useContactFields'
import { useOrganizations } from '../hooks/useOrganizations'
import { getOrganization } from '../stores/organizationsStore'
import { useSettings } from '../hooks/useSettings'
import { useStatuses } from '../hooks/useStatuses'
import { useIntegrationsStore } from '../stores/integrationsStore'
import { dealsListConfig } from '../utils/listConfigs'
import { dealColumns, dealRow } from '../utils/linkedRows'
import { getView } from '../utils/view'
import { resolveLocation } from '@/core/navigation'

type AnyRecord = Record<string, any>

const FIELD_LABELS: Record<string, () => string> = {
  mobile_no: () => __('Mobile Number'),
  company_name: () => __('Organization'),
}

const FIELD_PLACEHOLDERS: Record<string, () => string> = {
  mobile_no: () => __('Add Mobile Number...'),
  company_name: () => __('Add Organization...'),
}

export default function Contact() {
  const route = useRoute()
  const contactId = route.params.contactId ?? ''
  useUsers()
  useStatuses()
  useOrganizations()
  const { brand } = useSettings()
  const makeCall = useGlobalStore((state) => state.makeCall)
  const callEnabled = useIntegrationsStore((state) => state.callEnabled)
  const showDoctypeModal = useUiStore((state) => state.showDoctypeModal)
  const { doctypeMeta } = useMeta('Contact')
  const { getFormattedCurrency } = useMeta('CRM Deal')

  const bundle = useDocument('Contact', contactId)
  const contact = bundle.document as unknown as AnyRecord
  const doc: AnyRecord = contact.doc || {}
  const transformField = useContactFields(contact as never)

  const [showDeleteLinkedDocModal, setShowDeleteLinkedDocModal] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [tabIndex, setTabIndex] = useState(0)
  const mobile = useIsMobileView()

  const canDelete = Boolean((bundle.permissions as AnyRecord).data?.permissions?.delete)
  const recordError = describeRecordError(bundle.error as AnyRecord | null)

  const render = useEffectEvent(() => {
    if (contact.doc) void bundle.triggerOnRender()
  })
  useEffect(() => {
    render()
  }, [contactId])

  const { actions: customActions } = useFormScriptActions({
    scripts: bundle.scripts.data as unknown[] | null,
    doc,
    updateField: (name: string, value: unknown) => contact.setValue?.submit({ [name]: value }),
    deleteDoc: () => setShowDeleteLinkedDocModal(true),
  })

  const titleField = doctypeMeta?.title_field || 'name'
  const title: string = doc?.[titleField] || contactId
  usePageMeta({ title, icon: brand.favicon })

  const viewQuery = Array.isArray(route.query.view) ? route.query.view[0] : route.query.view
  const viewTypeQuery = Array.isArray(route.query.viewType) ? route.query.viewType[0] : route.query.viewType
  const view = viewQuery || viewTypeQuery ? getView(viewQuery, viewTypeQuery, 'Contact') : null
  const breadcrumbs = [
    { label: __('Contacts'), route: resolveLocation({ name: 'Contacts' }) },
    ...(view
      ? [
          {
            label: __(view.label),
            icon: view.icon,
            route: resolveLocation({
              name: 'Contacts',
              params: { viewType: viewTypeQuery },
              query: { view: viewQuery },
            }),
          },
        ]
      : []),
    {
      label: title,
      route: resolveLocation({ name: 'Contact', params: { contactId }, query: route.query }),
    },
  ]

  function changeContactImage(url: string) {
    contact.setField('image', url)
    contact.save.submit(null, { onSuccess: () => toast.success(__('Contact image updated')) })
  }

  function showAddressModal(address?: string | null) {
    showDoctypeModal({
      name: address || null,
      doctype: 'Address',
      callbacks: {
        afterInsert: (created: AnyRecord) => {
          capture('address_created')
          contact.setField('address', created.name)
          contact.save.submit()
        },
      },
    })
  }

  const deals = useResource<AnyRecord[]>({
    url: 'crm.api.contact.get_linked_deals',
    cache: ['deals', contactId],
    params: { contact: contactId },
    auto: true,
  })

  const sections = useResource<AnyRecord[]>({
    url: 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_sidepanel_sections',
    cache: ['sidePanelSections', 'Contact'],
    params: { doctype: 'Contact' },
    auto: true,
  })

  const parsedSections = (sections.data ?? []).map((section) => ({
    ...section,
    columns: section.columns.map((column: AnyRecord) => ({
      ...column,
      fields: column.fields.map((field: AnyRecord) => {
        const labelled = {
          ...field,
          label: FIELD_LABELS[field.fieldname]?.() || field.label,
          placeholder: FIELD_PLACEHOLDERS[field.fieldname]?.() || field.placeholder,
        }
        return transformField(labelled, { showAddressModal })
      }),
    })),
  }))

  const rows = (deals.data ?? []).map((deal) => dealRow(deal, getFormattedCurrency))
  const tabs = [{ label: 'Deals', icon: DealsIcon, count: deals.data?.length }]

  if (mobile) {
    const mobileTabs = [
      { label: 'Details', name: 'Details', icon: DetailsIcon },
      { ...tabs[0]!, name: 'Deals' },
    ]
    return (
      <>
        {contact.doc && (
          <LayoutHeader
            left={
              <header className="relative flex h-10.5 items-center justify-between gap-2 py-2.5 pl-2">
                <Breadcrumbs
                  items={breadcrumbs}
                  prefix={({ item }) => (item.icon ? <Icon icon={item.icon as never} className="mr-2 h-4" /> : null)}
                />
              </header>
            }
          />
        )}
        {contact.doc ? (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex flex-col items-start justify-start gap-4 p-4">
              <div className="flex items-center gap-4">
                <RecordImage
                  size="lg"
                  label={doc.full_name}
                  image={doc.image}
                  onChange={changeContactImage}
                  onUploadError={setUploadError}
                />
                <div className="flex flex-col gap-2 truncate">
                  <div className="truncate text-lg-medium text-ink-gray-9">
                    {doc.salutation && <span>{doc.salutation + '. '}</span>}
                    <span>{doc.full_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {callEnabled && doc.mobile_no && (
                      <Button
                        label={__('Make a Call')}
                        size="sm"
                        iconLeft={PhoneIcon}
                        onClick={() => makeCall(doc.mobile_no)}
                      />
                    )}
                    {canDelete && (
                      <Button
                        label={__('Delete')}
                        theme="red"
                        size="sm"
                        iconLeft="lucide-trash-2"
                        onClick={() => setShowDeleteLinkedDocModal(true)}
                      />
                    )}
                    {doc.company_name && (
                      <Avatar
                        size="md"
                        label={doc.company_name}
                        image={getOrganization(doc.company_name)?.organization_logo}
                      />
                    )}
                  </div>
                  <ErrorMessage message={uploadError ? __(uploadError) : ''} />
                </div>
              </div>
            </div>
            <Tabs
              as="div"
              value={tabIndex}
              onChange={setTabIndex}
              tabs={mobileTabs}
              className="flex flex-1 flex-col overflow-auto [&_[role='tablist']]:gap-3 [&_[role='tablist']]:px-4 [&_[role='tabpanel']:not([hidden])]:flex [&_[role='tabpanel']:not([hidden])]:grow"
              tabItem={({ tab, selected }) =>
                tab.name === 'Deals' ? (
                  <LinkedTabItem
                    tab={{ ...(tab as never as Record<string, unknown>), count: deals.data?.length } as never}
                    selected={selected}
                  />
                ) : (
                  <button
                    className={`flex items-center gap-2 border-b border-transparent py-2.5 text-base text-ink-gray-5 duration-300 ease-in-out hover:text-ink-gray-9 ${
                      selected ? 'text-ink-gray-9' : ''
                    }`}
                  >
                    <DetailsIcon className="h-5" />
                    {__('Details')}
                  </button>
                )
              }
              tabPanel={({ tab }) =>
                tab.name === 'Details' ? (
                  <div className="w-full">
                    {sections.data && (
                      <div className="flex flex-1 flex-col justify-between overflow-hidden">
                        <SidePanelLayout
                          sections={parsedSections as never}
                          doctype="Contact"
                          docname={doc.name}
                          onReload={() => void sections.reload()}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <LinkedRecordsList
                    config={dealsListConfig}
                    rows={rows}
                    columns={dealColumns()}
                    emptyName="Deals"
                    emptyIcon={DealsIcon}
                  />
                )
              }
            />
          </div>
        ) : recordError.title ? (
          <ErrorPage errorTitle={recordError.title} errorMessage={recordError.message} />
        ) : null}
        {showDeleteLinkedDocModal && (
          <DeleteLinkedDocModal
            open={showDeleteLinkedDocModal}
            onOpenChange={setShowDeleteLinkedDocModal}
            doctype="Contact"
            docname={doc.name}
            name="Contacts"
          />
        )}
      </>
    )
  }

  return (
    <>
      {contact.doc && (
        <LayoutHeader
          left={
            <Breadcrumbs
              items={breadcrumbs}
              prefix={({ item }) => (item.icon ? <Icon icon={item.icon as never} className="mr-2 h-4" /> : null)}
            />
          }
          right={customActions.length > 0 ? <CustomActions actions={customActions as never} /> : undefined}
        />
      )}
      {contact.doc ? (
        <div className="flex h-full">
          <Resizer className="flex h-full flex-col overflow-hidden border-r">
            {() => (
              <>
                <div className="border-b">
                  <div className="flex flex-col items-start justify-start gap-4 p-5">
                    <div className="flex items-center gap-4">
                      <RecordImage
                        size="lg"
                        label={doc.full_name}
                        image={doc.image}
                        onChange={changeContactImage}
                        onUploadError={setUploadError}
                      />
                      <div className="flex flex-col gap-2 truncate text-ink-gray-9">
                        <div className="truncate text-3xl-medium">
                          {doc.salutation && <span>{doc.salutation + ' '}</span>}
                          <span>{doc.full_name}</span>
                        </div>
                        {doc.company_name && (
                          <div className="flex items-center gap-1.5 text-base text-ink-gray-8">{doc.company_name}</div>
                        )}
                        <ErrorMessage message={uploadError ? __(uploadError) : ''} />
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {callEnabled && doc.mobile_no && (
                        <Button
                          label={__('Make Call')}
                          size="sm"
                          iconLeft={PhoneIcon}
                          onClick={() => makeCall(doc.mobile_no)}
                        />
                      )}
                      {canDelete && (
                        <Button
                          label={__('Delete')}
                          theme="red"
                          size="sm"
                          iconLeft="lucide-trash-2"
                          onClick={() => setShowDeleteLinkedDocModal(true)}
                        />
                      )}
                    </div>
                  </div>
                </div>
                {sections.data && (
                  <div className="flex flex-1 flex-col justify-between overflow-hidden">
                    <SidePanelLayout
                      sections={parsedSections as never}
                      doctype="Contact"
                      docname={doc.name}
                      onReload={() => void sections.reload()}
                    />
                  </div>
                )}
              </>
            )}
          </Resizer>
          <Tabs
            as="div"
            value={tabIndex}
            onChange={setTabIndex}
            tabs={tabs}
            className={RECORD_TABS_CLASS}
            tabItem={({ tab, selected }) => <LinkedTabItem tab={tab as never} selected={selected} />}
            tabPanel={() => (
              <LinkedRecordsList
                config={dealsListConfig}
                rows={rows}
                columns={dealColumns()}
                emptyName="Deals"
                emptyIcon={DealsIcon}
              />
            )}
          />
        </div>
      ) : recordError.title ? (
        <ErrorPage errorTitle={recordError.title} errorMessage={recordError.message} />
      ) : null}
      {showDeleteLinkedDocModal && (
        <DeleteLinkedDocModal
          open={showDeleteLinkedDocModal}
          onOpenChange={setShowDeleteLinkedDocModal}
          doctype="Contact"
          docname={doc.name}
          name="Contacts"
        />
      )}
    </>
  )
}
