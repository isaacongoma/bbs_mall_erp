type AnyRecord = Record<string, any>

const slot = window as unknown as AnyRecord

export function setCurrentForm(frm: AnyRecord | null): void {
  slot.cur_frm = frm
}

export function getCurrentForm(): AnyRecord | null {
  return (slot.cur_frm as AnyRecord | null | undefined) ?? null
}
