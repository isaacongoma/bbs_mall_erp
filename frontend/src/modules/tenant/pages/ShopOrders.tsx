import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/design-system'
import { shopApi } from '../api/shop'
import { PortalLayout } from '../components/PortalLayout'
import { Card, EmptyState, ErrorPanel, Loading, PageHeading, Segmented, StatusBadge } from '../components/PortalUi'
import { ShopGate } from '../components/ShopGate'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { formatDate, formatMoney } from '../utils/format'

const TABS = [
  { value: '', label: 'All' },
  { value: 'New', label: 'New' },
  { value: 'Accepted', label: 'To pack' },
  { value: 'Packed', label: 'To ship' },
  { value: 'Shipped', label: 'In transit' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
]
const PAGE = 20

function OrderList() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [start, setStart] = useState(0)
  const { data, loading, error, reload } = usePortalQuery(() => shopApi.orders(status, start, PAGE), [status, start])
  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Orders" subtitle="Customer orders for your products" />
      <div className="overflow-x-auto">
        <Segmented
          value={status}
          options={TABS}
          onChange={(value) => {
            setStart(0)
            setStatus(value)
          }}
        />
      </div>
      {loading && !data && <Loading />}
      {error && <ErrorPanel message={error} onRetry={reload} />}
      {data && data.rows.length === 0 && (
        <Card>
          <EmptyState icon="shopping-bag" title="No orders here" message="New orders appear as soon as customers pay." />
        </Card>
      )}
      {data && data.rows.length > 0 && (
        <Card bodyClassName="p-0 sm:p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-outline-gray-2 text-left text-xs uppercase tracking-wide text-ink-gray-5">
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 text-right font-semibold">Sale</th>
                  <th className="px-3 py-3 text-right font-semibold">You earn</th>
                  <th className="px-3 py-3 font-semibold">Ship by</th>
                  <th className="px-5 py-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.name}
                    className="cursor-pointer border-b border-outline-gray-1 last:border-0 hover:bg-surface-gray-1"
                    onClick={() => navigate(`/tenant/shop/orders/${row.name}`)}
                  >
                    <td className="px-5 py-3 font-medium text-ink-gray-9">{row.name}</td>
                    <td className="px-3 py-3 text-ink-gray-6">{formatDate(row.creation)}</td>
                    <td className="px-3 py-3 text-right">{formatMoney(Number(row.items_total) + Number(row.vat_total))}</td>
                    <td className="px-3 py-3 text-right font-semibold">{formatMoney(row.seller_net)}</td>
                    <td className="px-3 py-3 text-ink-gray-6">{formatDate(row.sla_due)}</td>
                    <td className="px-5 py-3 text-right">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-5 py-3 text-sm text-ink-gray-5">
            <span>
              {start + 1} - {Math.min(start + PAGE, data.total)} of {data.total}
            </span>
            <div className="flex gap-2">
              <Button label="Previous" variant="subtle" size="sm" disabled={start === 0} onClick={() => setStart(start - PAGE)} />
              <Button label="Next" variant="subtle" size="sm" disabled={start + PAGE >= data.total} onClick={() => setStart(start + PAGE)} />
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default function ShopOrders() {
  return (
    <PortalLayout title="Orders">
      <ShopGate>{() => <OrderList />}</ShopGate>
    </PortalLayout>
  )
}
