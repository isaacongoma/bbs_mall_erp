from apps.frappe.utils.data import (
    add_to_date,
    get_first_day,
    get_first_day_of_week,
    get_last_day,
    get_last_day_of_week,
    get_quarter_ending,
    get_quarter_start,
    get_year_ending,
    get_year_start,
    getdate,
)


def get_period_ending(date, timegrain):
    return getdate(
        {
            "Daily": date,
            "Weekly": get_last_day_of_week(date),
            "Monthly": get_last_day(date),
            "Quarterly": get_quarter_ending(date),
            "Yearly": get_year_ending(date),
        }[timegrain]
    )


def get_dates_from_timegrain(from_date, to_date, timegrain="Daily"):
    from_date = getdate(from_date)
    to_date = getdate(to_date)
    days = months = years = 0
    if timegrain == "Daily":
        days = 1
    elif timegrain == "Weekly":
        days = 7
    elif timegrain == "Monthly":
        months = 1
    elif timegrain == "Quarterly":
        months = 3
    elif timegrain == "Yearly":
        months = 1
    dates = [get_period_ending(from_date, timegrain)]
    while getdate(dates[-1]) < getdate(to_date):
        if timegrain == "Weekly":
            date = get_last_day_of_week(add_to_date(dates[-1], years=years, months=months, days=days))
        else:
            date = get_period_ending(add_to_date(dates[-1], years=years, months=months, days=days), timegrain)
        dates.append(date)
    return dates
