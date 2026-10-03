import { useEffect, useEffectEvent, useMemo, useState, type RefObject } from 'react'
import { __ } from '@/core/i18n'
import { resolveLocation, useRoute } from '@/core/navigation'
import { useResource } from '@/core/resources'
import { usePageMeta } from '@/design-system'
import { useActiveTabManager } from '@/shared/hooks/useActiveTabManager'
import { useDocument } from '@/shared/hooks/useDocument'
import { useFormScriptActions } from '@/shared/hooks/useFormScriptActions'
import { useMeta } from '@/shared/hooks/useMeta'
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning'
import { useVisitedRecords } from '@/shared/hooks/useVisitedRecords'
import { describeRecordError } from '@/shared/utils/recordPage'
import type { ActivitiesHandle } from '../components/Activities/Activities'
import { useEmailComposerStore } from '../stores/emailComposerStore'
import { useIntegrationsStore } from '../stores/integrationsStore'
import { getDealStatus, getLeadStatus, statusOptions } from '../stores/statusesStore'
import { getView } from '../utils/view'
import { useSettings } from './useSettings'
import { useStatuses } from './useStatuses'
import { ActivityIcon, AttachmentIcon, CommentIcon, DetailsIcon, EmailIcon, PhoneIcon } from '@/shared/components/Icons'
import { NoteIcon, TaskIcon, WhatsAppIcon } from '../components/Icons'

type AnyRecord = Record<string, any>

export interface UseRecordPageInput {
  doctype: 'CRM Lead' | 'CRM Deal'
  id: string
  listName: 'Leads' | 'Deals'
  detailName: 'Lead' | 'Deal'
  paramName: 'leadId' | 'dealId'
  ownerField: 'lead_owner' | 'deal_owner'
  tabStorageKey: 'lastLeadTab' | 'lastDealTab'
  statusKind: 'lead' | 'deal'
  capitalisedErrors?: boolean
  mobile?: boolean
  activitiesRef: RefObject<ActivitiesHandle | null>
  transformSections?: (sections: AnyRecord[]) => AnyRecord[]
}

