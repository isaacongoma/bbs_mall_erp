export interface CrmUser {
  name: string
  email: string
  full_name: string
  first_name?: string
  last_name?: string
  user_image?: string | null
  role?: string | null
  user_type?: string
  is_telephony_agent?: boolean | number
  [key: string]: any
}

export type UsersByName = Record<string, CrmUser>
