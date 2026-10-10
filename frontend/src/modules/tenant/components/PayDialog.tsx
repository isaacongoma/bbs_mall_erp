import { useEffect, useRef, useState } from 'react'
import { Button, Dialog, ErrorMessage, LucideIcon, TextInput } from '@/design-system'
import { portalApi } from '../api/portal'
import { usePortalStore } from '../stores/portalStore'
import { formatMoney } from '../utils/format'

interface PayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  invoice?: string
  onPaid: () => void
}

type Phase = 'form' | 'waiting' | 'success' | 'failed'

export function PayDialog({ open, onOpenChange, amount, invoice, onPaid }: PayDialogProps) {
  const customer = usePortalStore((state) => state.customer)
  const settings = usePortalStore((state) => state.context?.settings)
  const profilePhone = usePortalStore((state) => state.context?.user.mobile_no)
  const [phone, setPhone] = useState('')
  const [value, setValue] = useState(String(Math.round(amount)))
  const [phase, setPhase] = useState<Phase>('form')
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState('')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!open) return undefined
    const reset = window.setTimeout(() => {
      setPhase('form')
      setError('')
      setReceipt('')
      setValue(String(Math.round(amount)))
      setPhone(profilePhone ?? '')
    }, 0)
    return () => window.clearTimeout(reset)
  }, [open, amount, profilePhone])

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
    },
    [],
  )

  function poll(payment: string, attempt: number) {
    timer.current = window.setTimeout(() => {
      portalApi
        .checkPayment(payment, customer)
        .then((result) => {
          if (result.status === 'Allocated' || result.status === 'Received') {
            setReceipt(result.transaction_id ?? '')
            setPhase('success')
            onPaid()
          } else if (['Failed', 'Cancelled', 'Unmatched'].includes(result.status)) {
            setError(result.result_description || 'The payment was not completed.')
            setPhase('failed')
          } else if (attempt < 40) {
            poll(payment, attempt + 1)
          } else {
            setError(
              'We have not received a response from M-Pesa yet. If money left your phone it will reflect shortly.',
            )
            setPhase('failed')
          }
        })
        .catch(() => {
          if (attempt < 40) poll(payment, attempt + 1)
        })
    }, 3000)
  }

  async function submit() {
    setError('')
    const amountNumber = Number(value)
    if (!phone.trim()) return setError('Enter the Safaricom number to charge.')
    if (!(amountNumber >= 1)) return setError('Enter an amount of at least KSh 1.')
    try {
      const result = await portalApi.startPayment(customer, phone.trim(), amountNumber, invoice)
      setPhase('waiting')
      poll(result.payment, 0)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Pay with M-Pesa" size="md">
      {phase === 'form' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl bg-[#16a34a]/10 p-3 text-sm text-[#15803d]">
            <LucideIcon name="smartphone" className="size-5 shrink-0" />
            <span>An M-Pesa prompt will appear on your phone. Enter your PIN to complete the payment.</span>
          </div>
          <TextInput
            label="M-Pesa phone number"
            value={phone}
            onChange={setPhone}
            placeholder="0712 345 678"
            inputMode="tel"
          />
          <TextInput
            label="Amount (KSh)"
            type="number"
            value={value}
            onChange={setValue}
            description={invoice ? `Invoice ${invoice}` : `Total outstanding ${formatMoney(amount)}`}
          />
          {settings?.paybill && (
            <p className="text-xs text-ink-gray-5">
              Prefer to pay manually? Use Paybill <strong>{settings.paybill}</strong> and put your tenant number as the
              account.
            </p>
          )}
          <ErrorMessage message={error} />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="ghost" onClick={() => onOpenChange(false)} />
            <Button
              label={`Pay ${formatMoney(Number(value) || 0)}`}
              variant="solid"
              theme="green"
              onClick={() => void submit()}
            />
          </div>
        </div>
      )}
      {phase === 'waiting' && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="relative flex size-16 items-center justify-center rounded-full bg-[#16a34a]/12 text-[#15803d]">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#16a34a]/20" />
            <LucideIcon name="smartphone" className="relative size-7" />
          </span>
          <div>
            <p className="text-base font-semibold text-ink-gray-9">Check your phone</p>
            <p className="mt-1 text-sm text-ink-gray-5">
              Enter your M-Pesa PIN to approve {formatMoney(Number(value))}.
            </p>
          </div>
        </div>
      )}
      {phase === 'success' && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-[#16a34a] text-white">
            <LucideIcon name="check" className="size-8" />
          </span>
          <div>
            <p className="text-lg font-semibold text-ink-gray-9">Payment received</p>
            <p className="mt-1 text-sm text-ink-gray-5">
              Thank you.{' '}
              {receipt && (
                <>
                  M-Pesa receipt <strong>{receipt}</strong>.
                </>
              )}{' '}
              Your balance has been updated.
            </p>
          </div>
          <Button label="Done" variant="solid" onClick={() => onOpenChange(false)} />
        </div>
      )}
      {phase === 'failed' && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-[#dc2626]/12 text-[#dc2626]">
            <LucideIcon name="x" className="size-8" />
          </span>
          <p className="max-w-sm text-sm text-ink-gray-7">{error}</p>
          <div className="flex gap-2">
            <Button label="Close" variant="ghost" onClick={() => onOpenChange(false)} />
            <Button label="Try again" variant="solid" onClick={() => setPhase('form')} />
          </div>
        </div>
      )}
    </Dialog>
  )
}
