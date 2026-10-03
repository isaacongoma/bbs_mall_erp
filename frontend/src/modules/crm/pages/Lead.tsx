import { useRef, useState } from 'react'
import { useIsMobileView } from '@/shared/hooks/useIsMobileView'
import { __ } from '@/core/i18n'
import { Breadcrumbs, Button, Dropdown, ErrorMessage, Tabs, Tooltip, toast } from '@/design-system'
import { useRoute } from '@/core/navigation'
import { AssignTo } from '@/shared/components/AssignTo'
import { CustomActions } from '@/shared/components/CustomActions'
import { DeleteLinkedDocModal } from '@/shared/components/DeleteLinkedDocModal'
import { ErrorPage } from '@/shared/components/ErrorPage'
import { FilesUploader } from '@/shared/components/FilesUploader'
import { Icon } from '@/shared/components/Icon'
import { AttachmentIcon, Email2Icon, IndicatorIcon, LinkIcon, PhoneIcon } from '@/shared/components/Icons'
import { LayoutHeader } from '@/shared/components/LayoutHeader'
import { RecordImage } from '@/shared/components/RecordImage'
import { Resizer } from '@/shared/components/Resizer'
import { SidePanelLayout } from '@/shared/components/SidePanelLayout'
import { useGlobalStore } from '@/shared/stores/globalStore'
import { isTranslatable } from '@/shared/utils/cache'
import { copyToClipboard } from '@/shared/utils/platform'
import { MOBILE_RECORD_TABS_CLASS, RECORD_TABS_CLASS } from '@/shared/utils/recordPage'
import { openWebsite } from '@/shared/utils/url'
import { Activities, type ActivitiesHandle } from '../components/Activities/Activities'
import { EnrichFromWebsite } from '../components/EnrichFromWebsite'
import { LostReasonModal } from '../components/LostReasonModal'
import { ConvertToDealModal } from '../components/Modals'
import { SLASection } from '../components/SLASection'
import { useRecordPage } from '../hooks/useRecordPage'
import { useIntegrationsStore } from '../stores/integrationsStore'
import { getLeadStatus } from '../stores/statusesStore'

