import '../../styles/telephony.css'
import { useEffect, useEffectEvent, useImperativeHandle, useState, type Ref } from 'react'
import { ApiError } from '@/core/api/errors'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { router } from '@/core/navigation'
import { Avatar, Button, toast } from '@/design-system'
import { ArrowUpRightIcon, AvatarIcon, MinimizeIcon } from '@/shared/components/Icons'
import { RichTextField } from '@/shared/components/RichTextField'
import { useCountUpTimer } from '@/shared/hooks/useCountUpTimer'
import { useDraggable } from '@/shared/hooks/useDraggable'
import { useSession } from '@/shared/hooks/useSession'
import { useGlobalStore } from '@/shared/stores/globalStore'
import { EMPTY_CALL_TASK, type CallTask } from '../../utils/telephony'
import { NoteIcon, TaskIcon } from '../Icons'
import type { CallUIHandle } from './TwilioCallUI'
import { TaskPanel } from './TaskPanel'

type AnyRecord = Record<string, any>

export interface ExotelCallUIProps {
  ref?: Ref<CallUIHandle>
}

const EMPTY_CONTACT: AnyRecord = { full_name: '', image: '', mobile_no: '' }
const EMPTY_NOTE: AnyRecord = { name: '', content: '' }
const TERMINAL_STATUSES = ['Call ended', 'No answer']

function StatusText({ status, duration, time }: { status: string; duration: string; time: string }) {
  if (status === 'In progress') return <>{time}</>
  if (TERMINAL_STATUSES.includes(status)) {
    return (
      <div className="call-blink text-red-700">
        <span>{__(status)}</span>
        {status === 'Call ended' && (
          <span>
            <span> · </span>
            <span>{duration}</span>
          </span>
        )}
      </div>
    )
  }
  return <div>{__(status)}</div>
}

