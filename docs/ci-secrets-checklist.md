# CI Secrets Checklist

## Current Status

### Docker Hub publishing — setup required before first release

Required for `.github/workflows/docker.yml` (push-to-registry job). Triggered on any `v*.*.*` tag.

| Secret | Description | Where to add |
|--------|-------------|--------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username (e.g. `nicoiodice`) | GitHub → Settings → Secrets and variables → Actions |
| `DOCKERHUB_TOKEN` | Docker Hub access token — generate at hub.docker.com → Account Settings → Security | GitHub → Settings → Secrets and variables → Actions |

**One-time Docker Hub setup:**
1. Create a free account at [hub.docker.com](https://hub.docker.com)
2. Create a **public** repository named `fishtank` under your namespace
3. Go to **Account Settings → Security → New Access Token** — scope: "Read, Write, Delete"
4. Add both secrets to the GitHub repository (see "How to Add a Secret" below)

### GitHub Releases — no setup required

The `release.yml` workflow uses `GITHUB_TOKEN` which GitHub Actions provides automatically. The `permissions: contents: write` block in `release.yml` handles it. No manual secret needed.

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
| `DOCKERHUB_TOKEN` | Every 90 days | Nico |
| `PACT_BROKER_TOKEN` | Every 90 days | Platform team |
| `SLACK_WEBHOOK_URL` | On team member change | Platform team |

> **Note:** A silently-expired `DOCKERHUB_TOKEN` causes the push-to-registry job to fail on the next release tag. Test by pushing a pre-release tag (e.g. `v0.1.0-rc1`) before a real release.
