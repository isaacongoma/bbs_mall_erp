import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useAuthStore } from '@/core/auth/authStore'
import { Icon } from '@/shared/components/Icon'
import {
  AuthError,
  loginApi,
  passkeysSupported,
  signInWithPasskey,
  type AuthConfig,
  type Challenge,
  type Tokens,
} from '../auth/loginApi'
import { useGoogleSignIn } from '../auth/useGoogleSignIn'
import { OtpInput } from '../components/OtpInput'
import bbsLogo from '../assets/bbs-mall-logo.png'
import mallInterior from '../assets/bbs-mall-interior.webp'

type Step = 'login' | 'otp' | 'forgot' | 'forgotOtp' | 'reset'

const REMEMBER_KEY = 'bbs_login_email'
const NOTCH_W = 120
const NOTCH_H = 99
const RADIUS = 32
const FIELD =
  'block w-full rounded-[10px] bg-[#f3f4f6] px-4 pb-2 pt-2.5 focus-within:ring-2 focus-within:ring-[#9a6f00]/30'
const INPUT = 'block w-full border-0 bg-transparent p-0 text-[15px] leading-6 text-black outline-none focus:ring-0'
const PRIMARY =
  'h-12 w-full rounded-lg bg-[#9a6f00] text-[15px] font-medium text-white transition hover:bg-[#7d5a00] disabled:opacity-70'
const OUTLINE =
  'flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#d0d5dd] bg-white text-[15px] text-black transition hover:bg-[#f9fafb] disabled:opacity-70'

function readRemembered(): string {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) ?? ''
  } catch {
    return ''
  }
}

function rememberEmail(email: string | null) {
  try {
    if (email) window.localStorage.setItem(REMEMBER_KEY, email)
    else window.localStorage.removeItem(REMEMBER_KEY)
  } catch {
    return
  }
}

function panelPath(w: number, h: number): string {
  const r = RADIUS
  return [
    `M${NOTCH_W + r} 0`,
    `H${w - r}`,
    `A${r} ${r} 0 0 1 ${w} ${r}`,
    `V${h - NOTCH_H - r}`,
    `A${r} ${r} 0 0 1 ${w - r} ${h - NOTCH_H}`,
    `H${w - NOTCH_W + r}`,
    `A${r} ${r} 0 0 0 ${w - NOTCH_W} ${h - NOTCH_H + r}`,
    `V${h - r}`,
    `A${r} ${r} 0 0 1 ${w - NOTCH_W - r} ${h}`,
    `H${r}`,
    `A${r} ${r} 0 0 1 0 ${h - r}`,
    `V${NOTCH_H + r}`,
    `A${r} ${r} 0 0 1 ${r} ${NOTCH_H}`,
    `H${NOTCH_W - r}`,
    `A${r} ${r} 0 0 0 ${NOTCH_W} ${NOTCH_H - r}`,
    `V${r}`,
    `A${r} ${r} 0 0 1 ${NOTCH_W + r} 0Z`,
  ].join('')
}

const CAPTION = 'Everything your mall needs, in one place — tenants, leases, sales and payroll.'

function ImagePanel() {
  const host = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const element = host.current
    if (!element) return undefined
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight })
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={host} className="relative hidden h-full min-h-0 w-full lg:block">
      {size.width > 0 ? (
        <svg width={size.width} height={size.height} className="absolute inset-0" role="img" aria-label="BBS Mall">
          <defs>
            <clipPath id="login-panel">
              <path d={panelPath(size.width, size.height)} />
            </clipPath>
            <linearGradient id="login-shade" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#0b1a33" stopOpacity="0.5" />
              <stop offset="0.4" stopColor="#0b1a33" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g clipPath="url(#login-panel)">
            <image href={mallInterior} width={size.width} height={size.height} preserveAspectRatio="xMidYMid slice" />
            <rect width={size.width} height={size.height} fill="url(#login-shade)" />
          </g>
          <foreignObject x={NOTCH_W + RADIUS} y={24} width={size.width - NOTCH_W - RADIUS - 28} height={150}>
            <p className="m-0 text-right text-[24px] font-semibold leading-[1.15] tracking-tight text-white">
              {CAPTION}
            </p>
          </foreignObject>
        </svg>
      ) : null}
    </div>
  )
}

