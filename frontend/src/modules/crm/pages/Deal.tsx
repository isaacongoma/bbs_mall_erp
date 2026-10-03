import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useIsMobileView } from '@/shared/hooks/useIsMobileView'
import { __ } from '@/core/i18n'
import { router, useRoute } from '@/core/navigation'
import { Avatar, Breadcrumbs, Button, Dropdown, Tabs, Tooltip, toast } from '@/design-system'
import { AssignTo } from '@/shared/components/AssignTo'
import { CustomActions } from '@/shared/components/CustomActions'
import { DeleteLinkedDocModal } from '@/shared/components/DeleteLinkedDocModal'
import { ErrorPage } from '@/shared/components/ErrorPage'
import { FilesUploader } from '@/shared/components/FilesUploader'
import { Icon } from '@/shared/components/Icon'
import { AttachmentIcon, Email2Icon, IndicatorIcon, LinkIcon, PhoneIcon } from '@/shared/components/Icons'
import { LayoutHeader } from '@/shared/components/LayoutHeader'
import { Resizer } from '@/shared/components/Resizer'
import { SidePanelLayout } from '@/shared/components/SidePanelLayout'
import { useBroadcast } from '@/shared/hooks/useBroadcast'
import { useDocument } from '@/shared/hooks/useDocument'
import { useGlobalStore } from '@/shared/stores/globalStore'
import { isTranslatable } from '@/shared/utils/cache'
import { copyToClipboard } from '@/shared/utils/platform'
import { MOBILE_RECORD_TABS_CLASS, RECORD_TABS_CLASS } from '@/shared/utils/recordPage'
import { openWebsite } from '@/shared/utils/url'
import { Activities, type ActivitiesHandle } from '../components/Activities/Activities'
import { DealContactsActions, DealContactsBody } from '../components/DealContacts'
import { EnrichFromWebsite } from '../components/EnrichFromWebsite'
import { LostReasonModal } from '../components/LostReasonModal'
import { ContactModal, OrganizationModal } from '../components/Modals'
import { SLASection } from '../components/SLASection'
import { useDealContacts } from '../hooks/useDealContacts'
import { useRecordPage } from '../hooks/useRecordPage'
import { useIntegrationsStore } from '../stores/integrationsStore'
import { getDealStatus } from '../stores/statusesStore'

type AnyRecord = Record<string, any>

