const EMAIL_PATTERN =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

export function validateEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email)
}

export function validatePhone(phone: unknown): boolean {
  const value = String(phone).trim()
  return /^\+?[\d\s()-]+$/.test(value) && /\d/.test(value)
}
