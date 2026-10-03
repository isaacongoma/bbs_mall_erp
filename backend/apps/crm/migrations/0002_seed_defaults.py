# Ported from crm/install.py's after_install() seed data (frappe/crm, AGPL-3.0)
from django.db import migrations

LEAD_STATUSES = {
    "New": {"color": "gray", "type": "Open", "position": 1},
    "Contacted": {"color": "orange", "type": "Ongoing", "position": 2},
    "Nurture": {"color": "blue", "type": "Ongoing", "position": 3},
    "Qualified": {"color": "green", "type": "Won", "position": 4},
    "Converted": {"color": "teal", "type": "Won", "position": 5},
    "Unqualified": {"color": "red", "type": "Lost", "position": 6},
    "Junk": {"color": "purple", "type": "Lost", "position": 7},
}

DEAL_STATUSES = {
    "Qualification": {"color": "gray", "type": "Open", "probability": 10, "position": 1},
    "Demo/Making": {"color": "orange", "type": "Ongoing", "probability": 25, "position": 2},
    "Proposal/Quotation": {"color": "blue", "type": "Ongoing", "probability": 50, "position": 3},
    "Negotiation": {"color": "yellow", "type": "Ongoing", "probability": 70, "position": 4},
    "Ready to Close": {"color": "purple", "type": "Ongoing", "probability": 90, "position": 5},
    "Won": {"color": "green", "type": "Won", "probability": 100, "position": 6},
    "Lost": {"color": "red", "type": "Lost", "probability": 0, "position": 7},
}

COMMUNICATION_STATUSES = ["Open", "Replied"]

INDUSTRIES = [
    "Accounting", "Advertising", "Aerospace", "Agriculture", "Airline",
    "Apparel & Accessories", "Automotive", "Banking", "Biotechnology", "Broadcasting",
    "Brokerage", "Chemical", "Computer", "Consulting", "Consumer Products",
    "Cosmetics", "Defense", "Department Stores", "Education", "Electronics",
    "Energy", "Entertainment & Leisure, Executive Search", "Financial Services", "Food",
    "Beverage & Tobacco", "Grocery", "Health Care", "Internet Publishing",
    "Investment Banking", "Legal", "Manufacturing", "Motion Picture & Video", "Music",
    "Newspaper Publishers", "Online Auctions", "Pension Funds", "Pharmaceuticals",
    "Private Equity", "Publishing", "Real Estate", "Retail & Wholesale",
    "Securities & Commodity Exchanges", "Service", "Soap & Detergent", "Software",
    "Sports", "Technology", "Telecommunications", "Television", "Transportation",
    "Venture Capital",
]

LEAD_SOURCES = [
    "Email", "Existing Customer", "Reference", "Advertisement", "Cold Calling",
    "Exhibition", "Supplier Reference", "Mass Mailing", "Customer's Vendor",
    "Campaign", "Walk In", "Facebook", "Website", "Web Form",
]

LOST_REASONS = [
    ("Pricing", "The prospect found the pricing to be too high or not competitive."),
    ("Competition", "The prospect chose a competitor's product or service."),
    ("Budget Constraints", "The prospect did not have the budget to proceed with the purchase."),
    ("Missing Features", "The prospect felt that the product or service was missing key features they needed."),
    ("Long Sales Cycle", "The sales process took too long, leading to loss of interest."),
    ("No Decision-Maker", "The prospect was not the decision-maker and could not proceed."),
    ("Unresponsive Prospect", "The prospect did not respond to follow-ups."),
    ("Poor Fit", "The prospect was not a good fit for the product or service."),
    ("Other", ""),
]

CURRENCIES = ["USD", "EUR", "GBP", "INR", "KES"]


def seed_defaults(apps, schema_editor):
    CRMLeadStatus = apps.get_model("crm", "CRMLeadStatus")
    CRMDealStatus = apps.get_model("crm", "CRMDealStatus")
    CRMCommunicationStatus = apps.get_model("crm", "CRMCommunicationStatus")
    CRMIndustry = apps.get_model("crm", "CRMIndustry")
    CRMLeadSource = apps.get_model("crm", "CRMLeadSource")
    CRMLostReason = apps.get_model("crm", "CRMLostReason")
    Currency = apps.get_model("crm", "Currency")
    FCRMSettings = apps.get_model("crm", "FCRMSettings")

    for name, fields in LEAD_STATUSES.items():
        CRMLeadStatus.objects.get_or_create(name=name, defaults=fields)

    for name, fields in DEAL_STATUSES.items():
        CRMDealStatus.objects.get_or_create(name=name, defaults=fields)

    for status in COMMUNICATION_STATUSES:
        CRMCommunicationStatus.objects.get_or_create(name=status)

    for industry in INDUSTRIES:
        CRMIndustry.objects.get_or_create(name=industry)

    for source in LEAD_SOURCES:
        CRMLeadSource.objects.get_or_create(name=source)

    for reason, description in LOST_REASONS:
        CRMLostReason.objects.get_or_create(name=reason, defaults={"description": description})

    for code in CURRENCIES:
        Currency.objects.get_or_create(name=code)

    FCRMSettings.objects.get_or_create(id=1, defaults={"currency": "USD"})


def unseed_defaults(apps, schema_editor):
    apps.get_model("crm", "CRMLeadStatus").objects.filter(name__in=LEAD_STATUSES.keys()).delete()
    apps.get_model("crm", "CRMDealStatus").objects.filter(name__in=DEAL_STATUSES.keys()).delete()
    apps.get_model("crm", "CRMCommunicationStatus").objects.filter(name__in=COMMUNICATION_STATUSES).delete()
    apps.get_model("crm", "CRMIndustry").objects.filter(name__in=INDUSTRIES).delete()
    apps.get_model("crm", "CRMLeadSource").objects.filter(name__in=LEAD_SOURCES).delete()
    apps.get_model("crm", "CRMLostReason").objects.filter(name__in=[r for r, _ in LOST_REASONS]).delete()
    apps.get_model("crm", "Currency").objects.filter(name__in=CURRENCIES).delete()
    apps.get_model("crm", "FCRMSettings").objects.filter(id=1).delete()


class Migration(migrations.Migration):
    dependencies = [("crm", "0001_initial")]
    operations = [migrations.RunPython(seed_defaults, unseed_defaults)]
