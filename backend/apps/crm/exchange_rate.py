# Ported from crm/api/exchange_rate.py (frappe/crm, AGPL-3.0)
from datetime import date as date_cls

import requests
from django.core.cache import cache

from apps.crm.doctype.settings.settings import FCRMSettings


class ExchangeRateError(Exception):
    pass


def get_exchange_rate(from_currency: str, to_currency: str, date: str | None = None) -> float:
    if not date:
        date = "latest"

    cache_date = date_cls.today().isoformat() if date == "latest" else date
    cache_key = f"exchange_rate_{from_currency}_{to_currency}_{cache_date}"

    cached_rate = cache.get(cache_key)
    if cached_rate is not None:
        return cached_rate

    rate, api_used = _fetch_exchange_rate(from_currency, to_currency, date)
    if rate is not None:
        cache.set(cache_key, rate, timeout=None)
        return rate

    _raise_exchange_rate_error(from_currency, to_currency, date, api_used)


def _fetch_exchange_rate(from_currency: str, to_currency: str, date: str):
    settings = FCRMSettings.get_solo()
    provider = settings.service_provider

    if provider == "exchangerate.host":
        return _fetch_from_exchangerate_host(settings, from_currency, to_currency, date), provider
    if provider == "exchangerate-api":
        return _fetch_from_exchangerate_api(settings, from_currency, to_currency), provider
    if provider == "frankfurter.app":
        rate = _fetch_from_frankfurter(from_currency, to_currency, date)
        if rate is not None:
            return rate, provider
        return _fetch_from_fawaz_api(from_currency, to_currency, date), "fawazahmed-exchange-api"
    if provider == "fawazahmed-exchange-api":
        rate = _fetch_from_fawaz_api(from_currency, to_currency, date)
        if rate is not None:
            return rate, provider
        return _fetch_from_frankfurter(from_currency, to_currency, date), "frankfurter"

    rate = _fetch_from_frankfurter(from_currency, to_currency, date)
    if rate is not None:
        return rate, "frankfurter"
    return _fetch_from_fawaz_api(from_currency, to_currency, date), "fawazahmed-exchange-api"


def _fetch_from_frankfurter(from_currency: str, to_currency: str, date: str):
    try:
        res = requests.get(
            f"https://api.frankfurter.app/{date}?from={from_currency}&to={to_currency}", timeout=5
        )
        if res.ok:
            return res.json().get("rates", {}).get(to_currency)
    except requests.RequestException:
        pass
    return None


def _fetch_from_fawaz_api(from_currency: str, to_currency: str, date: str):
    from_lower = from_currency.lower()
    to_lower = to_currency.lower()
    date_str = "latest" if date == "latest" else date
    urls = [
        f"https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{date_str}/v1/currencies/{from_lower}.json",
        f"https://{date_str}.currency-api.pages.dev/v1/currencies/{from_lower}.json",
    ]
    for url in urls:
        try:
            res = requests.get(url, timeout=5)
            if res.ok:
                return res.json()[from_lower][to_lower]
        except (requests.RequestException, KeyError):
            continue
    return None


def _fetch_from_exchangerate_host(settings: FCRMSettings, from_currency: str, to_currency: str, date: str):
    if not settings.access_key:
        raise ExchangeRateError(f"Access Key is required for Service Provider: {settings.service_provider}")
    params = {"access_key": settings.access_key, "from": from_currency, "to": to_currency, "amount": 1}
    if date != "latest":
        params["date"] = date
    res = requests.get("https://api.exchangerate.host/convert", params=params, timeout=5)
    if res.ok:
        return res.json()["result"]
    return None


def _fetch_from_exchangerate_api(settings: FCRMSettings, from_currency: str, to_currency: str):
    if not settings.access_key:
        raise ExchangeRateError(f"Access Key is required for Service Provider: {settings.service_provider}")
    res = requests.get(
        f"https://v6.exchangerate-api.com/v6/{settings.access_key}/pair/{from_currency}/{to_currency}",
        timeout=5,
    )
    if res.ok:
        data = res.json()
        if data["result"] == "success":
            return data["conversion_rate"]
    return None


def _raise_exchange_rate_error(from_currency: str, to_currency: str, date: str, api_used: str | None):
    if api_used == "frankfurter":
        raise ExchangeRateError(
            "Set up an Exchange Rate Provider other than 'Frankfurter' in settings, as the default "
            f"provider does not support currency conversion for {from_currency} to {to_currency}."
        )
    raise ExchangeRateError(
        f"Failed to fetch exchange rate from {from_currency} to {to_currency} on {date}. "
        "Please check your internet connection or try again later."
    )
