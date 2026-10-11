import { useState } from 'react'
import { Button, Checkbox, Dialog, ErrorMessage, Select, TextInput, toast } from '@/design-system'
import { shopApi } from '../api/shop'
import { PortalLayout } from '../components/PortalLayout'
import { Card, EmptyState, ErrorPanel, Loading, PageHeading, Segmented, StatCard, StatusBadge } from '../components/PortalUi'
import { ShopGate } from '../components/ShopGate'
import { usePortalQuery } from '../hooks/usePortalQuery'
import type { OpenBill, PayoutAccount } from '../types/shop'
import { formatDate, formatDateTime, formatMoney } from '../utils/format'

type Tab = 'ledger' | 'withdrawals' | 'accounts'

function WithdrawDialog({
  open,
  onClose,
  accounts,
  available,
  minimum,
  onDone,
}: {
  open: boolean
  onClose: () => void
  accounts: PayoutAccount[]
  available: number
  minimum: number
  onDone: () => void
}) {
  const usable = accounts.filter((row) => row.verified)
  const [amount, setAmount] = useState('')
  const [account, setAccount] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const chosen = account || usable.find((row) => row.is_default)?.name || usable[0]?.name || ''

  async function submit() {
    setProblem('')
    const value = Number(amount)
    if (!(value > 0)) return setProblem('Enter the amount to withdraw.')
    if (value < minimum) return setProblem(`The minimum withdrawal is ${formatMoney(minimum)}.`)
    if (value > available) return setProblem('That is more than your available balance.')
    setBusy(true)
    try {
      const result = await shopApi.requestWithdrawal(value, chosen)
      toast.success(`Withdrawal requested. You will receive ${formatMoney(result.net_amount)}.`)
      setAmount('')
      onClose()
      onDone()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} title="Withdraw earnings" size="sm">
      <div className="flex flex-col gap-4">
        {usable.length === 0 ? (
          <p className="text-sm text-ink-gray-6">
            You have no verified payout account yet. Add one under Payout accounts, then the management office will
            verify it.
          </p>
        ) : (
          <>
            <p className="text-sm text-ink-gray-6">Available: {formatMoney(available)}</p>
            <TextInput label="Amount (KSh)" type="number" value={amount} onChange={setAmount} inputMode="decimal" />
            <Select
              label="Send to"
              value={chosen}
              onChange={(value) => setAccount(String(value ?? ''))}
              options={usable.map((row) => ({
                label: `${row.method} - ${row.mpesa_number || row.bank_account || row.account_label || row.name}`,
                value: row.name,
              }))}
            />
            <ErrorMessage message={problem} />
            <div className="flex justify-end gap-2">
              <Button label="Cancel" variant="subtle" onClick={onClose} />
              <Button label="Request withdrawal" variant="solid" loading={busy} onClick={() => void submit()} />
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}

function BillsDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { data, loading, error, reload } = usePortalQuery(() => (open ? shopApi.openBills() : Promise.resolve(null)), [open])
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  const bills: OpenBill[] = data?.invoices ?? []
  const chosen = bills.filter((bill) => picked[bill.name])
  const total = chosen.reduce((sum, bill) => sum + Number(bill.outstanding_amount), 0)
  const available = Number(data?.available ?? 0)

  async function pay() {
    setProblem('')
    if (chosen.length === 0) return setProblem('Choose the bills to pay.')
    if (total > available) return setProblem('Your available balance does not cover the chosen bills.')
    setBusy(true)
    try {
      await shopApi.payBills(chosen.map((bill) => ({ sales_invoice: bill.name, amount: Number(bill.outstanding_amount) })))
      toast.success(`Paid ${formatMoney(total)} from your wallet`)
      setPicked({})
      onClose()
      onDone()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} title="Pay rent and bills from wallet" size="lg">
      <div className="flex flex-col gap-4">
        {loading && !data && <Loading />}
        {error && <ErrorPanel message={error} onRetry={reload} />}
        {data && bills.length === 0 && (
          <EmptyState icon="circle-check" title="Nothing to pay" message="You have no outstanding bills." />
        )}
        {bills.length > 0 && (
          <div className="flex flex-col divide-y divide-outline-gray-1 rounded-xl border border-outline-gray-2">
            {bills.map((bill) => (
              <label key={bill.name} className="flex cursor-pointer items-center gap-3 px-4 py-3">
                <Checkbox
                  value={Boolean(picked[bill.name])}
                  onChange={(value) => setPicked((current) => ({ ...current, [bill.name]: value }))}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-gray-9">
                    {bill.bill_type} - {bill.name}
                  </p>
                  <p className="truncate text-xs text-ink-gray-5">
                    Due {formatDate(bill.due_date)} {bill.description ? `- ${bill.description}` : ''}
                  </p>
                </div>
                <span className="font-semibold">{formatMoney(bill.outstanding_amount)}</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-gray-6">Wallet available: {formatMoney(available)}</span>
          <span className="font-semibold text-ink-gray-9">Paying: {formatMoney(total)}</span>
        </div>
        <ErrorMessage message={problem} />
        <div className="flex justify-end gap-2">
          <Button label="Cancel" variant="subtle" onClick={onClose} />
          <Button label="Pay from wallet" variant="solid" loading={busy} disabled={chosen.length === 0} onClick={() => void pay()} />
        </div>
      </div>
    </Dialog>
  )
}

function AccountForm({ onSaved }: { onSaved: () => void }) {
  const [method, setMethod] = useState('M-Pesa')
  const [number, setNumber] = useState('')
  const [bank, setBank] = useState('')
  const [holder, setHolder] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setProblem('')
    setBusy(true)
    try {
      await shopApi.addPayoutAccount({
        method,
        mpesa_number: method === 'M-Pesa' ? number : undefined,
        bank_account: method === 'Bank Transfer' ? bank : undefined,
        account_holder: holder,
      })
      toast.success('Account added. It will be verified by the management office.')
      setNumber('')
      setBank('')
      onSaved()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Select
        label="Type"
        value={method}
        onChange={(value) => setMethod(String(value ?? 'M-Pesa'))}
        options={[
          { label: 'M-Pesa', value: 'M-Pesa' },
          { label: 'Bank transfer', value: 'Bank Transfer' },
        ]}
      />
      {method === 'M-Pesa' ? (
        <TextInput label="M-Pesa number" value={number} onChange={setNumber} placeholder="07XX XXX XXX" />
      ) : (
        <TextInput label="Bank account" value={bank} onChange={setBank} />
      )}
      <TextInput label="Account holder" value={holder} onChange={setHolder} />
      <div className="flex items-end">
        <Button label="Add account" variant="solid" loading={busy} onClick={() => void save()} />
      </div>
      <div className="sm:col-span-4">
        <ErrorMessage message={problem} />
      </div>
    </div>
  )
}

function Wallet() {
  const wallet = usePortalQuery(() => shopApi.wallet())
  const withdrawals = usePortalQuery(() => shopApi.withdrawals())
  const accounts = usePortalQuery(() => shopApi.payoutAccounts())
  const [tab, setTab] = useState<Tab>('ledger')
  const [withdrawing, setWithdrawing] = useState(false)
  const [billing, setBilling] = useState(false)

  const refresh = () => {
    wallet.reload()
    withdrawals.reload()
    accounts.reload()
  }

  if (wallet.loading && !wallet.data) return <Loading />
  if (wallet.error) return <ErrorPanel message={wallet.error} onRetry={wallet.reload} />
  if (!wallet.data) return null
  const { balances } = wallet.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Wallet"
        subtitle="Your earnings from BBS Mall"
        actions={
          <>
            <Button label="Pay rent and bills" variant="subtle" iconLeft="lucide-receipt" onClick={() => setBilling(true)} />
            <Button label="Withdraw" variant="solid" iconLeft="lucide-banknote" onClick={() => setWithdrawing(true)} />
          </>
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Wallet balance" value={formatMoney(balances.balance)} icon="wallet" emphasis />
        <StatCard label="Available now" value={formatMoney(balances.available)} icon="banknote" tone="green" />
        <StatCard
          label="Held until return window ends"
          value={formatMoney(balances.pending)}
          icon="clock"
          tone="violet"
        />
      </div>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'ledger', label: 'Transactions' },
          { value: 'withdrawals', label: 'Withdrawals' },
          { value: 'accounts', label: 'Payout accounts' },
        ]}
      />
      {tab === 'ledger' && (
        <Card bodyClassName="p-0 sm:p-0">
          {wallet.data.rows.length === 0 ? (
            <EmptyState icon="wallet" title="No transactions yet" message="Sales, withdrawals and bill payments show here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-outline-gray-2 text-left text-xs uppercase tracking-wide text-ink-gray-5">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-3 py-3 font-semibold">Type</th>
                    <th className="px-3 py-3 font-semibold">Details</th>
                    <th className="px-3 py-3 text-right font-semibold">Amount</th>
                    <th className="px-5 py-3 text-right font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.data.rows.map((row) => (
                    <tr key={row.name} className="border-b border-outline-gray-1 last:border-0">
                      <td className="px-5 py-3 text-ink-gray-6">{formatDateTime(row.posting_date)}</td>
                      <td className="px-3 py-3 font-medium text-ink-gray-9">
                        {row.transaction_type}
                        {row.status === 'Held' && (
                          <span className="ml-2 text-xs text-ink-gray-5">held until {formatDate(row.available_on)}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-ink-gray-6">{row.remarks || row.reference_name || ''}</td>
                      <td className={`px-3 py-3 text-right font-semibold ${Number(row.amount) < 0 ? 'text-[#b91c1c]' : 'text-[#15803d]'}`}>
                        {formatMoney(row.amount)}
                      </td>
                      <td className="px-5 py-3 text-right">{formatMoney(row.balance_after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {tab === 'withdrawals' && (
        <Card bodyClassName="p-0 sm:p-0">
          {(withdrawals.data ?? []).length === 0 ? (
            <EmptyState icon="banknote" title="No withdrawals yet" message="Withdraw your available balance to M-Pesa or your bank." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-outline-gray-2 text-left text-xs uppercase tracking-wide text-ink-gray-5">
                    <th className="px-5 py-3 font-semibold">Requested</th>
                    <th className="px-3 py-3 font-semibold">To</th>
                    <th className="px-3 py-3 text-right font-semibold">Amount</th>
                    <th className="px-3 py-3 text-right font-semibold">Fee</th>
                    <th className="px-3 py-3 text-right font-semibold">You get</th>
                    <th className="px-5 py-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(withdrawals.data ?? []).map((row) => (
                    <tr key={row.name} className="border-b border-outline-gray-1 last:border-0">
                      <td className="px-5 py-3 text-ink-gray-6">{formatDateTime(row.requested_on)}</td>
                      <td className="px-3 py-3">
                        {row.method} {row.mpesa_number ?? ''}
                        {row.receipt_no && <p className="text-xs text-ink-gray-5">Receipt {row.receipt_no}</p>}
                        {row.failure_reason && <p className="text-xs text-[#b91c1c]">{row.failure_reason}</p>}
                      </td>
                      <td className="px-3 py-3 text-right">{formatMoney(row.amount)}</td>
                      <td className="px-3 py-3 text-right text-ink-gray-6">{formatMoney(row.fee)}</td>
                      <td className="px-3 py-3 text-right font-semibold">{formatMoney(row.net_amount)}</td>
                      <td className="px-5 py-3 text-right">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {tab === 'accounts' && (
        <Card title="Where your money is sent">
          <div className="flex flex-col gap-5">
            {(accounts.data ?? []).map((row) => (
              <div key={row.name} className="flex items-center justify-between gap-3 border-b border-outline-gray-1 pb-3 last:border-0">
                <div>
                  <p className="font-medium text-ink-gray-9">
                    {row.method} - {row.mpesa_number || row.bank_account}
                  </p>
                  <p className="text-xs text-ink-gray-5">{row.account_holder}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={row.verified ? 'Approved' : 'Pending'} label={row.verified ? 'Verified' : 'Awaiting verification'} />
                  <Button
                    label="Remove"
                    variant="subtle"
                    size="sm"
                    onClick={() =>
                      void shopApi
                        .removePayoutAccount(row.name)
                        .then(() => accounts.reload())
                        .catch((caught: unknown) => toast.error(caught instanceof Error ? caught.message : String(caught)))
                    }
                  />
                </div>
              </div>
            ))}
            <AccountForm onSaved={accounts.reload} />
          </div>
        </Card>
      )}
      <WithdrawDialog
        open={withdrawing}
        onClose={() => setWithdrawing(false)}
        accounts={accounts.data ?? []}
        available={balances.available}
        minimum={wallet.data.min_withdrawal}
        onDone={refresh}
      />
      <BillsDialog open={billing} onClose={() => setBilling(false)} onDone={refresh} />
    </div>
  )
}

export default function ShopWallet() {
  return (
    <PortalLayout title="Wallet">
      <ShopGate>{() => <Wallet />}</ShopGate>
    </PortalLayout>
  )
}
