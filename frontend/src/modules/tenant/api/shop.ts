import { callMethod } from '@/shared/frappe/api'
import type {
  ListingRow,
  ListingValues,
  AdPackage,
  AdRow,
  ItemAttribute,
  OpenBill,
  VoucherInput,
  VoucherRow,
  PayoutAccount,
  PlansData,
  SalesSummary,
  SellerOrderDetail,
  SellerOrderRow,
  ShopProfile,
  ShopContext,
  ShopDashboard,
  WalletBalances,
  WalletData,
  WithdrawalRow,
} from '../types/shop'

const PREFIX = 'bbs_marketplace.marketplace.seller_portal'

async function call<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const response = await callMethod(`${PREFIX}.${name}`, args)
  return response.message as T
}

export interface SellerApplication {
  seller_name: string
  contact_phone?: string
  contact_email?: string
  description?: string
  kra_pin?: string
  tagline?: string
  vat_registered?: number
}

export interface PayoutInput {
  method: string
  mpesa_number?: string
  account_holder?: string
  bank_account?: string
  account_label?: string
  is_default?: number
}

export const shopApi = {
  context: () => call<ShopContext>('get_seller_context'),
  apply: (values: SellerApplication) => call<string>('apply_as_seller', { ...values }),
  dashboard: () => call<ShopDashboard>('get_dashboard'),
  listings: (status: string, search: string, start: number, pageLength: number) =>
    call<{ rows: ListingRow[]; total: number }>('get_listings', { status, search, start, page_length: pageLength }),
  listing: (name: string) => call<ListingValues>('get_listing', { name }),
  saveListing: (values: ListingValues, name?: string) => call<string>('save_listing', { values, name }),
  categories: () => call<string[]>('get_categories'),
  submitListing: (name: string) => call<string>('submit_listing', { name }),
  pauseListing: (name: string) => call<string>('pause_listing', { name }),
  resumeListing: (name: string) => call<string>('resume_listing', { name }),
  archiveListing: (name: string) => call<string>('archive_listing', { name }),
  adjustStock: (name: string, quantity: number) => call<number>('adjust_stock', { name, quantity }),
  uploadImage: (listing: string, filename: string, content: string) =>
    call<string>('upload_listing_image', { listing, filename, content }),
  itemAttributes: (category?: string) => call<ItemAttribute[]>('get_item_attributes', { category }),
  generateVariants: (name: string, attributes: Record<string, string[]>) =>
    call<{ created: number; variants: string[] }>('generate_listing_variants', { name, attributes }),
  vouchers: () => call<VoucherRow[]>('get_vouchers'),
  saveVoucher: (values: VoucherInput, name?: string) => call<string>('save_voucher', { values, name }),
  setVoucherStatus: (name: string, status: string) => call<string>('set_voucher_status', { name, status }),
  uploadDigital: (listing: string, filename: string, content: string) =>
    call<string>('upload_digital_file', { listing, filename, content }),
  orders: (status: string, start: number, pageLength: number) =>
    call<{ rows: SellerOrderRow[]; total: number }>('get_orders', { status, start, page_length: pageLength }),
  order: (name: string) => call<SellerOrderDetail>('get_order', { name }),
  orderAction: (name: string, action: string, extra: { tracking_no?: string; reason?: string } = {}) =>
    call<string>('order_action', { name, action, ...extra }),
  wallet: (from_date?: string, to_date?: string, transaction_type?: string) =>
    call<WalletData>('get_wallet', { from_date, to_date, transaction_type }),
  payoutAccounts: () => call<PayoutAccount[]>('get_payout_accounts'),
  addPayoutAccount: (values: PayoutInput) => call<PayoutAccount[]>('add_payout_account', { ...values }),
  removePayoutAccount: (row_name: string) => call<PayoutAccount[]>('remove_payout_account', { row_name }),
  withdrawals: () => call<WithdrawalRow[]>('get_withdrawals'),
  requestWithdrawal: (amount: number, payout_account?: string) =>
    call<{ name: string; status: string; net_amount: number; fee: number }>('request_withdrawal', {
      amount,
      payout_account,
    }),
  openBills: () => call<{ invoices: OpenBill[]; available: number }>('get_open_bills'),
  payBills: (allocations: { sales_invoice: string; amount: number }[]) =>
    call<{ name: string; total: number; balances: WalletBalances }>('pay_bills', { allocations }),
  profile: () => call<ShopProfile>('get_profile'),
  saveProfile: (values: Partial<ShopProfile>) => call<boolean>('save_profile', { values }),
  plans: () => call<PlansData>('get_plans'),
  subscribe: (plan: string, billing_period: string) =>
    call<{ name: string; ends: string; total: number }>('subscribe_to_plan', { plan, billing_period }),
  adPackages: () => call<AdPackage[]>('get_ad_packages'),
  ads: () => call<AdRow[]>('get_ads'),
  buyAd: (pkg: string, listings: string[]) => call<{ name: string; ends: string; total: number }>('buy_ad', { package: pkg, listings }),
  cancelAd: (name: string) => call<string>('cancel_ad', { name }),
  salesSummary: (from_date?: string, to_date?: string) =>
    call<SalesSummary>('get_sales_summary', { from_date, to_date }),
}
