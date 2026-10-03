import { getShellContributions } from '@/core/modules/registry'
import { GlobalModals } from './GlobalModals'

export function GlobalOverlays({ mobile }: { mobile: boolean }) {
  const overlays = getShellContributions('overlays')
  return (
    <>
      <GlobalModals />
      {overlays.map((Overlay, index) => (
        <Overlay key={index} mobile={mobile} />
      ))}
    </>
  )
}
