# Ported from crm/api/dashboard.py (frappe/crm, AGPL-3.0)
import calendar
from datetime import date, datetime, timedelta

from django.db.models import Avg, Case, Count, DurationField, ExpressionWrapper, F, Q, Sum, Value, When, FloatField, CharField
from django.db.models.functions import Coalesce, TruncDate, TruncMonth, Cast

from apps.crm.doctype.dashboard.dashboard import create_default_manager_dashboard
from apps.crm.doctype.deal.deal import CRMDeal
from apps.crm.doctype.lead.lead import CRMLead
from apps.crm.doctype.settings.settings import FCRMSettings


def _first_day(d: date) -> date:
    return d.replace(day=1)


def _last_day(d: date) -> date:
    return d.replace(day=calendar.monthrange(d.year, d.month)[1])


def _period_bounds(from_date: date, to_date: date):
    diff = (to_date - from_date).days or 1
    prev_from_date = from_date - timedelta(days=diff)
    to_date_plus_one = to_date + timedelta(days=1)
    return diff, prev_from_date, to_date_plus_one


def _pct_delta(current, previous):
    return (current - previous) / previous * 100 if previous else 0


def get_base_currency_symbol() -> str:
    from apps.crm.doctype.currency.currency import Currency

    base_currency = FCRMSettings.get_solo().currency or "USD"
    return Currency.objects.filter(pk=base_currency).values_list("symbol", flat=True).first() or ""


def get_chart_options() -> dict:
    from django.utils.translation import gettext as _

    return {
        "chart_types": [
            {"label": _("Spacer"), "value": "spacer"},
            {"label": _("Number Chart"), "value": "number_chart"},
            {"label": _("Axis Chart"), "value": "axis_chart"},
            {"label": _("Donut Chart"), "value": "donut_chart"},
        ],
        "number_chart": [
            {"label": _("Total Leads"), "value": "total_leads"},
            {"label": _("Ongoing Deals"), "value": "ongoing_deals"},
            {"label": _("Avg Ongoing Deal Value"), "value": "average_ongoing_deal_value"},
            {"label": _("Won Deals"), "value": "won_deals"},
            {"label": _("Avg Won Deal Value"), "value": "average_won_deal_value"},
            {"label": _("Avg Deal Value"), "value": "average_deal_value"},
            {"label": _("Avg Time to Close a Lead"), "value": "average_time_to_close_a_lead"},
            {"label": _("Avg Time to Close a Deal"), "value": "average_time_to_close_a_deal"},
        ],
        "axis_chart": [
            {"label": _("Sales Trend"), "value": "sales_trend"},
            {"label": _("Forecasted Revenue"), "value": "forecasted_revenue"},
            {"label": _("Funnel Conversion"), "value": "funnel_conversion"},
            {"label": _("Deals by Ongoing & Won Stage"), "value": "deals_by_stage_axis"},
            {"label": _("Lost Deal Reasons"), "value": "lost_deal_reasons"},
            {"label": _("Deals by Territory"), "value": "deals_by_territory"},
            {"label": _("Deals by Salesperson"), "value": "deals_by_salesperson"},
        ],
        "donut_chart": [
            {"label": _("Deals by Stage"), "value": "deals_by_stage_donut"},
            {"label": _("Leads by Source"), "value": "leads_by_source"},
            {"label": _("Deals by Source"), "value": "deals_by_source"},
        ],
    }


def get_dashboard(from_date: str | None = None, to_date: str | None = None, user=None) -> list:
    import json

    today = date.today()
    from_d = datetime.fromisoformat(from_date).date() if from_date else _first_day(today)
    to_d = datetime.fromisoformat(to_date).date() if to_date else _last_day(today)

    from apps.crm.doctype.dashboard.dashboard import CRMDashboard

    dashboard = CRMDashboard.objects.filter(pk="Manager Dashboard").first()
    layout = json.loads(dashboard.layout) if dashboard else json.loads(create_default_manager_dashboard())

    for item in layout:
        fn = globals().get(f"get_{item['name']}")
        item["data"] = fn(from_d, to_d, user) if fn else None
    return layout


