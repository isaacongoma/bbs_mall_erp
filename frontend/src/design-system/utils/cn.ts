import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const baseSizes = ['tiny', '2xs', 'xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl']
const largeSizes = ['5xl', '6xl', '7xl', '8xl', '9xl', '10xl', '11xl', '12xl', '13xl', '14xl', '15xl', '16xl']
const paragraphSizes = ['p-2xs', 'p-xs', 'p-sm', 'p-base', 'p-md', 'p-lg', 'p-xl', 'p-2xl', 'p-3xl', 'p-4xl']
const weights = ['medium', 'semibold', 'bold', 'black']

const fontSizes = [...baseSizes, ...largeSizes, ...paragraphSizes]

const textStyles = [...baseSizes, ...paragraphSizes].flatMap((size) => weights.map((weight) => `${size}-${weight}`))

const twMerge = extendTailwindMerge<'text-style' | 'focus-ring'>({
  extend: {
    theme: {
      text: fontSizes,
      radius: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'full', 'none', 'sm', 'md', 'lg', 'xl', '2xl'],
      shadow: ['sm', 'base', 'md', 'lg', 'xl', '2xl', 'status'],
    },
    classGroups: {
      'text-style': [{ text: textStyles }],
      'focus-ring': [
        'focus-ring',
        'focus-ring-red',
        'focus-ring-green',
        'focus-ring-amber',
        'focus-ring-blue',
        'focus-ring-violet',
      ],
    },
    conflictingClassGroups: {
      'text-style': ['font-size', 'font-weight', 'leading', 'tracking'],
      'font-size': ['text-style'],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
