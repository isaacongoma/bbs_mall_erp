import { Rating, type RatingProps } from '@/design-system'

export interface RatingInputProps extends Omit<RatingProps, 'value' | 'onChange' | 'max' | 'step'> {
  value?: number
  max?: number | string
  onChange?: (fraction: number) => void
}

export function RatingInput({ value = 0, max = 5, onChange, ...rest }: RatingInputProps) {
  const stars = Number(max) || 5
  const starValue = Math.round((value || 0) * stars * 2) / 2

  return <Rating {...rest} max={stars} step={0.5} value={starValue} onChange={(next) => onChange?.(next / stars)} />
}
