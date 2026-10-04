import pycountry

import frappe
from frappe import _
from frappe.model.document import Document, bulk_insert


class Country(Document):
    doctype = 'Country'

    _DOCTYPE_NAME = "Country"


    def validate(self):
        error_msg = _("{0} is not a valid ISO 3166 ALPHA-2 code.").format(self.code)
        try:
            country = pycountry.countries.lookup(self.code)
        except LookupError:
            frappe.throw(error_msg)

        if country.alpha_2 != self.code.upper():
            frappe.throw(error_msg)


def import_country_and_currency():
    from frappe.geo.doctype.currency.currency import enable_default_currencies

    countries, currencies = get_countries_and_currencies()

    bulk_insert("Country", countries, ignore_duplicates=True)
    bulk_insert("Currency", currencies, ignore_duplicates=True)

    enable_default_currencies()


def get_countries_and_currencies():
    from frappe.geo.country_info import get_all as get_geo_data

    data = get_geo_data()

    countries = []
    currencies = []

    added_currencies = set()

    for name, country in data.items():
        country = frappe._dict(country)
        countries.append(
            frappe.get_doc(
                doctype="Country",
                name=name,
                country_name=name,
                code=country.code,
                date_format=country.date_format or "dd-mm-yyyy",
                time_format=country.time_format or "HH:mm:ss",
                time_zones="\n".join(country.timezones or []),
            )
        )
        if country.currency and country.currency not in added_currencies:
            added_currencies.add(country.currency)

            currencies.append(
                frappe.get_doc(
                    doctype="Currency",
                    name=country.currency,
                    currency_name=country.currency,
                    fraction=country.currency_fraction,
                    symbol=country.currency_symbol,
                    fraction_units=country.currency_fraction_units,
                    smallest_currency_fraction_value=country.smallest_currency_fraction_value,
                    number_format=frappe.db.escape(country.number_format)[1:-1],
                )
            )

    return countries, currencies


def import_country_and_currency():
    from frappe.geo.doctype.currency.currency import enable_default_currencies

    countries, currencies = get_countries_and_currencies()

    bulk_insert("Country", countries, ignore_duplicates=True)
    bulk_insert("Currency", currencies, ignore_duplicates=True)

    enable_default_currencies()


def get_countries_and_currencies():
    from frappe.geo.country_info import get_all as get_geo_data

    data = get_geo_data()

    countries = []
    currencies = []

    added_currencies = set()

    for name, country in data.items():
        country = frappe._dict(country)
        countries.append(
            frappe.get_doc(
                doctype="Country",
                name=name,
                country_name=name,
                code=country.code,
                date_format=country.date_format or "dd-mm-yyyy",
                time_format=country.time_format or "HH:mm:ss",
                time_zones="\n".join(country.timezones or []),
            )
        )
        if country.currency and country.currency not in added_currencies:
            added_currencies.add(country.currency)

            currencies.append(
                frappe.get_doc(
                    doctype="Currency",
                    name=country.currency,
                    currency_name=country.currency,
                    fraction=country.currency_fraction,
                    symbol=country.currency_symbol,
                    fraction_units=country.currency_fraction_units,
                    smallest_currency_fraction_value=country.smallest_currency_fraction_value,
                    number_format=frappe.db.escape(country.number_format)[1:-1],
                )
            )

    return countries, currencies
