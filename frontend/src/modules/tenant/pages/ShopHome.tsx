import { Link } from 'react-router-dom'
import { Button } from '@/design-system'
import { shopApi } from '../api/shop'
import { PortalLayout } from '../components/PortalLayout'
import { Card, ErrorPanel, Loading, PageHeading, StatCard } from '../components/PortalUi'
import { ShopGate } from '../components/ShopGate'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { formatMoney, monthLabel } from '../utils/format'

function Overview({ shopName }: { shopName: string }) {
  const { data, loading, error, reload } = usePortalQuery(() => shopApi.dashboard())
  if (loading && !data) return <Loading />
  if (error) return <ErrorPanel message={error} onRetry={reload} />
  if (!data) return null
  const peak = Math.max(1, ...data.series.map((row) => Number(row.sales)))
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title={shopName}
        subtitle="Your shop at a glance"
        actions={
          <Link to="/tenant/shop/products/new">
            <Button label="Add product" variant="solid" iconLeft="lucide-plus" />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Wallet balance" value={formatMoney(data.wallet.balance)} icon="wallet" tone="gold" emphasis />
        <StatCard label="Available to withdraw" value={formatMoney(data.wallet.available)} icon="banknote" tone="green" />
        <StatCard label="Held until return window ends" value={formatMoney(data.wallet.pending)} icon="clock" tone="violet" />
        <StatCard label="Sales this month" value={formatMoney(data.orders.month_sales)} icon="trending-up" tone="blue" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="New orders" value={data.orders.new_orders} icon="bell" tone="red" onClick={undefined} />
        <StatCard label="To ship" value={data.orders.to_ship} icon="package" tone="gold" />
        <StatCard label="Live products" value={data.listings.live} icon="store" tone="green" />
        <StatCard label="Low stock" value={data.listings.low_stock} icon="triangle-alert" tone="red" />
      </div>
      <Card title="Sales, last 6 months">
        {data.series.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-gray-5">No sales yet</p>
        ) : (
          <div className="flex h-48 items-end gap-3">
            {data.series.map((row) => (
              <div key={row.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-ink-gray-5">{formatMoney(row.sales)}</span>
                <div
                  className="w-full rounded-t-lg bg-[#b8860b]/70"
                  style={{ height: `${Math.max(4, (Number(row.sales) / peak) * 130)}px` }}
                />
                <span className="text-xs font-medium text-ink-gray-6">{monthLabel(row.month)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link to="/tenant/shop/orders">
          <Card className="transition hover:shadow-md" title="Orders">
            <p className="text-sm text-ink-gray-6">Accept, pack and ship what customers bought.</p>
          </Card>
        </Link>
        <Link to="/tenant/shop/products">
          <Card className="transition hover:shadow-md" title="Products">
            <p className="text-sm text-ink-gray-6">Prices, stock and photos for everything you sell.</p>
          </Card>
        </Link>
        <Link to="/tenant/shop/wallet">
          <Card className="transition hover:shadow-md" title="Wallet">
            <p className="text-sm text-ink-gray-6">Withdraw earnings or pay your rent and bills.</p>
          </Card>
        </Link>
      </div>
    </div>
  )
}

export default function ShopHome() {
  return (
    <PortalLayout title="My shop">
      <ShopGate>{(seller) => (seller.status === 'Active' ? <Overview shopName={seller.seller_name} /> : null)}</ShopGate>
    </PortalLayout>
  )
}
