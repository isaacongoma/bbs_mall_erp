from django.db import models

from apps.bbs_marketplace.marketplace.doctype.ad_package.ad_package_generated import AdPackageGenerated
from apps.bbs_marketplace.marketplace.doctype.campaign_listing.campaign_listing_generated import CampaignListingGenerated
from apps.bbs_marketplace.marketplace.doctype.category_attribute.category_attribute_generated import CategoryAttributeGenerated
from apps.bbs_marketplace.marketplace.doctype.commission_rule.commission_rule_generated import CommissionRuleGenerated
from apps.bbs_marketplace.marketplace.doctype.courier.courier_generated import CourierGenerated
from apps.bbs_marketplace.marketplace.doctype.courier_rate.courier_rate_generated import CourierRateGenerated
from apps.bbs_marketplace.marketplace.doctype.delivery_zone.delivery_zone_generated import DeliveryZoneGenerated
from apps.bbs_marketplace.marketplace.doctype.delivery_zone_area.delivery_zone_area_generated import DeliveryZoneAreaGenerated
from apps.bbs_marketplace.marketplace.doctype.listing_attribute.listing_attribute_generated import ListingAttributeGenerated
from apps.bbs_marketplace.marketplace.doctype.listing_bundle_item.listing_bundle_item_generated import ListingBundleItemGenerated
from apps.bbs_marketplace.marketplace.doctype.listing_digital_file.listing_digital_file_generated import ListingDigitalFileGenerated
from apps.bbs_marketplace.marketplace.doctype.listing_image.listing_image_generated import ListingImageGenerated
from apps.bbs_marketplace.marketplace.doctype.listing_price_tier.listing_price_tier_generated import ListingPriceTierGenerated
from apps.bbs_marketplace.marketplace.doctype.listing_variant.listing_variant_generated import ListingVariantGenerated
from apps.bbs_marketplace.marketplace.doctype.listing_variant_axis.listing_variant_axis_generated import ListingVariantAxisGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_banner.marketplace_banner_generated import MarketplaceBannerGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_campaign.marketplace_campaign_generated import MarketplaceCampaignGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_cart.marketplace_cart_generated import MarketplaceCartGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_cart_item.marketplace_cart_item_generated import MarketplaceCartItemGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_faq.marketplace_faq_generated import MarketplaceFaqGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_listing.marketplace_listing_generated import MarketplaceListingGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_notification_log.marketplace_notification_log_generated import MarketplaceNotificationLogGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_notification_template.marketplace_notification_template_generated import MarketplaceNotificationTemplateGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_order.marketplace_order_generated import MarketplaceOrderGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_order_item.marketplace_order_item_generated import MarketplaceOrderItemGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_payment.marketplace_payment_generated import MarketplacePaymentGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_payment_method.marketplace_payment_method_generated import MarketplacePaymentMethodGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_seller.marketplace_seller_generated import MarketplaceSellerGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_seller_follow.marketplace_seller_follow_generated import MarketplaceSellerFollowGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_shipment.marketplace_shipment_generated import MarketplaceShipmentGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_size_chart.marketplace_size_chart_generated import MarketplaceSizeChartGenerated
from apps.bbs_marketplace.marketplace.doctype.marketplace_wishlist_item.marketplace_wishlist_item_generated import MarketplaceWishlistItemGenerated
from apps.bbs_marketplace.marketplace.doctype.order_status_event.order_status_event_generated import OrderStatusEventGenerated
from apps.bbs_marketplace.marketplace.doctype.pickup_station.pickup_station_generated import PickupStationGenerated
from apps.bbs_marketplace.marketplace.doctype.product_question.product_question_generated import ProductQuestionGenerated
from apps.bbs_marketplace.marketplace.doctype.product_review.product_review_generated import ProductReviewGenerated
from apps.bbs_marketplace.marketplace.doctype.recently_viewed_product.recently_viewed_product_generated import RecentlyViewedProductGenerated
from apps.bbs_marketplace.marketplace.doctype.return_request.return_request_generated import ReturnRequestGenerated
from apps.bbs_marketplace.marketplace.doctype.return_request_item.return_request_item_generated import ReturnRequestItemGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_ad.seller_ad_generated import SellerAdGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_ad_listing.seller_ad_listing_generated import SellerAdListingGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_closed_date.seller_closed_date_generated import SellerClosedDateGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_gallery_image.seller_gallery_image_generated import SellerGalleryImageGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_kyc_document.seller_kyc_document_generated import SellerKycDocumentGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_notice.seller_notice_generated import SellerNoticeGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_order.seller_order_generated import SellerOrderGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_order_item.seller_order_item_generated import SellerOrderItemGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_payout_account.seller_payout_account_generated import SellerPayoutAccountGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_plan.seller_plan_generated import SellerPlanGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_social_link.seller_social_link_generated import SellerSocialLinkGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_subscription.seller_subscription_generated import SellerSubscriptionGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_tag.seller_tag_generated import SellerTagGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_wallet_transaction.seller_wallet_transaction_generated import SellerWalletTransactionGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_withdrawal.seller_withdrawal_generated import SellerWithdrawalGenerated
from apps.bbs_marketplace.marketplace.doctype.seller_working_hours.seller_working_hours_generated import SellerWorkingHoursGenerated
from apps.bbs_marketplace.marketplace.doctype.shipment_event.shipment_event_generated import ShipmentEventGenerated
from apps.bbs_marketplace.marketplace.doctype.size_chart_row.size_chart_row_generated import SizeChartRowGenerated
from apps.bbs_marketplace.marketplace.doctype.wallet_bill_invoice.wallet_bill_invoice_generated import WalletBillInvoiceGenerated
from apps.bbs_marketplace.marketplace.doctype.wallet_bill_payment.wallet_bill_payment_generated import WalletBillPaymentGenerated

