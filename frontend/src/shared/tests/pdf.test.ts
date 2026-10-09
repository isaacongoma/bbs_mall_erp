import { describe, expect, it, vi } from 'vitest'
import { downloadPdf } from '../utils/pdf'

vi.mock('@/core/api/rpc', () => ({
  rpc: vi.fn(async () => ({ message: 'data:application/pdf;base64,UEER' })),
}))

describe('PDF download', () => {
  it('creates a named PDF download from the backend data URL', async () => {
    const click = vi.fn()
    const anchor = document.createElement('a')
    anchor.click = click
    const append = vi.spyOn(document.body, 'appendChild')
    const remove = vi.spyOn(document.body, 'removeChild')
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    await downloadPdf('Salary Slip', 'SAL-0001')
    expect(click).toHaveBeenCalled()
    expect(append).toHaveBeenCalled()
    expect(remove).toHaveBeenCalled()
  })
})
