import type { ButtonTheme, ButtonVariant } from '@/design-system'

const THEME_MAP: Record<string, ButtonTheme> = {
  Primary: 'gray',
  Info: 'blue',
  Success: 'green',
  Warning: 'gray',
  Danger: 'red',
}

const VARIANT_MAP: Record<string, ButtonVariant> = {
  Primary: 'solid',
  Info: 'subtle',
  Success: 'solid',
  Warning: 'subtle',
  Danger: 'solid',
}

export function getButtonTheme(buttonColor: string | null | undefined): ButtonTheme {
  return (buttonColor && THEME_MAP[buttonColor]) || 'gray'
}

export function getButtonVariant(buttonColor: string | null | undefined): ButtonVariant {
  return (buttonColor && VARIANT_MAP[buttonColor]) || 'subtle'
}
