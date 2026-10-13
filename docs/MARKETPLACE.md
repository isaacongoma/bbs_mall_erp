# BBS Mall Marketplace

The marketplace turns BBS Mall tenants into sellers. Tenants list products from their tenant portal, shoppers (B2C) and businesses (B2B) buy them, BBS Mall collects the money, and each tenant's share is credited to a **seller wallet**. A tenant can withdraw the wallet to M-Pesa or a bank, or spend it on rent, utilities and any other invoice BBS Mall has raised against them.

This document covers the backend app (`bbs_marketplace`), the admin desk, and the seller side of the tenant portal. The shopper-facing website and mobile app are built later on top of the storefront API described below.

## 1. How it fits with the rest of the ERP

Nothing that already exists was rebuilt. The marketplace adds only what ERPNext does not have and links to the rest.

| Need | Reused from | Marketplace addition |
|---|---|---|
| Shopper and business buyer | **Customer** (+ Address, Contact, Customer Group, Payment Terms) | `marketplace_user`, `marketplace_buyer_type` custom fields |
| Tenant who sells | **Customer** with the tenant portal users from `bbs_property`; the **Lease** is linked on the seller | **Marketplace Seller** (shop profile, KYC, payout accounts) |
| Product master | **Item**, **Item Group** (categories), **Brand**, **UOM** | **Marketplace Listing** (title, photos, price, VAT, bulk tiers, stock mode, delivery and return rules). One listing per item |
| Stock | **Warehouse**, **Bin**, Stock Ledger. Each seller gets a warehouse | Reservation of stock on order, release on cancel, commit on ship |
| Prices | **Price List**, **Item Price** (Marketplace Retail and Marketplace Wholesale lists) | Bulk tier prices live on the listing |
| Tax | **Item Tax Template**, Kenya VAT account | VAT-inclusive price extraction per line, VAT on commission |
| Discounts | **Coupon Code**, **Pricing Rule** | **Marketplace Campaign** says who funds a promotion (BBS Mall, seller, or shared) |
| Selling documents | **Sales Order**, **Sales Invoice**, **Delivery Note** | Linked from the marketplace order |
| Accounting | **Account**, **Journal Entry**, **Payment Entry**, **Mode of Payment**, GL, Cost Center, Bank Account | Posting rules in section 4 |
| Couriers | **Supplier** (each courier is a supplier), **Purchase Invoice** for courier cost | **Courier** rate cards, **Delivery Zone**, **Pickup Station**, **Marketplace Shipment** with tracking events |
| M-Pesa | The shared Daraja client in `erpnext_integrations/mpesa` (**M-Pesa Settings**, **M-Pesa Transaction**, callbacks) | A thin adapter that starts STK pushes and B2C payouts and reacts to the shared transaction record |
| Bills a tenant owes | Rent and utility **Sales Invoices** raised by `bbs_property` | **Wallet Bill Payment** settles them from the wallet |
| Notifications, comments, files, permissions, workflow history | Framework | None |

## 2. Roles

- **Marketplace Manager**: runs the platform. Approves sellers, listings and withdrawals, handles returns, sets commission.
- **Tenant (seller)**: any tenant portal user with finance access can open a shop and, once approved, manage listings, orders and the wallet. Sellers only ever see their own records; every seller API checks ownership.
- **Accounts Manager / Accounts User**: see wallet, payments, payouts and the marketplace reports.
- **Shopper / Business buyer**: customers who register through the storefront API.

## 3. Desk modules

Five modules appear in the dock, each with its own sidebar, workspace and number cards.

| Module | What is in it |
|---|---|
| **Marketplace** | Sellers, Listings, Product Reviews, Items, Categories, Brands, Seller Plans, Subscriptions, Wishlists, FAQs, Support Tickets, Commission Rules, Notification Templates and Log, Settings. Reports: Seller Performance, Listing Stock Status. Dashboard and onboarding |
| **Marketplace Orders** | Orders, Seller Orders, Payments, Return Requests, Carts, Sales Invoices. Reports: Marketplace Sales Register, Marketplace Commission Report, Returns Summary |
| **Seller Wallet** | Wallet Transactions, Withdrawals, Bill Payments, Journal Entries. Reports: Seller Wallet Statement, Wallet Liability (reconciled to the ledger), General Ledger |
| **Marketplace Logistics** | Shipments, Couriers, Delivery Zones, Pickup Stations. Reports: Courier Performance, COD Reconciliation |
| **Marketplace Promotions** | Campaigns, Banners, Ad Packages, Seller Ads, Coupon Codes, Pricing Rules |

