export type MediaAlign = 'left' | 'center' | 'right'

export interface MediaLayoutAttrs {
  align?: MediaAlign | null
  float?: 'left' | 'right' | null
  width?: number | null
  height?: number | null
}

export function wrapperClasses(float: 'left' | 'right' | null | undefined): string[] {
  if (!float) return ['my-2']
  return ['w-fit m-2', float === 'right' ? 'float-right ml-5' : 'float-left mr-5']
}

export function containerClasses(attrs: MediaLayoutAttrs, selected: boolean): Array<string | Record<string, boolean>> {
  const align = attrs.align ?? null
  return [
    { 'ring-2 ring-outline-gray-3 ring-offset-2': selected },
    align === 'center' || !align ? 'mx-auto' : '',
    align === 'right' ? 'ml-auto mr-0' : '',
    align === 'left' ? 'mr-auto ml-0' : '',
    !attrs.float ? 'block max-w-full' : '',
  ]
}

export function aspectRatioFrom(
  width: number | null | undefined,
  height: number | null | undefined,
): string | undefined {
  if (!width || !height) return undefined
  return `${width} / ${height}`
}

export function heightOverWidth(width: number | null | undefined, height: number | null | undefined): number {
  if (!width || !height) return 1
  return height / width
}
