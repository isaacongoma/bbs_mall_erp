#!/bin/bash
cd /d/Clients/BBS-ERP/backend
db="$1"; shift
for area in "$@"; do
  TEST_DATABASE_NAME="${db}" ./.venv/Scripts/python.exe manage.py test --noinput --keepdb "apps.${area}" > "/tmp/area_${area//./_}.log" 2>&1
  echo "$area: $(grep -E '^(Ran|OK|FAILED)' /tmp/area_${area//./_}.log | tr '\n' ' ')" >> /tmp/area_summary.txt
done
