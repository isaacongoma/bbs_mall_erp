import os

os.makedirs('D:/Clients/BBS-ERP/backend/apps/frappe/types', exist_ok=True)
with open('D:/Clients/BBS-ERP/backend/apps/frappe/types/__init__.py', 'w') as f:
    pass
with open('D:/Clients/BBS-ERP/backend/apps/frappe/types/filter.py', 'w') as f:
    f.write('Filters = ...\nFilterSignature = ...\nFilterTuple = ...\n')

with open('D:/Clients/BBS-ERP/backend/apps/frappe/locale.py', 'w') as f:
    f.write('def get_date_format(): return "yyyy-mm-dd"\ndef get_first_day_of_the_week(): return "Sunday"\ndef get_number_format(): return "#,###.##"\ndef get_time_format(): return "HH:mm:ss"\n')

with open('D:/Clients/BBS-ERP/backend/apps/frappe/utils/deprecations.py', 'w') as f:
    f.write('def deprecated(func=None, *, message=None, category=None):\n    if func is None:\n        return lambda f: f\n    return func\n')

with open('D:/Clients/BBS-ERP/backend/apps/frappe/deprecation_dumpster.py', 'w') as f:
    f.write('def get_number_format_info(format): return None\n')

print('Created mocks!')