function MobileBanner() {
  return (
    <div className="relative mb-6 h-36 w-full overflow-hidden rounded-3xl sm:h-48 lg:hidden">
      <img src={mallInterior} alt="BBS Mall" className="size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1a33]/60 to-transparent" />
      <p className="absolute right-4 top-3 m-0 max-w-[80%] text-right text-[15px] font-semibold leading-tight text-white sm:text-lg">
        {CAPTION}
      </p>
    </div>
  )
}

function Brand() {
  return <img src={bbsLogo} alt="Business Bay Square" className="h-24 w-auto sm:h-28" />
}

function Heading({ title, subtitle }: { title: string; subtitle: ReactNode }) {
  return (
    <>
      <h1 className="mt-[4vh] text-center text-[30px] font-bold leading-tight text-black sm:text-[38px]">{title}</h1>
      <p className="mt-1 text-center text-[15px] text-black">{subtitle}</p>
    </>
  )
}

function stamp(next: Challenge): Challenge & { issuedAt: number } {
  return { ...next, issuedAt: Date.now() }
}

function useCountdown(seconds: number, issuedAt: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return issuedAt ? Math.max(0, seconds - Math.floor((now - issuedAt) / 1000)) : 0
}

export function Login() {
  const setTokens = useAuthStore((state) => state.setTokens)
  const [config, setConfig] = useState<AuthConfig | null>(null)
  const [step, setStep] = useState<Step>('login')
  const [email, setEmail] = useState(readRemembered)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => Boolean(readRemembered()))
  const [show, setShow] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [challenge, setChallengeState] = useState<(Challenge & { issuedAt: number }) | null>(null)
  const [code, setCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleElement, setGoogleElement] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    void loginApi
      .config()
      .then(setConfig)
      .catch(() => setConfig({ google_client_id: null, passkeys: true, otp: true, otp_length: 6 }))
  }, [])

  function setChallenge(next: Challenge) {
    setChallengeState(stamp(next))
  }

  const finish = useCallback(
    (tokens: Tokens) => {
      rememberEmail(remember && email ? email : null)
      setTokens({ access: tokens.access, refresh: tokens.refresh })
    },
    [email, remember, setTokens],
  )

  const fail = useCallback((caught: unknown) => {
    setError(caught instanceof Error ? caught.message : String(caught))
  }, [])

  useGoogleSignIn(
    config?.google_client_id,
    (credential) => {
      setError('')
      setLoading(true)
      loginApi
        .google(credential)
        .then(finish)
        .catch(fail)
        .finally(() => setLoading(false))
    },
    { button: step === 'login' ? googleElement : null, prompt: step === 'login' },
  )

  function go(next: Step) {
    setStep(next)
    setError('')
    setNotice('')
    setCode('')
  }

  async function run(action: () => Promise<void>) {
    setError('')
    setLoading(true)
    try {
      await action()
    } catch (caught) {
      fail(caught)
    } finally {
      setLoading(false)
    }
  }

  function submitLogin(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      const result = await loginApi.login(email.trim(), password)
      if ('otp_required' in result && result.otp_required) {
        setChallenge(result)
        go('otp')
      } else finish(result as Tokens)
    })
  }

  function verifyLoginCode(value: string) {
    if (!challenge) return
    void run(async () => {
      try {
        finish(await loginApi.verifyOtp(challenge.challenge, value))
      } catch (caught) {
        setCode('')
        throw caught
      }
    })
  }

  function resend() {
    if (!challenge) return
    void run(async () => {
      setChallenge(await loginApi.resendOtp(challenge.challenge))
      setCode('')
      setNotice('A new code has been sent.')
    })
  }

  function submitForgot(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      setChallenge(await loginApi.forgot(identifier.trim()))
      go('forgotOtp')
    })
  }

  function verifyResetCode(value: string) {
    if (!challenge) return
    void run(async () => {
      try {
        const result = await loginApi.verifyForgot(challenge.challenge, value)
        setResetToken(result.reset_token)
        go('reset')
      } catch (caught) {
        setCode('')
        throw caught
      }
    })
  }

  function resendReset() {
    void run(async () => {
      setChallenge(await loginApi.forgot(identifier.trim()))
      setCode('')
      setNotice('A new code has been sent.')
    })
  }

  function submitReset(event: FormEvent) {
    event.preventDefault()
    if (newPassword !== confirm) {
      setError('The passwords do not match.')
      return
    }
    void run(async () => {
      await loginApi.resetPassword(resetToken, newPassword)
      setPassword('')
      setNewPassword('')
      setConfirm('')
      go('login')
      setNotice('Your password has been updated. Sign in with your new password.')
    })
  }

  function passkeyLogin() {
    void run(async () => {
      try {
        finish(await signInWithPasskey())
      } catch (caught) {
        if (caught instanceof DOMException && (caught.name === 'NotAllowedError' || caught.name === 'AbortError'))
          throw new AuthError('Passkey sign-in was cancelled.')
        throw caught
      }
    })
  }

  const length = challenge?.length ?? config?.otp_length ?? 6
  const left = useCountdown(challenge?.resend_in ?? 30, challenge?.issuedAt ?? 0)

  const otpScreen = (title: string, onVerify: (value: string) => void, onResend: () => void, back: Step) => (
    <div className="flex w-full flex-col items-center">
      <Heading
        title={title}
        subtitle={
          <>
            We sent a {length}-digit code to <span className="font-semibold">{challenge?.phone}</span>
          </>
        }
      />
      <div className="mt-[4vh] w-full">
        <OtpInput
          length={length}
          value={code}
          onChange={setCode}
          onComplete={onVerify}
          disabled={loading}
          invalid={Boolean(error)}
        />
      </div>
      {error ? <p className="mt-4 w-full text-center text-sm text-[#b42318]">{error}</p> : null}
      {notice ? <p className="mt-4 w-full text-center text-sm text-[#067647]">{notice}</p> : null}
      <button
        type="button"
        disabled={loading || code.length !== length}
        onClick={() => onVerify(code)}
        className={`${PRIMARY} mt-6`}
      >
        {loading ? 'Verifying…' : 'Verify'}
      </button>
      <div className="mt-5 text-[15px] text-black">
        {left > 0 ? (
          <span>
            Resend code in {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
          </span>
        ) : (
          <button type="button" className="font-medium text-[#9a6f00] underline" onClick={onResend} disabled={loading}>
            Resend code
          </button>
        )}
      </div>
      <button type="button" className="mt-3 text-[15px] text-[#9a6f00]" onClick={() => go(back)}>
        Back
      </button>
    </div>
  )

  const socialShown = Boolean(config?.google_client_id) || Boolean(config?.passkeys && passkeysSupported())

  return (
    <div className="min-h-dvh w-full bg-white lg:h-dvh lg:overflow-hidden lg:p-[3.2vh]">
      <div className="mx-auto grid min-h-dvh w-full max-w-[1500px] grid-cols-1 gap-0 px-5 py-6 sm:px-10 lg:h-full lg:min-h-0 lg:grid-cols-2 lg:gap-[3vw] lg:px-0 lg:py-0">
        <div className="mx-auto flex h-full w-full max-w-[420px] flex-col justify-center">
          <MobileBanner />
          <div className="flex flex-col items-center">
            <Brand />

            {step === 'login' ? (
              <form className="flex w-full flex-col items-center" onSubmit={submitLogin}>
                <Heading title="Welcome Back" subtitle="Sign in to BBS MALL ERP" />
                {notice ? <p className="mt-4 w-full text-center text-sm text-[#067647]">{notice}</p> : null}

                {config?.google_client_id ? (
                  <div className="mt-[3.5vh] w-full">
                    <div ref={setGoogleElement} className="flex min-h-[44px] w-full justify-center" />
                  </div>
                ) : null}
                {config?.passkeys && passkeysSupported() ? (
                  <button
                    type="button"
                    className={`${OUTLINE} ${config?.google_client_id ? 'mt-3' : 'mt-[3.5vh]'}`}
                    onClick={passkeyLogin}
                    disabled={loading}
                  >
                    <Icon icon="lucide-key-round" className="size-5 text-[#9a6f00]" />
                    Sign in with a passkey
                  </button>
                ) : null}
                {socialShown ? (
                  <div className="my-[2.5vh] flex w-full items-center gap-3 text-[13px] text-[#6b7280]">
                    <span className="h-px flex-1 bg-[#e5e7eb]" />
                    Or
                    <span className="h-px flex-1 bg-[#e5e7eb]" />
                  </div>
                ) : (
                  <div className="h-[4vh]" />
                )}

                <label className={FIELD}>
                  <span className="block text-[11px] leading-4 text-[#6b7280]">Email</span>
                  <input
                    type="email"
                    value={email}
                    required
                    autoComplete="username webauthn"
                    onChange={(event) => setEmail(event.target.value)}
                    className={INPUT}
                  />
                </label>

                <label className={`${FIELD} relative mt-4`}>
                  <span className="block text-[11px] leading-4 text-[#6b7280]">Password</span>
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    required
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                    className={`${INPUT} pr-8`}
                  />
                  <button
                    type="button"
                    aria-label={show ? 'Hide password' : 'Show password'}
                    onClick={() => setShow((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9a6f00]"
                  >
                    <Icon icon={show ? 'lucide-eye-off' : 'lucide-eye'} className="size-5" />
                  </button>
                </label>

                <div className="mt-3 flex w-full items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-[15px] text-black">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="size-4 rounded-[3px] border-black text-[#9a6f00] focus:ring-0"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    className="text-[15px] text-black underline"
                    onClick={() => {
                      setIdentifier(email)
                      go('forgot')
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                {error ? <p className="mt-4 w-full text-sm text-[#b42318]">{error}</p> : null}

                <button type="submit" disabled={loading} className={`${PRIMARY} mt-5`}>
                  {loading ? 'Signing in…' : 'Login'}
                </button>
              </form>
            ) : null}

            {step === 'otp' ? otpScreen('Enter verification code', verifyLoginCode, resend, 'login') : null}

            {step === 'forgot' ? (
              <form className="flex w-full flex-col items-center" onSubmit={submitForgot}>
                <Heading
                  title="Forgot Password?"
                  subtitle="Enter your email or phone number and we will text you a code."
                />
                <label className={`${FIELD} mt-[4vh]`}>
                  <span className="block text-[11px] leading-4 text-[#6b7280]">Email or phone number</span>
                  <input
                    type="text"
                    value={identifier}
                    required
                    autoComplete="username"
                    onChange={(event) => setIdentifier(event.target.value)}
                    className={INPUT}
                  />
                </label>
                {error ? <p className="mt-4 w-full text-sm text-[#b42318]">{error}</p> : null}
                <button type="submit" disabled={loading} className={`${PRIMARY} mt-5`}>
                  {loading ? 'Sending…' : 'Send code'}
                </button>
                <button type="button" className="mt-4 text-[15px] text-[#9a6f00]" onClick={() => go('login')}>
                  Back to login
                </button>
              </form>
            ) : null}

            {step === 'forgotOtp' ? otpScreen('Enter verification code', verifyResetCode, resendReset, 'forgot') : null}

            {step === 'reset' ? (
              <form className="flex w-full flex-col items-center" onSubmit={submitReset}>
                <Heading title="Set a new password" subtitle="Choose a strong password you have not used before." />
                <label className={`${FIELD} relative mt-[4vh]`}>
                  <span className="block text-[11px] leading-4 text-[#6b7280]">New password</span>
                  <input
                    type={show ? 'text' : 'password'}
                    value={newPassword}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    onChange={(event) => setNewPassword(event.target.value)}
                    className={`${INPUT} pr-8`}
                  />
                  <button
                    type="button"
                    aria-label={show ? 'Hide password' : 'Show password'}
                    onClick={() => setShow((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9a6f00]"
                  >
                    <Icon icon={show ? 'lucide-eye-off' : 'lucide-eye'} className="size-5" />
                  </button>
                </label>
                <label className={`${FIELD} mt-4`}>
                  <span className="block text-[11px] leading-4 text-[#6b7280]">Confirm password</span>
                  <input
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    required
                    autoComplete="new-password"
                    onChange={(event) => setConfirm(event.target.value)}
                    className={INPUT}
                  />
                </label>
                {error ? <p className="mt-4 w-full text-sm text-[#b42318]">{error}</p> : null}
                <button type="submit" disabled={loading} className={`${PRIMARY} mt-5`}>
                  {loading ? 'Saving…' : 'Update password'}
                </button>
              </form>
            ) : null}
          </div>
        </div>
        <ImagePanel />
      </div>
    </div>
  )
}
