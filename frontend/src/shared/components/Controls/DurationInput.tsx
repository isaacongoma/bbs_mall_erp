import { Duration, type DurationProps } from '@/design-system'

export interface DurationInputProps extends Omit<DurationProps, 'format'> {
  longForm?: boolean
}

export function DurationInput({ longForm = false, ...rest }: DurationInputProps) {
  return <Duration {...rest} format={longForm ? 'long' : 'short'} />
}
