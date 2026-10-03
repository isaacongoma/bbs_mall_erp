import type { CommonPickerProps, PickerAlign, PickerSide } from '../types/picker'

export function resolvePositioning(props: Pick<CommonPickerProps, 'side' | 'align' | 'offset' | 'placement'>) {
  const [placementSide, placementAlign] = (props.placement?.split('-') ?? []) as [
    PickerSide | undefined,
    PickerAlign | undefined,
  ]
  return {
    side: props.side ?? placementSide ?? 'bottom',
    align: props.align ?? placementAlign ?? 'start',
    offset: props.offset ?? 4,
  }
}
