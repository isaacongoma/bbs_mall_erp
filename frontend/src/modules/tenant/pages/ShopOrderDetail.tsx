import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Dialog, ErrorMessage, Textarea, TextInput, toast } from '@/design-system'
import { shopApi } from '../api/shop'
import { PortalLayout } from '../components/PortalLayout'
import { Card, ErrorPanel, KeyValue, Loading, PageHeading, StatusBadge } from '../components/PortalUi'
import { ShopGate } from '../components/ShopGate'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { formatDate, formatDateTime, formatMoney } from '../utils/format'

type Prompt = 'ship' | 'cancel' | null

function Detail({ name }: { name: string }) {
  const { data, loading, error, reload } = usePortalQuery(() => shopApi.order(name), [name])
  const [prompt, setPrompt] = useState<Prompt>(null)
  const [tracking, setTracking] = useState('')
  const [reason, setReason] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  async function act(action: string, extra: { tracking_no?: string; reason?: string } = {}) {
    setBusy(true)
    setProblem('')
    try {
      await shopApi.orderAction(name, action, extra)
      toast.success('Order updated')
      setPrompt(null)
      reload()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  if (loading && !data) return <Loading />
  if (error) return <ErrorPanel message={error} onRetry={reload} />
  if (!data) return null
  const { order, buyer, shipment } = data
  const buttons: React.ReactNode[] = []
  if (order.status === 'New') buttons.push(<Button key="a" label="Accept order" variant="solid" loading={busy} onClick={() => void act('accept')} />)
  if (order.status === 'Accepted') buttons.push(<Button key="p" label="Mark as packed" variant="solid" loading={busy} onClick={() => void act('pack')} />)
  if (order.status === 'Packed') buttons.push(<Button key="s" label="Mark as shipped" variant="solid" onClick={() => setPrompt('ship')} />)
  if (order.status === 'Shipped' && order.fulfilment_mode === 'Seller Ships') {
    buttons.push(<Button key="d" label="Mark as delivered" variant="solid" loading={busy} onClick={() => void act('deliver')} />)
  }
  if (['New', 'Accepted', 'Packed'].includes(order.status)) {
    buttons.push(<Button key="c" label="Cancel order" variant="subtle" theme="red" onClick={() => setPrompt('cancel')} />)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title={order.name}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <Link to="/tenant/shop/orders" className="text-ink-gray-6 underline">
              Orders
            </Link>
            <StatusBadge status={order.status} />
          </span>
        }
        actions={<>{buttons}</>}
      />
      <ErrorMessage message={problem} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Items" className="lg:col-span-2" bodyClassName="p-0 sm:p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-outline-gray-2 text-left text-xs uppercase tracking-wide text-ink-gray-5">
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 text-right font-semibold">Qty</th>
                  <th className="px-3 py-3 text-right font-semibold">Price</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((line) => (
                  <tr key={`${line.listing}-${line.item_name}`} className="border-b border-outline-gray-1 last:border-0">
                    <td className="px-5 py-3 font-medium text-ink-gray-9">{line.item_name}</td>
                    <td className="px-3 py-3 text-right">{line.qty}</td>
                    <td className="px-3 py-3 text-right">{formatMoney(line.rate)}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatMoney(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Settlement">
          <dl>
            <KeyValue label="Items">{formatMoney(order.items_total)}</KeyValue>
            <KeyValue label="VAT">{formatMoney(order.vat_total)}</KeyValue>
            <KeyValue label="Commission">- {formatMoney(order.commission_amount)}</KeyValue>
            <KeyValue label="VAT on commission">- {formatMoney(order.commission_vat)}</KeyValue>
            <KeyValue label="You earn">{formatMoney(order.seller_net)}</KeyValue>
            <KeyValue label="Wallet">
              <StatusBadge status={order.settlement_status} />
            </KeyValue>
          </dl>
        </Card>
        <Card title="Deliver to">
          <dl>
            <KeyValue label="Name">{buyer.recipient_name}</KeyValue>
            <KeyValue label="Phone">{buyer.recipient_phone}</KeyValue>
            <KeyValue label="Address">{buyer.address_snapshot}</KeyValue>
            <KeyValue label="Payment">{buyer.payment_method}</KeyValue>
            <KeyValue label="Ordered">{formatDateTime(buyer.order_date)}</KeyValue>
          </dl>
        </Card>
        <Card title="Delivery">
          <dl>
            <KeyValue label="Ship by">{formatDate(order.sla_due)}</KeyValue>
            <KeyValue label="Courier">{shipment?.courier ?? order.courier ?? '-'}</KeyValue>
            <KeyValue label="Tracking">{shipment?.tracking_no ?? '-'}</KeyValue>
            <KeyValue label="Shipment">{shipment ? <StatusBadge status={shipment.status} /> : '-'}</KeyValue>
          </dl>
        </Card>
      </div>
      <Dialog open={prompt === 'ship'} onOpenChange={(open) => !open && setPrompt(null)} title="Ship this order" size="sm">
        <div className="flex flex-col gap-4">
          <TextInput label="Tracking number (if you have one)" value={tracking} onChange={setTracking} />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="subtle" onClick={() => setPrompt(null)} />
            <Button label="Confirm shipped" variant="solid" loading={busy} onClick={() => void act('ship', { tracking_no: tracking })} />
          </div>
        </div>
      </Dialog>
      <Dialog open={prompt === 'cancel'} onOpenChange={(open) => !open && setPrompt(null)} title="Cancel this order" size="sm">
        <div className="flex flex-col gap-4">
          <Textarea label="Reason" value={reason} onChange={setReason} rows={3} />
          <div className="flex justify-end gap-2">
            <Button label="Keep order" variant="subtle" onClick={() => setPrompt(null)} />
            <Button
              label="Cancel order"
              variant="solid"
              theme="red"
              loading={busy}
              disabled={!reason.trim()}
              onClick={() => void act('cancel', { reason })}
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default function ShopOrderDetail() {
  const { name = '' } = useParams()
  return (
    <PortalLayout title="Order">
      <ShopGate>{() => <Detail key={name} name={name} />}</ShopGate>
    </PortalLayout>
  )
}