def get_chart(name: str, type: str, from_date: str | None = None, to_date: str | None = None, user: str | None = None):
    from django.utils.translation import gettext as _

    options = get_chart_options()
    
    # Flatten all option values from the dict (which contains lists of dicts except for 'chart_types')
    valid_chart_names = set()
    for key, values in options.items():
        if key != 'chart_types':
            for option in values:
                valid_chart_names.add(option["value"])
                
    if name not in valid_chart_names:
        return {"error": _("Invalid chart name")}

    today = date.today()
    from_d = datetime.fromisoformat(from_date).date() if from_date else _first_day(today)
    to_d = datetime.fromisoformat(to_date).date() if to_date else _last_day(today)

    fn = globals().get(f"get_{name}")
    if fn:
        return fn(from_d, to_d, user)

    return {"error": _("Invalid chart name")}


def reset_to_default():
    create_default_manager_dashboard(force=True)


def get_total_leads(from_date: date, to_date: date, user=None) -> dict:
    diff, prev_from_date, to_date_plus_one = _period_bounds(from_date, to_date)

    qs = CRMLead.objects.all()
    if user:
        qs = qs.filter(lead_owner_id=user)

    current = qs.filter(creation__date__gte=from_date, creation__date__lt=to_date_plus_one).count()
    previous = qs.filter(creation__date__gte=prev_from_date, creation__date__lt=from_date).count()

    return {
        "title": "Total leads", "tooltip": "Total number of leads",
        "value": current, "delta": _pct_delta(current, previous), "deltaSuffix": "%",
    }


def get_ongoing_deals(from_date: date, to_date: date, user=None) -> dict:
    diff, prev_from_date, to_date_plus_one = _period_bounds(from_date, to_date)

    qs = CRMDeal.objects.exclude(status__type__in=["Won", "Lost"])
    if user:
        qs = qs.filter(deal_owner_id=user)

    current = qs.filter(creation__date__gte=from_date, creation__date__lt=to_date_plus_one).count()
    previous = qs.filter(creation__date__gte=prev_from_date, creation__date__lt=from_date).count()

    return {
        "title": "Ongoing deals", "tooltip": "Total number of non won/lost deals",
        "value": current, "delta": _pct_delta(current, previous), "deltaSuffix": "%",
    }


def get_average_ongoing_deal_value(from_date: date, to_date: date, user=None) -> dict:
    diff, prev_from_date, to_date_plus_one = _period_bounds(from_date, to_date)

    qs = CRMDeal.objects.exclude(status__type__in=["Won", "Lost"])
    if user:
        qs = qs.filter(deal_owner_id=user)

    value_expr = ExpressionWrapper(F("deal_value") * Coalesce(F("exchange_rate"), 1.0), output_field=FloatField())
    current = qs.filter(creation__date__gte=from_date, creation__date__lt=to_date_plus_one).aggregate(
        avg=Avg(value_expr)
    )["avg"] or 0
    previous = qs.filter(creation__date__gte=prev_from_date, creation__date__lt=from_date).aggregate(
        avg=Avg(value_expr)
    )["avg"] or 0

    return {
        "title": "Avg. ongoing deal value", "tooltip": "Average deal value of non won/lost deals",
        "value": current, "delta": current - previous if previous else 0,
        "prefix": get_base_currency_symbol(),
    }


def get_won_deals(from_date: date, to_date: date, user=None) -> dict:
    diff, prev_from_date, to_date_plus_one = _period_bounds(from_date, to_date)

    qs = CRMDeal.objects.filter(status__type="Won")
    if user:
        qs = qs.filter(deal_owner_id=user)

    current = qs.filter(closed_date__gte=from_date, closed_date__lt=to_date_plus_one).count()
    previous = qs.filter(closed_date__gte=prev_from_date, closed_date__lt=from_date).count()

    return {
        "title": "Won deals", "tooltip": "Total number of won deals based on its closure date",
        "value": current, "delta": _pct_delta(current, previous), "deltaSuffix": "%",
    }


