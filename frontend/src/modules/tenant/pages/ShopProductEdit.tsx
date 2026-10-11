import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Checkbox, ErrorMessage, Select, Textarea, TextInput, toast } from '@/design-system'
import { shopApi } from '../api/shop'
import { PortalLayout } from '../components/PortalLayout'
import { Card, ErrorPanel, Loading, PageHeading, StatusBadge } from '../components/PortalUi'
import { ShopGate } from '../components/ShopGate'
import { usePortalQuery } from '../hooks/usePortalQuery'
import type { ListingValues, VariantRow } from '../types/shop'

const BLANK: ListingValues = {
  listing_title: '',
  listing_type: 'Both',
  item_group: '',
  price: 0,
  price_includes_vat: 1,
  vat_rate: 16,
  min_order_qty: 1,
  stock_qty: 0,
  low_stock_threshold: 5,
  return_eligible: 1,
  cod_allowed: 1,
  images: [],
  price_tiers: [],
  attributes: [],
  digital_files: [],
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the photo'))
    reader.readAsDataURL(file)
  })
}

function number(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function Editor({ name }: { name: string }) {
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const digitalInput = useRef<HTMLInputElement>(null)
  const attributes = usePortalQuery(() => shopApi.itemAttributes(), [])
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const isNew = name === 'new'
  const categories = usePortalQuery(() => shopApi.categories())
  const loaded = usePortalQuery(() => (isNew ? Promise.resolve(BLANK) : shopApi.listing(name)), [name])
  const [edits, setEdits] = useState<Partial<ListingValues>>({})
  const values: ListingValues = { ...(loaded.data ?? BLANK), ...edits }
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof ListingValues>(key: K, value: ListingValues[K]) =>
    setEdits((current) => ({ ...current, [key]: value }))
  const editable = isNew || ['Draft', 'Rejected', 'Paused', 'Published', 'Approved'].includes(values.status ?? 'Draft')

  async function save(thenSubmit = false) {
    setProblem('')
    if (!values.listing_title.trim()) return setProblem('Enter the product name.')
    if (!values.item_group) return setProblem('Choose a category.')
    if (!(values.price > 0)) return setProblem('Enter a selling price.')
    setBusy(true)
    try {
      const saved = await shopApi.saveListing(values, isNew ? undefined : name)
      if (thenSubmit) await shopApi.submitListing(saved)
      toast.success(thenSubmit ? 'Sent for review' : 'Saved')
      if (isNew) navigate(`/tenant/shop/products/${saved}`, { replace: true })
      else {
        setEdits({})
        loaded.reload()
      }
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files || isNew) return
    setBusy(true)
    try {
      const next = [...values.images]
      for (const file of Array.from(files)) {
        const url = await shopApi.uploadImage(name, file.name, await readFile(file))
        next.push({ image: url, is_primary: next.length === 0 ? 1 : 0, sort_order: next.length })
      }
      await shopApi.saveListing({ ...values, images: next }, name)
      setEdits((current) => ({ ...current, images: next }))
      toast.success('Photos added')
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function makeVariants() {
    const chosen = Object.fromEntries(Object.entries(picked).filter(([, list]) => list.length > 0))
    if (Object.keys(chosen).length === 0) return setProblem('Pick at least one option value.')
    setBusy(true)
    setProblem('')
    try {
      const result = await shopApi.generateVariants(name, chosen)
      toast.success(`${result.created} new variants created`)
      setEdits({})
      loaded.reload()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  async function addDigital(files: FileList | null) {
    if (!files || isNew || files.length === 0) return
    setBusy(true)
    try {
      const file = files[0]
      if (!file) return
      const url = await shopApi.uploadDigital(name, file.name, await readFile(file))
      const next = [...values.digital_files, { title: file.name, file: url }]
      await shopApi.saveListing({ ...values, digital_files: next }, name)
      setEdits((current) => ({ ...current, digital_files: next }))
      toast.success('File added')
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
      if (digitalInput.current) digitalInput.current.value = ''
    }
  }

  if (loaded.loading && !loaded.data) return <Loading />
  if (loaded.error) return <ErrorPanel message={loaded.error} onRetry={loaded.reload} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title={isNew ? 'New product' : values.listing_title}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <Link to="/tenant/shop/products" className="text-ink-gray-6 underline">
              Products
            </Link>
            {values.status && <StatusBadge status={values.status} />}
          </span>
        }
        actions={
          editable ? (
            <>
              <Button label="Save" variant="subtle" loading={busy} onClick={() => void save()} />
              {(isNew || values.status === 'Draft' || values.status === 'Rejected') && (
                <Button label="Save and submit" variant="solid" loading={busy} onClick={() => void save(true)} />
              )}
            </>
          ) : undefined
        }
      />
      {values.status === 'Rejected' && values.moderation_notes && (
        <ErrorMessage message={`Not approved: ${values.moderation_notes}`} />
      )}
      <ErrorMessage message={problem} />
      <Card title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextInput label="Product name" value={values.listing_title} onChange={(value) => set('listing_title', value)} />
          </div>
          <Select
            label="Category"
            value={values.item_group}
            onChange={(value) => set('item_group', String(value ?? ''))}
            options={(categories.data ?? []).map((value) => ({ label: value, value }))}
          />
          <TextInput label="Brand" value={values.brand ?? ''} onChange={(value) => set('brand', value)} />
          <Select
            label="Sell to"
            value={values.listing_type}
            onChange={(value) => set('listing_type', String(value ?? 'Both'))}
            options={[
              { label: 'Shoppers and businesses', value: 'Both' },
              { label: 'Shoppers only', value: 'B2C' },
              { label: 'Businesses only', value: 'B2B' },
            ]}
          />
          <TextInput
            label="Search keywords"
            value={values.search_keywords ?? ''}
            onChange={(value) => set('search_keywords', value)}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Short description"
              value={values.short_description ?? ''}
              onChange={(value) => set('short_description', value)}
              rows={2}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Full description"
              value={values.description ?? ''}
              onChange={(value) => set('description', value)}
              rows={5}
            />
          </div>
        </div>
      </Card>
      <Card title="Photos">
        {isNew ? (
          <p className="text-sm text-ink-gray-5">Save the product first, then add photos.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {values.images.map((image, index) => (
              <div key={`${image.image}-${index}`} className="relative">
                <img src={image.image} alt="" className="size-24 rounded-xl border border-outline-gray-2 object-cover" />
                {image.is_primary ? (
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white">Main</span>
                ) : null}
                {editable && (
                  <button
                    type="button"
                    className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-surface-base text-xs shadow"
                    onClick={() => set('images', values.images.filter((_, position) => position !== index))}
                  >
                    x
                  </button>
                )}
              </div>
            ))}
            {editable && (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  hidden
                  onChange={(event) => void addPhotos(event.target.files)}
                />
                <Button label="Add photos" variant="subtle" iconLeft="lucide-image-plus" onClick={() => fileInput.current?.click()} />
              </>
            )}
          </div>
        )}
      </Card>
      <Card title="Price and stock">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Selling price (KSh)" type="number" value={String(values.price)} onChange={(value) => set('price', number(value))} />
          <TextInput
            label="Was price (optional)"
            type="number"
            value={String(values.compare_at_price ?? '')}
            onChange={(value) => set('compare_at_price', number(value))}
          />
          <TextInput label="VAT %" type="number" value={String(values.vat_rate)} onChange={(value) => set('vat_rate', number(value))} />
          <Checkbox
            label="Price includes VAT"
            value={Boolean(values.price_includes_vat)}
            onChange={(value) => set('price_includes_vat', value ? 1 : 0)}
          />
          <TextInput
            label="Quantity in stock"
            type="number"
            value={String(values.stock_qty)}
            onChange={(value) => set('stock_qty', number(value))}
          />
          <TextInput
            label="Low stock alert at"
            type="number"
            value={String(values.low_stock_threshold ?? '')}
            onChange={(value) => set('low_stock_threshold', number(value))}
          />
          <TextInput
            label="Minimum order quantity"
            type="number"
            value={String(values.min_order_qty)}
            onChange={(value) => set('min_order_qty', number(value))}
          />
          <TextInput
            label="Maximum order quantity"
            type="number"
            value={String(values.max_order_qty ?? '')}
            onChange={(value) => set('max_order_qty', number(value))}
          />
          <TextInput
            label="Handling days"
            type="number"
            value={String(values.lead_time_days ?? '')}
            onChange={(value) => set('lead_time_days', number(value))}
          />
        </div>
      </Card>
      <Card
        title="Bulk prices for business buyers"
        action={
          editable ? (
            <Button
              label="Add tier"
              variant="subtle"
              size="sm"
              onClick={() => set('price_tiers', [...values.price_tiers, { min_qty: 10, price: 0, buyer_type: 'B2B' }])}
            />
          ) : undefined
        }
      >
        {values.price_tiers.length === 0 ? (
          <p className="text-sm text-ink-gray-5">Offer a lower price when businesses buy in volume.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {values.price_tiers.map((tier, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3">
                <Select
                  label="Buyer"
                  value={tier.buyer_type}
                  onChange={(value) =>
                    set(
                      'price_tiers',
                      values.price_tiers.map((row, position) =>
                        position === index ? { ...row, buyer_type: String(value) as 'B2B' | 'B2C' } : row,
                      ),
                    )
                  }
                  options={[
                    { label: 'Business', value: 'B2B' },
                    { label: 'Shopper', value: 'B2C' },
                  ]}
                />
                <TextInput
                  label="From quantity"
                  type="number"
                  value={String(tier.min_qty)}
                  onChange={(value) =>
                    set(
                      'price_tiers',
                      values.price_tiers.map((row, position) => (position === index ? { ...row, min_qty: number(value) } : row)),
                    )
                  }
                />
                <TextInput
                  label="Unit price"
                  type="number"
                  value={String(tier.price)}
                  onChange={(value) =>
                    set(
                      'price_tiers',
                      values.price_tiers.map((row, position) => (position === index ? { ...row, price: number(value) } : row)),
                    )
                  }
                />
                <Button
                  label="Remove"
                  variant="subtle"
                  size="sm"
                  onClick={() => set('price_tiers', values.price_tiers.filter((_, position) => position !== index))}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
      {!isNew && (
        <Card title="Variants (colour, size and more)">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-gray-5">
              Choose the options buyers pick between. A variant is created for every combination, each with its own
              stock and optional price.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(attributes.data ?? []).map((attr) => (
                <div key={attr.attribute} className="rounded-xl border border-outline-gray-2 p-3">
                  <p className="mb-2 text-sm font-medium text-ink-gray-8">{attr.attribute}</p>
                  <div className="flex flex-wrap gap-2">
                    {attr.values.map((value) => {
                      const on = (picked[attr.attribute] ?? []).includes(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setPicked((current) => {
                              const list = current[attr.attribute] ?? []
                              return { ...current, [attr.attribute]: on ? list.filter((v) => v !== value) : [...list, value] }
                            })
                          }
                          className={`rounded-lg border px-3 py-1 text-sm ${on ? 'border-[#b8860b] bg-[#b8860b]/10 text-ink-gray-9' : 'border-outline-gray-2 text-ink-gray-6'}`}
                        >
                          {value}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <Button label="Create variants" variant="solid" loading={busy} onClick={() => void makeVariants()} />
            </div>
            {(values.variants ?? []).length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-outline-gray-2 text-left text-xs uppercase tracking-wide text-ink-gray-5">
                      <th className="py-2 pr-3 font-semibold">Option</th>
                      <th className="px-2 py-2 font-semibold">SKU</th>
                      <th className="px-2 py-2 font-semibold">Price (optional)</th>
                      <th className="px-2 py-2 font-semibold">Stock</th>
                      <th className="px-2 py-2 font-semibold">On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(values.variants ?? []).map((row, index) => {
                      const update = (patch: Partial<VariantRow>) =>
                        set('variants', (values.variants ?? []).map((item, position) => (position === index ? { ...item, ...patch } : item)))
                      return (
                        <tr key={row.item_code} className="border-b border-outline-gray-1 last:border-0">
                          <td className="py-2 pr-3 font-medium text-ink-gray-9">{row.options}</td>
                          <td className="px-2 py-2">
                            <TextInput value={row.sku ?? ''} onChange={(value) => update({ sku: value })} />
                          </td>
                          <td className="px-2 py-2">
                            <TextInput type="number" value={String(row.price ?? '')} onChange={(value) => update({ price: value === '' ? null : number(value) })} />
                          </td>
                          <td className="px-2 py-2">
                            <TextInput type="number" value={String(row.stock_qty)} onChange={(value) => update({ stock_qty: number(value) })} />
                          </td>
                          <td className="px-2 py-2">
                            <Checkbox value={Boolean(row.enabled)} onChange={(value) => update({ enabled: value ? 1 : 0 })} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}
      <Card title="Digital product">
        <div className="flex flex-col gap-4">
          <Checkbox
            label="This is a digital product (nothing is shipped, buyers download the files after paying)"
            value={Boolean(values.is_digital)}
            onChange={(value) => set('is_digital', value ? 1 : 0)}
          />
          {values.is_digital ? (
            <>
              <TextInput
                label="Downloads allowed per purchase"
                type="number"
                value={String(values.download_limit ?? 5)}
                onChange={(value) => set('download_limit', number(value))}
              />
              {isNew ? (
                <p className="text-sm text-ink-gray-5">Save the product first, then add the files.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {values.digital_files.map((row, index) => (
                    <div key={`${row.file}-${index}`} className="flex items-center justify-between rounded-xl border border-outline-gray-2 px-4 py-2 text-sm">
                      <span>{row.title}</span>
                      <Button
                        label="Remove"
                        variant="subtle"
                        size="sm"
                        onClick={() => set('digital_files', values.digital_files.filter((_, position) => position !== index))}
                      />
                    </div>
                  ))}
                  <input ref={digitalInput} type="file" hidden onChange={(event) => void addDigital(event.target.files)} />
                  <div>
                    <Button label="Add file" variant="subtle" iconLeft="lucide-paperclip" onClick={() => digitalInput.current?.click()} />
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </Card>
      <Card title="Delivery and returns">
        <div className="grid gap-4 sm:grid-cols-4">
          <TextInput label="Weight (kg)" type="number" value={String(values.weight_kg ?? '')} onChange={(value) => set('weight_kg', number(value))} />
          <TextInput label="Length (cm)" type="number" value={String(values.length_cm ?? '')} onChange={(value) => set('length_cm', number(value))} />
          <TextInput label="Width (cm)" type="number" value={String(values.width_cm ?? '')} onChange={(value) => set('width_cm', number(value))} />
          <TextInput label="Height (cm)" type="number" value={String(values.height_cm ?? '')} onChange={(value) => set('height_cm', number(value))} />
          <Checkbox label="Fragile" value={Boolean(values.is_fragile)} onChange={(value) => set('is_fragile', value ? 1 : 0)} />
          <Checkbox label="Pay on delivery" value={Boolean(values.cod_allowed)} onChange={(value) => set('cod_allowed', value ? 1 : 0)} />
          <Checkbox label="Accept returns" value={Boolean(values.return_eligible)} onChange={(value) => set('return_eligible', value ? 1 : 0)} />
          <TextInput label="Warranty" value={values.warranty ?? ''} onChange={(value) => set('warranty', value)} />
        </div>
      </Card>
      <Card
        title="Specifications"
        action={
          editable ? (
            <Button
              label="Add"
              variant="subtle"
              size="sm"
              onClick={() => set('attributes', [...values.attributes, { attribute: '', value: '', filterable: 0 }])}
            />
          ) : undefined
        }
      >
        {values.attributes.length === 0 ? (
          <p className="text-sm text-ink-gray-5">Size, colour, material and other details shoppers filter by.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {values.attributes.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                <TextInput
                  label="Name"
                  value={row.attribute}
                  onChange={(value) =>
                    set('attributes', values.attributes.map((item, position) => (position === index ? { ...item, attribute: value } : item)))
                  }
                />
                <TextInput
                  label="Value"
                  value={row.value}
                  onChange={(value) =>
                    set('attributes', values.attributes.map((item, position) => (position === index ? { ...item, value } : item)))
                  }
                />
                <Button
                  label="Remove"
                  variant="subtle"
                  size="sm"
                  onClick={() => set('attributes', values.attributes.filter((_, position) => position !== index))}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default function ShopProductEdit() {
  const { name = 'new' } = useParams()
  return (
    <PortalLayout title="Product">
      <ShopGate>{() => <Editor key={name} name={name} />}</ShopGate>
    </PortalLayout>
  )
}
