export interface SysDefaults {
  date_format: string
  time_format: string
  currency: string
  number_format: string
  float_precision: number
  currency_precision: number
  rounding_method: string
}

export interface BootData {
  bbs_erp_version: string | null
  default_route: string
  site_name: string
  socketio_port: number | null
  read_only_mode: boolean
  csrf_token: string
  setup_complete: number
  sysdefaults: SysDefaults
  is_demo_site: boolean
  demo_data_created: boolean
  is_fc_site: boolean
  translated_doctypes: string[]
  translated_messages: Record<string, string>
  timezone: { system: string | null; user: string | null }
  state_options: Record<string, unknown>
}