Form buttons drive the workflows: approve or reject a seller, moderate a listing, accept, pack, ship and deliver a seller order, update a shipment, approve or reject and mark a withdrawal paid or failed, decide a return and refund the buyer.

### Marketplace Settings

Company and cost centre; commission default, commission VAT rate; hold days after delivery; unpaid order expiry; seller ship-within hours; return window; minimum and daily maximum withdrawal; withdrawal fee (percent and flat); auto-approval limit for withdrawals; KYC required before withdrawal; price lists; default courier and delivery zone; and the **payment methods table**. BBS Mall decides which methods shoppers see (M-Pesa, Card, Bank Transfer, Cash on Delivery, Wallet, Credit Terms, Airtel Money), per audience (B2C, B2B or both), with minimum and maximum order amounts, the Mode of Payment and the clearing account each posts to.

Accounts are created automatically on install: customer advances (liability), seller wallet payable, commission income, delivery income, withdrawal fee income, platform-funded promotion expense, refunds clearing, payouts in transit. Output VAT uses the company's existing VAT account.

## 4. Money flow and accounting

All postings are ordinary **Journal Entries** and **Payment Entries**, so every figure is visible in the General Ledger, Trial Balance and Accounts reports.

1. **Shopper pays.** A Payment Entry debits the payment-method clearing account (M-Pesa, bank, card) and credits **Customer Advances**. For cash on delivery the clearing account holds the courier's float until it is remitted.
2. **Order delivered and the return window passes.** A settlement Journal Entry per seller order:
   - debits Customer Advances for the gross sale;
   - credits **Seller Wallet Payable** (party: the seller's Supplier) with the seller's net;
   - credits **Commission Income** for the commission;
   - credits **Output VAT** for VAT on the commission (VAT on the goods themselves is the seller's own VAT);
   - credits **Delivery Income** for delivery fees BBS Mall keeps;
   - debits **Promotion Expense** for platform-funded discounts.
3. **Hold.** The seller net is credited to the wallet as *held* and becomes *available* after `hold_days_after_delivery`. A scheduled job releases due holds.
4. **Withdrawal.** Requesting a withdrawal immediately moves the amount out of the available balance (hold Journal Entry), then:
   - M-Pesa goes out through the Daraja B2C API; the result callback marks it paid or returns the funds;
   - bank transfer is approved by accounts and marked paid with the bank reference;
   - the fee is posted to Withdrawal Fee Income.
5. **Pay bills from the wallet.** A **Wallet Bill Payment** debits Seller Wallet Payable and credits Accounts Receivable against the tenant's Sales Invoices (rent, service charge, utilities). Allocations are checked against the tenant's own open invoices and against the available balance. Cancelling it reopens the invoices.
6. **Returns and cancellations.** A refund reverses the buyer's payment and the proportional commission, VAT and wallet credit. Unshipped orders are cancelled in full and stock is released.

Wallet balances are always read from the ledger; the **Wallet Liability** report shows the ledger balance next to the stored balance and flags any difference.

### Commission

**Commission Rules** are matched by priority: seller override, then category plus seller, brand, category, and finally the default rate. Each rule can add a fixed fee per item and a minimum and maximum fee, apply to B2C, B2B or both, and carry validity dates.

## 5. Orders

- B2C and B2B in one flow. Orders are priced from the listing (VAT extracted or added), bulk tiers, the buyer type price list, coupons and campaigns.
- B2B extras: bulk tier pricing, purchase order number, KRA PIN and business name, payment terms template and **credit terms** with a credit-limit check, VAT invoice requested.
- One marketplace order can contain several sellers; it splits into one **Seller Order** per seller, each with its own status, courier, shipment, commission and settlement.
- Stock is reserved at placement (row-locked, so two buyers cannot oversell), committed on shipment, and released on cancellation or when an unpaid order expires.
- The order status rolls up from its seller orders: Pending Payment, Paid, Processing, Partially Shipped, Shipped, Delivered, Completed, Cancelled, Refunded.
- Seller SLA: a ship-by time is set on acceptance; late orders are escalated by a daily job.

## 6. Logistics and couriers

- **Delivery Zones** group counties and towns. **Couriers** hold rate cards per zone, service level and weight band (base rate plus per-kg), ETA range, cash on delivery support, and a webhook token.
- Delivery fee is quoted at checkout from the best available courier for the zone, parcel weight, order value and COD. Free delivery can be set per listing.
- Fulfilment modes per seller: *Seller Ships*, *Platform Fulfils* (courier collects from the seller's warehouse), *Seller Drops at Station* (pickup station).
- **Marketplace Shipment** records pickup, transit, out for delivery, delivered, failed delivery and return, each as a timeline event with note, location and source. Couriers push updates to a webhook (`/api/marketplace/courier/<courier>/<token>/`) using their own status words, mapped to ours.
- COD collected by the courier is tracked until remitted (COD Reconciliation report).
- Courier cost is raised as a Purchase Invoice against the courier's Supplier so Accounts Payable stays correct.
- The shipment holds a proof-of-delivery photo and a delivery OTP field for the courier to record.

## 7. Seller side of the tenant portal

New entries in the tenant portal menu: **My Shop**, **Products**, **Shop Orders**, **Shop Wallet**.

- Apply to sell (shop name, tagline, KRA PIN, about). The application goes to the Marketplace Manager.
- Products: create and edit with photos, category, brand, price and VAT, was-price, bulk tiers for businesses, stock and low-stock alert, order limits, weight and dimensions, COD and returns, specifications. Submit for review; the manager approves or rejects with a reason; the seller pauses, resumes or archives.
- Orders: accept, pack, ship with tracking, deliver, cancel; see the buyer's delivery details and exactly what will be credited.
- Wallet: balance, held and available amounts, full transaction history with hold dates, withdrawals and their status, payout accounts (a payout account is usable only after the management office verifies it), and **Pay rent and bills** from the wallet.
- Sales summary and top products for any period.
- Shop profile (hours, closed dates, social links, tags), plans and subscriptions, advertising, digital product files.

The seller API is `bbs_marketplace.marketplace.seller_portal`.

## 8. Storefront API (for the future website and app)

Whitelisted, guest-safe where appropriate, in `bbs_marketplace.marketplace.store`:

catalogue (`get_home`, `get_categories`, `search_listings` with filters and sorting, `get_listing`, `get_reviews`), buyer registration, cart (`get_cart`, `add_to_cart`, `update_cart_item`, `apply_cart_coupon`), checkout (`get_delivery_options`, `get_payment_methods`, `place_order`, `pay_order` with M-Pesa STK push or wallet), orders (`get_my_orders`, `get_order`, `get_payment_status`, `cancel_my_order`, `track_order`), returns (`request_return`) and reviews (`add_review`).

In `bbs_marketplace.marketplace.engagement`: `toggle_wishlist`, `get_wishlist`, `compare_listings`, `get_faqs`, `get_shop`, `subscribe_newsletter`, `create_ticket`, `get_my_tickets`, `get_downloads`, `download_file`.

## 9. Payments

- **M-Pesa**: STK push for shoppers and B2C for payouts, through the one shared Daraja client and credentials in **M-Pesa Settings**. Callbacks arrive on the shared M-Pesa endpoints and the transaction record drives the marketplace payment or withdrawal.
- Other methods (card, bank transfer, Airtel Money, cash on delivery, credit terms) are recorded as Marketplace Payments and confirmed by accounts or the gateway integration; each posts to its own clearing account.
- Wallet payment lets a seller buy from the marketplace with their earnings.

## 10. Scheduled jobs

Hourly: release wallet holds, expire unpaid orders, process pending withdrawals. Daily: escalate late seller orders, abandon stale carts, refresh seller metrics, activate and end campaigns, low-stock alerts.

## 11. Controls

- A seller can never read or change another seller's data.
- Payout accounts are verified by staff before use; withdrawals respect KYC, minimum, daily maximum, fee, and optional manual approval above a limit.
- Funds are reserved at the moment a withdrawal is requested, so the same money cannot be withdrawn and spent on bills.
- Orders that were paid cannot be deleted; items with orders cannot be deleted; listings with orders are archived instead.
- Every state change is written to the order and shipment timelines.

## 12. Setup

1. Run migrations and `python manage.py setup_marketplace` (creates roles, accounts, price lists, default zone, payment method rows, artifacts).
2. Open **Marketplace Settings** and check the company, accounts, payment methods and commission.
3. Enable and configure **M-Pesa Settings**.
4. Add Delivery Zones and Couriers.
5. Invite tenants to the portal; they apply from **My Shop**.
6. Verify the seller's KYC and payout account, then approve the seller.

## 13. Tests

`python manage.py test apps.bbs_marketplace` covers seller setup, VAT pricing, stock reservation and overselling, payment receipts, settlement figures and balanced journals, hold release, withdrawals (including failure), wallet payment of tenant invoices and its reversal, returns, cancellations, commission priority, and the seller portal API (listing lifecycle, ownership checks, order fulfilment, payout verification, bills).

## 14. Order notifications (email and SMS)

Every order status change tells the people involved, the way Jumia and Amazon do.

| Event | Sent to |
|---|---|
| Order placed, payment received, payment failed | Buyer |
| Order partially shipped, shipped (with courier and tracking link), out for delivery, delivered, delivery failed | Buyer |
| Order cancelled (with the reason), order refunded | Buyer |
| Return requested, approved, rejected, received, refund issued | Buyer (seller is told about a new return request) |
| New order to accept, order cancelled, late order warning, low stock | Seller |
| Withdrawal requested, paid, failed | Seller (staff are told when one awaits approval) |
| Listing approved or rejected, shop approved or suspended, plan or ad activated | Seller |
| Seller application, listing awaiting review, withdrawal awaiting approval | Marketplace Managers and the staff alert addresses |

- Emails use the **Marketplace Notification Templates** (one per event, editable: subject, HTML body with the order table, SMS text, and switches for each channel). Defaults are created on setup and never overwritten.
- SMS goes through the shared **HostPinnacle** integration. One SMS goes to the delivery phone on the order.
- Every message is written to the **Marketplace Notification Log** (queued, sent, failed or skipped, with the error). Failed messages are retried hourly and can be sent again from the log; each template has a **Send Test** button.
- The same event is not sent twice to the same person within five minutes.
- Switches in Marketplace Settings: notifications on or off, email, SMS, brand name, support phone and email, storefront URL used for order links.

## 15. Growth tools

- **Seller plans and subscriptions.** Plans set a monthly or annual fee, a listing limit, an optional commission rate and included sponsored slots. The seller pays from the wallet (fee posted to Subscription Income with VAT); plans renew automatically while the wallet can cover them and fall back to the free plan when they lapse. The listing limit is enforced when a listing is created.
- **Advertising.** Ad packages (search boost, category top, home featured, home banner) are bought from the wallet for a number of days for chosen listings (posted to Advertising Income with VAT). Sponsored listings sort first in search and are flagged on the card. Ads end automatically.
- **Shop profile.** Opening hours, closed dates, holiday mode, social links, gallery, tags, about text and return policy, shown on the shop page (`get_shop`), with an open-now flag.
- **Digital products.** A listing can be digital: no shipping, no address needed, delivery fee zero, and the order is fulfilled and settled automatically when paid. Buyers download the files from their order, within the download limit.
- **Wishlist and compare.** Buyers save products; the listing shows how many people saved it. Up to four products compare side by side including specifications.
- **Help centre and support.** Marketplace FAQs by category; support tickets are ERPNext Issues linked to the buyer and the order.
- **Newsletter.** Sign-ups join the Marketplace Newsletter email group.

## 16. Comparison with the uzmart admin backend

The uzmart admin backend (Laravel) was reviewed feature by feature. Only e-commerce features were brought over, and wherever ERPNext or an existing BBS app already does the job it is reused.

| uzmart feature | Here |
|---|---|
| Shops, shop users, status, documents, working days, closed dates, social, gallery, tags, locations | Marketplace Seller (+ KYC, hours, closed dates, social, gallery, tags, warehouse and ship-from address) |
| Products, stocks, extras, properties, galleries, brands, categories, units, variants | Marketplace Listing over ERPNext Item (variants through Item templates), Item Group, Brand, UOM, specifications, price tiers |
| Product reviews | Product Review with rating roll-up on listings |
| Cart, orders, order details, order statuses, order coupons, order refunds | Marketplace Cart, Order, Seller Order, status timeline, Coupon Code, Return Request |
| Coupons, discounts, bonuses (buy X get Y) | Coupon Code, Marketplace Campaign, ERPNext Pricing Rule (free item rules) |
| Banners, ads packages and shop ads | Marketplace Banner, Ad Package, Seller Ad |
| Wallet, wallet history, payouts, payment to partners, transactions | Seller wallet ledger, Withdrawals, Journal Entries and Payment Entries in Accounts |
| Payments and gateway payloads | Marketplace Payment per method with clearing accounts; M-Pesa through the shared Daraja client |
| Delivery prices, delivery points, warehouses and their calendars | Delivery Zone, Courier rate cards, Pickup Station, ERPNext Warehouse |
| Deliveryman settings | Couriers and Marketplace Shipment tracking (own-fleet couriers supported) |
| Subscriptions (shop plans) | Seller Plan and Seller Subscription |
| Likes | Marketplace Wishlist Item |
| Digital files | Digital products |
| FAQ, tickets | Marketplace FAQ, ERPNext Issue |
| Email templates, email settings, email subscription, SMS gateways and payloads, notifications | Notification Templates and Log, email and HostPinnacle SMS, Email Group |
| Currencies, countries, regions, cities, areas | ERPNext Currency, Territory, Delivery Zone areas |
| Reports and statistics (sales, products, categories, revenue, stocks, orders) | Number cards, charts and nine script reports; ERPNext Sales and Stock reports |
| Product and order import and export, shop import | ERPNext Data Import and Export on any marketplace doctype |
| Roles and permissions | ERPNext roles: Marketplace Manager, Operations, Finance, Catalog Moderator |

Not brought over because they are not e-commerce features: blogs, careers, landing pages, stories, chat, parcel-sending service, backups, system information, translation editor and licence checks. Loyalty points, referral rewards and cashback are not built yet.

## 17. Variants, attributes and community features

- **Variants.** A product can have options such as colour and size. Variants are real ERPNext **Item variants** of the product's Item (template), generated for every combination of the chosen **Item Attribute** values, so stock, invoices and reports stay in ERPNext. Each variant has its own SKU, price (optional, falls back to the product price), photo, barcode, weight, stock and on/off switch. Stock is reserved, committed on shipment, released on cancellation and restocked on return **per variant**; the product totals are the sum. Buyers must choose an option before adding to cart; cards show a price range; orders, seller orders and carts record the chosen option.
- **Attributes.** Item Attributes are the shared master. Each category (Item Group) can list the attributes sellers fill in and which ones are shown as filters or used for variants. Search can filter by option values (`variant_attributes`) and returns option facets with counts. `get_category_filters` returns the filters for a category.
- **Product questions and answers.** Buyers ask, the seller or staff answer, answered questions show on the product.
- **Follow seller** and **recently viewed** products for buyers.
- **Frequently bought together.** Sellers pick companion products; if none are set the API suggests products that were bought together in past orders.
- **Size charts**, reusable per seller or marketplace-wide and attached to products.
- **Seller notices** from the marketplace to all or selected sellers (shown in the seller API).
- **Catalogue feed** in JSON and Google Merchant XML (`get_catalog_feed`) for shopping ads and social catalogues.

Tests: `apps.bbs_marketplace.tests.test_variants` and `test_community`.

## 18. Vouchers

Vouchers extend ERPNext's own **Coupon Code** (no separate voucher doctype). A Coupon Code with **Marketplace Voucher** ticked gets the marketplace rules below; ordinary ERPNext coupons keep working as before. Every voucher must have a **Valid Until** date.

**Who issues them.** BBS Mall (platform vouchers, paid for by the marketplace and booked to Promotion Expense) or a seller (paid for by the seller, who simply receives less). Sellers create their own from the tenant portal under **Vouchers**, can pause or resume them, and see how often each was used and how much was given. Marketplace Settings caps the percentage a seller may offer and can require approval of seller vouchers.

**What they can do**
- Money off as a percentage (with an optional maximum discount) or a fixed amount.
- **Delivery discount** vouchers, up to free delivery. A platform delivery voucher lowers the fee the buyer pays; a seller-issued one is deducted from that seller's payout.
- Minimum spend on the eligible items.
- Apply to everything, selected products, a category (with its sub-categories) or a brand. A seller voucher only ever applies to that seller's items.
- Limits: total uses, uses per customer, new customers only, one buyer type (B2C or B2B), one payment method, and skip items already on a promotion.
- Visibility: shown on the shop and product pages, or kept private by code. Optional **collect first**: shoppers press Collect, it goes into their voucher wallet, and only then can they use it.

**Accounting.** Platform-funded discounts debit Promotion Expense and the seller is credited the full amount; commission is worked out before the voucher. Seller-funded discounts reduce what the buyer pays and what the seller receives. Seller-funded delivery discounts are deducted from the seller net while delivery income is still booked in full. Settlement journals stay balanced.

**Redemption tracking.** Each use is a **Marketplace Voucher Redemption**. A cancelled or expired order releases its use so the voucher can be used again. The Voucher Usage report shows uses and the total given per voucher.

Storefront API (`bbs_marketplace.marketplace.vouchers`): `get_vouchers` (for a shop or a product), `claim_voucher`, `get_my_vouchers`. The cart applies a typed code through `apply_cart_coupon`, and the cart shows the discount or the reason a voucher cannot be used.

## 19. Not in this release

Still to build from the reference systems: loyalty points and cashback, referral and affiliate programmes, auctions, pre-orders, flash-deal timers on the storefront (campaigns exist), a point-of-sale screen, shipping label printing, seller-to-admin chat, and live courier API connectors. The shopper website and app are built later.
