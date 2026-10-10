export function isModernModule(module: unknown): boolean {
  void module
  return true
}

const ICON_HINTS: [RegExp, string][] = [
  [/occupied/i, 'lucide-building-2'],
  [/vacant/i, 'lucide-door-open'],
  [/arrears|overdue/i, 'lucide-triangle-alert'],
  [/rent roll|revenue|billed/i, 'lucide-banknote'],
  [/expiring/i, 'lucide-calendar-clock'],
  [/lease/i, 'lucide-file-signature'],
  [/maintenance|request/i, 'lucide-wrench'],
  [/meter|reading/i, 'lucide-gauge'],
  [/m-pesa|mpesa/i, 'lucide-smartphone'],
  [/enquir/i, 'lucide-user-search'],
]

export function cardIconFor(label: string): string {
  return ICON_HINTS.find(([pattern]) => pattern.test(label))?.[1] ?? 'lucide-chart-no-axes-column'
}

const SUB_HINTS: [RegExp, string][] = [
  [/occupied/i, 'Currently leased'],
  [/vacant/i, 'Available to let'],
  [/rent roll/i, 'From active leases'],
  [/arrears/i, 'Overdue balances'],
  [/expiring/i, 'Inside the alert window'],
  [/active leases/i, 'Submitted and live'],
  [/enquir/i, 'Awaiting follow-up'],
  [/maintenance/i, 'Needs action'],
  [/reading/i, 'Awaiting approval'],
  [/m-pesa|mpesa/i, 'Needs allocation'],
]

export function cardSubFor(label: string): string | undefined {
  return SUB_HINTS.find(([pattern]) => pattern.test(label))?.[1]
}
