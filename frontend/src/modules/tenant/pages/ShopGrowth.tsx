import { useState } from 'react'
import { Button, Dialog, ErrorMessage, Select, toast } from '@/design-system'
import { shopApi } from '../api/shop'
import { PortalLayout } from '../components/PortalLayout'
import { Card, EmptyState, ErrorPanel, Loading, PageHeading, StatusBadge } from '../components/PortalUi'
import { ShopGate } from '../components/ShopGate'
import { usePortalQuery } from '../hooks/usePortalQuery'
import type { AdPackage } from '../types/shop'
import { formatDate, formatMoney } from '../utils/format'

function Plans() {
  const { data, loading, error, reload } = usePortalQuery(() => shopApi.plans())
  const [busy, setBusy] = useState('')

  async function subscribe(plan: string, period: string) {
    setBusy(plan + period)
    try {
      const result = await shopApi.subscribe(plan, period)
      toast.success(`Plan active until ${formatDate(result.ends)}`)
      reload()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy('')
    }
  }

  if (loading && !data) return <Loading />
  if (error) return <ErrorPanel message={error} onRetry={reload} />
  if (!data) return null
  return (
    <Card title="Plans" action={<span className="text-sm text-ink-gray-5">Wallet available: {formatMoney(data.available)}</span>}>
      <div className="grid gap-4 md:grid-cols-3">
        {data.plans.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col gap-3 rounded-2xl border p-5 ${data.current === plan.name ? 'border-[#b8860b] bg-[#b8860b]/5' : 'border-outline-gray-2'}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink-gray-9">{plan.plan_name}</h3>
              {data.current === plan.name && <StatusBadge status="Active" label="Current" />}
            </div>
            <p className="text-2xl font-semibold">
              {Number(plan.monthly_fee) ? formatMoney(plan.monthly_fee) : 'Free'}
              {Number(plan.monthly_fee) ? <span className="text-sm font-normal text-ink-gray-5"> / month + VAT</span> : null}
            </p>
            <ul className="flex flex-col gap-1 text-sm text-ink-gray-6">
              <li>{plan.listing_limit ? `Up to ${plan.listing_limit} listings` : 'Unlimited listings'}</li>
              {Number(plan.commission_rate) ? <li>{plan.commission_rate}% commission</li> : null}
              {plan.featured_slots ? <li>{plan.featured_slots} sponsored listings included</li> : null}
              {plan.description && <li>{plan.description}</li>}
            </ul>
            {data.current !== plan.name && !plan.is_default && (
              <div className="mt-auto flex gap-2">
                <Button label="Monthly" variant="solid" loading={busy === plan.name + 'Monthly'} onClick={() => void subscribe(plan.name, 'Monthly')} />
                {Number(plan.annual_fee) > 0 && (
                  <Button label={`Annual ${formatMoney(plan.annual_fee)}`} variant="subtle" loading={busy === plan.name + 'Annual'} onClick={() => void subscribe(plan.name, 'Annual')} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-gray-5">
        You are using {data.listings_used} listings. Plan fees are paid from your wallet.
        {data.expires_on ? ` Current plan renews on ${formatDate(data.expires_on)}.` : ''}
      </p>
    </Card>
  )
}

function BuyAd({ pkg, onClose, onDone }: { pkg: AdPackage | null; onClose: () => void; onDone: () => void }) {
  const listings = usePortalQuery(() => shopApi.listings('Published', '', 0, 100), [pkg?.name])
  const [picked, setPicked] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  async function buy() {
    if (!pkg || !picked) return setProblem('Choose a product to promote.')
    setBusy(true)
    setProblem('')
    try {
      await shopApi.buyAd(pkg.name, [picked])
      toast.success('Your ad is live')
      setPicked('')
      onClose()
      onDone()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={pkg !== null} onOpenChange={(open) => !open && onClose()} title={pkg ? `Promote with ${pkg.package_name}` : ''} size="sm">
      {pkg && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-gray-6">
            {formatMoney(pkg.price)} + VAT for {pkg.duration_days} days. Paid from your wallet.
          </p>
          <Select
            label="Product"
            value={picked}
            onChange={(value) => setPicked(String(value ?? ''))}
            options={(listings.data?.rows ?? []).map((row) => ({ label: row.listing_title, value: row.name }))}
          />
          <ErrorMessage message={problem} />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="subtle" onClick={onClose} />
            <Button label="Pay and start" variant="solid" loading={busy} onClick={() => void buy()} />
          </div>
        </div>
      )}
    </Dialog>
  )
}

function Ads() {
  const packages = usePortalQuery(() => shopApi.adPackages())
  const ads = usePortalQuery(() => shopApi.ads())
  const [chosen, setChosen] = useState<AdPackage | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <Card title="Promote your products">
        {(packages.data ?? []).length === 0 ? (
          <EmptyState icon="megaphone" title="No ad packages yet" message="Packages will appear here when the marketplace offers them." />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {(packages.data ?? []).map((pkg) => (
              <div key={pkg.name} className="flex flex-col gap-2 rounded-2xl border border-outline-gray-2 p-5">
                <h3 className="text-base font-semibold text-ink-gray-9">{pkg.package_name}</h3>
                <p className="text-sm text-ink-gray-5">{pkg.placement}</p>
                <p className="text-xl font-semibold">{formatMoney(pkg.price)}</p>
                <p className="text-xs text-ink-gray-5">
                  {pkg.duration_days} days, up to {pkg.max_listings} product(s)
                </p>
                <Button label="Buy" variant="solid" onClick={() => setChosen(pkg)} />
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Your ads" bodyClassName="p-0 sm:p-0">
        {(ads.data ?? []).length === 0 ? (
          <EmptyState icon="megaphone" title="No ads yet" message="Sponsored products appear first in search results." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-outline-gray-2 text-left text-xs uppercase tracking-wide text-ink-gray-5">
                  <th className="px-5 py-3 font-semibold">Package</th>
                  <th className="px-3 py-3 font-semibold">Products</th>
                  <th className="px-3 py-3 font-semibold">Runs</th>
                  <th className="px-3 py-3 text-right font-semibold">Paid</th>
                  <th className="px-5 py-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(ads.data ?? []).map((ad) => (
                  <tr key={ad.name} className="border-b border-outline-gray-1 last:border-0">
                    <td className="px-5 py-3 font-medium text-ink-gray-9">{ad.package}</td>
                    <td className="px-3 py-3 text-ink-gray-6">{ad.listings.join(', ')}</td>
                    <td className="px-3 py-3 text-ink-gray-6">
                      {formatDate(ad.start_date)} - {formatDate(ad.end_date)}
                    </td>
                    <td className="px-3 py-3 text-right">{formatMoney(ad.total)}</td>
                    <td className="px-5 py-3 text-right">
                      <StatusBadge status={ad.status === 'Active' ? 'Approved' : ad.status} label={ad.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <BuyAd pkg={chosen} onClose={() => setChosen(null)} onDone={ads.reload} />
    </div>
  )
}

export default function ShopGrowth() {
  return (
    <PortalLayout title="Plans and ads">
      <ShopGate needActive>
        {() => (
          <div className="flex flex-col gap-6">
            <PageHeading title="Plans and ads" subtitle="Grow your shop" />
            <Plans />
            <Ads />
          </div>
        )}
      </ShopGate>
    </PortalLayout>
  )
}