export function ExotelCallUI({ ref }: ExotelCallUIProps) {
  const socket = useGlobalStore((state) => state.$socket)
  const { user } = useSession()
  const timer = useCountUpTimer()

  const [ready, setReady] = useState(false)
  const [showCallPopup, setShowCallPopup] = useState(false)
  const [showSmallCallPopup, setShowSmallCallPopup] = useState(false)
  const [callStatus, setCallStatus] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [callData, setCallData] = useState<AnyRecord | null>(null)
  const [contact, setContact] = useState<AnyRecord>(EMPTY_CONTACT)
  const [callDuration, setCallDuration] = useState('00:00')
  const [dirty, setDirty] = useState(false)
  const [note, setNote] = useState<AnyRecord>(EMPTY_NOTE)
  const [showNote, setShowNote] = useState(false)
  const [task, setTask] = useState<CallTask>(EMPTY_CALL_TASK)
  const [showTask, setShowTask] = useState(false)

  const { style, setPosition, setHandle } = useDraggable({
    x: window.innerWidth - 350,
    y: window.innerHeight - 250,
  })

  useEffect(() => {
    if (!phoneNumber) return
    let cancelled = false
    rpc<AnyRecord>({
      url: 'crm.integrations.api.get_contact_by_phone_number',
      params: { phone_number: phoneNumber },
    })
      .then((data) => {
        if (!cancelled) setContact(data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [phoneNumber])

  function updateStatus(data: AnyRecord): string | undefined {
    if (
      data.EventType === 'answered' &&
      data.Direction === 'outbound-api' &&
      data.Status === 'in-progress' &&
      data['Legs[0][Status]'] === 'in-progress' &&
      data['Legs[1][Status]'] === ''
    ) {
      return 'Ringing...'
    }
    if (
      data.EventType === 'answered' &&
      data.Direction === 'outbound-api' &&
      data.Status === 'in-progress' &&
      data['Legs[1][Status]'] === 'in-progress'
    ) {
      timer.start()
      return 'In progress'
    }
    if (
      data.EventType === 'terminal' &&
      data.Direction === 'outbound-api' &&
      (data.Status === 'no-answer' || data.Status === 'busy') &&
      (data['Legs[1][Status]'] === 'no-answer' ||
        data['Legs[0][Status]'] === 'no-answer' ||
        data['Legs[1][Status]'] === 'busy' ||
        data['Legs[0][Status]'] === 'busy')
    ) {
      timer.stop()
      return 'No answer'
    }
    if (data.EventType === 'terminal' && data.Direction === 'outbound-api' && data.Status === 'completed') {
      timer.stop()
      setCallDuration(timer.getTime(parseInt(data['Legs[0][OnCallDuration]']) || parseInt(data.DialCallDuration)))
      return 'Call ended'
    }

    if (data.EventType === 'Dial' && data.Direction === 'incoming' && data.Status === 'busy') {
      setPhoneNumber(data.From || data.CallFrom)
      return 'Incoming call'
    }
    if (data.Direction === 'incoming' && data.CallType === 'incomplete' && data.DialCallStatus === 'no-answer') {
      return 'No answer'
    }
    if (
      data.Direction === 'incoming' &&
      (data.CallType === 'completed' || data.CallType === 'client-hangup') &&
      (data.DialCallStatus === 'completed' || data.DialCallStatus === 'canceled')
    ) {
      setCallDuration(timer.getTime(parseInt(data['Legs[0][OnCallDuration]']) || parseInt(data.DialCallDuration)))
      return 'Call ended'
    }
    return undefined
  }

  const onExotelCall = useEffectEvent((data: AnyRecord) => {
    setCallData(data)
    setCallStatus(updateStatus(data) ?? '')
    if (!showCallPopup && !showSmallCallPopup) {
      if (data.AgentEmail && data.AgentEmail === user) {
        setPhoneNumber(data.CallFrom || data.From)
        setShowCallPopup(true)
      } else {
        setPhoneNumber(data.To)
      }
    }
  })

  useEffect(() => {
    if (!ready) return
    const handler = (data: unknown) => onExotelCall(data as AnyRecord)
    socket.on('exotel_call', handler)
    return () => socket.off('exotel_call', handler)
  }, [ready, socket])

  function toggleCallPopup() {
    setShowCallPopup((current) => !current)
    setShowSmallCallPopup((current) => !current)
  }

  function updateWindowHeight(condition: boolean) {
    setPosition((current) => {
      const updated = condition ? current.y - 224 : current.y + 224
      return { ...current, y: updated < 0 ? 10 : updated }
    })
  }

  function showNoteWindow() {
    const next = !showNote
    setShowNote(next)
    if (!showTask) updateWindowHeight(next)
    if (next) setShowTask(false)
  }

  function showTaskWindow() {
    const next = !showTask
    setShowTask(next)
    if (!showNote) updateWindowHeight(next)
    if (next) setShowNote(false)
  }

  async function createUpdateNote() {
    const saved = await rpc<AnyRecord>({
      url: 'crm.integrations.api.add_note_to_call_log',
      params: { call_sid: callData?.CallSid, note },
    })
    setNote((current) => ({ ...current, name: saved.name }))
    setDirty(false)
  }

  async function createUpdateTask() {
    const saved = await rpc<AnyRecord>({
      url: 'crm.integrations.api.add_task_to_call_log',
      params: { call_sid: callData?.CallSid, task },
    })
    setTask((current) => ({ ...current, name: saved.name }))
    setDirty(false)
  }

  function save() {
    if (note.content) void createUpdateNote()
    if (task.title) void createUpdateTask()
  }

  function makeOutgoingCall(number: string) {
    setPhoneNumber(number)
    rpc<AnyRecord>({ url: 'crm.integrations.exotel.handler.make_a_call', params: { to_number: number } })
      .then((callDetails) => {
        setCallData(callDetails)
        setCallStatus('Calling...')
        setShowCallPopup(true)
        setShowSmallCallPopup(false)
        if (callDetails.call_log_creation_failed) {
          toast.warning(__('Call connected, but the call log could not be saved. Please contact your administrator.'))
        }
      })
      .catch((failure) => {
        toast.error(failure instanceof ApiError ? (failure.messages[0] ?? failure.message) : String(failure))
      })
  }

  useImperativeHandle(ref, () => ({ makeOutgoingCall, setup: () => setReady(true) }))

  function openDealOrLead() {
    if (contact.deal) router.push({ name: 'Deal', params: { dealId: contact.deal } })
    else if (contact.lead) router.push({ name: 'Lead', params: { leadId: contact.lead } })
  }

  function closeCallPopup() {
    setShowCallPopup(false)
    setShowSmallCallPopup(false)
    setNote(EMPTY_NOTE)
    setTask(EMPTY_CALL_TASK)
  }

  const displayName = contact?.full_name ?? contact?.mobile_no
  const ended = TERMINAL_STATUSES.includes(callStatus)

  return (
    <div>
      {showSmallCallPopup && (
        <div
          className="ml-2 flex cursor-pointer select-none items-center justify-between gap-1 rounded-full bg-surface-gray-10 px-2 py-[7px] text-base text-ink-gray-2"
          onClick={toggleCallPopup}
        >
          <div className="mr-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-gray-9">
            {contact?.image ? (
              <Avatar image={contact.image} label={contact.full_name} className="!size-5" />
            ) : (
              <AvatarIcon className="size-3" />
            )}
          </div>
          <span>{displayName}</span>
          <span>·</span>
          <StatusText status={callStatus} duration={callDuration} time={timer.updatedTime} />
        </div>
      )}
      <div
        className={`call-popup fixed z-20 min-h-44 w-[280px] flex-col gap-2 rounded-lg bg-surface-gray-10 p-4 pt-2.5 text-ink-gray-2 shadow-2xl ${
          showCallPopup ? 'flex' : 'hidden'
        }`}
        style={style}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex cursor-move select-none items-center justify-between gap-1 text-base" ref={setHandle}>
          <div className="flex items-center gap-2 truncate">
            {showNote || showTask ? (
              <div className="flex items-center gap-3 truncate">
                {contact?.image ? (
                  <Avatar image={contact.image} label={contact.full_name} className="!size-7 shrink-0" />
                ) : (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-gray-9">
                    <AvatarIcon className="size-3" />
                  </div>
                )}
                <div className="flex flex-col gap-1 overflow-hidden text-base leading-4">
                  <div className="truncate font-medium">{displayName}</div>
                  <div className="text-ink-gray-6">
                    {callStatus === 'In progress' ? (
                      <div>
                        <span>{contact?.mobile_no}</span>
                        <span> · </span>
                        <span>{timer.updatedTime}</span>
                      </div>
                    ) : (
                      <StatusText status={callStatus} duration={callDuration} time={timer.updatedTime} />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <StatusText status={callStatus} duration={callDuration} time={timer.updatedTime} />
              </div>
            )}
          </div>
          <div className="flex">
            <Button
              className="shrink-0 cursor-pointer bg-surface-gray-10 text-ink-base hover:bg-surface-gray-9"
              tooltip={__('Minimize')}
              icon={MinimizeIcon}
              size="md"
              onClick={toggleCallPopup}
            />
            {ended && (
              <Button
                className="shrink-0 bg-surface-gray-10 text-ink-base hover:bg-surface-gray-9"
                icon="lucide-x"
                size="md"
                onClick={closeCallPopup}
              />
            )}
          </div>
        </div>
        <div className="flex-1">
          {showNote ? (
            <div>
              <RichTextField
                editorClass="prose-sm h-[290px] text-ink-base overflow-auto mt-1"
                content={note.content}
                placeholder={__('Take a note...')}
                onChange={(value) => {
                  setNote((current) => ({ ...current, content: value }))
                  setDirty(true)
                }}
              />
            </div>
          ) : showTask ? (
            <TaskPanel
              task={task}
              onChange={(next) => {
                setTask(next)
                setDirty(true)
              }}
            />
          ) : (
            <div className="flex items-center gap-3">
              {contact?.image ? (
                <Avatar image={contact.image} label={contact.full_name} className="!size-8" />
              ) : (
                <div className="flex size-8 items-center justify-center rounded-full bg-surface-gray-9">
                  <AvatarIcon className="size-4" />
                </div>
              )}
              {contact?.full_name ? (
                <div className="flex flex-col gap-1">
                  <div className="text-lg-medium leading-5">{contact.full_name}</div>
                  <div className="text-base leading-4 text-ink-gray-6">{contact.mobile_no}</div>
                </div>
              ) : (
                <div className="text-lg-medium leading-5">{contact.mobile_no}</div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-between gap-2">
          <div className="flex gap-2">
            <Button
              className="bg-surface-gray-9 text-ink-base hover:bg-surface-gray-8"
              tooltip={__('Add a Note')}
              size="md"
              icon={NoteIcon}
              onClick={showNoteWindow}
            />
            <Button
              className="bg-surface-gray-9 text-ink-base hover:bg-surface-gray-8"
              size="md"
              tooltip={__('Add a Task')}
              icon={TaskIcon}
              onClick={showTaskWindow}
            />
            {(contact.deal || contact.lead) && (
              <Button
                className="bg-surface-gray-9 text-ink-base hover:bg-surface-gray-8"
                size="md"
                iconRight={ArrowUpRightIcon}
                label={contact.deal ? __('Deal') : __('Lead')}
                onClick={openDealOrLead}
              />
            )}
          </div>
          {(note.name || task.name) && dirty ? (
            <Button
              className="bg-surface-base !text-ink-gray-9 hover:!bg-surface-gray-3"
              variant="solid"
              label={__('Update')}
              size="md"
              onClick={save}
            />
          ) : ((note?.content && note.content !== '<p></p>') || task.title) && !note.name && !task.name ? (
            <Button
              className="bg-surface-base !text-ink-gray-9 hover:!bg-surface-gray-3"
              variant="solid"
              label={__('Save')}
              size="md"
              onClick={save}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
