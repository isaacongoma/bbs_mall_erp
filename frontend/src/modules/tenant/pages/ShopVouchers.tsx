import dayjs from 'dayjs'
import { useState } from 'react'
import { Button, Checkbox, Dialog, ErrorMessage, Select, TextInput, toast } from '@/design-system'
import { shopApi } from '../api/shop'
import { PortalLayout } from '../components/PortalLayout'
import { Card, EmptyState, ErrorPanel, Loading, PageHeading, StatusBadge } from '../components/PortalUi'
import { ShopGate } from '../components/ShopGate'
import { usePortalQuery } from '../hooks/usePortalQuery'
import type { VoucherInput, VoucherRow } from '../types/shop'
import { formatDate, formatMoney } from '../utils/format'

const BLANK: VoucherInput = {
  coupon_code: '',
  voucher_type: 'Discount',
  discount_type: 'Percent',
  discount_value: 10,
  max_discount: 0,
  min_order: 0,
  applies_to: 'All Items',
  listings: [],
  valid_from: dayjs().format('YYYY-MM-DD'),
  valid_upto: dayjs().add(30, 'day').format('YYYY-MM-DD'),
  usage_limit: 0,
  per_customer_limit: 1,
  first_order_only: 0,
  exclude_campaign_items: 0,
  show_on_shop: 1,
  must_collect: 0,
}

