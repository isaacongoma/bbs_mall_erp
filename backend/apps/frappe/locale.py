def get_date_format(): return "yyyy-mm-dd"
def get_first_day_of_the_week(): return "Sunday"
def get_number_format():
    from apps.frappe.utils.number_format import NumberFormat

    return NumberFormat.from_string("#,###.##")
def get_time_format(): return "HH:mm:ss"
