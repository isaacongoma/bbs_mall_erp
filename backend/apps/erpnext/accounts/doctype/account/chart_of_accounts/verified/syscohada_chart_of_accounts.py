import json
from pathlib import Path

syscohada_countries = [
    "bj",
    "bf",
    "cm",
    "cf",
    "ci",
    "cg",
    "km",
    "ga",
    "gn",
    "gw",
    "gq",
    "ml",
    "ne",
    "cd",
    "sn",
    "td",
    "tg",
]

folder = Path(__file__).parent
generic_charts = Path(folder).glob("syscohada*.json")

for file in generic_charts:
    with open(file) as f:
        chart = json.load(f)
    for country in syscohada_countries:
        chart["country_code"] = country
        json_object = json.dumps(chart, indent=4)
        with open(Path(folder, file.name.replace("syscohada", country)), "w") as outfile:
            outfile.write(json_object)