def get_average_won_deal_value(from_date: date, to_date: date, user=None) -> dict:
    diff, prev_from_date, to_date_plus_one = _period_bounds(from_date, to_date)

    qs = CRMDeal.objects.filter(status__type="Won")
    if user:
        qs = qs.filter(deal_owner_id=user)

    value_expr = ExpressionWrapper(F("deal_value") * Coalesce(F("exchange_rate"), 1.0), output_field=FloatField())
    current = qs.filter(closed_date__gte=from_date, closed_date__lt=to_date_plus_one).aggregate(
        avg=Avg(value_expr)
    )["avg"] or 0
    previous = qs.filter(closed_date__gte=prev_from_date, closed_date__lt=from_date).aggregate(
        avg=Avg(value_expr)
    )["avg"] or 0

    return {
        "title": "Avg. won deal value", "tooltip": "Average deal value of won deals",
        "value": current, "delta": current - previous if previous else 0,
        "prefix": get_base_currency_symbol(),
    }


def get_average_deal_value(from_date: date, to_date: date, user=None) -> dict:
    diff, prev_from_date, to_date_plus_one = _period_bounds(from_date, to_date)

    qs = CRMDeal.objects.exclude(status__type="Lost")
    if user:
        qs = qs.filter(deal_owner_id=user)

    value_expr = ExpressionWrapper(F("deal_value") * Coalesce(F("exchange_rate"), 1.0), output_field=FloatField())
    current = qs.filter(creation__date__gte=from_date, creation__date__lt=to_date_plus_one).aggregate(
        avg=Avg(value_expr)
    )["avg"] or 0
    previous = qs.filter(creation__date__gte=prev_from_date, creation__date__lt=from_date).aggregate(
        avg=Avg(value_expr)
    )["avg"] or 0

    return {
        "title": "Avg. deal value", "tooltip": "Average deal value of ongoing & won deals",
        "value": current, "prefix": get_base_currency_symbol(),
        "delta": current - previous if previous else 0, "deltaSuffix": "%",
    }


def _avg_days_to_close(qs, closed_from, closed_to, creation_field="creation"):
    duration_expr = ExpressionWrapper(F("closed_date") - F(creation_field), output_field=DurationField())
    result = qs.filter(closed_date__gte=closed_from, closed_date__lt=closed_to).aggregate(avg=Avg(duration_expr))
    avg_duration = result["avg"]
    return avg_duration.total_seconds() / 86400 if avg_duration else 0


def get_average_time_to_close_a_lead(from_date: date, to_date: date, user=None) -> dict:
    diff, prev_from_date, to_date_plus_one = _period_bounds(from_date, to_date)
    prev_to_date = from_date

    qs = CRMDeal.objects.filter(status__type="Won", closed_date__isnull=False).annotate(
        lead_creation=Coalesce("lead__creation", "creation")
    )
    if user:
        qs = qs.filter(deal_owner_id=user)

    current_avg = _avg_days_to_close(qs, from_date, to_date_plus_one, creation_field="lead_creation")
    previous_avg = _avg_days_to_close(qs, prev_from_date, prev_to_date, creation_field="lead_creation")

    return {
        "title": "Avg. time to close a lead",
        "tooltip": "Average time taken from lead creation to deal closure",
        "value": current_avg, "suffix": " days",
        "delta": current_avg - previous_avg if previous_avg else 0,
        "deltaSuffix": " days", "negativeIsBetter": True,
    }