function number(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function headline(row: VoucherRow): string {
  if (row.voucher_type === 'Delivery Discount') {
    return row.voucher_discount_type === 'Percent' && Number(row.voucher_discount_value) >= 100
      ? 'Free delivery'
      : 'Delivery discount'
  }
  return row.voucher_discount_type === 'Percent'
    ? `${Number(row.voucher_discount_value)}% off`
    : `${formatMoney(row.voucher_discount_value)} off`
}

function VoucherDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [values, setValues] = useState<VoucherInput>(BLANK)
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const products = usePortalQuery(() => (open ? shopApi.listings('Published', '', 0, 100) : Promise.resolve(null)), [open])
  const set = <K extends keyof VoucherInput>(key: K, value: VoucherInput[K]) => setValues((current) => ({ ...current, [key]: value }))

  async function save() {
    setProblem('')
    if (!values.coupon_code?.trim()) return setProblem('Enter the code shoppers will type.')
    if (!values.valid_upto) return setProblem('Choose when the voucher ends.')
    if (!(values.discount_value > 0)) return setProblem('Enter the discount.')
    if (values.applies_to === 'Selected Products' && !(values.listings ?? []).length) return setProblem('Choose the products.')
    setBusy(true)
    try {
      await shopApi.saveVoucher(values)
      toast.success('Voucher created')
      setValues(BLANK)
      onClose()
      onDone()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const delivery = values.voucher_type === 'Delivery Discount'
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} title="New voucher" size="lg">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Code shoppers type" value={values.coupon_code ?? ''} onChange={(value) => set('coupon_code', value.toUpperCase())} />
          <Select
            label="Voucher type"
            value={values.voucher_type}
            onChange={(value) => set('voucher_type', String(value))}
            options={[
              { label: 'Money off', value: 'Discount' },
              { label: 'Delivery discount', value: 'Delivery Discount' },
            ]}
          />
          <Select
            label="Discount"
            value={values.discount_type}
            onChange={(value) => set('discount_type', String(value))}
            options={[
              { label: 'Percentage', value: 'Percent' },
              { label: 'Fixed amount (KSh)', value: 'Fixed Amount' },
            ]}
          />
          <TextInput
            label={values.discount_type === 'Percent' ? (delivery ? 'Percent of delivery fee (100 = free)' : 'Percent off') : 'Amount off (KSh)'}
            type="number"
            value={String(values.discount_value)}
            onChange={(value) => set('discount_value', number(value))}
          />
          {values.discount_type === 'Percent' && (
            <TextInput label="Maximum discount (KSh, 0 for none)" type="number" value={String(values.max_discount ?? 0)} onChange={(value) => set('max_discount', number(value))} />
          )}
          <TextInput label="Minimum spend (KSh)" type="number" value={String(values.min_order ?? 0)} onChange={(value) => set('min_order', number(value))} />
          <TextInput label="Starts" type="date" value={values.valid_from ?? ''} onChange={(value) => set('valid_from', value)} />
          <TextInput label="Valid until" type="date" value={values.valid_upto} onChange={(value) => set('valid_upto', value)} />
          <Select
            label="Applies to"
            value={values.applies_to}
            onChange={(value) => set('applies_to', String(value))}
            options={[
              { label: 'Everything in my shop', value: 'All Items' },
              { label: 'Selected products', value: 'Selected Products' },
            ]}
          />
          <TextInput label="Total uses (0 for unlimited)" type="number" value={String(values.usage_limit ?? 0)} onChange={(value) => set('usage_limit', number(value))} />
          <TextInput label="Uses per customer (0 for unlimited)" type="number" value={String(values.per_customer_limit ?? 1)} onChange={(value) => set('per_customer_limit', number(value))} />
        </div>
        {values.applies_to === 'Selected Products' && (
          <div className="flex max-h-40 flex-col gap-1 overflow-auto rounded-xl border border-outline-gray-2 p-3">
            {(products.data?.rows ?? []).map((row) => (
              <Checkbox
                key={row.name}
                label={row.listing_title}
                value={(values.listings ?? []).includes(row.name)}
                onChange={(value) =>
                  set('listings', value ? [...(values.listings ?? []), row.name] : (values.listings ?? []).filter((item) => item !== row.name))
                }
              />
            ))}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox label="New customers only" value={Boolean(values.first_order_only)} onChange={(value) => set('first_order_only', value ? 1 : 0)} />
          <Checkbox label="Skip items already on promotion" value={Boolean(values.exclude_campaign_items)} onChange={(value) => set('exclude_campaign_items', value ? 1 : 0)} />
          <Checkbox label="Show on my shop and product pages" value={Boolean(values.show_on_shop)} onChange={(value) => set('show_on_shop', value ? 1 : 0)} />
          <Checkbox label="Shoppers collect it first" value={Boolean(values.must_collect)} onChange={(value) => set('must_collect', value ? 1 : 0)} />
        </div>
        <ErrorMessage message={problem} />
        <div className="flex justify-end gap-2">
          <Button label="Cancel" variant="subtle" onClick={onClose} />
          <Button label="Create voucher" variant="solid" loading={busy} onClick={() => void save()} />
        </div>
      </div>
    </Dialog>
  )
}

function Vouchers() {
  const { data, loading, error, reload } = usePortalQuery(() => shopApi.vouchers())
  const [creating, setCreating] = useState(false)

  async function toggle(row: VoucherRow) {
    try {
      await shopApi.setVoucherStatus(row.name, row.voucher_status === 'Active' ? 'Paused' : 'Active')
      reload()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : String(caught))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Vouchers"
        subtitle="Offer discounts or cheaper delivery to bring shoppers to your shop"
        actions={<Button label="New voucher" variant="solid" iconLeft="lucide-plus" onClick={() => setCreating(true)} />}
      />
      {loading && !data && <Loading />}
      {error && <ErrorPanel message={error} onRetry={reload} />}
      {data && data.length === 0 && (
        <Card>
          <EmptyState icon="ticket" title="No vouchers yet" message="Create a code for your whole shop or for selected products. You pay for the discount, not the marketplace." />
        </Card>
      )}
      {data && data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((row) => {
            const expired = dayjs(row.valid_upto).isBefore(dayjs(), 'day')
            return (
              <Card key={row.name}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-ink-gray-9">{headline(row)}</p>
                    <p className="mt-1 inline-block rounded-lg border border-dashed border-[#b8860b] bg-[#b8860b]/5 px-2 py-0.5 font-mono text-sm text-ink-gray-8">{row.coupon_code}</p>
                  </div>
                  <StatusBadge status={expired ? 'Expired' : row.voucher_status === 'Active' ? 'Approved' : row.voucher_status} label={expired ? 'Expired' : row.voucher_status} />
                </div>
                <ul className="mt-3 flex flex-col gap-0.5 text-sm text-ink-gray-6">
                  {Number(row.voucher_min_order) > 0 && <li>Minimum spend {formatMoney(row.voucher_min_order)}</li>}
                  {Number(row.voucher_max_discount) > 0 && <li>Up to {formatMoney(row.voucher_max_discount)} off</li>}
                  <li>{row.voucher_applies_to === 'Selected Products' ? `${row.listings.length} selected products` : 'Everything in your shop'}</li>
                  <li>
                    Valid {formatDate(row.valid_from)} to <b>{formatDate(row.valid_upto)}</b>
                  </li>
                  <li>
                    Used {row.used}
                    {Number(row.maximum_use) > 0 ? ` of ${row.maximum_use}` : ''} times, {formatMoney(row.voucher_total_discount)} given
                  </li>
                  {row.voucher_first_order_only ? <li>New customers only</li> : null}
                  {row.voucher_must_collect ? <li>Shoppers collect it first</li> : null}
                </ul>
                {!expired && row.voucher_status !== 'Pending Approval' && (
                  <div className="mt-4">
                    <Button label={row.voucher_status === 'Active' ? 'Pause' : 'Resume'} variant="subtle" size="sm" onClick={() => void toggle(row)} />
                  </div>
                )}
                {row.voucher_status === 'Pending Approval' && <p className="mt-3 text-xs text-ink-gray-5">Waiting for the marketplace team to approve it.</p>}
              </Card>
            )
          })}
        </div>
      )}
      <VoucherDialog open={creating} onClose={() => setCreating(false)} onDone={reload} />
    </div>
  )
}

export default function ShopVouchers() {
  return (
    <PortalLayout title="Vouchers">
      <ShopGate needActive>{() => <Vouchers />}</ShopGate>
    </PortalLayout>
  )
}