export function useRecordPage({
  doctype,
  id,
  listName,
  detailName,
  paramName,
  ownerField,
  tabStorageKey,
  statusKind,
  capitalisedErrors = false,
  mobile = false,
  activitiesRef,
  transformSections,
}: UseRecordPageInput) {
  const route = useRoute()
  const { brand } = useSettings()
  useStatuses()
  const getStatus = statusKind === 'lead' ? getLeadStatus : getDealStatus
  const whatsappEnabled = useIntegrationsStore((state) => state.whatsappEnabled)
  const { doctypeMeta } = useMeta(doctype)

  const bundle = useDocument(doctype, id)
  const { document: documentResource, assignees, permissions, scripts, error } = bundle
  const document = documentResource as unknown as AnyRecord
  const doc: AnyRecord = useMemo(() => document.doc || {}, [document.doc])

  const [showDeleteLinkedDocModal, setShowDeleteLinkedDocModal] = useState(false)
  const [showFilesUploader, setShowFilesUploader] = useState(false)
  const [showLostReasonModal, setShowLostReasonModal] = useState(false)

  const canDelete = Boolean((permissions as AnyRecord).data?.permissions?.delete)
  const recordError = describeRecordError(error as AnyRecord | null, capitalisedErrors)

  useUnsavedChangesWarning(() => Boolean(document.isDirty))

  const { markVisited } = useVisitedRecords(doctype)
  const visit = useEffectEvent(() => {
    if (document.doc) void bundle.triggerOnRender()
    markVisited(id)
  })

  useEffect(() => {
    visit()
  }, [id])

  const sections = useResource<AnyRecord[]>({
    url: 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_sidepanel_sections',
    cache: ['sidePanelSections', doctype],
    params: { doctype },
    auto: true,
    transform: transformSections,
  })

  function setFields(names: string[], value: unknown) {
    names.forEach((fieldname) => document.setField(fieldname, value))
  }

  function updateField(name: string | string[], value?: unknown) {
    const names = Array.isArray(name) ? name : [name]
    const next = Array.isArray(name) ? '' : value
    const previous = Object.fromEntries(names.map((fieldname) => [fieldname, doc[fieldname]]))
    setFields(names, next)
    document.save.submit(null, {
      onSuccess: () => activitiesRef.current?.reload(),
      onError: () => names.forEach((fieldname) => document.setField(fieldname, previous[fieldname])),
    })
  }

  const { actions: customActions, statuses: customStatuses } = useFormScriptActions({
    scripts: scripts.data as unknown[] | null,
    doc,
    updateField,
    deleteDoc: () => setShowDeleteLinkedDocModal(true),
  })

  function setLostReason() {
    const status = getStatus(document.doc.status)
    if (
      status?.type !== 'Lost' ||
      (document.doc.lost_reason && document.doc.lost_reason !== 'Other') ||
      (document.doc.lost_reason === 'Other' && document.doc.lost_notes)
    ) {
      document.save.submit(null, { onSuccess: () => void sections.reload() })
      return
    }
    setShowLostReasonModal(true)
  }

  async function triggerStatusChange(value: string) {
    await bundle.triggerOnChange('status', value)
    setLostReason()
  }

  function reloadResources(data?: AnyRecord) {
    if (Object.hasOwn(data ?? {}, ownerField)) void assignees.reload()
    if (Object.hasOwn(data ?? {}, 'status') && getStatus(data?.status)?.type !== 'Lost') void sections.reload()
  }

  function beforeStatusChange(data?: AnyRecord) {
    if (Object.hasOwn(data ?? {}, 'status') && getStatus(data?.status)?.type === 'Lost') {
      setLostReason()
    } else {
      document.save.submit(null, { onSuccess: () => reloadResources(data) })
    }
  }

  const tabs = useMemo(() => {
    const options = [
      { name: 'Details', label: __('Details'), icon: DetailsIcon, hidden: !mobile },
      { name: 'Activity', label: __('Activity'), icon: ActivityIcon },
      { name: 'Emails', label: __('Emails'), icon: EmailIcon },
      { name: 'Comments', label: __('Comments'), icon: CommentIcon },
      { name: 'Data', label: __('Data'), icon: DetailsIcon },
      { name: 'Calls', label: __('Calls'), icon: PhoneIcon },
      { name: 'Tasks', label: __('Tasks'), icon: TaskIcon },
      { name: 'Notes', label: __('Notes'), icon: NoteIcon },
      { name: 'Attachments', label: __('Attachments'), icon: AttachmentIcon },
      { name: 'WhatsApp', label: __('WhatsApp'), icon: WhatsAppIcon, hidden: !whatsappEnabled },
    ]
    return options.filter((tab) => !tab.hidden)
  }, [whatsappEnabled, mobile])

  const { tabIndex, setTabIndex, changeTabTo } = useActiveTabManager(tabs, tabStorageKey)

  const titleField = doctypeMeta?.title_field || 'name'
  const title: string = doc?.[titleField] || id

  usePageMeta({ title, icon: brand.favicon })

  const viewQuery = Array.isArray(route.query.view) ? route.query.view[0] : route.query.view
  const viewTypeQuery = Array.isArray(route.query.viewType) ? route.query.viewType[0] : route.query.viewType
  const view = viewQuery || viewTypeQuery ? getView(viewQuery, viewTypeQuery, doctype) : null

  const breadcrumbs = [
    { label: __(listName), route: resolveLocation({ name: listName }) },
    ...(view
      ? [
          {
            label: __(view.label),
            icon: view.icon,
            route: resolveLocation({
              name: listName,
              params: { viewType: viewTypeQuery },
              query: { view: viewQuery },
            }),
          },
        ]
      : []),
    {
      label: title,
      route: resolveLocation({ name: detailName, params: { [paramName]: id }, query: route.query }),
    },
  ]

  function openEmailBox() {
    const current = tabs[tabIndex]?.name
    if (!current || !['Emails', 'Comments', 'Activities'].includes(current)) {
      activitiesRef.current?.changeTabTo('emails')
    }
    requestAnimationFrame(() => useEmailComposerStore.getState().set({ show: true }))
  }

  const statusDropdownOptions = statusOptions(
    statusKind,
    document.statuses?.length ? document.statuses : customStatuses,
    triggerStatusChange,
  )

  return {
    bundle,
    document,
    doc,
    assignees,
    sections,
    canDelete,
    recordError,
    customActions,
    statusDropdownOptions,
    tabs,
    tabIndex,
    setTabIndex,
    changeTabTo,
    title,
    breadcrumbs,
    updateField,
    beforeStatusChange,
    reloadResources,
    openEmailBox,
    showDeleteLinkedDocModal,
    setShowDeleteLinkedDocModal,
    showFilesUploader,
    setShowFilesUploader,
    showLostReasonModal,
    setShowLostReasonModal,
  }
}