def get_average_time_to_close_a_deal(from_date: date, to_date: date, user=None) -> dict:
    diff, prev_from_date, to_date_plus_one = _period_bounds(from_date, to_date)
    prev_to_date = from_date

    qs = CRMDeal.objects.filter(status__type="Won", closed_date__isnull=False)
    if user:
        qs = qs.filter(deal_owner_id=user)

    current_avg = _avg_days_to_close(qs, from_date, to_date_plus_one)
    previous_avg = _avg_days_to_close(qs, prev_from_date, prev_to_date)

    return {
        "title": "Avg. time to close a deal",
        "tooltip": "Average time taken from deal creation to deal closure",
        "value": current_avg, "suffix": " days",
        "delta": current_avg - previous_avg if previous_avg else 0,
        "deltaSuffix": " days", "negativeIsBetter": True,
    }


def get_sales_trend(from_date: date, to_date: date, user=None) -> dict:
    leads_qs = CRMLead.objects.filter(creation__date__gte=from_date, creation__date__lte=to_date)
    if user:
        leads_qs = leads_qs.filter(lead_owner_id=user)
    leads_by_day = {
        row["day"]: row["c"]
        for row in leads_qs.annotate(day=TruncDate("creation")).values("day").annotate(c=Count("name"))
    }

    deals_qs = CRMDeal.objects.filter(creation__date__gte=from_date, creation__date__lte=to_date)
    if user:
        deals_qs = deals_qs.filter(deal_owner_id=user)
    deals_by_day = {
        row["day"]: row for row in deals_qs.annotate(day=TruncDate("creation")).values("day").annotate(
            c=Count("name"), won=Count("name", filter=Q(status__type="Won"))
        )
    }

    all_days = sorted(set(leads_by_day) | set(deals_by_day))
    data = [
        {
            "date": d.strftime("%Y-%m-%d"),
            "leads": leads_by_day.get(d, 0),
            "deals": deals_by_day.get(d, {}).get("c", 0),
            "won_deals": deals_by_day.get(d, {}).get("won", 0),
        }
        for d in all_days
    ]

    return {
        "data": data, "title": "Sales trend", "subtitle": "Daily performance of leads, deals, and wins",
        "xAxis": {"title": "Date", "key": "date", "type": "time", "timeGrain": "day"},
        "yAxis": {"title": "Count"},
        "series": [
            {"name": "leads", "type": "line", "showDataPoints": True},
            {"name": "deals", "type": "line", "showDataPoints": True},
            {"name": "won_deals", "type": "line", "showDataPoints": True},
        ],
    }


def get_forecasted_revenue(from_date: date, to_date: date, user=None) -> dict:
    twelve_months_ago = date.today().replace(day=1) - timedelta(days=365)

    qs = CRMDeal.objects.filter(expected_closure_date__gte=twelve_months_ago)
    if user:
        qs = qs.filter(deal_owner_id=user)

    forecasted_expr = ExpressionWrapper(
        Case(
            When(status__type="Lost", then=ExpressionWrapper(F("expected_deal_value") * Coalesce(F("exchange_rate"), 1.0), output_field=FloatField())),
            default=ExpressionWrapper(F("expected_deal_value") * Coalesce(F("probability"), 0) / 100 * Coalesce(F("exchange_rate"), 1.0), output_field=FloatField()),
        ),
        output_field=FloatField()
    )
    actual_expr = ExpressionWrapper(
        Case(
            When(status__type="Won", then=ExpressionWrapper(F("deal_value") * Coalesce(F("exchange_rate"), 1.0), output_field=FloatField())), default=Value(0.0)
        ),
        output_field=FloatField()
    )

    rows = (
        qs.annotate(month=TruncMonth("expected_closure_date"))
        .values("month")
        .annotate(forecasted=Sum(forecasted_expr), actual=Sum(actual_expr))
        .order_by("month")
    )

    data = [
        {"month": row["month"].strftime("%Y-%m-01"), "forecasted": row["forecasted"] or "", "actual": row["actual"] or ""}
        for row in rows
        if row["month"]
    ]

    return {
        "data": data, "title": "Forecasted revenue", "subtitle": "Projected vs actual revenue based on deal probability",
        "xAxis": {"title": "Month", "key": "month", "type": "time", "timeGrain": "month"},
        "yAxis": {"title": f"Revenue ({get_base_currency_symbol()})"},
        "series": [
            {"name": "forecasted", "type": "line", "showDataPoints": True},
            {"name": "actual", "type": "line", "showDataPoints": True},
        ],
    }


