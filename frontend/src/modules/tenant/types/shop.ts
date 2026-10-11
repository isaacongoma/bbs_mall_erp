export interface ShopSeller {
  name: string
  seller_name: string
  status: string
  kyc_status: string
  fulfilment_mode: string
  holiday_mode: number
  rating: number
  shop_slug: string
  logo?: string | null
  customer: string
  vat_registered: number
  currency: string
  min_withdrawal: number
  hold_days: number
}

export interface ShopContext {
  seller: ShopSeller | null
  can_apply: boolean
  customer: string | null
}

export interface WalletBalances {
  balance: number
  pending: number
  available: number
}

export interface ShopDashboard {
  wallet: WalletBalances
  orders: { new_orders: number; to_ship: number; in_transit: number; month_sales: number; awaiting_release: number }
  listings: { live: number; in_review: number; low_stock: number }
  series: { month: string; sales: number }[]
}

export interface ListingRow {
  name: string
  listing_title: string
  item: string
  status: string
  listing_type: string
  price: number
  compare_at_price: number
  stock_qty: number
  reserved_qty: number
  available_qty: number
  primary_image?: string | null
  sold_count: number
  rating_average: number
  item_group: string
  moderation_notes?: string | null
}

export interface ListingImage {
  image: string
  alt_text?: string
  is_primary?: number
  sort_order?: number
}

export interface ListingTier {
  min_qty: number
  price: number
  buyer_type: 'B2B' | 'B2C'
}

export interface ListingAttribute {
  attribute: string
  value: string
  filterable?: number
}

export interface ListingValues {
  name?: string
  item?: string
  status?: string
  stock_mode?: string
  listing_title: string
  listing_type: string
  item_group: string
  brand?: string
  short_description?: string
  description?: string
  video_url?: string
  search_keywords?: string
  price: number
  compare_at_price?: number
  price_includes_vat: number
  vat_rate: number
  min_order_qty: number
  max_order_qty?: number
  order_multiple?: number
  lead_time_days?: number
  stock_qty: number
  low_stock_threshold?: number
  allow_backorder?: number
  weight_kg?: number
  length_cm?: number
  width_cm?: number
  height_cm?: number
  is_fragile?: number
  cod_allowed?: number
  free_delivery?: number
  return_eligible?: number
  return_window_days?: number
  warranty?: string
  is_digital?: number
  download_limit?: number
  digital_files: { title: string; file: string; version?: string }[]
  has_variants?: number
  variant_axes?: { attribute: string }[]
  variants?: VariantRow[]
  moderation_notes?: string | null
  images: ListingImage[]
  price_tiers: ListingTier[]
  attributes: ListingAttribute[]
}

export interface SellerOrderRow {
  name: string
  marketplace_order: string
  status: string
  settlement_status: string
  items_total: number
  vat_total: number
  shipping_fee: number
  commission_amount: number
  commission_vat: number
  seller_net: number
  customer: string
  sla_due?: string | null
  creation: string
  shipment?: string | null
}

export interface SellerOrderItem {
  listing: string
  item_name: string
  qty: number
  rate: number
  amount: number
  vat_amount: number
}

export interface SellerOrderDetail {
  order: SellerOrderRow & { items: SellerOrderItem[]; fulfilment_mode: string; courier?: string | null }
  buyer: {
    recipient_name: string
    recipient_phone: string
    address_snapshot: string
    delivery_method: string
    payment_method: string
    payment_status: string
    order_date: string
    delivery_notes?: string | null
  }
  shipment: { name: string; status: string; tracking_no?: string | null; courier?: string | null } | null
}

export interface WalletRow {
  name: string
  posting_date: string
  transaction_type: string
  amount: number
  status: string
  available_on?: string | null
  balance_after: number
  reference_doctype?: string | null
  reference_name?: string | null
  remarks?: string | null
}

export interface WalletData {
  balances: WalletBalances
  rows: WalletRow[]
  total: number
  min_withdrawal: number
  kyc_status: string
}

export interface PayoutAccount {
  name: string
  method: 'M-Pesa' | 'Bank Transfer'
  account_label?: string
  mpesa_number?: string
  bank_account?: string
  account_holder?: string
  is_default: number
  verified: number
}

export interface WithdrawalRow {
  name: string
  amount: number
  fee: number
  net_amount: number
  status: string
  method: string
  requested_on: string
  processed_on?: string | null
  receipt_no?: string | null
  failure_reason?: string | null
  account_holder?: string | null
  mpesa_number?: string | null
}

export interface OpenBill {
  name: string
  posting_date: string
  due_date: string
  grand_total: number
  outstanding_amount: number
  currency: string
  description?: string | null
  bill_type: string
}

export interface SalesSummary {
  totals: { orders: number; net_sales: number; vat: number; fees: number; earnings: number }
  top_products: { listing: string; item_name: string; qty: number; amount: number }[]
}

export interface HoursRow {
  day: string
  is_closed: number
  opens_at?: string
  closes_at?: string
}

export interface ShopProfile {
  seller_name: string
  shop_slug?: string
  tagline?: string
  description?: string
  logo?: string
  banner?: string
  holiday_mode: number
  return_policy?: string
  contact_phone?: string
  contact_email?: string
  working_hours: HoursRow[]
  closed_dates: { date: string; reason?: string }[]
  social_links: { platform: string; url: string }[]
  gallery: { image: string; caption?: string }[]
  shop_tags: { tag: string }[]
}

export interface PlanRow {
  name: string
  plan_name: string
  monthly_fee: number
  annual_fee: number
  listing_limit: number
  commission_rate: number
  featured_slots: number
  description?: string
  is_default: number
}

export interface PlansData {
  plans: PlanRow[]
  current: string | null
  expires_on: string | null
  listings_used: number
  available: number
  vat_rate: number
}

export interface AdPackage {
  name: string
  package_name: string
  placement: string
  price: number
  duration_days: number
  max_listings: number
  description?: string
}

export interface AdRow {
  name: string
  package: string
  status: string
  start_date?: string
  end_date?: string
  total: number
  listings: string[]
}

export interface VariantRow {
  item_code: string
  options: string
  sku?: string
  enabled: number
  price?: number | null
  compare_at_price?: number | null
  stock_qty: number
  available_qty?: number
  image?: string
  barcode?: string
}

export interface ItemAttribute {
  attribute: string
  values: string[]
  use_for_variants?: number
}
