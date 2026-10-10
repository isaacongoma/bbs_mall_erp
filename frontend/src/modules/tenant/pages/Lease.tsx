import { useRef, useState } from 'react'
import { Button, Dialog, ErrorMessage, LucideIcon, Textarea, TextInput, toast } from '@/design-system'
import { portalApi } from '../api/portal'
import { PortalLayout } from '../components/PortalLayout'
import { Card, EmptyState, ErrorPanel, KeyValue, Loading, PageHeading, StatusBadge } from '../components/PortalUi'
import { SignaturePad, type SignaturePadHandle } from '../components/SignaturePad'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { usePortalStore } from '../stores/portalStore'
import type { LeaseDetail } from '../types/portal'
import { formatDate, formatDateTime, formatMoney, formatNumber } from '../utils/format'

function escalationText(lease: LeaseDetail): string {
  if (lease.escalation_type === 'Percentage') return `${lease.escalation_rate}% every ${lease.escalation_months} months`
  if (lease.escalation_type === 'Fixed Amount') return `Fixed increase every ${lease.escalation_months} months`
  return 'None'
}

export default function Lease() {
  const level = usePortalStore(
    (state) => state.context?.tenants.find((row) => row.customer === state.customer)?.access_level,
  )
  const userName = usePortalStore((state) => state.context?.user.full_name)
  const customer = usePortalStore((state) => state.customer)
  const { data, loading, error, reload } = usePortalQuery((id) => portalApi.leases(id))
  const [signing, setSigning] = useState<LeaseDetail | null>(null)
  const [renewing, setRenewing] = useState<LeaseDetail | null>(null)
  const [signer, setSigner] = useState('')
  const [note, setNote] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const pad = useRef<SignaturePadHandle | null>(null)
  const canManage = level === 'Owner' || level === undefined

  async function sign() {
    const image = pad.current?.toDataUrl()
    if (!signing || !image) return setProblem('Draw your signature in the box first.')
    setBusy(true)
    setProblem('')
    try {
      await portalApi.signLease(signing.name, image, signer || userName || '', customer)
      toast.success('Lease signed')
      setSigning(null)
      reload()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  async function renew() {
    if (!renewing) return
    setBusy(true)
    try {
      await portalApi.requestRenewal(renewing.name, note, customer)
      toast.success('Renewal request sent to the management office')
      setRenewing(null)
      setNote('')
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PortalLayout title="My Lease">
      <div className="flex flex-col gap-6">
        <PageHeading title="My lease" subtitle="Terms, rent schedule, documents and signatures" />
        {loading && !data && <Loading />}
        {error && <ErrorPanel message={error} onRetry={reload} />}
        {data?.length === 0 && (
          <Card>
            <EmptyState
              icon="file-signature"
              title="No lease on record"
              message="Contact the management office if you expected to see a lease here."
            />
          </Card>
        )}
        {data?.map((lease) => (
          <section
            key={lease.name}
            className="flex flex-col gap-4 rounded-3xl border border-outline-gray-2 bg-surface-base p-5 shadow-sm sm:p-6"
          >
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-gray-5">{lease.name}</p>
                <h2 className="text-xl font-semibold text-ink-gray-9">
                  {lease.units.map((unit) => unit.unit).join(', ')}
                </h2>
                <p className="text-sm text-ink-gray-5">{lease.property}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={lease.status} />
                {lease.days_left > 0 && lease.days_left <= 120 && (
                  <StatusBadge status="Expiring Soon" label={`${lease.days_left} days left`} />
                )}
              </div>
            </header>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Terms">
                <dl>
                  <KeyValue label="Start date">{formatDate(lease.start_date)}</KeyValue>
                  <KeyValue label="End date">{formatDate(lease.end_date)}</KeyValue>
                  <KeyValue label="Billing">{lease.billing_frequency}</KeyValue>
                  <KeyValue label="Next invoice">{formatDate(lease.next_billing_date)}</KeyValue>
                  <KeyValue label="Rent review">{escalationText(lease)}</KeyValue>
                  {lease.turnover_rent_applicable ? (
                    <KeyValue label="Turnover rent">{lease.turnover_rent_percent}% of sales</KeyValue>
                  ) : null}
                  <KeyValue label="Notice period">{lease.notice_period_days} days</KeyValue>
                  <KeyValue label="Security deposit">
                    {formatMoney(lease.deposit_balance)} held of {formatMoney(lease.security_deposit_amount)}
                  </KeyValue>
                </dl>
              </Card>
              <Card title="Spaces and monthly charges">
                <ul className="flex flex-col gap-2">
                  {lease.units.map((unit) => (
                    <li
                      key={unit.unit}
                      className="flex items-center justify-between gap-3 rounded-xl bg-surface-gray-1 px-3 py-2.5 text-sm"
                    >
                      <span>
                        <span className="font-medium text-ink-gray-9">{unit.unit}</span>
                        <span className="ml-2 text-xs text-ink-gray-5">
                          {unit.unit_type} - {formatNumber(unit.area_sqm)} sqm
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold text-ink-gray-9">{formatMoney(unit.monthly_rent)}</span>
                        {Number(unit.monthly_service_charge) > 0 && (
                          <span className="block text-xs text-ink-gray-5">
                            + {formatMoney(unit.monthly_service_charge)} service
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                  {lease.charges.map((charge, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between gap-3 px-3 py-1 text-sm text-ink-gray-6"
                    >
                      <span>
                        {charge.description || charge.charge_item} ({charge.frequency})
                      </span>
                      <span>{formatMoney(charge.amount)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card title="Rent schedule">
              <ol className="relative ml-2 flex flex-col gap-4 border-l-2 border-[#b8860b]/30 pl-5">
                {lease.schedule.map((row, index) => {
                  const current = new Date(row.from_date) <= new Date() && new Date(row.to_date) >= new Date()
                  return (
                    <li key={index} className="relative">
                      <span
                        className={`absolute -left-[27px] top-1 size-3 rounded-full border-2 ${current ? 'border-[#b8860b] bg-[#b8860b]' : 'border-[#b8860b]/50 bg-surface-base'}`}
                      />
                      <p className="text-sm font-medium text-ink-gray-9">
                        {formatDate(row.from_date)} - {formatDate(row.to_date)}
                        {current && (
                          <span className="ml-2 rounded-full bg-[#b8860b]/15 px-2 py-0.5 text-xs text-[#8a6508]">
                            Now
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-ink-gray-6">
                        {formatMoney(row.monthly_rent)} rent per month
                        {Number(row.monthly_service_charge) > 0 &&
                          ` + ${formatMoney(row.monthly_service_charge)} service charge`}
                        {row.note && <span className="text-ink-gray-5"> - {row.note}</span>}
                      </p>
                    </li>
                  )
                })}
              </ol>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Signatures">
                <ul className="flex flex-col gap-3 text-sm">
                  <li className="flex items-center gap-3">
                    <LucideIcon
                      name={lease.landlord_signed_on ? 'circle-check' : 'circle-dashed'}
                      className={`size-5 ${lease.landlord_signed_on ? 'text-[#16a34a]' : 'text-ink-gray-4'}`}
                    />
                    <span className="flex-1">Landlord</span>
                    <span className="text-ink-gray-5">
                      {lease.landlord_signed_on ? formatDateTime(lease.landlord_signed_on) : 'Pending'}
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <LucideIcon
                      name={lease.tenant_signed_on ? 'circle-check' : 'circle-dashed'}
                      className={`size-5 ${lease.tenant_signed_on ? 'text-[#16a34a]' : 'text-ink-gray-4'}`}
                    />
                    <span className="flex-1">You</span>
                    <span className="text-ink-gray-5">
                      {lease.tenant_signed_on ? formatDateTime(lease.tenant_signed_on) : 'Pending'}
                    </span>
                  </li>
                </ul>
                {!lease.tenant_signed_on && canManage && (
                  <Button
                    label="Sign this lease"
                    variant="solid"
                    className="mt-4"
                    iconLeft="lucide-pen-line"
                    onClick={() => {
                      setSigner(userName ?? '')
                      setProblem('')
                      setSigning(lease)
                    }}
                  />
                )}
              </Card>
              <Card title="Documents">
                {lease.documents.length || lease.signed_copy ? (
                  <ul className="flex flex-col gap-2 text-sm">
                    {lease.signed_copy && (
                      <li>
                        <a
                          href={lease.signed_copy}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 rounded-xl bg-surface-gray-1 px-3 py-2.5 hover:bg-surface-gray-2"
                        >
                          <LucideIcon name="file-check" className="size-5 text-[#8a6508]" />
                          <span className="flex-1 font-medium">Signed lease</span>
                          <LucideIcon name="download" className="size-4 text-ink-gray-5" />
                        </a>
                      </li>
                    )}
                    {lease.documents.map((document, index) => (
                      <li key={index}>
                        <a
                          href={document.file}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 rounded-xl bg-surface-gray-1 px-3 py-2.5 hover:bg-surface-gray-2"
                        >
                          <LucideIcon name="file-text" className="size-5 text-[#8a6508]" />
                          <span className="flex-1">
                            <span className="block font-medium">{document.document_type}</span>
                            {document.expiry_date && (
                              <span className="block text-xs text-ink-gray-5">
                                Expires {formatDate(document.expiry_date)}
                              </span>
                            )}
                          </span>
                          <LucideIcon name="download" className="size-4 text-ink-gray-5" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-gray-5">No documents have been shared yet.</p>
                )}
              </Card>
            </div>

            {canManage && lease.days_left <= 180 && lease.days_left > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#b8860b]/10 p-4">
                <div>
                  <p className="font-semibold text-[#6d4f05]">Your lease ends in {lease.days_left} days</p>
                  <p className="text-sm text-[#8a6508]">Let the management office know if you would like to renew.</p>
                </div>
                <Button
                  label="Request renewal"
                  variant="solid"
                  onClick={() => {
                    setProblem('')
                    setRenewing(lease)
                  }}
                />
              </div>
            )}
          </section>
        ))}
      </div>

      <Dialog
        open={signing !== null}
        onOpenChange={(open) => !open && setSigning(null)}
        title="Sign your lease"
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-gray-6">
            By signing you confirm that you have read and agree to the terms of lease <strong>{signing?.name}</strong>.
          </p>
          <TextInput label="Full name" value={signer} onChange={setSigner} />
          <SignaturePad handleRef={pad} />
          <ErrorMessage message={problem} />
          <div className="flex justify-between gap-2">
            <Button label="Clear" variant="ghost" onClick={() => pad.current?.clear()} />
            <div className="flex gap-2">
              <Button label="Cancel" variant="subtle" onClick={() => setSigning(null)} />
              <Button label="Sign and submit" variant="solid" loading={busy} onClick={() => void sign()} />
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={renewing !== null}
        onOpenChange={(open) => !open && setRenewing(null)}
        title="Request a renewal"
        size="md"
      >
        <div className="flex flex-col gap-4">
          <Textarea
            label="Message (optional)"
            value={note}
            onChange={setNote}
            rows={4}
            placeholder="Preferred term, any changes you would like to discuss..."
          />
          <ErrorMessage message={problem} />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="subtle" onClick={() => setRenewing(null)} />
            <Button label="Send request" variant="solid" loading={busy} onClick={() => void renew()} />
          </div>
        </div>
      </Dialog>
    </PortalLayout>
  )
}