class AdPackage(AdPackageGenerated):
    class Meta:
        db_table = 'tabAd Package'
        verbose_name = 'Ad Package'
        ordering = ['-modified']


class CampaignListing(CampaignListingGenerated):
    class Meta:
        db_table = 'tabCampaign Listing'
        verbose_name = 'Campaign Listing'
        ordering = ['-creation']


class CategoryAttribute(CategoryAttributeGenerated):
    class Meta:
        db_table = 'tabCategory Attribute'
        verbose_name = 'Category Attribute'
        ordering = ['-creation']


class CommissionRule(CommissionRuleGenerated):
    class Meta:
        db_table = 'tabCommission Rule'
        verbose_name = 'Commission Rule'
        ordering = ['-modified']


class Courier(CourierGenerated):
    class Meta:
        db_table = 'tabCourier'
        verbose_name = 'Courier'
        ordering = ['-modified']


class CourierRate(CourierRateGenerated):
    class Meta:
        db_table = 'tabCourier Rate'
        verbose_name = 'Courier Rate'
        ordering = ['-creation']


class DeliveryZone(DeliveryZoneGenerated):
    class Meta:
        db_table = 'tabDelivery Zone'
        verbose_name = 'Delivery Zone'
        ordering = ['-modified']


class DeliveryZoneArea(DeliveryZoneAreaGenerated):
    class Meta:
        db_table = 'tabDelivery Zone Area'
        verbose_name = 'Delivery Zone Area'
        ordering = ['-creation']


class ListingAttribute(ListingAttributeGenerated):
    class Meta:
        db_table = 'tabListing Attribute'
        verbose_name = 'Listing Attribute'
        ordering = ['-creation']


class ListingBundleItem(ListingBundleItemGenerated):
    class Meta:
        db_table = 'tabListing Bundle Item'
        verbose_name = 'Listing Bundle Item'
        ordering = ['-creation']


class ListingDigitalFile(ListingDigitalFileGenerated):
    class Meta:
        db_table = 'tabListing Digital File'
        verbose_name = 'Listing Digital File'
        ordering = ['-creation']


class ListingImage(ListingImageGenerated):
    class Meta:
        db_table = 'tabListing Image'
        verbose_name = 'Listing Image'
        ordering = ['-creation']


class ListingPriceTier(ListingPriceTierGenerated):
    class Meta:
        db_table = 'tabListing Price Tier'
        verbose_name = 'Listing Price Tier'
        ordering = ['-creation']


class ListingVariant(ListingVariantGenerated):
    class Meta:
        db_table = 'tabListing Variant'
        verbose_name = 'Listing Variant'
        ordering = ['-creation']


class ListingVariantAxis(ListingVariantAxisGenerated):
    class Meta:
        db_table = 'tabListing Variant Axis'
        verbose_name = 'Listing Variant Axis'
        ordering = ['-creation']


class MarketplaceBanner(MarketplaceBannerGenerated):
    class Meta:
        db_table = 'tabMarketplace Banner'
        verbose_name = 'Marketplace Banner'
        ordering = ['-creation']


