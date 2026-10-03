export interface IconStyle {
  icon: string
  tone: string
  chip: string
}

export const ICON_TONES = {
  blue: { tone: 'text-ink-blue-7', chip: 'bg-surface-blue-3 border-outline-blue-7' },
  green: { tone: 'text-ink-green-7', chip: 'bg-surface-green-3 border-outline-green-7' },
  teal: { tone: 'text-ink-teal-7', chip: 'bg-surface-teal-3 border-outline-teal-7' },
  amber: { tone: 'text-ink-amber-7', chip: 'bg-surface-amber-3 border-outline-amber-7' },
  violet: { tone: 'text-ink-violet-7', chip: 'bg-surface-violet-3 border-outline-violet-7' },
  cyan: { tone: 'text-ink-cyan-7', chip: 'bg-surface-cyan-3 border-outline-cyan-7' },
  orange: { tone: 'text-ink-orange-7', chip: 'bg-surface-orange-3 border-outline-orange-7' },
  pink: { tone: 'text-ink-pink-7', chip: 'bg-surface-pink-3 border-outline-pink-7' },
  red: { tone: 'text-ink-red-6', chip: 'bg-surface-red-3 border-outline-red-6' },
  gray: { tone: 'text-ink-gray-7', chip: 'bg-surface-gray-3 border-outline-gray-4' },
  purple: { tone: 'text-ink-purple-7', chip: 'bg-surface-purple-3 border-outline-purple-7' },
}

const ACTION_STYLES: Record<string, IconStyle> = {
  SetFieldValue: { icon: 'lucide-pencil-line', ...ICON_TONES.blue },
  IncrementFieldValue: { icon: 'lucide-trending-up', ...ICON_TONES.cyan },
  CreateDocument: { icon: 'lucide-file-plus', ...ICON_TONES.green },
  SendNotification: { icon: 'lucide-bell-ring', ...ICON_TONES.teal },
  SendCRMNotification: { icon: 'lucide-bell-ring', ...ICON_TONES.teal },
  AssignToUser: { icon: 'lucide-user-plus', ...ICON_TONES.violet },
  CallWebhook: { icon: 'lucide-webhook', ...ICON_TONES.pink },
  RunScript: { icon: 'lucide-code', ...ICON_TONES.gray },
  AdjustLeadScore: { icon: 'lucide-gauge', ...ICON_TONES.orange },
  SetLeadTemperature: { icon: 'lucide-thermometer', ...ICON_TONES.red },
  ConvertLeadToDeal: { icon: 'lucide-handshake', ...ICON_TONES.purple },
  SendCRMEmail: { icon: 'lucide-mail', ...ICON_TONES.violet },
}

const ACTION_STEP: IconStyle = { icon: 'lucide-zap', ...ICON_TONES.blue }

const STEP_STYLES: Record<string, IconStyle> = {
  Action: ACTION_STEP,
  Wait: { icon: 'lucide-timer', ...ICON_TONES.amber },
  WaitForEvent: { icon: 'lucide-webhook', ...ICON_TONES.amber },
  If: { icon: 'lucide-git-branch', ...ICON_TONES.green },
}

export const TRIGGER_STYLE: IconStyle = { icon: 'lucide-play', ...ICON_TONES.blue }

export function actionIcon(actionType?: string): IconStyle {
  return (actionType && ACTION_STYLES[actionType]) || ACTION_STEP
}

export function stepTypeIcon(stepType?: string): IconStyle {
  return (stepType && STEP_STYLES[stepType]) || ACTION_STEP
}

export function stepIcon(step: { step_type?: string; action_type?: string }): IconStyle {
  return step.step_type === 'Action' ? actionIcon(step.action_type) : stepTypeIcon(step.step_type)
}
