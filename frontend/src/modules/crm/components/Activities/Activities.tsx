import { useEffect, useEffectEvent, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react'
import { call } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { useRoute } from '@/core/navigation'
import { useResource } from '@/core/resources'
import { capture } from '@/core/telemetry'
import { toast } from '@/design-system'
import { FadedScrollableDiv } from '@/shared/components/FadedScrollableDiv'
import { FilesUploader } from '@/shared/components/FilesUploader'
import { CommentIcon, LoadingIndicator } from '@/shared/components/Icons'
import { EmptyState } from '@/shared/components/ListViews'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useDocument } from '@/shared/hooks/useDocument'
import { useUsers } from '@/shared/hooks/useUsers'
import { useGlobalStore } from '@/shared/stores/globalStore'
import { useActivityModals } from '../../hooks/useActivityModals'
import { useTimelinePreferences } from '../../hooks/useTimelinePreferences'
import { useIntegrationsStore } from '../../stores/integrationsStore'
import type { ActivityData } from '../../types/activities'
import type { WhatsAppMessage, WhatsAppReply } from '../../types/whatsapp'
import {
  activityEmptyState,
  decorateActivity,
  scrollToActivity,
  sortByCreation,
  sortByModified,
} from '../../utils/activities'
import { CommunicationArea } from '../CommunicationArea'
import { DeclinedCallIcon, InboundCallIcon, MissedCallIcon, OutboundCallIcon } from '../Icons'
import { WhatsappTemplateSelectorModal } from '../WhatsappTemplateSelectorModal'
import { ActivityHeader } from './ActivityHeader'
import { ActivityVersionRow } from './ActivityVersionRow'
import { AttachmentArea } from './AttachmentArea'
import { CallArea } from './CallArea'
import { CommentArea } from './CommentArea'
import { DataFields } from './DataFields'
import { EmailArea } from './EmailArea'
import { NoteArea } from './NoteArea'
import { TaskArea } from './TaskArea'
import { TimelineGutter } from './TimelineGutter'
import { TimelineTimestamp } from './TimelineTimestamp'
import { WhatsAppArea } from './WhatsAppArea'
import { WhatsAppBox, type WhatsAppBoxHandle } from './WhatsAppBox'

type AnyRecord = Record<string, any>

export interface ActivitiesHandle {
  changeTabTo: (tabName: string) => void
  reload: () => void
}

export interface ActivitiesProps {
  doctype?: string
  docname?: string
  tabs?: Array<{ name: string }>
  tabIndex: number
  onTabIndexChange: (index: number) => void
  onBeforeSave?: (changes: AnyRecord) => void
  onAfterSave?: (changes: AnyRecord) => void
  ref?: Ref<ActivitiesHandle>
}

const SIMPLE_COMMUNICATION_TABS = ['Activity', 'Emails']

function CallStatusIcon({ call: callLog }: { call: AnyRecord }) {
  if (callLog.status === 'No Answer') return <MissedCallIcon className="text-ink-red-8" />
  if (callLog.status === 'Busy') return <DeclinedCallIcon />
  return callLog.type === 'Incoming' ? <InboundCallIcon /> : <OutboundCallIcon />
}

