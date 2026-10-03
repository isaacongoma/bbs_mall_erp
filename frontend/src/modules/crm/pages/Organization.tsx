import { useEffect, useEffectEvent, useState } from 'react'
import { useIsMobileView } from '@/shared/hooks/useIsMobileView'
import { DetailsIcon } from '@/shared/components/Icons'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { resolveLocation, router, useRoute } from '@/core/navigation'
import { useListResource, useResource } from '@/core/resources'
import { capture } from '@/core/telemetry'
import { Breadcrumbs, Button, ErrorMessage, Tabs, toast, usePageMeta } from '@/design-system'
import { CustomActions } from '@/shared/components/CustomActions'
import { DeleteLinkedDocModal } from '@/shared/components/DeleteLinkedDocModal'
import { ErrorPage } from '@/shared/components/ErrorPage'
import { Icon } from '@/shared/components/Icon'
import { ContactsIcon, WebsiteIcon } from '@/shared/components/Icons'
import { LayoutHeader } from '@/shared/components/LayoutHeader'
import { RecordImage } from '@/shared/components/RecordImage'
import { Resizer } from '@/shared/components/Resizer'
import { SidePanelLayout } from '@/shared/components/SidePanelLayout'
import { useDocument } from '@/shared/hooks/useDocument'
import { useFormScriptActions } from '@/shared/hooks/useFormScriptActions'
import { useMeta } from '@/shared/hooks/useMeta'
import { useUsers } from '@/shared/hooks/useUsers'
import { useUiStore } from '@/shared/stores/uiStore'
import { describeRecordError, RECORD_TABS_CLASS } from '@/shared/utils/recordPage'
import { openWebsite as openExternalWebsite } from '@/shared/utils/url'
import { DealsIcon } from '../components/Icons'
import { EnrichFromWebsite } from '../components/EnrichFromWebsite'
import { LinkedRecordsList, LinkedTabItem } from '../components/LinkedRecordsList'
import { useSettings } from '../hooks/useSettings'
import { useStatuses } from '../hooks/useStatuses'
import { contactsListConfig, dealsListConfig } from '../utils/listConfigs'
import { contactColumns, contactRow, dealColumns, dealRow } from '../utils/linkedRows'
import { getView } from '../utils/view'

type AnyRecord = Record<string, any>

function displayWebsite(url?: string | null) {
  return url && url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
}