export default function Lead() {
  const route = useRoute()
  const leadId = route.params.leadId ?? ''
  const makeCall = useGlobalStore((state) => state.makeCall)
  const callEnabled = useIntegrationsStore((state) => state.callEnabled)
  const activitiesRef = useRef<ActivitiesHandle | null>(null)
  const [showConvertToDealModal, setShowConvertToDealModal] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const mobile = useIsMobileView()

  const page = useRecordPage({
    doctype: 'CRM Lead',
    id: leadId,
    listName: 'Leads',
    detailName: 'Lead',
    paramName: 'leadId',
    ownerField: 'lead_owner',
    tabStorageKey: 'lastLeadTab',
    statusKind: 'lead',
    activitiesRef,
    mobile,
  })
  const { doc, document, assignees, sections, title } = page

  const isConversionDisabled = Boolean(doc.status && getLeadStatus(doc.status)?.type === 'Lost')
  const statusLabel = (status: string) => (isTranslatable('CRM Lead Status') ? __(status) : status)

  const header = !page.recordError.title && (
    <>
      {document._actions?.length > 0 && <CustomActions actions={document._actions} />}
      {page.customActions.length > 0 && <CustomActions actions={page.customActions as never} />}
      {document.actions?.length > 0 && <CustomActions actions={document.actions} />}
      <EnrichFromWebsite
        doctype="CRM Lead"
        docname={leadId}
        website={doc.website}
        onDone={() => {
          void document.reload?.()
          void sections.reload()
        }}
      />
      <AssignTo
        doctype="CRM Lead"
        docname={leadId}
        ownerField="lead_owner"
        assignees={assignees.data ?? []}
        onAssigneesChange={(next) => assignees.setData(next.map((assignee) => assignee.name))}
      />
      {doc && document.statuses && (
        <Dropdown options={page.statusDropdownOptions as never} placement="right">
          {({ open }) =>
            doc.status ? (
              <Button label={statusLabel(doc.status)} iconRight={open ? 'lucide-chevron-up' : 'lucide-chevron-down'}>
                <IndicatorIcon className={getLeadStatus(doc.status)?.color} />
              </Button>
            ) : (
              <span />
            )
          }
        </Dropdown>
      )}
      <Tooltip disabled={!isConversionDisabled} text={__('Cannot convert a lost lead to deal')}>
        <div className="inline-flex">
          <Button
            label={__('Convert to Deal')}
            variant="solid"
            disabled={isConversionDisabled}
            onClick={() => setShowConvertToDealModal(true)}
          />
        </div>
      </Tooltip>
    </>
  )

  const details = (
    <>
      {doc.sla_status && <SLASection data={doc} onUpdateField={page.updateField} />}
      {sections.data && (
        <div className="flex flex-1 flex-col justify-between overflow-hidden">
          <SidePanelLayout
            sections={sections.data as never}
            doctype="CRM Lead"
            docname={leadId}
            onReload={() => void sections.reload()}
            onBeforeFieldChange={page.beforeStatusChange}
            onAfterFieldChange={page.reloadResources}
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
                          <IndicatorIcon className={getLeadStatus(doc.status)?.color} />
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
                doctype="CRM Lead"
                docname={leadId}
                ownerField="lead_owner"
                assignees={assignees.data ?? []}
                onAssigneesChange={(next) => assignees.setData(next.map((assignee) => assignee.name))}
              />
              <div className="flex items-center gap-2">
                {document._actions?.length > 0 && <CustomActions actions={document._actions} />}
                {page.customActions.length > 0 && <CustomActions actions={page.customActions as never} />}
                {document.actions?.length > 0 && <CustomActions actions={document.actions} />}
                <Tooltip disabled={!isConversionDisabled} text={__('Cannot convert a lost lead to deal')}>
                  <div className="inline-flex">
                    <Button
                      label={__('Convert')}
                      variant="solid"
                      disabled={isConversionDisabled}
                      onClick={() => setShowConvertToDealModal(true)}
                    />
                  </div>
                </Tooltip>
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
                    <div>{details}</div>
                  ) : (
                    <Activities
                      ref={activitiesRef}
                      doctype="CRM Lead"
                      docname={leadId}
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
        {showConvertToDealModal && (
          <ConvertToDealModal open={showConvertToDealModal} onOpenChange={setShowConvertToDealModal} lead={doc} />
        )}
        {page.showDeleteLinkedDocModal && (
          <DeleteLinkedDocModal
            open={page.showDeleteLinkedDocModal}
            onOpenChange={page.setShowDeleteLinkedDocModal}
            doctype="CRM Lead"
            docname={leadId}
            title={doc.lead_name}
            name="Leads"
          />
        )}
        {page.showLostReasonModal && (
          <LostReasonModal
            open={page.showLostReasonModal}
            onOpenChange={page.setShowLostReasonModal}
            doctype="CRM Lead"
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
            value={page.tabIndex}
            onChange={page.setTabIndex}
            tabs={page.tabs}
            className={RECORD_TABS_CLASS}
            tabPanel={() => (
              <Activities
                ref={activitiesRef}
                doctype="CRM Lead"
                docname={leadId}
                tabs={page.tabs}
                tabIndex={page.tabIndex}
                onTabIndexChange={page.setTabIndex}
                onBeforeSave={page.beforeStatusChange}
                onAfterSave={page.reloadResources}
              />
            )}
          />
          <Resizer className="flex flex-col justify-between border-l" side="right">
            {() => (
              <>
                <div
                  className="flex h-[45px] cursor-copy items-center border-b px-5 py-2.5 text-lg-medium text-ink-gray-9"
                  onClick={() => copyToClipboard(leadId)}
                >
                  {__(leadId)}
                </div>
                <div className="flex items-center justify-start gap-5 border-b p-5">
                  <RecordImage
                    label={title}
                    image={doc.image || doc.organization_logo}
                    onChange={(url) => page.updateField('image', url)}
                    onUploadError={setUploadError}
                  />
                  <div className="flex flex-col gap-2.5 truncate">
                    <Tooltip text={doc.lead_name || __('Set First Name')}>
                      <div className="truncate text-3xl-medium text-ink-gray-9">{title}</div>
                    </Tooltip>
                    <div className="flex gap-1.5">
                      {callEnabled && (
                        <Button
                          tooltip={__('Make a Call')}
                          icon={PhoneIcon}
                          onClick={() =>
                            doc.mobile_no
                              ? makeCall(doc.mobile_no)
                              : toast.error(__('Please set a mobile number to make calls'))
                          }
                        />
                      )}
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
                          theme="red"
                          icon="lucide-trash-2"
                          onClick={() => page.setShowDeleteLinkedDocModal(true)}
                        />
                      )}
                    </div>
                    <ErrorMessage message={uploadError ? __(uploadError) : ''} />
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
      {showConvertToDealModal && (
        <ConvertToDealModal open={showConvertToDealModal} onOpenChange={setShowConvertToDealModal} lead={doc} />
      )}
      <FilesUploader
        open={page.showFilesUploader}
        onOpenChange={page.setShowFilesUploader}
        doctype="CRM Lead"
        docname={leadId}
        onAfter={() => {
          activitiesRef.current?.reload()
          activitiesRef.current?.changeTabTo('attachments')
        }}
      />
      {page.showDeleteLinkedDocModal && (
        <DeleteLinkedDocModal
          open={page.showDeleteLinkedDocModal}
          onOpenChange={page.setShowDeleteLinkedDocModal}
          doctype="CRM Lead"
          docname={leadId}
          title={doc.lead_name}
          name="Leads"
        />
      )}
      {page.showLostReasonModal && (
        <LostReasonModal
          open={page.showLostReasonModal}
          onOpenChange={page.setShowLostReasonModal}
          doctype="CRM Lead"
          document={document as never}
        />
      )}
    </>
  )
}
