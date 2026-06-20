# CI Secrets Checklist

## Current Status

✅ **No secrets required** for the current pipeline configuration.

---

## Future Secrets (add when features are enabled)

### Contract Testing (Pact)

Enable by setting `tea_use_pactjs_utils: true` in `_bmad/tea/config.yaml`.

| Secret | Description | Where to add |
|--------|-------------|--------------|
| `PACT_BROKER_BASE_URL` | PactFlow broker URL (e.g., `https://yourorg.pactflow.io`) | GitHub → Settings → Secrets → Actions |
| `PACT_BROKER_TOKEN` | Read-write API token for PactFlow | GitHub → Settings → Secrets → Actions |

### Notifications (Slack)

If Slack failure alerts are added to the pipeline:

| Secret | Description | Where to add |
|--------|-------------|--------------|
| `SLACK_WEBHOOK_URL` | Incoming webhook URL for the `#ci-alerts` channel | GitHub → Settings → Secrets → Actions |

---

## How to Add a Secret

1. Go to **GitHub → repository → Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Enter the name exactly as listed above (case-sensitive)
4. Paste the value and save

---

## Rotation Policy

| Secret | Rotation frequency | Owner |
|--------|-------------------|-------|
| `PACT_BROKER_TOKEN` | Every 90 days | Platform team |
| `SLACK_WEBHOOK_URL` | On team member change | Platform team |

> **Note:** A silently-expired `PACT_BROKER_TOKEN` is the most common cause of `can-i-deploy` timeouts. Add a staleness monitoring job (daily cron) once Pact is enabled.
