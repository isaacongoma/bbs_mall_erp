import type { DropdownOptions } from '@/design-system'
import type { MenuOptionView } from '../frappe/formAdapter'

export function toMenuOptions(options: MenuOptionView[]): DropdownOptions {
  return options.map((option) => {
    if (option.options?.length) {
      return {
        group: option.group ?? '',
        hideLabel: option.hide_label,
        options: toMenuOptions(option.options) as never,
      }
    }
    return {
      label: option.label,
      icon: option.icon ? `lucide-${option.icon}` : undefined,
      disabled: option.disabled,
      theme: option.theme === 'red' ? 'red' : undefined,
      onClick: () => option.onclick?.(),
    }
  }) as DropdownOptions
}

export function toolbarIcon(name: string): string {
  if (name.includes('prev')) return 'lucide-chevron-left'
  if (name === 'next' || name.includes('next')) return 'lucide-chevron-right'
  return `lucide-${name}`
}
