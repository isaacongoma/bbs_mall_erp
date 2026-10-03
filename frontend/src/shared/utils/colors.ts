export const colors = [
  'gray',
  'blue',
  'green',
  'red',
  'pink',
  'orange',
  'amber',
  'yellow',
  'cyan',
  'teal',
  'violet',
  'purple',
  'black',
]

export function parseColor(color: string): string {
  let textColor = `!text-${color}-600`
  if (color === 'black') {
    textColor = '!text-ink-gray-9'
  } else if (['gray', 'green'].includes(color)) {
    textColor = `!text-${color}-700`
  }
  return textColor
}
