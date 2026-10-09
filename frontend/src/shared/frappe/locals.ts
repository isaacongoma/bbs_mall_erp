export const locals: Record<string, Record<string, any>> = { DocType: {} }

export function resetLocals(): void {
  for (const key of Object.keys(locals)) {
    if (key !== 'DocType') delete locals[key]
  }
}
