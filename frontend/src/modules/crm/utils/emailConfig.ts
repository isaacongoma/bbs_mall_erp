import { __ } from '@/core/i18n'
import { validateEmail } from '@/shared/utils/validation'
import frappeMail from '../assets/email/frappe-mail.svg'
import gmail from '../assets/email/gmail.png'
import outlook from '../assets/email/outlook.png'
import sendgrid from '../assets/email/sendgrid.png'
import sparkpost from '../assets/email/sparkpost.webp'
import yahoo from '../assets/email/yahoo.png'
import yandex from '../assets/email/yandex.png'

export interface EmailAccountState {
  service: string
  email_account_name: string
  email_id: string
  password: string | null
  api_key: string | null
  api_secret: string | null
  frappe_mail_site: string
  enable_incoming: boolean
  enable_outgoing: boolean
  default_incoming: boolean
  default_outgoing: boolean
  create_lead_from_incoming_email: boolean
}

export interface EmailField {
  label: string
  name: keyof EmailAccountState
  type: 'text' | 'email' | 'password' | 'checkbox'
  placeholder?: string
  description?: string
  condition?: (state: EmailAccountState) => boolean
}

export interface EmailService {
  name: string
  icon: string
  info: string
  link: string
  custom: boolean
}

export function emptyEmailAccount(): EmailAccountState {
  return {
    service: '',
    email_account_name: '',
    email_id: '',
    password: '',
    api_key: '',
    api_secret: '',
    frappe_mail_site: '',
    enable_incoming: false,
    enable_outgoing: false,
    default_incoming: false,
    default_outgoing: false,
    create_lead_from_incoming_email: false,
  }
}

function fixedFields(): EmailField[] {
  return [
    { label: __('Account Name'), name: 'email_account_name', type: 'text', placeholder: __('Support / Sales') },
    { label: __('Email ID'), name: 'email_id', type: 'email', placeholder: 'johndoe@example.com' },
  ]
}

export function incomingOutgoingFields(): EmailField[] {
  return [
    {
      label: __('Enable Incoming'),
      name: 'enable_incoming',
      type: 'checkbox',
      description: __('If enabled, emails will be pulled from this account.'),
    },
    {
      label: __('Enable Outgoing'),
      name: 'enable_outgoing',
      type: 'checkbox',
      description: __('If enabled, outgoing emails can be sent from this account.'),
    },
    {
      label: __('Default Incoming'),
      name: 'default_incoming',
      type: 'checkbox',
      description: __(
        'If enabled, all replies to your company (eg: replies@yourcompany.com) will come to this account. Note: Only one account can be default incoming.',
      ),
    },
    {
      label: __('Default Outgoing'),
      name: 'default_outgoing',
      type: 'checkbox',
      description: __(
        'If enabled, all outgoing emails will be sent from this account. Note: Only one account can be default outgoing.',
      ),
    },
    {
      label: __('Create Lead from Incoming Emails'),
      name: 'create_lead_from_incoming_email',
      type: 'checkbox',
      description: __(
        'If enabled, a lead will be automatically created when an incoming email is received from an unknown contact.',
      ),
      condition: (state) => state.enable_incoming,
    },
  ]
}

export function popularProviderFields(): EmailField[] {
  return [...fixedFields(), { label: __('Password'), name: 'password', type: 'password', placeholder: '********' }]
}

export function customProviderFields(): EmailField[] {
  return [
    ...fixedFields(),
    { label: __('Frappe Mail Site'), name: 'frappe_mail_site', type: 'text', placeholder: 'https://frappemail.com' },
    { label: __('API Key'), name: 'api_key', type: 'text', placeholder: '********' },
    { label: __('API Secret'), name: 'api_secret', type: 'password', placeholder: '********' },
  ]
}

function appPasswordInfo(provider: string): string {
  return __('Setting up {0} requires you to enable two factor authentication and app specific passwords. Read more', [
    provider,
  ])
}

export function emailServices(): EmailService[] {
  return [
    {
      name: 'GMail',
      icon: gmail,
      info: appPasswordInfo('GMail'),
      link: 'https://support.google.com/accounts/answer/185833',
      custom: false,
    },
    {
      name: 'Outlook',
      icon: outlook,
      info: appPasswordInfo('Outlook'),
      link: 'https://support.microsoft.com/en-us/account-billing/how-to-get-and-use-app-passwords-5896ed9b-4263-e681-128a-a6f2979a7944',
      custom: false,
    },
    {
      name: 'Sendgrid',
      icon: sendgrid,
      info: appPasswordInfo('Sendgrid'),
      link: 'https://sendgrid.com/docs/ui/account-and-settings/two-factor-authentication/',
      custom: false,
    },
    {
      name: 'SparkPost',
      icon: sparkpost,
      info: appPasswordInfo('Sparkpost'),
      link: 'https://support.sparkpost.com/docs/my-account-and-profile/enabling-two-factor-authentication',
      custom: false,
    },
    {
      name: 'Yahoo',
      icon: yahoo,
      info: appPasswordInfo('Yahoo'),
      link: 'https://help.yahoo.com/kb/SLN15241.html',
      custom: false,
    },
    {
      name: 'Yandex',
      icon: yandex,
      info: appPasswordInfo('Yandex'),
      link: 'https://yandex.com/support/id/authorization/app-passwords.html',
      custom: false,
    },
    {
      name: 'Frappe Mail',
      icon: frappeMail,
      info: __(
        'Setting up Frappe Mail requires you to have an API key and API secret for your email account. Read more',
      ),
      link: 'https://github.com/frappe/mail',
      custom: true,
    },
  ]
}

const ICONS: Record<string, string> = {
  GMail: gmail,
  Outlook: outlook,
  Sendgrid: sendgrid,
  SparkPost: sparkpost,
  Yahoo: yahoo,
  Yandex: yandex,
  'Frappe Mail': frappeMail,
}

export function emailIcon(service: string): string {
  return ICONS[service] ?? ''
}

export function validateInputs(state: EmailAccountState, isCustom: boolean): string {
  if (!state.email_account_name) return __('Account name is required')
  if (!state.email_id) return __('Email ID is required')
  if (!validateEmail(state.email_id)) return __('Invalid email ID')
  if (!isCustom && !state.password) return __('Password is required')
  if (isCustom && !state.api_key) return __('API key is required')
  return ''
}
