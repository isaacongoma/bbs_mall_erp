def name_filter(model, name):
    primary = model._meta.pk
    if primary.name != "name" and any(field.name == "name" for field in model._meta.fields):
        return {"name": name}
    return {"pk": name}