def get_funnel_conversion(from_date: date, to_date: date, user=None) -> dict:
    leads_qs = CRMLead.objects.filter(creation__date__gte=from_date, creation__date__lte=to_date)
    if user:
        leads_qs = leads_qs.filter(lead_owner_id=user)

    result = [{"stage": "Leads", "count": leads_qs.count()}]
    result += get_deal_status_change_counts(from_date, to_date, user)

    return {
        "data": result, "title": "Funnel conversion", "subtitle": "Lead to deal conversion pipeline",
        "xAxis": {"title": "Stage", "key": "stage", "type": "category"},
        "yAxis": {"title": "Count"}, "swapXY": True,
        "series": [{"name": "count", "type": "bar", "echartOptions": {"colorBy": "data"}}],
    }


def get_deal_status_change_counts(from_date: date, to_date: date, user=None) -> list:
    from apps.crm.doctype.status_change_log.status_change_log import CRMStatusChangeLog

    qs = CRMStatusChangeLog.objects.filter(
        parent_deal__isnull=False,
        to_status__isnull=False,
        parent_deal__status__type__in=["Open", "Ongoing", "On Hold", "Won"],
        parent_deal__creation__date__gte=from_date,
        parent_deal__creation__date__lte=to_date,
    ).exclude(to_status="")
    if user:
        qs = qs.filter(parent_deal__deal_owner_id=user)

    rows = (
        qs.values("to_status")
        .annotate(count=Count("id"), position=F("parent_deal__status__position"))
        .order_by("parent_deal__status__position")
    )
    return [{"stage": row["to_status"], "count": row["count"]} for row in rows]


def get_deals_by_stage_donut(from_date: date, to_date: date, user=None) -> dict:
    return _deals_by_stage(from_date, to_date, user, exclude_lost=False, title="Deals by stage")


def get_deals_by_stage_axis(from_date: date, to_date: date, user=None) -> dict:
    result = _deals_by_stage(from_date, to_date, user, exclude_lost=True, title="Deals by ongoing & won stage")
    result["xAxis"] = {"title": "Stage", "key": "stage", "type": "category"}
    result["yAxis"] = {"title": "Count"}
    result["series"] = [{"name": "count", "type": "bar"}]
    return result


def _deals_by_stage(from_date, to_date, user, exclude_lost, title):
    qs = CRMDeal.objects.filter(creation__date__gte=from_date, creation__date__lte=to_date)
    if exclude_lost:
        qs = qs.exclude(status__type="Lost")
    if user:
        qs = qs.filter(deal_owner_id=user)

    rows = qs.values("status").annotate(count=Count("name")).order_by("-count")
    data = [{"stage": row["status"], "count": row["count"]} for row in rows]

    return {
        "data": data, "title": title, "subtitle": "Current pipeline distribution",
        "categoryColumn": "stage", "valueColumn": "count",
    }


def get_lost_deal_reasons(from_date: date, to_date: date, user=None) -> dict:
    qs = CRMDeal.objects.filter(
        creation__date__gte=from_date, creation__date__lte=to_date, status__type="Lost",
        lost_reason__isnull=False,
    ).exclude(lost_reason="")
    if user:
        qs = qs.filter(deal_owner_id=user)

    rows = qs.values("lost_reason").annotate(count=Count("name")).order_by("-count")
    data = [{"reason": row["lost_reason"], "count": row["count"]} for row in rows]

    return {
        "data": data, "title": "Lost deal reasons", "subtitle": "Common reasons for losing deals",
        "xAxis": {"title": "Reason", "key": "reason", "type": "category"},
        "yAxis": {"title": "Count"}, "series": [{"name": "count", "type": "bar"}],
    }


