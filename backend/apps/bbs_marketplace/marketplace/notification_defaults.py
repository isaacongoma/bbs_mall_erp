ITEMS = (
    "{% if order %}<table style='width:100%;border-collapse:collapse;margin:12px 0'>"
    "{% for row in order.get('items') %}<tr>"
    "<td style='padding:6px 0;border-bottom:1px solid #e5e7eb'>{{ row.item_name }} x {{ '%g'|format(row.qty or 0) }}</td>"
    "<td style='padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right'>{{ money(row.amount) }}</td>"
    "</tr>{% endfor %}"
    "<tr><td style='padding:8px 0;font-weight:bold'>Total</td><td style='padding:8px 0;text-align:right;font-weight:bold'>{{ money(order.grand_total) }}</td></tr>"
    "</table>{% endif %}"
)
SELLER_ITEMS = (
    "<table style='width:100%;border-collapse:collapse;margin:12px 0'>"
    "{% for row in doc.get('items') %}<tr>"
    "<td style='padding:6px 0;border-bottom:1px solid #e5e7eb'>{{ row.item_name }} x {{ '%g'|format(row.qty or 0) }}</td>"
    "<td style='padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right'>{{ money(row.amount) }}</td>"
    "</tr>{% endfor %}</table>"
)
TRACK = (
    "{% if tracking_no %}<p>Courier: <b>{{ courier }}</b><br>Tracking number: <b>{{ tracking_no }}</b>"
    "{% if tracking_url %}<br><a href='{{ tracking_url }}'>Track your parcel</a>{% endif %}</p>{% endif %}"
)
VIEW = "{% if order_url %}<p><a href='{{ order_url }}' style='background:#f97316;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none'>View your order</a></p>{% endif %}"
HELLO = "<p>Hi {{ customer_name }},</p>"
SELLER_HELLO = "<p>Hi {{ seller_name }},</p>"
STAFF_HELLO = "<p>Hello,</p>"

BUYER = "Buyer"
SELLER = "Seller"
STAFF = "Staff"

CART_LINES = (
    "<table style='width:100%;border-collapse:collapse;margin:12px 0'>"
    "{% for row in doc.get('items') %}<tr>"
    "<td style='padding:6px 0;border-bottom:1px solid #e5e7eb'>{{ row.item_name }} x {{ '%g'|format(row.qty or 0) }}</td>"
    "<td style='padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right'>{{ money(row.amount) }}</td>"
    "</tr>{% endfor %}</table>"
)

