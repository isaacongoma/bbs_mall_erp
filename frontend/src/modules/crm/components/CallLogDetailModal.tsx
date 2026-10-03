import { useState, type ReactNode } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { router } from '@/core/navigation'
import { useObservable, type Resource } from '@/core/resources'
import { capture } from '@/core/telemetry'
import { Avatar, Button, Dialog, Dropdown, FeatherIcon, Tooltip, toast } from '@/design-system'
import { FadedScrollableDiv } from '@/shared/components/FadedScrollableDiv'
import {
  ArrowUpRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  ContactsIcon,
  DurationIcon,
  EditIcon,
} from '@/shared/components/Icons'
import { useDocument } from '@/shared/hooks/useDocument'
import { useIsMobileView } from '@/shared/hooks/useIsMobileView'
import { useUiStore } from '@/shared/stores/uiStore'
import { sanitizeHTML } from '@/shared/utils/text'
import { getCallLogDetail } from '../utils/callLog'
import { DealsIcon, LeadsIcon, NoteIcon, TaskIcon } from './Icons'

type AnyRecord = Record<string, any>

export interface CallLogDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  callLog: Resource<AnyRecord, AnyRecord>
}

interface DetailField {
  icon: ReactNode
  name: string
  value: any
  tooltip?: string
  color?: string
  link?: () => void
}

function CallLogDocument({ name, children }: { name: string; children: (bundle: AnyRecord) => ReactNode }) {
  const bundle = useDocument('CRM Call Log', name)
  return <>{children(bundle as unknown as AnyRecord)}</>
}

