export interface WhatsAppMessage {
  name: string
  type: 'Incoming' | 'Outgoing'
  status?: string
  creation: string
  message: string
  content_type: string
  message_type?: string
  attach?: string
  template?: string
  header?: string
  footer?: string
  reaction?: string
  is_reply?: boolean
  reply_to?: string
  reply_to_type?: string
  reply_to_from?: string
  reply_message?: string
  from_name?: string
  [key: string]: unknown
}

export interface WhatsAppReply {
  name?: string
  message?: string
  type?: string
  from_name?: string
  [key: string]: unknown
}
