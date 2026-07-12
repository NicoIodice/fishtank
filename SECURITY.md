# Security Policy

## Supported Versions

Fishtank follows semantic versioning. We provide security updates for the latest major version only.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

Please report security vulnerabilities **privately** via [GitHub Security Advisories](https://github.com/NicoIodice/fishtank/security/advisories/new).

**Do NOT open a public GitHub issue for security vulnerabilities.** Public disclosure before a fix is available puts all users at risk.

### What to include in your report

- A clear description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept (if possible)
- Affected versions / configurations
- Any suggested mitigations you are aware of

### Response Timeline

| Milestone | Target |
|---|---|
| Initial acknowledgement | Within 48 hours |
| Severity assessment | Within 7 days |
| Fix Timeline | Depends on severity:<br>• Critical: 7 days<br>• High: 14 days<br>• Medium: 30 days<br>• Low: Next release |
| Public disclosure | After fix is released |

We appreciate responsible disclosure and will credit reporters in the release notes (unless you prefer anonymity).

## Responsible Disclosure Policy

We follow a responsible disclosure process with clear steps:

1. **Reporter notifies maintainer privately** — using GitHub Security Advisories or secure communication
2. **Maintainer confirms and assesses impact** — severity classification within 7 days
3. **Fix is developed and tested** — timeline based on severity (see above)
4. **Fix is released with security advisory** — versioned release with CVE reference if applicable
5. **Public disclosure after patch is available** — coordinated announcement once users can upgrade

## Security Design Decisions

Key security properties of the Fishtank container:

- **Non-root process** — the container runs as the `fishtank` user (UID/GID created at build time)
- **No TLS termination** — TLS is the responsibility of your reverse proxy; the container serves plain HTTP on port 5000
- **JWT in httpOnly cookies** — tokens are never accessible to JavaScript (`localStorage` is explicitly out of scope)
- **Login rate limiting** — brute-force protection is built in and configurable via `FISHTANK_LOGIN_RATE_LIMIT`
- **CORS restricted by default** — only the bundled UI origin is allowed unless `FISHTANK_ALLOWED_ORIGINS` is set