export function CallLogDetailModal({ open, onOpenChange, callLog }: CallLogDetailModalProps) {
  const isMobileView = useIsMobileView()
  const showDoctypeModal = useUiStore((state) => state.showDoctypeModal)
  const [recordingError, setRecordingError] = useState(false)

  useObservable(callLog)
  const data = callLog.data
  const recordingPath = data?.recording_url_path
  const [trackedRecording, setTrackedRecording] = useState(recordingPath)
  const [trackedOpen, setTrackedOpen] = useState(open)
  if (trackedRecording !== recordingPath) {
    setTrackedRecording(recordingPath)
    setRecordingError(false)
  }
  if (trackedOpen !== open) {
    setTrackedOpen(open)
    if (open) setRecordingError(false)
  }

  const note = data?._notes?.[0]?.name ?? null
  const task = data?._tasks?.[0]?.name ?? null

  async function addNoteToCallLog(saved: AnyRecord, isInsert: boolean) {
    if (isInsert && saved.name) {
      await rpc({ url: 'crm.integrations.api.add_note_to_call_log', params: { call_sid: data?.id, note: saved } })
      capture('note_created')
    } else {
      capture('note_updated')
    }
    void callLog.reload()
  }

  async function addTaskToCallLog(saved: AnyRecord, isInsert: boolean) {
    if (isInsert && saved.name) {
      await rpc({ url: 'crm.integrations.api.add_task_to_call_log', params: { call_sid: data?.id, task: saved } })
      capture('task_created')
    } else {
      capture('task_updated')
    }
    void callLog.reload()
  }

  function showNote(name?: string | null) {
    showDoctypeModal({
      name,
      doctype: 'FCRM Note',
      title: 'Note',
      callbacks: {
        afterInsert: (saved: AnyRecord) => void addNoteToCallLog(saved, true),
        afterUpdate: (saved: AnyRecord) => void addNoteToCallLog(saved, false),
      },
    })
  }

  function showTask(name?: string | null) {
    showDoctypeModal({
      name,
      doctype: 'CRM Task',
      title: 'Task',
      defaults: { status: 'Backlog', priority: 'Low' },
      callbacks: {
        afterInsert: (saved: AnyRecord) => void addTaskToCallLog(saved, true),
        afterUpdate: (saved: AnyRecord) => void addTaskToCallLog(saved, false),
      },
    })
  }

  function openCallLogModal() {
    showDoctypeModal({
      name: data?.name,
      doctype: 'CRM Call Log',
      title: 'Call Log',
      callbacks: {
        afterUpdate: () => {
          void callLog.reload()
          capture('call_log_updated')
        },
      },
    })
  }

  const detailFields: DetailField[] = (() => {
    if (!data) return []
    const parsed: AnyRecord = {}
    for (const key of Object.keys(data)) parsed[key] = getCallLogDetail(key, data)

    const details: Array<DetailField & { condition?: () => boolean }> = [
      {
        icon: <FeatherIcon name={parsed.type.icon} className="h-3.5 w-3.5" />,
        name: 'type',
        value: `${parsed.type.label} Call`,
      },
      { icon: <ContactsIcon />, name: 'receiver', value: { receiver: parsed.receiver, caller: parsed.caller } },
      {
        icon: parsed._lead ? <LeadsIcon /> : <DealsIcon />,
        name: 'reference_doc',
        value: parsed._lead ? 'Lead' : 'Deal',
        link: () => {
          if (parsed._lead) router.push({ name: 'Lead', params: { leadId: parsed._lead } })
          else router.push({ name: 'Deal', params: { dealId: parsed._deal } })
        },
        condition: () => Boolean(parsed._lead || parsed._deal),
      },
      { icon: <CalendarIcon />, name: 'creation', value: parsed.creation.label, tooltip: parsed.creation.label },
      { icon: <DurationIcon />, name: 'duration', value: parsed.duration.label },
      { icon: <CheckCircleIcon />, name: 'status', value: parsed.status.label, color: parsed.status.color },
      {
        icon: <FeatherIcon name="play-circle" className="mt-2 h-4 w-4" />,
        name: 'recording_url_path',
        value: parsed.recording_url_path,
      },
      { icon: <NoteIcon />, name: 'note', value: parsed._notes?.[0] ?? null },
      { icon: <TaskIcon />, name: 'task', value: parsed._tasks?.[0] ?? null },
    ]
    return details.filter((detail) => detail.value).filter((detail) => (detail.condition ? detail.condition() : true))
  })()

  async function createLead(documentBundle: AnyRecord | null) {
    await documentBundle?.triggerOnCreateLead?.(data, {}, () => onOpenChange(false))
    try {
      const created = await rpc<string>({
        url: 'crm.fcrm.doctype.crm_call_log.crm_call_log.create_lead_from_call_log',
        params: { call_log: data, lead_details: {} },
      })
      if (created) router.push({ name: 'Lead', params: { leadId: created } })
    } catch (error) {
      const err = error as { messages?: string[]; message?: string }
      toast.error(__('Error creating lead: {0}', [err.messages?.[0] || err.message]))
    }
  }

  const renderDialog = (documentBundle: AnyRecord | null) => (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        body={
          <>
            <div className="bg-surface-elevation-2 px-4 pb-6 pt-5 sm:px-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-3xl-semibold leading-6 text-ink-gray-9">{__('Call Details')}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <Dropdown
                    options={[
                      {
                        group: __('Options'),
                        hideLabel: true,
                        items: [
                          {
                            label: note ? __('Edit Note') : __('Add Note'),
                            icon: NoteIcon,
                            onClick: () => showNote(note),
                          },
                          {
                            label: task ? __('Edit Task') : __('Add Task'),
                            icon: TaskIcon,
                            onClick: () => showTask(task),
                          },
                        ],
                      },
                    ]}
                  >
                    <Button variant="ghost" icon="lucide-more-horizontal" />
                  </Dropdown>
                  {!isMobileView && (
                    <Button
                      variant="ghost"
                      tooltip={__('Edit Call Log')}
                      icon={EditIcon}
                      className="w-7"
                      onClick={openCallLogModal}
                    />
                  )}
                  <Button icon="lucide-x" variant="ghost" className="w-7" onClick={() => onOpenChange(false)} />
                </div>
              </div>
              <div className="flex flex-col gap-3.5">
                {detailFields.map((field) => (
                  <div key={field.name} className="flex gap-2 text-base text-ink-gray-8">
                    <div className="grid size-7 place-content-center">{field.icon}</div>
                    <div className="flex min-h-7 w-full items-center gap-2">
                      {field.name === 'receiver' ? (
                        <div className="flex items-center gap-1">
                          <Avatar image={field.value.caller.image} label={field.value.caller.label} size="sm" />
                          <div className="ml-1 flex flex-col gap-1">{field.value.caller.label}</div>
                          <span className="lucide-arrow-right mx-1 h-4 w-4 text-ink-gray-5" aria-hidden="true" />
                          <Avatar image={field.value.receiver.image} label={field.value.receiver.label} size="sm" />
                          <div className="ml-1 flex flex-col gap-1">{field.value.receiver.label}</div>
                        </div>
                      ) : field.tooltip ? (
                        <Tooltip text={field.tooltip}>
                          <span>{field.value}</span>
                        </Tooltip>
                      ) : field.name === 'recording_url_path' ? (
                        <div className="w-full">
                          {!recordingError ? (
                            <audio
                              className="audio-control h-9 w-full cursor-pointer rounded-[10px] bg-[rgb(237,237,237)] outline-none"
                              controls
                              src={field.value}
                              onError={() => setRecordingError(true)}
                            />
                          ) : (
                            <div className="flex h-9 items-center text-base text-ink-gray-5">
                              {__('Recording not available')}
                            </div>
                          )}
                        </div>
                      ) : field.name === 'note' ? (
                        <div
                          className="w-full cursor-pointer rounded border px-2 pt-1.5 text-base text-ink-gray-7"
                          onClick={() => showNote(field.value?.name)}
                        >
                          <FadedScrollableDiv className="max-h-24 min-h-16 overflow-y-auto">
                            {field.value?.title && (
                              <div
                                className={field.value?.content ? 'mb-1 font-bold' : ''}
                                dangerouslySetInnerHTML={{ __html: sanitizeHTML(field.value.title) }}
                              />
                            )}
                            {field.value?.content && (
                              <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(field.value.content) }} />
                            )}
                          </FadedScrollableDiv>
                        </div>
                      ) : field.name === 'task' ? (
                        <div
                          className="w-full cursor-pointer rounded border px-2 pt-1.5 text-base text-ink-gray-7"
                          onClick={() => showTask(field.value?.name)}
                        >
                          <FadedScrollableDiv className="max-h-24 min-h-16 overflow-y-auto">
                            {field.value?.title && (
                              <div
                                className={field.value?.description ? 'mb-1 font-bold' : ''}
                                dangerouslySetInnerHTML={{ __html: sanitizeHTML(field.value.title) }}
                              />
                            )}
                            {field.value?.description && (
                              <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(field.value.description) }} />
                            )}
                          </FadedScrollableDiv>
                        </div>
                      ) : (
                        <div className={field.color ? `text-${field.color}-600` : ''}>{field.value}</div>
                      )}
                      {field.link && (
                        <div>
                          <ArrowUpRightIcon
                            className="h-4 w-4 shrink-0 cursor-pointer text-ink-gray-5 hover:text-ink-gray-8"
                            onClick={() => field.link?.()}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {!data?._lead && !data?._deal && (
              <div className="px-4 pb-7 pt-4 sm:px-6">
                <Button
                  className="w-full"
                  variant="solid"
                  label={__('Create Lead')}
                  onClick={() => void createLead(documentBundle)}
                />
              </div>
            )}
          </>
        }
      />
    </>
  )

  if (open && data?.name) return <CallLogDocument name={data.name}>{renderDialog}</CallLogDocument>
  return renderDialog(null)
}
