# Deploying BBS ERP to Cyberspace

Production is one server, reached as the SSH host `CyberSpace` (set in `~/.ssh/config`). Nothing is deployed from git; the working tree is packaged and copied up.

## Layout on the server

| What | Where |
|---|---|
| Django backend (code, `.venv`, `.env`) | `/www/wwwroot/bbs-api.cyberspacetg.com/backend` |
| Python tooling (uv) | `/www/wwwroot/bbs-api.cyberspacetg.com/.uv` |
| Vendored upstream (frappe, erpnext, hrms) | `/www/wwwroot/bbs-api.cyberspacetg.com/vendor` |
| Built React app | `/www/wwwroot/bbs-erp.cyberspacetg.com` |
| Processes (pm2) | `bbs-api` (uvicorn, port 5200, 3 workers), `bbs-worker` (celery), `bbs-beat` (celery beat) |
| Database | PostgreSQL `bbs_mall`, credentials in the backend `.env` (`DATABASE_URL`) |
| Web server | nginx via aaPanel, API at `https://bbs-api.cyberspacetg.com`, app at `https://bbs-erp.cyberspacetg.com` |

The backend `.env` lives only on the server and is never overwritten by a deploy (the package excludes it). Settings module is `config.settings.prod`.

## Before you start

1. Everything you want live is working locally: `manage.py check`, the tests for the app you changed, `npx tsc --noEmit`, `npx eslint src`.
2. The server has room: `ssh CyberSpace 'df -h /www'`.
3. Take a database backup (below). Do this every time a migration will run.

## 1. Back up the database

```bash
ssh CyberSpace 'A=/www/wwwroot/bbs-api.cyberspacetg.com/backend
URL=$(grep ^DATABASE_URL $A/.env | cut -d= -f2-)
F=/root/bbs_mall_before_<what>_$(date +%Y%m%d).sql.gz
/www/server/pgsql/bin/pg_dump "$URL" | gzip > $F; gzip -t $F && echo ok'
```

To roll back the data, restore that file into `bbs_mall` (stop pm2 first).

## 2. Build and package (on your machine)

```bash
cd frontend && npx tsc --noEmit -p . && npm run build
cd .. && mkdir -p /d/tmp/deploy
tar --exclude='.venv' --exclude='__pycache__' --exclude='*.pyc' --exclude='.env' --exclude='sites' \
    --exclude='logs' --exclude='node_modules' --exclude='.pytest_cache' --exclude='celerybeat-schedule*' \
    --exclude='*.csv' --exclude='*.log' -czf /d/tmp/deploy/backend.tgz backend
tar --exclude='*.map' -czf /d/tmp/deploy/frontend.tgz -C frontend dist
scp /d/tmp/deploy/backend.tgz /d/tmp/deploy/frontend.tgz CyberSpace:/tmp/
```

## 3. Backend: unpack, install, migrate

```bash
ssh CyberSpace 'set -e
A=/www/wwwroot/bbs-api.cyberspacetg.com
tar -xzf /tmp/backend.tgz -C /tmp && cp -a /tmp/backend/. $A/backend/ && rm -rf /tmp/backend
cd $A/backend
$A/.uv/uv pip install --python .venv/bin/python -r requirements/prod.txt
export DJANGO_SETTINGS_MODULE=config.settings.prod PYTHONPATH=$PWD
.venv/bin/python -W ignore manage.py check
nohup .venv/bin/python -W ignore manage.py migrate --noinput > logs/deploy_migrate.log 2>&1 &'
```

`migrate` also re-syncs every doctype table and the base fixtures, so it can take **10 to 20 minutes** even when there is little to apply. Always run it with `nohup` and poll:

```bash
ssh CyberSpace 'pgrep -f "manage.py migrate"; tail -3 /www/wwwroot/bbs-api.cyberspacetg.com/backend/logs/deploy_migrate.log'
```

It has finished when `pgrep` prints nothing. Check the log for `Error` or `Traceback` before continuing.

## 4. Apps and workspaces

After migrate, register each app and import its workspaces, sidebars, number cards, charts and reports. Run only the apps that changed:

```bash
ssh CyberSpace 'cd /www/wwwroot/bbs-api.cyberspacetg.com/backend
export DJANGO_SETTINGS_MODULE=config.settings.prod PYTHONPATH=$PWD
.venv/bin/python -W ignore manage.py setup_property
.venv/bin/python -W ignore manage.py setup_marketplace --force'
```

Both commands print `artifacts imported: N`. They are safe to repeat. `setup_marketplace` also creates the marketplace roles, accounts, price lists, notification templates, the Free seller plan and the standard size charts, and only fills in what is missing.

`manage.py migrate` used to reset the list of installed apps to frappe, erpnext and hrms, which hid the Property and Marketplace icons from the apps screen. That is fixed in `apps/erpnext/install.py` (it now keeps registered apps). If an app icon is missing after a deploy, run the matching `setup_*` command.

## 5. Frontend

```bash
ssh CyberSpace 'W=/www/wwwroot/bbs-erp.cyberspacetg.com
rm -rf $W/assets; tar -xzf /tmp/frontend.tgz -C /tmp && cp -a /tmp/dist/. $W/ && rm -rf /tmp/dist
find $W -mindepth 1 -not -name ".user.ini" -exec chown www:www {} +'
```

## 6. Restart and verify

```bash
ssh CyberSpace 'pm2 restart bbs-api bbs-worker bbs-beat; sleep 20; pm2 list | grep bbs'
curl -s -o /dev/null -w "%{http_code}\n" https://bbs-erp.cyberspacetg.com/
curl -s -o /dev/null -w "%{http_code}\n" https://bbs-api.cyberspacetg.com/api/erpnext/method/frappe.sessions.get/
```

The app should answer 200 and the API path 401 (it wants a login). The bare API root URL returns 502 through nginx even when everything is healthy, so do not use it as a check. The restart also clears the per-user cached page data. Without it, workspace layout changes and new apps do not show until the cache expires. Then sign in, hard-refresh (Ctrl+Shift+R) and open the changed screens. Check `pm2 logs bbs-api --lines 50` for errors.

## Marketplace settings after the first deploy

1. Marketplace Settings: confirm the company, accounts and payment methods, the storefront URL (used in email links) and support contacts.
2. M-Pesa Settings: enable and set the credentials and callback base URL. Marketplace payments and payouts use this shared integration.
3. HostPinnacle Settings: enabled for SMS. Email uses the site mail settings.
4. Add Delivery Zones and Couriers, invite tenants, then approve sellers.

## Rolling back

- **Frontend:** unpack the previous `dist` (keep the last `frontend.tgz` you deployed).
- **Backend code:** copy the previous package back and `pm2 restart`. Migrations here only add tables and fields, so older code keeps working against the newer database.
- **Data:** restore the backup from step 1.

## Gotchas

- Do not run `git` on the server; there is no repository there.
- Never edit `.env` through a deploy. Back it up first if you change it (`cp .env /root/bbs_env_backup_<date>`).
- One migrate at a time. Running two together corrupts the doctype sync.
- Test databases are separate (`TEST_DATABASE_NAME=...`) and are never used on the server.
- The credentials for the server and database are not stored in this repository.
