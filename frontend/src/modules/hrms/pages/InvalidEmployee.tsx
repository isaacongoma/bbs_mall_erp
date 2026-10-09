import { __ } from '@/core/i18n'

export default function InvalidEmployee() {
  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <section className="max-w-md rounded-2xl border border-outline-gray-2 bg-surface-base p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-ink-gray-9">{__('Employee profile required')}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-gray-6">
          {__('Your account is not linked to an active employee profile. Contact your HR administrator.')}
        </p>
      </section>
    </main>
  )
}
