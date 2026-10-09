import { useEffect, useEffectEvent, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Button, Dialog, LucideIcon, Spinner, toast } from '@/design-system'
import { dayjsLocal } from '@/core/datetime'
import { Link } from 'react-router-dom'
import { useGlobalStore } from '@/shared/stores/globalStore'
import { useHrmsSession } from '../hooks/useHrmsSession'
import { useHrmsDocumentList } from '../stores/listStore'

export function CheckInPanel() {
  const { employee, settings } = useHrmsSession()
  const { documents, resource } = useHrmsDocumentList('Employee Checkin', employee)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [checkinTimestamp, setCheckinTimestamp] = useState('')
  const [location, setLocation] = useState({ latitude: 0, longitude: 0, status: '' })
  const lastLog = documents[0]
  const nextAction = lastLog?.log_type === 'IN' ? 'OUT' : 'IN'
  const socket = useGlobalStore((state) => state.$socket)
  const reload = useEffectEvent(() => void resource.reload())

  useEffect(() => {
    socket.emit('doctype_subscribe', 'Employee Checkin')
    const onUpdate = (data: unknown) => {
      if (!data || typeof data !== 'object' || (data as { doctype?: string }).doctype === 'Employee Checkin') reload()
    }
    socket.on('list_update', onUpdate)
    return () => {
      socket.emit('doctype_unsubscribe', 'Employee Checkin')
      socket.off('list_update', onUpdate)
    }
  }, [socket])

  function openCheckin() {
    setError('')
    setCheckinTimestamp(dayjsLocal().format('YYYY-MM-DD HH:mm:ss'))
    setLocation({ latitude: 0, longitude: 0, status: '' })
    if (settings?.allow_geolocation_tracking && navigator.geolocation) {
      setLocation((current) => ({ ...current, status: __('Locating...') }))
      navigator.geolocation.getCurrentPosition(
        (position) =>
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            status: __('Location captured'),
          }),
        () => setLocation((current) => ({ ...current, status: __('Unable to retrieve your location') })),
      )
    }
    setOpen(true)
  }

  async function submit() {
    if (!employee) return
    setSaving(true)
    setError('')
    try {
      await rpc({
        url: 'frappe.client.insert',
        params: {
          doc: {
            doctype: 'Employee Checkin',
            employee: employee.name,
            log_type: nextAction,
            time: dayjsLocal().format('YYYY-MM-DD HH:mm:ss'),
            latitude: location.latitude,
            longitude: location.longitude,
          },
        },
      })
      setOpen(false)
      void resource.reload()
      toast.success(__('{0} successful!', [nextAction === 'IN' ? __('Check-in') : __('Check-out')]))
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : __('Check-in failed')
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (!settings?.allow_employee_checkin_from_mobile_app)
    return (
      <section className="rounded-xl border border-outline-gray-2 bg-surface-base p-5">
        <p className="text-sm text-ink-gray-6">{dayjsLocal().format('ddd, D MMMM, YYYY')}</p>
      </section>
    )
  return (
    <>
      <section className="rounded-xl border border-outline-gray-2 bg-surface-base p-5">
        <h2 className="text-lg font-semibold text-ink-gray-9">
          {__('Hey, {0} 👋', [employee?.first_name ?? employee?.employee_name ?? ''])}
        </h2>
        {lastLog && (
          <p className="mt-1 text-sm text-ink-gray-6">
            {__('Last {0} was at {1}', [
              lastLog.log_type === 'IN' ? __('check-in') : __('check-out'),
              String(lastLog.time ?? ''),
            ])}
            <span className="mx-1">·</span>
            <Link className="underline" to="/hrms/attendance/checkins">
              {__('View List')}
            </Link>
          </p>
        )}
        <Button
          className="mt-4 w-full"
          variant="solid"
          loading={resource.loading}
          iconLeft={nextAction === 'IN' ? 'lucide-arrow-right-circle' : 'lucide-arrow-left-circle'}
          onClick={openCheckin}
        >
          {nextAction === 'IN' ? __('Check In') : __('Check Out')}
        </Button>
      </section>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={nextAction === 'IN' ? __('Check In') : __('Check Out')}
        actions={[
          {
            label: __('Confirm {0}', [nextAction === 'IN' ? __('Check In') : __('Check Out')]),
            variant: 'solid',
            onClick: () => void submit(),
          },
        ]}
      >
        {
          <div className="flex flex-col items-center gap-4 py-5">
            <LucideIcon name="clock-3" className="size-8 text-ink-gray-5" />
            <p className="text-2xl font-semibold text-ink-gray-9">
              {dayjsLocal(checkinTimestamp).format('hh:mm:ss a')}
            </p>
            <p className="text-sm text-ink-gray-6">{dayjsLocal().format('D MMM, YYYY')}</p>
            {location.status && <p className="text-sm text-ink-gray-6">{location.status}</p>}
            {settings?.allow_geolocation_tracking && (
              <iframe
                title={__('Check-in location')}
                className="h-44 w-full rounded border-4 border-outline-gray-2"
                src={`https://maps.google.com/maps?q=${location.latitude},${location.longitude}&hl=en&z=15&output=embed`}
              />
            )}
            {error && (
              <p className="w-full rounded-lg bg-surface-red-2 p-3 text-sm text-ink-red-8" role="alert">
                {error}
              </p>
            )}
            {saving && <Spinner size="sm" />}
          </div>
        }
      </Dialog>
    </>
  )
}