class MarketplaceCampaign(MarketplaceCampaignGenerated):
    class Meta:
        db_table = 'tabMarketplace Campaign'
        verbose_name = 'Marketplace Campaign'
        ordering = ['-modified']


class MarketplaceCart(MarketplaceCartGenerated):
    class Meta:
        db_table = 'tabMarketplace Cart'
        verbose_name = 'Marketplace Cart'
        ordering = ['-modified']


class MarketplaceCartItem(MarketplaceCartItemGenerated):
    class Meta:
        db_table = 'tabMarketplace Cart Item'
        verbose_name = 'Marketplace Cart Item'
        ordering = ['-creation']


class MarketplaceFaq(MarketplaceFaqGenerated):
    class Meta:
        db_table = 'tabMarketplace FAQ'
        verbose_name = 'Marketplace FAQ'
        ordering = ['sort_order']


class MarketplaceListing(MarketplaceListingGenerated):
    class Meta:
        db_table = 'tabMarketplace Listing'
        verbose_name = 'Marketplace Listing'
        ordering = ['-modified']


class MarketplaceNotificationLog(MarketplaceNotificationLogGenerated):
    class Meta:
        db_table = 'tabMarketplace Notification Log'
        verbose_name = 'Marketplace Notification Log'
        ordering = ['-creation']


class MarketplaceNotificationTemplate(MarketplaceNotificationTemplateGenerated):
    class Meta:
        db_table = 'tabMarketplace Notification Template'
        verbose_name = 'Marketplace Notification Template'
        ordering = ['-modified']


class MarketplaceOrder(MarketplaceOrderGenerated):
    class Meta:
        db_table = 'tabMarketplace Order'
        verbose_name = 'Marketplace Order'
        ordering = ['-modified']


class MarketplaceOrderItem(MarketplaceOrderItemGenerated):
    class Meta:
        db_table = 'tabMarketplace Order Item'
        verbose_name = 'Marketplace Order Item'
        ordering = ['-creation']


class MarketplacePayment(MarketplacePaymentGenerated):
    class Meta:
        db_table = 'tabMarketplace Payment'
        verbose_name = 'Marketplace Payment'
        ordering = ['-modified']


class MarketplacePaymentMethod(MarketplacePaymentMethodGenerated):
    class Meta:
        db_table = 'tabMarketplace Payment Method'
        verbose_name = 'Marketplace Payment Method'
        ordering = ['-creation']


class MarketplaceSeller(MarketplaceSellerGenerated):
    class Meta:
        db_table = 'tabMarketplace Seller'
        verbose_name = 'Marketplace Seller'
        ordering = ['-modified']


class MarketplaceSellerFollow(MarketplaceSellerFollowGenerated):
    class Meta:
        db_table = 'tabMarketplace Seller Follow'
        verbose_name = 'Marketplace Seller Follow'
        ordering = ['-modified']


class MarketplaceShipment(MarketplaceShipmentGenerated):
    class Meta:
        db_table = 'tabMarketplace Shipment'
        verbose_name = 'Marketplace Shipment'
        ordering = ['-modified']


class MarketplaceSizeChart(MarketplaceSizeChartGenerated):
    class Meta:
        db_table = 'tabMarketplace Size Chart'
        verbose_name = 'Marketplace Size Chart'
        ordering = ['-modified']


class MarketplaceWishlistItem(MarketplaceWishlistItemGenerated):
    class Meta:
        db_table = 'tabMarketplace Wishlist Item'
        verbose_name = 'Marketplace Wishlist Item'
        ordering = ['-modified']


class OrderStatusEvent(OrderStatusEventGenerated):
    class Meta:
        db_table = 'tabOrder Status Event'
        verbose_name = 'Order Status Event'
        ordering = ['-creation']


class PickupStation(PickupStationGenerated):
    class Meta:
        db_table = 'tabPickup Station'
        verbose_name = 'Pickup Station'
        ordering = ['-modified']


class ProductQuestion(ProductQuestionGenerated):
    class Meta:
        db_table = 'tabProduct Question'
        verbose_name = 'Product Question'
        ordering = ['-modified']


class ProductReview(ProductReviewGenerated):
    class Meta:
        db_table = 'tabProduct Review'
        verbose_name = 'Product Review'
        ordering = ['-creation']


class RecentlyViewedProduct(RecentlyViewedProductGenerated):
    class Meta:
        db_table = 'tabRecently Viewed Product'
        verbose_name = 'Recently Viewed Product'
        ordering = ['-modified']