export default function Deal() {
  const route = useRoute()
  const dealId = route.params.dealId ?? ''
  const socket = useGlobalStore((state) => state.$socket)
  const callEnabled = useIntegrationsStore((state) => state.callEnabled)
  const activitiesRef = useRef<ActivitiesHandle | null>(null)
  const [showOrganizationModal, setShowOrganizationModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [organizationDefaults, setOrganizationDefaults] = useState<AnyRecord>({})
  const [contactDefaults, setContactDefaults] = useState<AnyRecord>({})
  const mobile = useIsMobileView()

  const { contacts, addContact, removeContact, setPrimaryContact, triggerCall } = useDealContacts(dealId)

  function transformSections(sections: AnyRecord[]): AnyRecord[] {
    return sections.map((section) => {
      if (section.name === 'contacts_section') return section
      return {
        ...section,
        columns: section.columns.map((column: AnyRecord, columnIndex: number) =>
          columnIndex !== 0
            ? column
            : {
                ...column,
                fields: column.fields.map((field: AnyRecord) =>
                  field.fieldname === 'organization'
                    ? {
                        ...field,
                        create: (value: string, close: () => void) => {
                          setOrganizationDefaults({ organization_name: value })
                          setShowOrganizationModal(true)
                          close()
                        },
                        link: (organization: string) =>
                          router.push({ name: 'Organization', params: { organizationId: organization } }),
                      }
                    : field,
                ),
              },
        ),
      }
    })
  }

  const page = useRecordPage({
    doctype: 'CRM Deal',
    id: dealId,
    listName: 'Deals',
    detailName: 'Deal',
    paramName: 'dealId',
    ownerField: 'deal_owner',
    tabStorageKey: 'lastDealTab',
    statusKind: 'deal',
    capitalisedErrors: true,
    activitiesRef,
    mobile,
    transformSections,
  })
  const { doc, document, assignees, sections, title } = page

  const organizationBundle = useDocument('CRM Organization', doc.organization || null)
  const organization: AnyRecord = (organizationBundle.document as unknown as AnyRecord).doc || {}

  useBroadcast('reload-deal-sections', () => void sections.reload())

  const customerCreated = useEffectEvent(() => toast.success(__('Customer Created Successfully')))
  useEffect(() => {
    const handler = () => customerCreated()
    socket.on('crm_customer_created', handler)
    return () => socket.off('crm_customer_created', handler)
  }, [socket])

  const statusLabel = (status: string) => (isTranslatable('CRM Deal Status') ? __(status) : status)

  const header = !page.recordError.title && (
    <>
      {document._actions?.length > 0 && <CustomActions actions={document._actions} />}
      {page.customActions.length > 0 && <CustomActions actions={page.customActions as never} />}
      {document.actions?.length > 0 && <CustomActions actions={document.actions} />}
      <EnrichFromWebsite
        doctype="CRM Deal"
        docname={dealId}
        website={doc.website}
        onDone={() => {
          void document.reload?.()
          void sections.reload()
        }}
      />
      <AssignTo
        doctype="CRM Deal"
        docname={dealId}
        ownerField="deal_owner"
        assignees={assignees.data ?? []}
        onAssigneesChange={(next) => assignees.setData(next.map((assignee) => assignee.name))}
      />
      {doc && document.statuses && (
        <Dropdown options={page.statusDropdownOptions as never} placement="right">
          {({ open }) =>
            doc.status ? (
              <Button label={statusLabel(doc.status)} iconRight={open ? 'lucide-chevron-up' : 'lucide-chevron-down'}>
                <IndicatorIcon className={getDealStatus(doc.status)?.color} />
              </Button>
            ) : (
              <span />
            )
          }
        </Dropdown>
      )}
    </>
  )

  const details = (
    <>
      {doc.sla_status && <SLASection data={doc} onUpdateField={page.updateField} />}
      {sections.data && (
        <div className="flex flex-1 flex-col justify-between overflow-hidden">
          <SidePanelLayout
            sections={sections.data as never}
            doctype="CRM Deal"
            docname={dealId}
            onReload={() => void sections.reload()}
            onBeforeFieldChange={page.beforeStatusChange}
            onAfterFieldChange={page.reloadResources}
            renderActions={({ section }) =>
              section.name === 'contacts_section' ? (
                <DealContactsActions
                  onAddContact={(name) => void addContact(name)}
                  onCreateContact={(firstName) => {
                    setContactDefaults({ first_name: firstName, company_name: doc.organization })
                    setShowContactModal(true)
                  }}
                />
              ) : null
            }
            renderSection={({ section }) =>
              section.name === 'contacts_section' ? (
                <DealContactsBody
                  contacts={contacts}
                  onRemove={(name) => void removeContact(name)}
                  onSetPrimary={(name) => void setPrimaryContact(name)}
                />
              ) : null
            }
          />
        </div>
      )}
    </>
  )

  if (mobile) {
    return (
      <>
        <LayoutHeader
          left={
            <header className="relative flex h-10.5 items-center justify-between gap-2 py-2.5 pl-2">
              <Breadcrumbs
                items={page.breadcrumbs}
                prefix={({ item }) => (item.icon ? <Icon icon={item.icon as never} className="mr-2 h-4" /> : null)}
              />
              <div className="absolute right-0">
                {doc && document.statuses && (
                  <Dropdown options={page.statusDropdownOptions as never}>
                    {({ open }) =>
                      doc.status ? (
                        <Button
                          label={statusLabel(doc.status)}
                          iconRight={open ? 'lucide-chevron-up' : 'lucide-chevron-down'}
                        >
                          <IndicatorIcon className={getDealStatus(doc.status)?.color} />
                        </Button>
                      ) : (
                        <span />
                      )
                    }
                  </Dropdown>
                )}
              </div>
            </header>
          }
        />
        {doc.name ? (
          <>
            <div className="flex h-12 items-center justify-between gap-2 border-b px-3 py-2.5">
              <AssignTo
                doctype="CRM Deal"
                docname={dealId}
                ownerField="deal_owner"
                assignees={assignees.data ?? []}
                onAssigneesChange={(next) => assignees.setData(next.map((assignee) => assignee.name))}
              />
              <div className="flex items-center gap-2">
                {document._actions?.length > 0 && <CustomActions actions={document._actions} />}
                {page.customActions.length > 0 && <CustomActions actions={page.customActions as never} />}
                {document.actions?.length > 0 && <CustomActions actions={document.actions} />}
              </div>
            </div>
            <div className="flex h-full overflow-hidden">
              <Tabs
                as="div"
                value={page.tabIndex}
                onChange={page.setTabIndex}
                tabs={page.tabs}
                className={MOBILE_RECORD_TABS_CLASS}
                tabPanel={({ tab }) =>
                  tab.name === 'Details' ? (
                    <div className="w-full">{details}</div>
                  ) : (
                    <Activities
                      ref={activitiesRef}
                      doctype="CRM Deal"
                      docname={dealId}
                      tabs={page.tabs}
                      tabIndex={page.tabIndex}
                      onTabIndexChange={page.setTabIndex}
                      onBeforeSave={page.beforeStatusChange}
                      onAfterSave={page.reloadResources}
                    />
                  )
                }
              />
            </div>
          </>
        ) : page.recordError.title ? (
          <ErrorPage errorTitle={page.recordError.title} errorMessage={page.recordError.message} />
        ) : null}
        {showOrganizationModal && (
          <OrganizationModal
            open={showOrganizationModal}
            onOpenChange={setShowOrganizationModal}
            data={organizationDefaults}
            options={{ redirect: false, afterInsert: (created) => page.updateField('organization', created.name) }}
          />
        )}
        {showContactModal && (
          <ContactModal
            open={showContactModal}
            onOpenChange={setShowContactModal}
            contact={contactDefaults}
            options={{ redirect: false, afterInsert: (created) => void addContact(created.name) }}
          />
        )}
        {page.showDeleteLinkedDocModal && (
          <DeleteLinkedDocModal
            open={page.showDeleteLinkedDocModal}
            onOpenChange={page.setShowDeleteLinkedDocModal}
            doctype="CRM Deal"
            docname={dealId}
            title={doc.organization}
            name="Deals"
          />
        )}
        {page.showLostReasonModal && (
          <LostReasonModal
            open={page.showLostReasonModal}
            onOpenChange={page.setShowLostReasonModal}
            doctype="CRM Deal"
            document={document as never}
          />
        )}
      </>
    )
  }

  return (
    <>
      <LayoutHeader
        left={
          <Breadcrumbs
            items={page.breadcrumbs}
            prefix={({ item }) => (item.icon ? <Icon icon={item.icon as never} className="mr-2 h-4" /> : null)}
          />
        }
        right={header || undefined}
      />
      {doc.name ? (
        <div className="flex h-full overflow-hidden">
          <Tabs
            as="div"
            value={page.tabIndex}
            onChange={page.setTabIndex}
            tabs={page.tabs}
            className={RECORD_TABS_CLASS}
            tabPanel={() => (
              <Activities
                ref={activitiesRef}
                doctype="CRM Deal"
                docname={dealId}
                tabs={page.tabs}
                tabIndex={page.tabIndex}
                onTabIndexChange={page.setTabIndex}
                onBeforeSave={page.beforeStatusChange}
                onAfterSave={page.reloadResources}
              />
            )}
          />
          <Resizer side="right" className="flex flex-col justify-between border-l">
            {() => (
              <>
                <div
                  className="flex h-[45px] cursor-copy items-center border-b px-5 py-2.5 text-lg-medium text-ink-gray-9"
                  onClick={() => copyToClipboard(dealId)}
                >
                  {__(dealId)}
                </div>
                <div className="flex items-center justify-start gap-5 border-b p-5">
                  <Tooltip text={__('Organization Logo')}>
                    <div className="group relative size-12">
                      <Avatar
                        size="3xl"
                        className="size-12"
                        label={title}
                        image={doc.organization_logo || organization.organization_logo}
                      />
                    </div>
                  </Tooltip>
                  <div className="flex flex-col gap-2.5 truncate text-ink-gray-9">
                    <Tooltip text={organization.name || __('Set an Organization')}>
                      <div className="truncate text-3xl-medium">{title}</div>
                    </Tooltip>
                    <div className="flex gap-1.5">
                      {callEnabled && <Button tooltip={__('Make a Call')} icon={PhoneIcon} onClick={triggerCall} />}
                      <Button
                        tooltip={__('Send an Email')}
                        icon={Email2Icon}
                        onClick={() =>
                          doc.email
                            ? page.openEmailBox()
                            : toast.error(__('Please set an email address to send emails'))
                        }
                      />
                      <Button
                        tooltip={__('Go to Website')}
                        icon={LinkIcon}
                        onClick={() =>
                          doc.website ? openWebsite(doc.website) : toast.error(__('Please set a website to visit'))
                        }
                      />
                      <Button
                        tooltip={__('Attach a File')}
                        icon={AttachmentIcon}
                        onClick={() => page.setShowFilesUploader(true)}
                      />
                      {page.canDelete && (
                        <Button
                          tooltip={__('Delete')}
                          variant="subtle"
                          icon="lucide-trash-2"
                          theme="red"
                          onClick={() => page.setShowDeleteLinkedDocModal(true)}
                        />
                      )}
                    </div>
                  </div>
                </div>
                {details}
              </>
            )}
          </Resizer>
        </div>
      ) : page.recordError.title ? (
        <ErrorPage errorTitle={page.recordError.title} errorMessage={page.recordError.message} />
      ) : null}
      <FilesUploader
        open={page.showFilesUploader}
        onOpenChange={page.setShowFilesUploader}
        doctype="CRM Deal"
        docname={dealId}
        onAfter={() => {
          activitiesRef.current?.reload()
          activitiesRef.current?.changeTabTo('attachments')
        }}
      />
      {showOrganizationModal && (
        <OrganizationModal
          open={showOrganizationModal}
          onOpenChange={setShowOrganizationModal}
          data={organizationDefaults}
          options={{ redirect: false, afterInsert: (created) => page.updateField('organization', created.name) }}
        />
      )}
      {showContactModal && (
        <ContactModal
          open={showContactModal}
          onOpenChange={setShowContactModal}
          contact={contactDefaults}
          options={{ redirect: false, afterInsert: (created) => void addContact(created.name) }}
        />
      )}
      {page.showDeleteLinkedDocModal && (
        <DeleteLinkedDocModal
          open={page.showDeleteLinkedDocModal}
          onOpenChange={page.setShowDeleteLinkedDocModal}
          doctype="CRM Deal"
          docname={dealId}
          title={doc.organization}
          name="Deals"
        />
      )}
      {page.showLostReasonModal && (
        <LostReasonModal
          open={page.showLostReasonModal}
          onOpenChange={page.setShowLostReasonModal}
          doctype="CRM Deal"
          document={document as never}
        />
      )}
    </>
  )
}
