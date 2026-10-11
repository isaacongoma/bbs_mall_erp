#!/bin/bash
# Usage: run_module_tests.sh <module> [database]
# Runs every ported test file of apps/erpnext/<module> one at a time against a kept test database
# and writes one summary line per file to /tmp/sweep_<module>_summary.txt.
module="$1"
db="${2:-test_sweep_selling}"
cd /d/Clients/BBS-ERP/backend
summary="/tmp/sweep_${module}_summary.txt"
logdir="/tmp/sweep_${module}"
mkdir -p "$logdir"
: > "$summary"
for file in $(find "apps/erpnext/$module" -name "test_*.py" | sort); do
  label=$(echo "${file%.py}" | tr '/' '.')
  name=$(basename "$file" .py)
  start=$(date +%s)
  TEST_DATABASE_NAME="$db" timeout 900 ./.venv/Scripts/python.exe -W ignore manage.py test --noinput --keepdb "$label" > "$logdir/$name.log" 2>&1
  code=$?
  took=$(( $(date +%s) - start ))
  result=$(grep -E "^(OK|FAILED)" "$logdir/$name.log" | tail -1)
  ran=$(grep -E "^Ran " "$logdir/$name.log" | tail -1)
  echo "$name | exit=$code | ${took}s | $ran | $result" >> "$summary"
done
echo "DONE" >> "$summary"