class ReturnRequest(ReturnRequestGenerated):
    class Meta:
        db_table = 'tabReturn Request'
        verbose_name = 'Return Request'
        ordering = ['-modified']


class ReturnRequestItem(ReturnRequestItemGenerated):
    class Meta:
        db_table = 'tabReturn Request Item'
        verbose_name = 'Return Request Item'
        ordering = ['-creation']


class SellerAd(SellerAdGenerated):
    class Meta:
        db_table = 'tabSeller Ad'
        verbose_name = 'Seller Ad'
        ordering = ['-modified']


class SellerAdListing(SellerAdListingGenerated):
    class Meta:
        db_table = 'tabSeller Ad Listing'
        verbose_name = 'Seller Ad Listing'
        ordering = ['-creation']


class SellerClosedDate(SellerClosedDateGenerated):
    class Meta:
        db_table = 'tabSeller Closed Date'
        verbose_name = 'Seller Closed Date'
        ordering = ['-creation']


class SellerGalleryImage(SellerGalleryImageGenerated):
    class Meta:
        db_table = 'tabSeller Gallery Image'
        verbose_name = 'Seller Gallery Image'
        ordering = ['-creation']


class SellerKycDocument(SellerKycDocumentGenerated):
    class Meta:
        db_table = 'tabSeller KYC Document'
        verbose_name = 'Seller KYC Document'
        ordering = ['-creation']


class SellerNotice(SellerNoticeGenerated):
    class Meta:
        db_table = 'tabSeller Notice'
        verbose_name = 'Seller Notice'
        ordering = ['-modified']


class SellerOrder(SellerOrderGenerated):
    class Meta:
        db_table = 'tabSeller Order'
        verbose_name = 'Seller Order'
        ordering = ['-modified']


class SellerOrderItem(SellerOrderItemGenerated):
    class Meta:
        db_table = 'tabSeller Order Item'
        verbose_name = 'Seller Order Item'
        ordering = ['-creation']


class SellerPayoutAccount(SellerPayoutAccountGenerated):
    class Meta:
        db_table = 'tabSeller Payout Account'
        verbose_name = 'Seller Payout Account'
        ordering = ['-creation']


class SellerPlan(SellerPlanGenerated):
    class Meta:
        db_table = 'tabSeller Plan'
        verbose_name = 'Seller Plan'
        ordering = ['-modified']


class SellerSocialLink(SellerSocialLinkGenerated):
    class Meta:
        db_table = 'tabSeller Social Link'
        verbose_name = 'Seller Social Link'
        ordering = ['-creation']


class SellerSubscription(SellerSubscriptionGenerated):
    class Meta:
        db_table = 'tabSeller Subscription'
        verbose_name = 'Seller Subscription'
        ordering = ['-modified']


class SellerTag(SellerTagGenerated):
    class Meta:
        db_table = 'tabSeller Tag'
        verbose_name = 'Seller Tag'
        ordering = ['-creation']


class SellerWalletTransaction(SellerWalletTransactionGenerated):
    class Meta:
        db_table = 'tabSeller Wallet Transaction'
        verbose_name = 'Seller Wallet Transaction'
        ordering = ['-posting_date']


class SellerWithdrawal(SellerWithdrawalGenerated):
    class Meta:
        db_table = 'tabSeller Withdrawal'
        verbose_name = 'Seller Withdrawal'
        ordering = ['-modified']


class SellerWorkingHours(SellerWorkingHoursGenerated):
    class Meta:
        db_table = 'tabSeller Working Hours'
        verbose_name = 'Seller Working Hours'
        ordering = ['-creation']


class ShipmentEvent(ShipmentEventGenerated):
    class Meta:
        db_table = 'tabShipment Event'
        verbose_name = 'Shipment Event'
        ordering = ['-creation']


class SizeChartRow(SizeChartRowGenerated):
    class Meta:
        db_table = 'tabSize Chart Row'
        verbose_name = 'Size Chart Row'
        ordering = ['-creation']


class WalletBillInvoice(WalletBillInvoiceGenerated):
    class Meta:
        db_table = 'tabWallet Bill Invoice'
        verbose_name = 'Wallet Bill Invoice'
        ordering = ['-creation']


class WalletBillPayment(WalletBillPaymentGenerated):
    class Meta:
        db_table = 'tabWallet Bill Payment'
        verbose_name = 'Wallet Bill Payment'
        ordering = ['-modified']


