import '../../styles/telephony.css'
import { Call, Device } from '@twilio/voice-sdk'
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { capture } from '@/core/telemetry'
import { Avatar, Button } from '@/design-system'
import { MinimizeIcon, PhoneIcon } from '@/shared/components/Icons'
import { useCountUpTimer } from '@/shared/hooks/useCountUpTimer'
import { useDraggable } from '@/shared/hooks/useDraggable'
import { useUiStore } from '@/shared/stores/uiStore'
import { NoteIcon } from '../Icons'

type AnyRecord = Record<string, any>

export interface CallUIHandle {
  makeOutgoingCall: (number: string) => void | Promise<void>
  setup: () => void | Promise<void>
}

export interface TwilioCallUIProps {
  ref?: Ref<CallUIHandle>
}

const EMPTY_CONTACT: AnyRecord = { full_name: '', image: '', mobile_no: '' }
const EMPTY_NOTE: AnyRecord = { name: '', title: '', content: '' }

export function TwilioCallUI({ ref }: TwilioCallUIProps) {
  const showDoctypeModal = useUiStore((state) => state.showDoctypeModal)
  const timer = useCountUpTimer()

  const deviceRef = useRef<Device | null>(null)
  const callRef = useRef<Call | null>(null)

  const [showCallPopup, setShowCallPopup] = useState(false)
  const [showSmallCallWindow, setShowSmallCallWindow] = useState(false)
  const [onCall, setOnCall] = useState(false)
  const [calling, setCalling] = useState(false)
  const [muted, setMuted] = useState(false)
  const [callStatus, setCallStatus] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [contact, setContact] = useState<AnyRecord>(EMPTY_CONTACT)
  const [note, setNote] = useState<AnyRecord>(EMPTY_NOTE)

  const { style, setHandle } = useDraggable({ x: window.innerWidth - 280, y: window.innerHeight - 310 })

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

  async function updateNote(updated: AnyRecord, isInsert = false) {
    setNote(updated)
    if (isInsert && updated.name) {
      await rpc({
        url: 'crm.integrations.api.add_note_to_call_log',
        params: { call_sid: callRef.current?.parameters.CallSid, note: updated },
      })
      capture('note_created')
    } else {
      capture('note_updated')
    }
  }

  function openNoteModal() {
    showDoctypeModal({
      name: note.name || null,
      doctype: 'CRM Call Log',
      title: 'Call Log',
      callbacks: {
        afterInsert: (created: AnyRecord) => void updateNote(created, true),
        afterUpdate: (updated: AnyRecord) => void updateNote(updated),
      },
    })
  }

  function resetCallState() {
    setCalling(false)
    setOnCall(false)
    setShowCallPopup(false)
    setShowSmallCallWindow(false)
    setCallStatus('')
    setMuted(false)
    setNote(EMPTY_NOTE)
    timer.stop()
  }

  function handleDisconnectedIncomingCall() {
    setShowCallPopup(false)
    setShowSmallCallWindow(false)
    callRef.current = null
    setMuted(false)
    setOnCall(false)
    timer.stop()
  }

  function handleIncomingCall(incoming: Call) {
    setPhoneNumber(incoming.parameters.From ?? '')
    setShowCallPopup(true)
    callRef.current = incoming
    incoming.on('cancel', handleDisconnectedIncomingCall)
    incoming.on('disconnect', handleDisconnectedIncomingCall)
    incoming.on('reject', handleDisconnectedIncomingCall)
  }

  function initializeDevice(token: string) {
    const options = {
      codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
      fakeLocalDTMF: true,
      enableRingingState: true,
    }
    const device = new Device(token, options)
    deviceRef.current = device

    device.on('incoming', handleIncomingCall)
    device.on('tokenWillExpire', async () => {
      const data = await rpc<AnyRecord>({ url: 'crm.integrations.twilio.api.generate_access_token' })
      device.updateToken(data.token)
    })
    void device.register()
  }

  async function startupClient() {
    try {
      const data = await rpc<AnyRecord>({ url: 'crm.integrations.twilio.api.generate_access_token' })
      initializeDevice(data.token)
    } catch (failure) {
      console.error('Twilio setup failed:', failure)
    }
  }

  function toggleMute() {
    const active = callRef.current
    if (!active) return
    if (active.isMuted()) {
      active.mute(false)
      setMuted(false)
    } else {
      active.mute()
      setMuted(true)
    }
  }

  async function acceptIncomingCall() {
    setOnCall(true)
    await callRef.current?.accept()
    timer.start()
  }

  function rejectIncomingCall() {
    callRef.current?.reject()
    setShowCallPopup(false)
    setShowSmallCallWindow(false)
    setCallStatus('')
    setMuted(false)
  }

  function hangUpCall() {
    callRef.current?.disconnect()
    setOnCall(false)
    setCallStatus('')
    setMuted(false)
    setNote(EMPTY_NOTE)
    timer.stop()
  }

  function cancelCall() {
    callRef.current?.disconnect()
    resetCallState()
  }

  async function makeOutgoingCall(number: string) {
    setPhoneNumber(number)
    const device = deviceRef.current
    if (!device) return

    try {
      const outgoing = await device.connect({ params: { To: number } })
      callRef.current = outgoing
      setShowCallPopup(true)
      setCallStatus('initiating')
      capture('make_outgoing_call')

      outgoing.on('messageReceived', (message: { content: AnyRecord }) => {
        const info = message.content
        setCallStatus(info.CallStatus)
        if (info.CallStatus === 'in-progress') {
          setCalling(false)
          setOnCall(true)
          timer.start()
        }
      })
      outgoing.on('accept', () => {
        setShowCallPopup(true)
        setCalling(true)
        setOnCall(false)
      })
      outgoing.on('disconnect', () => {
        callRef.current = null
        resetCallState()
      })
      outgoing.on('cancel', () => {
        callRef.current = null
        resetCallState()
      })
    } catch (failure) {
      console.error('Could not connect call:', failure)
    }
  }

  function toggleCallWindow() {
    setShowCallPopup((current) => !current)
    setShowSmallCallWindow((current) => !current)
  }

  useImperativeHandle(ref, () => ({ makeOutgoingCall, setup: startupClient }))

  const status =
    callStatus === 'initiating'
      ? __('Initiating call...')
      : callStatus === 'ringing'
        ? __('Ringing...')
        : calling
          ? __('Calling...')
          : __('Incoming call...')

  return (
    <>
      <div className={showCallPopup ? '' : 'hidden'}>
        <div
          ref={setHandle}
          className="fixed z-20 flex w-60 cursor-move select-none flex-col rounded-lg bg-surface-gray-10 p-4 text-ink-gray-2 shadow-2xl"
          style={style}
        >
          <div className="flex flex-row-reverse items-center gap-1">
            <MinimizeIcon className="h-4 w-4 cursor-pointer" onClick={toggleCallWindow} />
          </div>
          <div className="flex flex-col items-center justify-center gap-3">
            {contact?.image && (
              <Avatar
                image={contact.image}
                label={contact.full_name}
                className={`relative flex !h-24 !w-24 items-center justify-center [&>div]:text-[30px] ${
                  onCall || calling ? '' : 'call-pulse'
                }`}
              />
            )}
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="text-2xl-medium">{contact?.full_name || __('Unknown')}</div>
              <div className="text-sm text-ink-gray-5">{contact?.mobile_no}</div>
            </div>
            {onCall && <div className="my-1 text-base">{timer.updatedTime}</div>}
            {!onCall && <div className="my-1 text-base">{status}</div>}
            {onCall ? (
              <div className="flex gap-2">
                <Button icon={muted ? 'mic-off' : 'mic'} className="rounded-full" onClick={toggleMute} />
                <Button
                  className="cursor-pointer rounded-full"
                  tooltip={__('Add a Note')}
                  icon={NoteIcon}
                  onClick={openNoteModal}
                />
                <Button
                  className="rotate-[135deg] rounded-full bg-surface-red-7 text-ink-base hover:bg-surface-red-8"
                  tooltip={__('Hang Up')}
                  icon={PhoneIcon}
                  onClick={hangUpCall}
                />
              </div>
            ) : calling || callStatus === 'initiating' ? (
              <div>
                <Button
                  size="md"
                  variant="solid"
                  theme="red"
                  label={__('Cancel')}
                  className="rounded-lg text-ink-base"
                  disabled={callStatus === 'initiating'}
                  onClick={cancelCall}
                >
                  <PhoneIcon className="rotate-[135deg]" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="md"
                  variant="solid"
                  theme="green"
                  label={__('Accept')}
                  className="rounded-lg text-ink-base"
                  iconLeft={PhoneIcon}
                  onClick={() => void acceptIncomingCall()}
                />
                <Button
                  size="md"
                  variant="solid"
                  theme="red"
                  label={__('Reject')}
                  className="rounded-lg text-ink-base"
                  onClick={rejectIncomingCall}
                >
                  <PhoneIcon className="rotate-[135deg]" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {showSmallCallWindow && (
        <div
          className="ml-2 flex cursor-pointer select-none items-center justify-between gap-3 rounded-lg bg-surface-gray-10 px-2 py-[7px] text-base text-ink-gray-2"
          onClick={toggleCallWindow}
        >
          <div className="flex items-center gap-2">
            {contact?.image && (
              <Avatar
                image={contact.image}
                label={contact.full_name}
                className="relative flex !h-5 !w-5 items-center justify-center"
              />
            )}
            <div className="max-w-[120px] truncate">{contact?.full_name || __('Unknown')}</div>
          </div>
          {onCall ? (
            <div className="flex items-center gap-2">
              <div className="my-1 min-w-[40px] text-center">{timer.updatedTime}</div>
              <Button
                variant="solid"
                theme="red"
                className="rotate-[135deg] !h-6 !w-6 rounded-full text-ink-base"
                icon={PhoneIcon}
                onClick={(event) => {
                  event.stopPropagation()
                  hangUpCall()
                }}
              />
            </div>
          ) : calling ? (
            <div className="flex items-center gap-3">
              <div className="my-1">{callStatus === 'ringing' ? __('Ringing...') : __('Calling...')}</div>
              <Button
                variant="solid"
                theme="red"
                className="rotate-[135deg] !h-6 !w-6 rounded-full text-ink-base"
                icon={PhoneIcon}
                onClick={(event) => {
                  event.stopPropagation()
                  cancelCall()
                }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="solid"
                theme="green"
                className="call-pulse relative !h-6 !w-6 animate-pulse rounded-full text-ink-base"
                tooltip={__('Accept Call')}
                icon={PhoneIcon}
                onClick={(event) => {
                  event.stopPropagation()
                  void acceptIncomingCall()
                }}
              />
              <Button
                variant="solid"
                theme="red"
                className="rotate-[135deg] !h-6 !w-6 rounded-full text-ink-base"
                tooltip={__('Reject Call')}
                icon={PhoneIcon}
                onClick={(event) => {
                  event.stopPropagation()
                  rejectIncomingCall()
                }}
              />
            </div>
          )}
        </div>
      )}
    </>
  )
}