export default function Organization() {
  const route = useRoute()
  const organizationId = route.params.organizationId ?? ''
  useUsers()
  useStatuses()
  const { brand } = useSettings()
  const showDoctypeModal = useUiStore((state) => state.showDoctypeModal)
  const { doctypeMeta } = useMeta('CRM Organization')
  const { getFormattedCurrency } = useMeta('CRM Deal')

  const bundle = useDocument('CRM Organization', organizationId)
  const organization = bundle.document as unknown as AnyRecord
  const doc: AnyRecord = organization.doc || {}

  const [showDeleteLinkedDocModal, setShowDeleteLinkedDocModal] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [tabIndex, setTabIndex] = useState(0)
  const mobile = useIsMobileView()

  const canDelete = Boolean((bundle.permissions as AnyRecord).data?.permissions?.delete)
  const recordError = describeRecordError(bundle.error as AnyRecord | null)

  const render = useEffectEvent(() => {
    if (organization.doc) void bundle.triggerOnRender()
  })
  useEffect(() => {
    render()
  }, [organizationId])

  const { actions: customActions } = useFormScriptActions({
    scripts: bundle.scripts.data as unknown[] | null,
    doc,
    updateField: (name: string, value: unknown) => organization.setValue?.submit({ [name]: value }),
    deleteDoc: () => setShowDeleteLinkedDocModal(true),
  })

  const titleField = doctypeMeta?.title_field || 'name'
  const title: string = doc?.[titleField] || organizationId
  usePageMeta({ title, icon: brand.favicon })

  const viewQuery = Array.isArray(route.query.view) ? route.query.view[0] : route.query.view
  const viewTypeQuery = Array.isArray(route.query.viewType) ? route.query.viewType[0] : route.query.viewType
  const view = viewQuery || viewTypeQuery ? getView(viewQuery, viewTypeQuery, 'CRM Organization') : null
  const breadcrumbs = [
    { label: __('Organizations'), route: resolveLocation({ name: 'Organizations' }) },
    ...(view
      ? [
          {
            label: __(view.label),
            icon: view.icon,
            route: resolveLocation({
              name: 'Organizations',
              params: { viewType: viewTypeQuery },
              query: { view: viewQuery },
            }),
          },
        ]
      : []),
    {
      label: title,
      route: resolveLocation({ name: 'Organization', params: { organizationId }, query: route.query }),
    },
  ]

  function showAddressModal(address?: string | null) {
    showDoctypeModal({
      name: address || null,
      doctype: 'Address',
      callbacks: {
        afterInsert: (created: AnyRecord) => {
          capture('address_created')
          organization.setField('address', created.name)
          organization.save.submit()
        },
      },
    })
  }

  function beforeFieldChange(data?: AnyRecord) {
    if (Object.hasOwn(data ?? {}, 'organization_name')) {
      void rpc({
        url: 'frappe.client.rename_doc',
        params: { doctype: 'CRM Organization', old_name: organizationId, new_name: data?.organization_name },
      }).then(() => router.push({ name: 'Organization', params: { organizationId: data?.organization_name } }))
    } else {
      organization.save.submit()
    }
  }

  function openWebsite() {
    if (!doc.website) {
      toast.error(__('No Website Found'))
      return
    }
    openExternalWebsite(doc.website)
  }

  const sections = useResource<AnyRecord[]>({
    url: 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_sidepanel_sections',
    cache: ['sidePanelSections', 'CRM Organization'],
    params: { doctype: 'CRM Organization' },
    auto: true,
  })

  const parsedSections = (sections.data ?? []).map((section) => ({
    ...section,
    columns: section.columns.map((column: AnyRecord) => ({
      ...column,
      fields: column.fields.map((field: AnyRecord) =>
        field.fieldname === 'address'
          ? {
              ...field,
              create: (_value: string, close: () => void) => {
                showAddressModal()
                close()
              },
              edit: (address: string) => showAddressModal(address),
            }
          : field,
      ),
    })),
  }))

  const deals = useListResource({
    doctype: 'CRM Deal',
    cache: ['deals', organizationId],
    fields: [
      'name',
      'organization',
      'currency',
      'deal_value',
      'status',
      'email',
      'mobile_no',
      'deal_owner',
      'modified',
    ],
    filters: { organization: organizationId },
    orderBy: 'modified desc',
    pageLength: 20,
    auto: true,
  })

  const contacts = useListResource({
    doctype: 'Contact',
    cache: ['contacts', organizationId],
    fields: ['name', 'full_name', 'image', 'email_id', 'mobile_no', 'company_name', 'modified'],
    filters: { company_name: organizationId },
    orderBy: 'modified desc',
    pageLength: 20,
    auto: true,
  })

  const dealList = (deals.data as AnyRecord[] | null) ?? []
  const contactList = (contacts.data as AnyRecord[] | null) ?? []

  const tabs = [
    { label: 'Deals', icon: DealsIcon, count: dealList.length },
    { label: 'Contacts', icon: ContactsIcon, count: contactList.length },
  ]

  const rows =
    tabIndex === 0
      ? dealList.map((deal) => dealRow(deal, getFormattedCurrency, doc.organization_logo))
      : contactList.map((contact) => contactRow(contact, doc.organization_logo))

  if (mobile) {
    const mobileTabs = [
      { name: 'Details', label: 'Details', icon: DetailsIcon },
      ...tabs.map((tab) => ({ ...tab, name: tab.label })),
    ]
    const activeTab = mobileTabs[tabIndex]
    const mobileRows =
      tabIndex === 1
        ? dealList.map((deal) => dealRow(deal, getFormattedCurrency, doc.organization_logo))
        : contactList.map((contact) => contactRow(contact, doc.organization_logo))
    return (
      <>
        {organization.doc && (
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
        {organization.doc ? (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex flex-col items-start justify-start gap-4 p-4">
              <div className="flex items-center gap-4">
                <RecordImage
                  size="lg"
                  label={doc.organization_name}
                  image={doc.organization_logo}
                  onChange={(url) => organization.setValue.submit({ organization_logo: url || null })}
                  onUploadError={setUploadError}
                />
                <div className="flex flex-col gap-2 truncate">
                  <div className="truncate text-lg-medium text-ink-gray-9">{doc.name}</div>
                  <div className="flex items-center gap-1.5">
                    <Button onClick={openWebsite}>
                      <span className="lucide-link h-4 w-4" aria-hidden="true" />
                    </Button>
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
                  <ErrorMessage message={uploadError ? __(uploadError) : ''} />
                </div>
              </div>
            </div>
            <Tabs
              as="div"
              value={tabIndex}
              onChange={setTabIndex}
              tabs={mobileTabs}
              className="flex flex-1 flex-col overflow-auto [&_[role='tablist']]:gap-7.5 [&_[role='tablist']]:px-4 [&_[role='tabpanel']:not([hidden])]:flex [&_[role='tabpanel']:not([hidden])]:grow"
              tabItem={({ tab, selected }) =>
                tab.name === 'Details' ? (
                  <button
                    className={`flex items-center gap-2 border-b border-transparent py-2.5 text-base text-ink-gray-5 duration-300 ease-in-out hover:text-ink-gray-9 ${
                      selected ? 'text-ink-gray-9' : ''
                    }`}
                  >
                    <DetailsIcon className="h-5" />
                    {__('Details')}
                  </button>
                ) : (
                  <LinkedTabItem tab={tab as never} selected={selected} />
                )
              }
              tabPanel={({ tab }) =>
                tab.name === 'Details' ? (
                  <div className="w-full">
                    {sections.data && (
                      <div className="flex flex-1 flex-col justify-between overflow-hidden">
                        <SidePanelLayout
                          sections={parsedSections as never}
                          doctype="CRM Organization"
                          docname={doc.name}
                          onReload={() => void sections.reload()}
                          onBeforeFieldChange={beforeFieldChange}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <LinkedRecordsList
                    config={activeTab?.name === 'Deals' ? dealsListConfig : contactsListConfig}
                    rows={mobileRows}
                    columns={activeTab?.name === 'Deals' ? dealColumns() : contactColumns()}
                    emptyName={tab.label}
                    emptyIcon={tab.icon as never}
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
            doctype="CRM Organization"
            docname={organizationId}
            name="Organizations"
          />
        )}
      </>
    )
  }

  return (
    <>
      {organization.doc && (
        <LayoutHeader
          left={
            <Breadcrumbs
              items={breadcrumbs}
              prefix={({ item }) => (item.icon ? <Icon icon={item.icon as never} className="mr-2 h-4" /> : null)}
            />
          }
          right={
            <>
              {customActions.length > 0 && <CustomActions actions={customActions as never} />}
              <EnrichFromWebsite
                doctype="CRM Organization"
                docname={organizationId}
                website={doc.website}
                onDone={() => {
                  void organization.reload?.()
                  void sections.reload()
                }}
              />
            </>
          }
        />
      )}
      {organization.doc ? (
        <div className="flex h-full">
          <Resizer className="flex h-full flex-col overflow-hidden border-r">
            {() => (
              <>
                <div className="border-b">
                  <div className="flex flex-col items-start justify-start gap-4 p-5">
                    <div className="flex items-center gap-4">
                      <RecordImage
                        size="lg"
                        label={doc.organization_name}
                        image={doc.organization_logo}
                        onChange={(url) => organization.setValue.submit({ organization_logo: url || null })}
                        onUploadError={setUploadError}
                      />
                      <div className="flex flex-col gap-2 truncate">
                        <div className="truncate text-3xl-medium text-ink-gray-9">
                          <span>{doc.name}</span>
                        </div>
                        {doc.website && (
                          <div className="flex items-center gap-1.5 text-base text-ink-gray-8">
                            <WebsiteIcon className="size-4" />
                            <span>{displayWebsite(doc.website)}</span>
                          </div>
                        )}
                        <ErrorMessage message={uploadError ? __(uploadError) : ''} />
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {canDelete && (
                        <Button
                          label={__('Delete')}
                          theme="red"
                          size="sm"
                          iconLeft="lucide-trash-2"
                          onClick={() => setShowDeleteLinkedDocModal(true)}
                        />
                      )}
                      <Button tooltip={__('Open Website')} icon="lucide-link" onClick={openWebsite} />
                    </div>
                  </div>
                </div>
                {sections.data && (
                  <div className="flex flex-1 flex-col justify-between overflow-hidden">
                    <SidePanelLayout
                      sections={parsedSections as never}
                      doctype="CRM Organization"
                      docname={doc.name}
                      onReload={() => void sections.reload()}
                      onBeforeFieldChange={beforeFieldChange}
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
            tabPanel={({ tab }) => (
              <LinkedRecordsList
                config={tab.label === 'Deals' ? dealsListConfig : contactsListConfig}
                rows={rows}
                columns={tab.label === 'Deals' ? dealColumns() : contactColumns()}
                emptyName={tab.label}
                emptyIcon={tab.icon as never}
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
          doctype="CRM Organization"
          docname={organizationId}
          name="Organizations"
        />
      )}
    </>
  )
}