export function Activities({
  doctype = 'CRM Lead',
  docname = '',
  tabs = [],
  tabIndex,
  onTabIndexChange,
  onBeforeSave,
  onAfterSave,
  ref,
}: ActivitiesProps) {
  const route = useRoute()
  const { getUser } = useUsers()
  const { isNewestFirst } = useTimelinePreferences()
  const socket = useGlobalStore((state) => state.$socket)
  const whatsappEnabled = useIntegrationsStore((state) => state.whatsappEnabled)
  const { document: documentResource } = useDocument(doctype, docname)
  const documentRecord = documentResource as unknown as AnyRecord
  const doc = useMemo<AnyRecord>(() => (documentRecord.doc as AnyRecord | undefined) ?? {}, [documentRecord.doc])

  const [showFilesUploader, setShowFilesUploader] = useState(false)
  const [showWhatsappTemplates, setShowWhatsappTemplates] = useState(false)
  const [fieldLayoutTabIndex, setFieldLayoutTabIndex] = useState(0)
  const [fieldLayoutTabName, setFieldLayoutTabName] = useState('')
  const [replyMessage, setReplyMessage] = useState<WhatsAppReply>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const whatsappBoxRef = useRef<WhatsAppBoxHandle | null>(null)

  const title = tabs[tabIndex]?.name || 'Activity'

  function scroll(hash?: string | null) {
    scrollToActivity(hash ?? null, isNewestFirst, route.hash ?? '')
  }

  const allActivities = useResource<ActivityData>({
    url: 'crm.api.activities.get_activities',
    params: { name: docname },
    cache: ['activity', docname],
    auto: true,
    transform: ([versions, calls, notes, tasks, attachments]: any) => ({ versions, calls, notes, tasks, attachments }),
    onSuccess: () => requestAnimationFrame(() => scroll()),
    onError: (error: unknown) => toast.error(toErrorMessage(error) || __('Failed to load activities')),
  })

  const whatsappMessages = useResource<WhatsAppMessage[]>({
    url: 'crm.api.whatsapp.get_whatsapp_messages',
    cache: ['whatsapp_messages', docname],
    params: { reference_doctype: doctype, reference_name: docname },
    auto: false,
    transform: (data: WhatsAppMessage[]) => sortByCreation(data),
    onSuccess: () => requestAnimationFrame(() => scroll()),
  })

  const reloadActivities = () => void allActivities.reload()
  const reloadWhatsapp = () => void whatsappMessages.reload()

  function reloadAll() {
    reloadActivities()
    void documentRecord.reload?.()
  }

  const modalRef = useActivityModals({ doctype, doc, reloadActivities })

  function changeTabTo(tabName: string) {
    const index = tabs.map((tab) => tab.name?.toLowerCase()).indexOf(tabName)
    if (index === -1) return
    onTabIndexChange(index)
  }

  useImperativeHandle(ref, () => ({ changeTabTo, reload: reloadAll }))

  const fetchWhatsapp = useEffectEvent(() => void whatsappMessages.fetch())

  useEffect(() => {
    if (whatsappEnabled) fetchWhatsapp()
  }, [whatsappEnabled])

  const onDocinfoUpdate = useEffectEvent((payload: { doc: AnyRecord; key: string }) => {
    if (payload.key !== 'comments' && payload.key !== 'communications') return
    if (payload.doc.reference_doctype !== doctype) return
    if (payload.doc.reference_name !== docname) return
    reloadAll()
  })

  const onWhatsappMessage = useEffectEvent((data: { reference_doctype: string; reference_name: string }) => {
    if (data.reference_doctype === doctype && data.reference_name === docname) reloadWhatsapp()
  })

  useEffect(() => {
    const docinfoHandler = (payload: unknown) => onDocinfoUpdate(payload as { doc: AnyRecord; key: string })
    const whatsappHandler = (data: unknown) =>
      onWhatsappMessage(data as { reference_doctype: string; reference_name: string })
    socket.emit('doc_subscribe', doctype, docname)
    socket.on('docinfo_update', docinfoHandler)
    socket.on('whatsapp_message', whatsappHandler)
    return () => {
      socket.off('whatsapp_message', whatsappHandler)
      socket.off('docinfo_update', docinfoHandler)
      socket.emit('doc_unsubscribe', doctype, docname)
    }
  }, [socket, doctype, docname])

  const mountScroll = useEffectEvent(() => {
    const hash = route.hash?.slice(1) || null
    if (!tabs.map((tab) => tab.name).includes(hash ?? '')) scroll(hash)
  })

  useEffect(() => {
    requestAnimationFrame(() => mountScroll())
  }, [])

  async function sendTemplate(template: string) {
    setShowWhatsappTemplates(false)
    capture('send_whatsapp_template', { doctype })
    try {
      await call('crm.api.whatsapp.send_whatsapp_template', {
        reference_doctype: doctype,
        reference_name: docname,
        to: doc.mobile_no,
        template,
      })
      reloadWhatsapp()
    } catch (error) {
      toast.error(toErrorMessage(error) || __('Failed to send WhatsApp template'))
    }
  }

  const data = allActivities.data
  const activities = useMemo<AnyRecord[]>(() => {
    if (!data?.versions) return []
    const ownerName = (owner: string) => getUser(owner).full_name
    if (title === 'Calls') return sortByCreation(data.calls ?? [], isNewestFirst)
    if (title === 'Tasks') return sortByModified(data.tasks ?? [])
    if (title === 'Notes') return sortByModified(data.notes ?? [])
    if (title === 'Attachments') return sortByModified(data.attachments ?? [])

    let list: AnyRecord[] = []
    if (title === 'Activity') list = data.calls?.length ? [...data.versions, ...data.calls] : data.versions
    else if (title === 'Emails') list = data.versions.filter((item) => item.activity_type === 'communication')
    else if (title === 'Comments') list = data.versions.filter((item) => item.activity_type === 'comment')
    return sortByCreation(
      list.map((item) => decorateActivity(item, ownerName)),
      isNewestFirst,
    )
  }, [data, title, isNewestFirst, getUser])

  const empty = activityEmptyState(title)
  const top = ['Activity', 'Emails', 'Comments'].includes(title) ? '32.3%' : '30%'
  const whatsappList = whatsappMessages.data ?? []
  const hasWhatsapp = title === 'WhatsApp' && whatsappList.length > 0

  function toggleOthers(name: string) {
    setExpanded((current) => ({ ...current, [name]: !current[name] }))
  }

  function renderBody() {
    if (hasWhatsapp) {
      return (
        <div>
          <WhatsAppArea messages={whatsappList} onReload={reloadWhatsapp} onReply={setReplyMessage} />
        </div>
      )
    }
    if (title === 'Notes') {
      return (
        <div className="grid grid-cols-1 gap-4 px-3 pb-3 sm:px-10 sm:pb-5 lg:grid-cols-2 xl:grid-cols-3">
          {activities.map((note) => (
            <div key={note.name} onClick={() => modalRef.showNote(note)}>
              <NoteArea note={note} modalRef={modalRef} onReload={reloadActivities} />
            </div>
          ))}
        </div>
      )
    }
    if (title === 'Comments') {
      return (
        <div className="pb-5">
          {activities.map((comment, index) => (
            <div key={comment.name}>
              <div className="activity grid grid-cols-[30px_minmax(auto,1fr)] gap-2 px-3 sm:gap-4 sm:px-10">
                <TimelineGutter isLast={index === activities.length - 1}>
                  <div className="flex h-8 w-7 items-center justify-center bg-surface-base">
                    <CommentIcon className="text-ink-gray-8" />
                  </div>
                </TimelineGutter>
                <CommentArea className="mb-4" activity={comment} onReload={reloadActivities} />
              </div>
            </div>
          ))}
        </div>
      )
    }
    if (title === 'Tasks') {
      return (
        <div className="px-3 pb-3 sm:px-10 sm:pb-5">
          <TaskArea modalRef={modalRef} tasks={activities} doctype={doctype} />
        </div>
      )
    }
    if (title === 'Calls') {
      return (
        <div className="activity">
          {activities.map((callLog, index) => (
            <div key={callLog.name}>
              <div className="activity grid grid-cols-[30px_minmax(auto,1fr)] gap-4 px-3 sm:px-10">
                <TimelineGutter isLast={index === activities.length - 1}>
                  <div className="flex h-8 w-7 items-center justify-center bg-surface-base text-ink-gray-8">
                    <CallStatusIcon call={callLog} />
                  </div>
                </TimelineGutter>
                <CallArea className="mb-4" activity={callLog} />
              </div>
            </div>
          ))}
        </div>
      )
    }
    if (title === 'Attachments') {
      return (
        <div className="px-3 pb-3 sm:px-10 sm:pb-5">
          <AttachmentArea
            attachments={activities}
            onReload={() => {
              reloadActivities()
              scroll()
            }}
          />
        </div>
      )
    }
    return activities.map((activity, index) => {
      const withGutter = SIMPLE_COMMUNICATION_TABS.includes(title)
      const type: string = activity.activity_type
      const isCall = type === 'incoming_call' || type === 'outgoing_call'
      const Icon = activity.icon
      const muted = ['added', 'removed', 'changed'].includes(type)
      return (
        <div
          key={activity.name}
          className={`activity px-3 sm:px-10 ${withGutter ? 'grid grid-cols-[30px_minmax(auto,1fr)] gap-2 sm:gap-4' : ''}`}
        >
          {withGutter && (
            <TimelineGutter isLast={index === activities.length - 1}>
              <div
                className={`flex h-7 w-7 items-center justify-center bg-surface-base ${
                  type === 'communication' ? 'mt-2.5' : ''
                } ${['comment', 'communication', 'incoming_call', 'outgoing_call'].includes(type) ? 'h-8' : ''}`}
              >
                {type === 'communication' ? (
                  <UserAvatar user={activity.data.sender} size="md" />
                ) : isCall && activity.status === 'No Answer' ? (
                  <MissedCallIcon className="text-ink-red-8" />
                ) : isCall && activity.status === 'Busy' ? (
                  <DeclinedCallIcon />
                ) : (
                  <Icon className={muted ? 'text-ink-gray-4' : 'text-ink-gray-8'} />
                )}
              </div>
            </TimelineGutter>
          )}
          {type === 'communication' ? (
            <div className="mt-px pb-5">
              <EmailArea activity={activity} />
            </div>
          ) : type === 'comment' ? (
            <div id={activity.name} className="mb-4">
              <CommentArea activity={activity} onReload={reloadActivities} />
            </div>
          ) : type === 'attachment_log' ? (
            <div id={activity.name} className="mb-4 flex flex-col gap-2 py-1.5">
              <div className="flex items-center justify-stretch gap-2 text-base">
                <div className="inline-flex flex-wrap items-center gap-1.5 font-medium text-ink-gray-8">
                  <span className="font-medium">{activity.owner_name}</span>
                  <span className="text-ink-gray-5">{__(activity.data.type)}</span>
                  {activity.data.file_url ? (
                    <a href={activity.data.file_url} target="_blank" rel="noreferrer">
                      <span>{activity.data.file_name}</span>
                    </a>
                  ) : (
                    <span>{activity.data.file_name}</span>
                  )}
                  {activity.data.is_private && <span className="lucide-lock size-3" aria-hidden="true" />}
                </div>
                <div className="ml-auto whitespace-nowrap">
                  <TimelineTimestamp date={activity.creation} />
                </div>
              </div>
            </div>
          ) : isCall ? (
            <div className="mb-4">
              <CallArea activity={activity} />
            </div>
          ) : (
            <ActivityVersionRow
              activity={activity}
              showOthers={Boolean(expanded[activity.name])}
              onToggleOthers={() => toggleOthers(activity.name)}
            />
          )}
        </div>
      )
    })
  }

  return (
    <>
      <ActivityHeader
        tabs={tabs}
        title={title}
        doc={doc}
        modalRef={modalRef}
        onTabChange={onTabIndexChange}
        onShowWhatsappTemplates={() => setShowWhatsappTemplates(true)}
        onShowFilesUploader={() => setShowFilesUploader(true)}
        onShowWhatsappBox={() => whatsappBoxRef.current?.show()}
      />
      <FadedScrollableDiv className="flex h-full flex-col overflow-y-auto">
        {allActivities.loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-2xl-medium text-ink-gray-4">
            <LoadingIndicator className="h-6 w-6" />
            <span>{__('Loading...')}</span>
          </div>
        ) : activities.length || hasWhatsapp ? (
          <div className="activities">{renderBody()}</div>
        ) : title === 'Data' ? (
          <div className="flex h-full flex-col px-3 sm:px-10">
            <DataFields
              doctype={doctype}
              docname={docname}
              fieldLayoutTabIndex={fieldLayoutTabIndex}
              onFieldLayoutTabIndexChange={setFieldLayoutTabIndex}
              fieldLayoutTabName={fieldLayoutTabName}
              onFieldLayoutTabNameChange={setFieldLayoutTabName}
              onBeforeSave={onBeforeSave}
              onAfterSave={onAfterSave}
            />
          </div>
        ) : (
          <EmptyState name={title} title={empty.text} description={empty.description} icon={empty.icon} top={top} />
        )}
      </FadedScrollableDiv>
      <div>
        {['Emails', 'Comments', 'Activity'].includes(title) && (
          <CommunicationArea doctype={doctype} doc={doc} onReload={reloadAll} onScroll={() => scroll()} />
        )}
        {title === 'WhatsApp' && (
          <WhatsAppBox
            ref={whatsappBoxRef}
            doctype={doctype}
            doc={doc}
            reply={replyMessage}
            onReplyChange={setReplyMessage}
            onSent={reloadWhatsapp}
          />
        )}
      </div>
      {whatsappEnabled && (
        <WhatsappTemplateSelectorModal
          open={showWhatsappTemplates}
          onOpenChange={setShowWhatsappTemplates}
          doctype={doctype}
          onSend={(template) => void sendTemplate(template)}
        />
      )}
      <FilesUploader
        open={showFilesUploader}
        onOpenChange={setShowFilesUploader}
        doctype={doctype}
        docname={docname}
        onAfter={() => {
          reloadActivities()
          changeTabTo('attachments')
        }}
      />
    </>
  )
}
