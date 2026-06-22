# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities **privately** via [GitHub Security Advisories](https://github.com/NicoIodice/fishtank/security/advisories/new).

**Do NOT open a public GitHub issue for security vulnerabilities.** Public disclosure before a fix is available puts all users at risk.

### What to include in your report

- A clear description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept (if possible)
- Affected versions / configurations
- Any suggested mitigations you are aware of

### Response timeline

| Milestone | Target |
|---|---|
| Initial acknowledgement | Within 72 hours |
| Severity assessment | Within 7 days |
| Fix published | Within 14 days of confirmation |
| Public disclosure | After fix is released |

We appreciate responsible disclosure and will credit reporters in the release notes (unless you prefer anonymity).

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (`main`) | ✅ Active support |
| Older releases | ❌ Please upgrade |

## Security Design Decisions

Key security properties of the Fishtank container:

- **Non-root process** — the container runs as the `fishtank` user (UID/GID created at build time)
- **No TLS termination** — TLS is the responsibility of your reverse proxy; the container serves plain HTTP on port 5000
- **JWT in httpOnly cookies** — tokens are never accessible to JavaScript (`localStorage` is explicitly out of scope)
- **Login rate limiting** — brute-force protection is built in and configurable via `FISHTANK_LOGIN_RATE_LIMIT`
- **CORS restricted by default** — only the bundled UI origin is allowed unless `FISHTANK_ALLOWED_ORIGINS` is set
