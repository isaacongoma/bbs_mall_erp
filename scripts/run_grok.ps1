param(
    [string]$PromptFile = "D:\Clients\BBS-ERP\docs\GROK_HANDOFF_PROMPT.md",
    [int]$MaxTurns = 400
)

$root = "D:\Clients\BBS-ERP"
$logDir = Join-Path $root "docs\agent_logs"
New-Item -ItemType Directory -Force $logDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$raw = Join-Path $logDir "grok_raw_$stamp.log"
$summary = Join-Path $logDir "LATEST_SUMMARY.md"

Set-Location $root
"started $(Get-Date -Format s)" | Out-File $summary -Encoding utf8

grok --cwd $root --permission-mode bypassPermissions --max-turns $MaxTurns --output-format plain --prompt-file $PromptFile *> $raw

Set-Location (Join-Path $root "backend")
$tests = & ".\.venv\Scripts\python.exe" manage.py test 2>&1 | Select-Object -Last 15
$check = & ".\.venv\Scripts\python.exe" manage.py check 2>&1 | Select-Object -Last 3
$mig = & ".\.venv\Scripts\python.exe" manage.py makemigrations --check --dry-run 2>&1 | Select-Object -Last 3

$lines = @(
    "# Grok run summary",
    "finished: $(Get-Date -Format s)",
    "raw log: $raw",
    "",
    "## Test suite tail",
    '```',
    ($tests -join "`n"),
    '```',
    "## manage.py check",
    ($check -join "`n"),
    "## makemigrations --check",
    ($mig -join "`n"),
    "",
    "## Grok output tail",
    '```',
    ((Get-Content $raw -Tail 60) -join "`n"),
    '```'
)
$lines -join "`n" | Out-File $summary -Encoding utf8
