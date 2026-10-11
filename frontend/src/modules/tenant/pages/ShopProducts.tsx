import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Select, TextInput, toast } from '@/design-system'
import { shopApi } from '../api/shop'
import { PortalLayout } from '../components/PortalLayout'
import { Card, EmptyState, ErrorPanel, Loading, PageHeading, StatusBadge } from '../components/PortalUi'
import { ShopGate } from '../components/ShopGate'
import { usePortalQuery } from '../hooks/usePortalQuery'
import type { ListingRow } from '../types/shop'
import { formatMoney, formatNumber } from '../utils/format'

const STATUSES = ['', 'Draft', 'Pending Approval', 'Approved', 'Published', 'Paused', 'Rejected', 'Archived']
const PAGE = 20

function Catalogue() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [start, setStart] = useState(0)
  const { data, loading, error, reload } = usePortalQuery(
    () => shopApi.listings(status, search, start, PAGE),
    [status, search, start],
  )

  async function run(action: () => Promise<unknown>, done: string) {
    try {
      await action()
      toast.success(done)
      reload()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : String(caught))
    }
  }

  function actions(row: ListingRow) {
    const items: { label: string; run: () => void }[] = []
    if (row.status === 'Draft' || row.status === 'Rejected') {
      items.push({ label: 'Submit', run: () => void run(() => shopApi.submitListing(row.name), 'Sent for review') })
    }
    if (row.status === 'Published') {
      items.push({ label: 'Pause', run: () => void run(() => shopApi.pauseListing(row.name), 'Paused') })
    }
    if (row.status === 'Paused' || row.status === 'Approved') {
      items.push({ label: 'Publish', run: () => void run(() => shopApi.resumeListing(row.name), 'Published') })
    }
    return items
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Products"
        subtitle="Everything you sell on BBS Mall"
        actions={
          <Link to="/tenant/shop/products/new">
            <Button label="Add product" variant="solid" iconLeft="lucide-plus" />
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <TextInput
          placeholder="Search by name or code"
          value={search}
          onChange={(value) => {
            setStart(0)
            setSearch(value)
          }}
        />
        <Select
          value={status}
          onChange={(value) => {
            setStart(0)
            setStatus(String(value ?? ''))
          }}
          options={STATUSES.map((value) => ({ label: value || 'All statuses', value }))}
        />
      </div>
      {loading && !data && <Loading />}
      {error && <ErrorPanel message={error} onRetry={reload} />}
      {data && data.rows.length === 0 && (
        <Card>
          <EmptyState
            icon="package"
            title="No products yet"
            message="Add your first product, upload photos and send it for review."
          />
        </Card>
      )}
      {data && data.rows.length > 0 && (
        <Card bodyClassName="p-0 sm:p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-outline-gray-2 text-left text-xs uppercase tracking-wide text-ink-gray-5">
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 text-right font-semibold">Price</th>
                  <th className="px-3 py-3 text-right font-semibold">Available</th>
                  <th className="px-3 py-3 text-right font-semibold">Sold</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.name}
                    className="cursor-pointer border-b border-outline-gray-1 last:border-0 hover:bg-surface-gray-1"
                    onClick={() => navigate(`/tenant/shop/products/${row.name}`)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {row.primary_image ? (
                          <img src={row.primary_image} alt="" className="size-10 rounded-lg object-cover" />
                        ) : (
                          <span className="size-10 rounded-lg bg-surface-gray-2" />
                        )}
                        <div>
                          <p className="font-medium text-ink-gray-9">{row.listing_title}</p>
                          <p className="text-xs text-ink-gray-5">{row.name}</p>
                          {row.status === 'Rejected' && row.moderation_notes && (
                            <p className="text-xs text-[#b91c1c]">{row.moderation_notes}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">{formatMoney(row.price)}</td>
                    <td className="px-3 py-3 text-right">{formatNumber(row.available_qty)}</td>
                    <td className="px-3 py-3 text-right">{formatNumber(row.sold_count)}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        {actions(row).map((item) => (
                          <Button key={item.label} label={item.label} variant="subtle" size="sm" onClick={item.run} />
                        ))}
                      </div>
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
              <Button
                label="Next"
                variant="subtle"
                size="sm"
                disabled={start + PAGE >= data.total}
                onClick={() => setStart(start + PAGE)}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default function ShopProducts() {
  return (
    <PortalLayout title="Products">
      <ShopGate>{() => <Catalogue />}</ShopGate>
    </PortalLayout>
  )
}
