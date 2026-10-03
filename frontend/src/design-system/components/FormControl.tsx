import type { ComponentProps } from 'react'
import { Checkbox } from './Checkbox'
import { Combobox } from './Combobox'
import { DatePicker, DateRangePicker, DateTimePicker } from './DatePicker'
import { Select } from './Select'
import { Textarea } from './Textarea'
import { TextInput } from './TextInput'
import { TimePicker } from './TimePicker'

type TextInputType = NonNullable<ComponentProps<typeof TextInput>['type']>

type Sized = { size?: 'sm' | 'md' | 'lg' | 'xl'; variant?: 'subtle' | 'outline' | 'ghost' }

export type FormControlProps =
  | ({ type?: TextInputType } & ComponentProps<typeof TextInput>)
  | ({ type: 'textarea' } & ComponentProps<typeof Textarea>)
  | ({ type: 'select' } & ComponentProps<typeof Select>)
  | ({ type: 'combobox' | 'autocomplete' } & ComponentProps<typeof Combobox>)
  | ({ type: 'checkbox' } & ComponentProps<typeof Checkbox>)
  | ({ type: 'date' } & ComponentProps<typeof DatePicker>)
  | ({ type: 'daterange' } & ComponentProps<typeof DateRangePicker>)
  | ({ type: 'datetime' } & ComponentProps<typeof DateTimePicker>)
  | ({ type: 'time' } & ComponentProps<typeof TimePicker>)

const FILL_WIDTH = new Set(['select', 'combobox', 'autocomplete', 'date', 'daterange', 'datetime', 'time'])

export function FormControl(props: FormControlProps & Sized) {
  const { type = 'text', size = 'sm', variant = 'subtle' } = props as { type?: string } & Sized
  const fill = FILL_WIDTH.has(type)
  const merge = (className?: string) => [fill ? 'w-full' : null, className].filter(Boolean).join(' ') || undefined
  const shared = { size, variant }

  switch (type) {
    case 'textarea': {
      const rest = props as ComponentProps<typeof Textarea>
      return <Textarea {...rest} {...shared} />
    }
    case 'select': {
      const rest = props as ComponentProps<typeof Select>
      return <Select {...rest} {...shared} className={merge(rest.className)} />
    }
    case 'combobox':
    case 'autocomplete': {
      const rest = props as ComponentProps<typeof Combobox>
      return <Combobox {...rest} {...shared} className={merge(rest.className)} />
    }
    case 'checkbox': {
      const rest = props as ComponentProps<typeof Checkbox>
      return <Checkbox {...rest} size={size === 'md' ? 'md' : 'sm'} />
    }
    case 'date': {
      const rest = props as ComponentProps<typeof DatePicker>
      return <DatePicker {...rest} {...shared} className={merge(rest.className)} />
    }
    case 'daterange': {
      const rest = props as ComponentProps<typeof DateRangePicker>
      return <DateRangePicker {...rest} {...shared} className={merge(rest.className)} />
    }
    case 'datetime': {
      const rest = props as ComponentProps<typeof DateTimePicker>
      return <DateTimePicker {...rest} {...shared} className={merge(rest.className)} />
    }
    case 'time': {
      const rest = props as ComponentProps<typeof TimePicker>
      return <TimePicker {...rest} {...shared} className={merge(rest.className)} />
    }
    default: {
      const rest = props as ComponentProps<typeof TextInput>
      return <TextInput {...rest} {...shared} type={type as TextInputType} />
    }
  }
}
