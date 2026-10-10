def customer_dashboard(data):
    data["transactions"].append({"label": "Property", "items": ["Lease Agreement", "Maintenance Request", "Mpesa Payment"]})
    data["non_standard_fieldnames"]["Lease Agreement"] = "customer"
    data["non_standard_fieldnames"]["Maintenance Request"] = "customer"
    data["non_standard_fieldnames"]["Mpesa Payment"] = "customer"
    return data
