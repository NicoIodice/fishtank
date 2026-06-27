import { mergeTests, expect, test as base } from "@playwright/test";
import { test as apiRequestFixture } from "@seontechnologies/playwright-utils/api-request/fixtures";
import { createAuthFixtures } from "@seontechnologies/playwright-utils/auth-session/fixtures";
import { setAuthProvider } from "@seontechnologies/playwright-utils/auth-session";
import { test as recurseFixture } from "@seontechnologies/playwright-utils/recurse/fixtures";
import { test as interceptFixture } from "@seontechnologies/playwright-utils/intercept-network-call/fixtures";
import { test as networkErrorMonitorFixture } from "@seontechnologies/playwright-utils/network-error-monitor/fixtures";
import { test as logFixture } from "@seontechnologies/playwright-utils/log/fixtures";
import { fishtankAuthProvider } from "../auth/auth-provider";

setAuthProvider(fishtankAuthProvider);
// createAuthFixtures() returns a self-contained set where `context` depends on
// `authOptions` and `authSessionEnabled` (also in the set). TypeScript cannot
// verify this self-referential fixture dependency via base.extend's generics,
// so we assert `as any` — the runtime wiring is correct.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authFixture = base.extend(createAuthFixtures() as any);

/**
 * Unified test object combining all playwright-utils fixtures.
 * Import `test` and `expect` from this file in every spec.
 *
 * Available fixtures:
 *  apiRequest            — typed HTTP client with schema validation & retry
 *  authToken             — persisted JWT cookie for API-only tests
 *  recurse               — polling for async / eventual-consistency scenarios
 *  interceptNetworkCall  — spy or stub network requests in browser tests
 *  networkErrorMonitor   — auto-fail on unexpected 4xx/5xx responses
 *  log                   — structured logging wired to Playwright reporter
 */
export const test = mergeTests(
  apiRequestFixture,
  authFixture,
  recurseFixture,
  interceptFixture,
  networkErrorMonitorFixture,
  logFixture,
);

export { expect };