TEMPLATES = [
    ("Abandoned Cart Reminder", BUYER, "You left something in your cart",
     HELLO + "<p>You left these items in your {{ brand }} cart. They are still waiting for you, but stock may run out.</p>" + CART_LINES
     + "{% if cart_url %}<p><a href='{{ cart_url }}' style='background:#f97316;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none'>Complete your order</a></p>{% endif %}",
     ""),
    ("Order Placed", BUYER, "We received your order {{ order.name }}", HELLO + "<p>Thank you for shopping with {{ brand }}. We have received order <b>{{ order.name }}</b>." + "{% if order.payment_status != 'Paid' %} Please complete payment to confirm it.{% endif %}</p>" + ITEMS + VIEW,
     "{{ brand }}: we received order {{ order.name }} for {{ amount }}. {% if order_url %}Track: {{ order_url }}{% endif %}"),
    ("Payment Received", BUYER, "Payment received for order {{ order.name }}", HELLO + "<p>We have received your payment of <b>{{ amount }}</b> for order <b>{{ order.name }}</b>. Your seller is preparing it now.</p>" + ITEMS + VIEW,
     "{{ brand }}: payment of {{ amount }} received for order {{ order.name }}. The seller is preparing your items."),
    ("Payment Failed", BUYER, "Payment for order {{ order.name }} did not go through", HELLO + "<p>We could not confirm payment for order <b>{{ order.name }}</b>. {{ reason }}</p><p>You can try again from your order page.</p>" + VIEW,
     "{{ brand }}: payment for order {{ order.name }} was not completed. Please try again{% if order_url %}: {{ order_url }}{% endif %}"),
    ("Order Partially Shipped", BUYER, "Part of order {{ order.name }} is on its way", HELLO + "<p>Some items in order <b>{{ order.name }}</b> have shipped. The rest will follow separately.</p>" + TRACK + VIEW,
     "{{ brand }}: part of order {{ order.name }} has shipped.{% if tracking_no %} Tracking {{ tracking_no }}.{% endif %}"),
    ("Order Shipped", BUYER, "Order {{ order.name }} has shipped", HELLO + "<p>Good news, your order <b>{{ order.name }}</b> is on its way.</p>" + TRACK + ITEMS + VIEW,
     "{{ brand }}: order {{ order.name }} has shipped.{% if tracking_no %} Tracking {{ tracking_no }}{% if tracking_url %} {{ tracking_url }}{% endif %}.{% endif %}"),
    ("Out for Delivery", BUYER, "Order {{ order.name }} is out for delivery", HELLO + "<p>Your order <b>{{ order.name }}</b> is out for delivery today. Please keep your phone close.</p>" + TRACK + VIEW,
     "{{ brand }}: order {{ order.name }} is out for delivery today.{% if order.payment_method == 'Cash on Delivery' %} Have {{ amount }} ready.{% endif %}"),
    ("Order Delivered", BUYER, "Order {{ order.name }} was delivered", HELLO + "<p>Your order <b>{{ order.name }}</b> has been delivered. We hope you love it.</p><p>If anything is wrong you can request a return from your order page. Please also take a moment to review what you bought.</p>" + VIEW,
     "{{ brand }}: order {{ order.name }} was delivered. Thank you for shopping with us."),
    ("Delivery Failed", BUYER, "We could not deliver order {{ order.name }}", HELLO + "<p>The courier could not deliver order <b>{{ order.name }}</b>. {{ reason }}</p><p>We will contact you to arrange another attempt.</p>" + TRACK + VIEW,
     "{{ brand }}: delivery of order {{ order.name }} was not successful. We will call you to reschedule. {{ support_phone }}"),
    ("Order Cancelled", BUYER, "Order {{ order.name }} was cancelled", HELLO + "<p>Order <b>{{ order.name }}</b> has been cancelled. {{ reason }}</p><p>If you already paid, the money is on its way back to you.</p>" + VIEW,
     "{{ brand }}: order {{ order.name }} was cancelled.{% if order.payment_status in ['Paid', 'Partially Refunded'] %} Your refund is being processed.{% endif %}"),
    ("Order Refunded", BUYER, "Refund for order {{ order.name }}", HELLO + "<p>We have refunded <b>{{ amount }}</b> for order <b>{{ order.name }}</b>.</p>" + VIEW,
     "{{ brand }}: we refunded {{ amount }} for order {{ order.name }}."),
    ("Return Requested", BUYER, "We received your return request {{ doc.name }}", HELLO + "<p>Your return request <b>{{ doc.name }}</b> for order <b>{{ order.name }}</b> is being reviewed. We will let you know the decision shortly.</p>" + VIEW,
     "{{ brand }}: return request {{ doc.name }} received. We will update you soon."),
    ("Return Approved", BUYER, "Return {{ doc.name }} approved", HELLO + "<p>Your return <b>{{ doc.name }}</b> was approved. {{ reason }}</p><p>We will arrange collection or tell you where to drop the item.</p>" + VIEW,
     "{{ brand }}: return {{ doc.name }} approved. We will contact you about the pickup."),
    ("Return Rejected", BUYER, "Return {{ doc.name }} was not approved", HELLO + "<p>We could not approve return <b>{{ doc.name }}</b>. {{ reason }}</p><p>Contact us if you would like to discuss this.</p>" + VIEW,
     "{{ brand }}: return {{ doc.name }} was not approved. {{ support_phone }}"),
    ("Return Received", BUYER, "We received your returned item", HELLO + "<p>We received the item for return <b>{{ doc.name }}</b>. Your refund is being prepared.</p>" + VIEW,
     "{{ brand }}: we received your return {{ doc.name }}. Your refund is being prepared."),
    ("Refund Issued", BUYER, "Your refund of {{ amount }} is on its way", HELLO + "<p>We have refunded <b>{{ amount }}</b> for return <b>{{ doc.name }}</b>.</p>" + VIEW,
     "{{ brand }}: refund of {{ amount }} issued for return {{ doc.name }}."),
    ("New Order for Seller", SELLER, "New order {{ doc.name }} to accept", SELLER_HELLO + "<p>You have a new order <b>{{ doc.name }}</b> worth <b>{{ amount }}</b> to you. Please accept and ship it on time.</p>" + SELLER_ITEMS + "<p>Open your tenant portal, Shop Orders, to accept it.</p>",
     "{{ brand }}: new order {{ doc.name }} ({{ amount }}). Accept it in your Shop Orders."),
    ("Seller Order Cancelled", SELLER, "Order {{ doc.name }} was cancelled", SELLER_HELLO + "<p>Order <b>{{ doc.name }}</b> was cancelled. {{ reason }}</p><p>Any stock held for it has been released.</p>",
     "{{ brand }}: order {{ doc.name }} was cancelled. Stock is released."),
    ("Seller Return Request", SELLER, "Return request on order {{ doc.marketplace_order }}", SELLER_HELLO + "<p>A customer asked to return items from order <b>{{ doc.marketplace_order }}</b> (return <b>{{ doc.name }}</b>). Reason: {{ doc.reason }}.</p><p>The marketplace team will review it and contact you.</p>",
     "{{ brand }}: return request {{ doc.name }} on order {{ doc.marketplace_order }}."),
    ("Withdrawal Requested", SELLER, "Withdrawal {{ doc.name }} received", SELLER_HELLO + "<p>We received your withdrawal request <b>{{ doc.name }}</b> of <b>{{ money(doc.amount) }}</b>. You will receive <b>{{ money(doc.net_amount) }}</b> after fees.</p>",
     "{{ brand }}: withdrawal {{ doc.name }} of {{ money(doc.amount) }} received. You will get {{ money(doc.net_amount) }}."),
    ("Withdrawal Paid", SELLER, "Withdrawal {{ doc.name }} paid", SELLER_HELLO + "<p>We sent <b>{{ money(doc.net_amount) }}</b> for withdrawal <b>{{ doc.name }}</b>.{% if doc.receipt_no %} Reference: <b>{{ doc.receipt_no }}</b>.{% endif %}</p>",
     "{{ brand }}: {{ money(doc.net_amount) }} sent for withdrawal {{ doc.name }}.{% if doc.receipt_no %} Ref {{ doc.receipt_no }}.{% endif %}"),
    ("Withdrawal Failed", SELLER, "Withdrawal {{ doc.name }} was not completed", SELLER_HELLO + "<p>Withdrawal <b>{{ doc.name }}</b> could not be completed. {{ reason }}</p><p>The money is back in your wallet.</p>",
     "{{ brand }}: withdrawal {{ doc.name }} failed. The money is back in your wallet."),
    ("Listing Approved", SELLER, "Your listing {{ doc.listing_title }} was approved", SELLER_HELLO + "<p>Your listing <b>{{ doc.listing_title }}</b> was approved. You can publish it now.</p>",
     "{{ brand }}: listing {{ doc.listing_title }} approved. Publish it from Products."),
    ("Listing Rejected", SELLER, "Your listing {{ doc.listing_title }} needs changes", SELLER_HELLO + "<p>Your listing <b>{{ doc.listing_title }}</b> was not approved. {{ reason }}</p><p>Please fix it and submit again.</p>",
     "{{ brand }}: listing {{ doc.listing_title }} was not approved. {{ reason }}"),
    ("Seller Approved", SELLER, "Your shop is approved", SELLER_HELLO + "<p>Your shop <b>{{ seller_name }}</b> is approved. You can start listing products from your tenant portal.</p>",
     "{{ brand }}: your shop {{ seller_name }} is approved. Start listing products in your portal."),
    ("Seller Suspended", SELLER, "Your shop was suspended", SELLER_HELLO + "<p>Your shop <b>{{ seller_name }}</b> has been suspended and your listings are paused. Please contact the management office.</p>",
     "{{ brand }}: your shop {{ seller_name }} was suspended. Contact {{ support_phone }}."),
    ("Late Order Warning", SELLER, "Order {{ doc.name }} is waiting for you", SELLER_HELLO + "<p>Order <b>{{ doc.name }}</b> has not been accepted yet. It will be cancelled automatically if you do not accept it soon.</p>",
     "{{ brand }}: order {{ doc.name }} awaits your acceptance and will be cancelled soon."),
    ("Low Stock Alert", SELLER, "Low stock on your listings", SELLER_HELLO + "<p>These listings are running low:</p><ul>{% for row in listings %}<li>{{ row.listing_title }}: {{ '%g'|format(row.available_qty or 0) }} left</li>{% endfor %}</ul>",
     "{{ brand }}: {{ listings|length }} of your listings are low on stock."),
    ("Subscription Activated", SELLER, "Your {{ doc.plan }} plan is active", SELLER_HELLO + "<p>Your <b>{{ doc.plan }}</b> plan is active until <b>{{ doc.end_date }}</b>.</p>",
     "{{ brand }}: your {{ doc.plan }} plan is active until {{ doc.end_date }}."),
    ("Ad Activated", SELLER, "Your advertising is live", SELLER_HELLO + "<p>Your <b>{{ doc.package }}</b> campaign is live until <b>{{ doc.end_date }}</b>.</p>",
     "{{ brand }}: your {{ doc.package }} ad is live until {{ doc.end_date }}."),
    ("Seller Application Received", STAFF, "New seller application: {{ doc.seller_name }}", STAFF_HELLO + "<p><b>{{ doc.seller_name }}</b> applied to sell on {{ brand }}. Please verify their KYC and approve the shop.</p>",
     "{{ brand }}: new seller application from {{ doc.seller_name }}."),
    ("Listing Awaiting Review", STAFF, "Listing waiting for review: {{ doc.listing_title }}", STAFF_HELLO + "<p>{{ seller_name }} submitted <b>{{ doc.listing_title }}</b> for approval.</p>",
     "{{ brand }}: listing {{ doc.listing_title }} by {{ seller_name }} awaits review."),
    ("Withdrawal Awaiting Approval", STAFF, "Withdrawal {{ doc.name }} awaits approval", STAFF_HELLO + "<p>{{ seller_name }} requested a withdrawal of <b>{{ money(doc.amount) }}</b> ({{ doc.name }}).</p>",
     "{{ brand }}: withdrawal {{ doc.name }} of {{ money(doc.amount) }} by {{ seller_name }} awaits approval."),
]