def get_leads_by_source(from_date: date, to_date: date, user=None) -> dict:
    qs = CRMLead.objects.filter(creation__date__gte=from_date, creation__date__lte=to_date)
    if user:
        qs = qs.filter(lead_owner_id=user)

    rows = qs.annotate(src=Coalesce("source", Value("Empty"))).values("src").annotate(
        count=Count("name")
    ).order_by("-count")
    data = [{"source": row["src"], "count": row["count"]} for row in rows]

    return {
        "data": data, "title": "Leads by source", "subtitle": "Lead generation channel analysis",
        "categoryColumn": "source", "valueColumn": "count",
    }


def get_deals_by_source(from_date: date, to_date: date, user=None) -> dict:
    qs = CRMDeal.objects.filter(creation__date__gte=from_date, creation__date__lte=to_date)
    if user:
        qs = qs.filter(deal_owner_id=user)

    rows = qs.annotate(src=Coalesce("source", Value("Empty"))).values("src").annotate(
        count=Count("name")
    ).order_by("-count")
    data = [{"source": row["src"], "count": row["count"]} for row in rows]

    return {
        "data": data, "title": "Deals by source", "subtitle": "Deal generation channel analysis",
        "categoryColumn": "source", "valueColumn": "count",
    }


def get_deals_by_territory(from_date: date, to_date: date, user=None) -> dict:
    qs = CRMDeal.objects.filter(creation__date__gte=from_date, creation__date__lte=to_date)
    if user:
        qs = qs.filter(deal_owner_id=user)

    value_expr = ExpressionWrapper(Coalesce(F("deal_value"), 0.0) * Coalesce(F("exchange_rate"), 1.0), output_field=FloatField())
    rows = (
        qs.annotate(terr=Coalesce("territory", Value("Empty"), output_field=CharField()))
        .values("terr")
        .annotate(deals=Count("name"), value=Sum(value_expr))
        .order_by("-deals", "-value")
    )
    data = [{"territory": row["terr"], "deals": row["deals"], "value": row["value"] or 0} for row in rows]

    return {
        "data": data, "title": "Deals by territory", "subtitle": "Geographic distribution of deals and revenue",
        "xAxis": {"title": "Territory", "key": "territory", "type": "category"},
        "yAxis": {"title": "Number of deals"},
        "y2Axis": {"title": f"Deal value ({get_base_currency_symbol()})"},
        "series": [
            {"name": "deals", "type": "bar"},
            {"name": "value", "type": "line", "showDataPoints": True, "axis": "y2"},
        ],
    }


def get_deals_by_salesperson(from_date: date, to_date: date, user=None) -> dict:
    qs = CRMDeal.objects.filter(creation__date__gte=from_date, creation__date__lte=to_date)
    if user:
        qs = qs.filter(deal_owner_id=user)

    value_expr = ExpressionWrapper(Coalesce(F("deal_value"), 0.0) * Coalesce(F("exchange_rate"), 1.0), output_field=FloatField())
    rows = (
        qs.annotate(salesperson=Coalesce("deal_owner__first_name", Cast("deal_owner_id", CharField()), output_field=CharField()))
        .values("salesperson")
        .annotate(deals=Count("name"), value=Sum(value_expr))
        .order_by("-deals", "-value")
    )
    data = [{"salesperson": row["salesperson"], "deals": row["deals"], "value": row["value"] or 0} for row in rows]

    return {
        "data": data, "title": "Deals by salesperson", "subtitle": "Number of deals and total value per salesperson",
        "xAxis": {"title": "Salesperson", "key": "salesperson", "type": "category"},
        "yAxis": {"title": "Number of deals"},
        "y2Axis": {"title": f"Deal value ({get_base_currency_symbol()})"},
        "series": [
            {"name": "deals", "type": "bar"},
            {"name": "value", "type": "line", "showDataPoints": True, "axis": "y2"},
        ],
    }
