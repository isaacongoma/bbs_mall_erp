import { useAuthStore } from '@/core/auth/authStore'

export interface AuthConfig {
  google_client_id: string | null
  passkeys: boolean
  otp: boolean
  otp_length: number
}

export interface Challenge {
  challenge: string
  phone: string
  length: number
  resend_in: number
}

export interface Tokens {
  access: string
  refresh: string
}

export type LoginResult = ({ otp_required: true } & Challenge) | ({ otp_required?: false } & Tokens)

export class AuthError extends Error {}

async function call<T>(path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined && !init.method ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  })
  const text = await response.text()
  const data: unknown = (() => {
    try {
      return text ? JSON.parse(text) : null
    } catch {
      return null
    }
  })()
  if (!response.ok) {
    const detail = (data as { detail?: string } | null)?.detail
    throw new AuthError(detail ?? 'Something went wrong. Please try again.')
  }
  return data as T
}

function authorized(): Record<string, string> {
  const token = useAuthStore.getState().access
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const loginApi = {
  config: () => call<AuthConfig>('/api/auth/config/'),
  login: (email: string, password: string) => call<LoginResult>('/api/auth/login/', { email, password }),
  verifyOtp: (challenge: string, code: string) => call<Tokens>('/api/auth/otp/verify/', { challenge, code }),
  resendOtp: (challenge: string) => call<Challenge>('/api/auth/otp/resend/', { challenge }),
  forgot: (identifier: string) => call<Challenge>('/api/auth/forgot/', { identifier }),
  verifyForgot: (challenge: string, code: string) =>
    call<{ reset_token: string }>('/api/auth/forgot/verify/', { challenge, code }),
  resetPassword: (resetToken: string, password: string) =>
    call<{ detail: string }>('/api/auth/forgot/reset/', { reset_token: resetToken, password }),
  google: (credential: string) => call<Tokens>('/api/auth/google/', { credential }),
  passkeyOptions: () => call<{ state: string; options: PublicKeyRequestJson }>('/api/auth/passkey/options/', {}),
  passkeyVerify: (state: string, credential: unknown) =>
    call<Tokens>('/api/auth/passkey/verify/', { state, credential }),
  listPasskeys: () =>
    call<Array<{ id: number; label: string; created_at: string; last_used_at: string | null }>>(
      '/api/auth/passkeys/',
      undefined,
      {
        headers: authorized(),
      },
    ),
  removePasskey: (id: number) =>
    call<null>(`/api/auth/passkeys/${id}/`, undefined, { method: 'DELETE', headers: authorized() }),
  registerOptions: () =>
    call<PublicKeyCreationJson>('/api/auth/passkeys/register/options/', {}, { headers: authorized() }),
  registerVerify: (credential: unknown, label: string) =>
    call<{ detail: string }>('/api/auth/passkeys/register/verify/', { credential, label }, { headers: authorized() }),
}

interface CredentialDescriptorJson {
  id: string
  type: PublicKeyCredentialType
  transports?: AuthenticatorTransport[]
}

export interface PublicKeyRequestJson {
  challenge: string
  rpId?: string
  timeout?: number
  userVerification?: UserVerificationRequirement
  allowCredentials?: CredentialDescriptorJson[]
}

export interface PublicKeyCreationJson {
  challenge: string
  rp: PublicKeyCredentialRpEntity
  user: { id: string; name: string; displayName: string }
  pubKeyCredParams: PublicKeyCredentialParameters[]
  timeout?: number
  excludeCredentials?: CredentialDescriptorJson[]
  authenticatorSelection?: AuthenticatorSelectionCriteria
  attestation?: AttestationConveyancePreference
}

export function fromBase64Url(value: string): ArrayBuffer {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes.buffer
}

export function toBase64Url(buffer: ArrayBuffer): string {
  let binary = ''
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function descriptors(list: CredentialDescriptorJson[] | undefined): PublicKeyCredentialDescriptor[] | undefined {
  return list?.map((entry) => ({ ...entry, id: fromBase64Url(entry.id) }))
}

export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(window.PublicKeyCredential) && Boolean(navigator.credentials)
}

export async function signInWithPasskey(): Promise<Tokens> {
  const { state, options } = await loginApi.passkeyOptions()
  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: fromBase64Url(options.challenge),
      rpId: options.rpId,
      timeout: options.timeout,
      userVerification: options.userVerification,
      allowCredentials: descriptors(options.allowCredentials),
    },
  })) as PublicKeyCredential | null
  if (!credential) throw new AuthError('Passkey sign-in was cancelled.')
  const response = credential.response as AuthenticatorAssertionResponse
  return loginApi.passkeyVerify(state, {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: toBase64Url(response.clientDataJSON),
      authenticatorData: toBase64Url(response.authenticatorData),
      signature: toBase64Url(response.signature),
      userHandle: response.userHandle ? toBase64Url(response.userHandle) : undefined,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  })
}

export async function createPasskey(label: string): Promise<void> {
  const options = await loginApi.registerOptions()
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: fromBase64Url(options.challenge),
      rp: options.rp,
      user: { ...options.user, id: fromBase64Url(options.user.id) },
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      excludeCredentials: descriptors(options.excludeCredentials),
      authenticatorSelection: options.authenticatorSelection,
      attestation: options.attestation,
    },
  })) as PublicKeyCredential | null
  if (!credential) throw new AuthError('Passkey setup was cancelled.')
  const response = credential.response as AuthenticatorAttestationResponse
  await loginApi.registerVerify(
    {
      id: credential.id,
      rawId: toBase64Url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: toBase64Url(response.clientDataJSON),
        attestationObject: toBase64Url(response.attestationObject),
        transports: response.getTransports?.() ?? [],
      },
      clientExtensionResults: credential.getClientExtensionResults(),
    },
    label,
  )
}
