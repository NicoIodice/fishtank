## Type of change

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `hotfix` — emergency fix on a released version
- [ ] `chore` / `ci` / `docs` — infrastructure, tooling, or documentation only
- [ ] `refactor` — code change with no behavior change
- [ ] `test` — test-only change

## Branch target

- [ ] **Release branch** — this is a `story/**` or `fix/**` PR → `release/v*.*.*`
- [ ] **Main** — this is a `release/v*.*.*` PR → `main` (all stories done, ready to publish)
- [ ] **Main** — this is a `hotfix/v*.*.*` PR → `main` (emergency patch)

> ⚠️ PRs from feature/story branches must target the **release branch**, not `main`.

## Related story / issue

<!-- Story ID: e.g., 1-2-database-authentication-backend-and-first-run-logic -->
<!-- GitHub issue: Closes #N -->

## Summary

<!-- What does this PR do? Why? -->

## Checklist

- [ ] All tests pass locally: `dotnet test src/Fishtank.slnx` + `cd src/client && npm test`
- [ ] TypeScript build clean: `cd src/client && npm run build`
- [ ] Docker smoke test passes (for story PRs): `docker build -t fishtank:ci . && docker run -d -p 5000:5000 fishtank:ci` → `curl http://localhost:5000/health`
- [ ] `CHANGELOG.md` updated under `[Unreleased]` (for `feat`, `fix`, `security` PRs)
- [ ] No `console.log` / debug statements remaining
- [ ] No credentials, tokens, or secrets in code or comments
