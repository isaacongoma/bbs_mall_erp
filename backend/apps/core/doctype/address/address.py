# Ported from Frappe's core "Address" doctype (frappe/frappe, MIT), scoped to
# the fields crm/install.py's Address-Quick Entry layout actually uses.
# Frappe's real Address is far larger (multi-link via Dynamic Link child
# table, GPS fields, etc.); Contact/CRM Organization here reference a single
# Address by a plain Link field, so this only carries what's addressed
# (title/type/lines/city/state/country/pincode) rather than the full doctype.
import uuid

from django.db import models

ADDRESS_TYPE_CHOICES = [
    (c, c) for c in (
        "Billing", "Shipping", "Office", "Personal", "Plant",
        "Postal", "Shop", "Subsidiary", "Warehouse", "Current", "Permanent", "Other",
    )
]

# Frappe's real Country doctype is a Link to ~195 seeded records; modeled
# here as a fixed Select instead of a full separate lookup doctype+table,
# same tradeoff as Address itself -- still a real dropdown of every country,
# just not independently creatable/editable the way the source is.
COUNTRY_CHOICES = [
    (c, c) for c in (
        "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia",
        "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
        "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina",
        "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia",
        "Cameroon", "Canada", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo",
        "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti",
        "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Estonia", "Eswatini",
        "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany",
        "Ghana", "Greece", "Guatemala", "Guinea", "Guyana", "Haiti", "Honduras", "Hungary",
        "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
        "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait",
        "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
        "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia",
        "Maldives", "Mali", "Malta", "Mauritania", "Mauritius", "Mexico", "Moldova", "Monaco",
        "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nepal",
        "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea",
        "North Macedonia", "Norway", "Oman", "Pakistan", "Panama", "Papua New Guinea",
        "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia",
        "Rwanda", "Saudi Arabia", "Senegal", "Serbia", "Sierra Leone", "Singapore", "Slovakia",
        "Slovenia", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain",
        "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
        "Tajikistan", "Tanzania", "Thailand", "Togo", "Trinidad and Tobago", "Tunisia",
        "Turkey", "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates",
        "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam",
        "Yemen", "Zambia", "Zimbabwe",
    )
]


class Address(models.Model):
    doctype_label = "Address"

    name = models.CharField(max_length=140, primary_key=True, editable=False)  # autoname: hash
    address_title = models.CharField(max_length=140, blank=True)
    address_type = models.CharField(max_length=20, choices=ADDRESS_TYPE_CHOICES, default="Billing")
    address_line1 = models.CharField(max_length=240, blank=True)
    address_line2 = models.CharField(max_length=240, blank=True)
    city = models.CharField(max_length=140, blank=True)
    state = models.CharField(max_length=140, blank=True)
    country = models.CharField(max_length=140, choices=COUNTRY_CHOICES, blank=True)
    pincode = models.CharField(max_length=20, blank=True)

    class Meta:
        app_label = "core"
        db_table = "address"
        verbose_name = "Address"
        verbose_name_plural = "Addresses"

    def __str__(self):
        return self.address_title or self.name

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = uuid.uuid4().hex[:10]
        super().save(*args, **kwargs)
