# Ported from crm/fcrm/doctype/crm_dashboard/crm_dashboard.py (frappe/crm, AGPL-3.0)
from django.db import models

DEFAULT_MANAGER_DASHBOARD_LAYOUT = (
    '[{"name":"total_leads","type":"number_chart","tooltip":"Total number of leads","layout":{"x":0,"y":0,"w":4,"h":3,"i":"total_leads"}},'
    '{"name":"ongoing_deals","type":"number_chart","tooltip":"Total number of ongoing deals","layout":{"x":8,"y":0,"w":4,"h":3,"i":"ongoing_deals"}},'
    '{"name":"won_deals","type":"number_chart","tooltip":"Total number of won deals","layout":{"x":12,"y":0,"w":4,"h":3,"i":"won_deals"}},'
    '{"name":"average_won_deal_value","type":"number_chart","tooltip":"Average value of won deals","layout":{"x":16,"y":0,"w":4,"h":3,"i":"average_won_deal_value"}},'
    '{"name":"average_deal_value","type":"number_chart","tooltip":"Average deal value of ongoing and won deals","layout":{"x":0,"y":2,"w":4,"h":3,"i":"average_deal_value"}},'
    '{"name":"average_time_to_close_a_lead","type":"number_chart","tooltip":"Average time taken to close a lead","layout":{"x":4,"y":0,"w":4,"h":3,"i":"average_time_to_close_a_lead"}},'
    '{"name":"average_time_to_close_a_deal","type":"number_chart","layout":{"x":4,"y":2,"w":4,"h":3,"i":"average_time_to_close_a_deal"}},'
    '{"name":"spacer","type":"spacer","layout":{"x":8,"y":2,"w":12,"h":3,"i":"spacer"}},'
    '{"name":"sales_trend","type":"axis_chart","layout":{"x":0,"y":4,"w":10,"h":9,"i":"sales_trend"}},'
    '{"name":"forecasted_revenue","type":"axis_chart","layout":{"x":10,"y":4,"w":10,"h":9,"i":"forecasted_revenue"}},'
    '{"name":"funnel_conversion","type":"axis_chart","layout":{"x":0,"y":11,"w":10,"h":9,"i":"funnel_conversion"}},'
    '{"name":"deals_by_stage_donut","type":"donut_chart","layout":{"x":10,"y":11,"w":10,"h":9,"i":"deals_by_stage_donut"}},'
    '{"name":"lost_deal_reasons","type":"axis_chart","layout":{"x":0,"y":32,"w":20,"h":9,"i":"lost_deal_reasons"}},'
    '{"name":"leads_by_source","type":"donut_chart","layout":{"x":0,"y":18,"w":10,"h":9,"i":"leads_by_source"}},'
    '{"name":"deals_by_source","type":"donut_chart","layout":{"x":10,"y":18,"w":10,"h":9,"i":"deals_by_source"}},'
    '{"name":"deals_by_territory","type":"axis_chart","layout":{"x":0,"y":25,"w":10,"h":9,"i":"deals_by_territory"}},'
    '{"name":"deals_by_salesperson","type":"axis_chart","layout":{"x":10,"y":25,"w":10,"h":9,"i":"deals_by_salesperson"}}]'
)


class CRMDashboard(models.Model):
    name = models.CharField(max_length=140, primary_key=True)
    title = models.CharField(max_length=140)
    layout = models.TextField(blank=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_dashboard"
        verbose_name = "CRM Dashboard"

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = self.title
        super().save(*args, **kwargs)


def create_default_manager_dashboard(force: bool = False) -> str:
    dashboard, created = CRMDashboard.objects.get_or_create(
        name="Manager Dashboard",
        defaults={"title": "Manager Dashboard", "layout": DEFAULT_MANAGER_DASHBOARD_LAYOUT},
    )
    if not created and force:
        dashboard.layout = DEFAULT_MANAGER_DASHBOARD_LAYOUT
        dashboard.save()
    return dashboard.layout
