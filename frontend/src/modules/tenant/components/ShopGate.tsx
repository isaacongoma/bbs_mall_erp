import { useState, type ReactNode } from 'react'
import { Button, ErrorMessage, Textarea, TextInput, toast } from '@/design-system'
import { shopApi } from '../api/shop'
import { usePortalQuery } from '../hooks/usePortalQuery'
import type { ShopSeller } from '../types/shop'
import { Card, EmptyState, ErrorPanel, Loading, StatusBadge } from './PortalUi'

function ApplyForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setProblem('')
    if (!name.trim()) return setProblem('Enter the name of your shop.')
    setBusy(true)
    try {
      await shopApi.apply({
        seller_name: name.trim(),
        contact_phone: phone,
        kra_pin: pin,
        tagline,
        description,
      })
      toast.success('Application sent. We will review it shortly.')
      onDone()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Open your shop on BBS Mall">
      <div className="flex max-w-xl flex-col gap-4">
        <p className="text-sm text-ink-gray-6">
          Sell your products to shoppers and businesses. Earnings go to your wallet, and you can withdraw to M-Pesa or
          your bank, or use them to pay your rent and utilities.
        </p>
        <TextInput label="Shop name" value={name} onChange={setName} />
        <TextInput label="Tagline" value={tagline} onChange={setTagline} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Contact phone" value={phone} onChange={setPhone} />
          <TextInput label="KRA PIN" value={pin} onChange={setPin} />
        </div>
        <Textarea label="About your shop" value={description} onChange={setDescription} rows={4} />
        <ErrorMessage message={problem} />
        <div>
          <Button label="Apply to sell" variant="solid" loading={busy} onClick={() => void submit()} />
        </div>
      </div>
    </Card>
  )
}

export function ShopGate({
  children,
  needActive = false,
}: {
  children: (seller: ShopSeller) => ReactNode
  needActive?: boolean
}) {
  const { data, loading, error, reload } = usePortalQuery(() => shopApi.context())

  if (loading && !data) return <Loading />
  if (error) return <ErrorPanel message={error} onRetry={reload} />
  if (!data) return null
  if (!data.seller) {
    if (!data.can_apply) {
      return (
        <Card>
          <EmptyState icon="store" title="Selling is not available" message="Your account is not linked to a tenant." />
        </Card>
      )
    }
    return <ApplyForm onDone={reload} />
  }
  const seller = data.seller
  return (
    <div className="flex flex-col gap-6">
      {seller.status !== 'Active' && (
        <Card>
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink-gray-7">
            <StatusBadge status={seller.status} />
            <span>
              {seller.status === 'Pending Approval'
                ? 'Your shop is waiting for approval. You can prepare listings while you wait.'
                : `Your shop is ${seller.status.toLowerCase()}. Contact the management office.`}
            </span>
          </div>
        </Card>
      )}
      {needActive && seller.status !== 'Active' ? null : children(seller)}
    </div>
  )
}
