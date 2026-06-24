import { test, expect } from "../support/fixtures";

/**
 * ATDD acceptance test scaffolds for Story 1.4:
 * Additional UI Themes — Deep Ocean, Emerald Terminal, Ink & Amber.
 *
 * RED PHASE — these tests define the expected acceptance behaviour.
 * They FAIL before implementation (no useTheme hook, no theme picker in Settings).
 * They PASS once AppearanceSettings component is wired into SettingsPage.
 *
 * ACs covered:
 *   AC-1  — Theme picker visible in Settings → Appearance; selecting changes data-theme immediately
 *   AC-2  — Theme persists in localStorage; reload applies stored theme
 *   T-1-4-01 — All 4 theme CSS variable blocks present in loaded stylesheet
 */

test.describe("Story 1-4: Additional UI Themes", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // T-1-4-01 — All 4 theme CSS variable blocks present in the loaded stylesheet
  // RED:  N/A — CSS blocks were already written in Story 1.3 (this test may pass immediately)
  // GREEN: theme.css contains all 4 [data-theme="…"] selector blocks
  //
  // Note: This test validates the Story 1.3 CSS foundation. It is included here
  // as T-1-4-01 per the test design document and to anchor the acceptance baseline.
  // ─────────────────────────────────────────────────────────────────────────

  test("T-1-4-01: all 4 theme CSS variable blocks are present in the stylesheet", async ({
    page,
  }) => {
    await page.goto("/settings");

    const blocks = await page.evaluate(() => {
      const themes = [
        "clean-light",
        "deep-ocean",
        "emerald-terminal",
        "ink-amber",
      ];
      const results: Record<string, boolean> = {};
      for (const theme of themes) {
        let found = false;
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            const rules = Array.from(sheet.cssRules ?? []);
            const match = rules.some(
              (r) =>
                r instanceof CSSStyleRule &&
                r.selectorText === `[data-theme="${theme}"]`,
            );
            if (match) {
              found = true;
              break;
            }
          } catch {
            // Cross-origin stylesheets — skip
          }
        }
        results[theme] = found;
      }
      return results;
    });

    expect(blocks["clean-light"], "clean-light CSS block must be present").toBe(
      true,
    );
    expect(blocks["deep-ocean"], "deep-ocean CSS block must be present").toBe(
      true,
    );
    expect(
      blocks["emerald-terminal"],
      "emerald-terminal CSS block must be present",
    ).toBe(true);
    expect(blocks["ink-amber"], "ink-amber CSS block must be present").toBe(
      true,
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-1 — Theme picker visible in Settings → Appearance
  // RED:  SettingsPage shows "Configured in a later story." placeholder — no picker present
  // GREEN: AppearanceSettings renders 4 radio inputs with correct data-testid attributes
  // ─────────────────────────────────────────────────────────────────────────

  test("AC-1a: Settings → Appearance renders a theme picker with 4 options", async ({
    page,
  }) => {
    await page.goto("/settings");

    // Navigate to Appearance section (it is the default active section)
    const appearanceSection = page.getByTestId("settings-appearance");
    await expect(
      appearanceSection,
      "Settings → Appearance section must render a container with " +
        "data-testid='settings-appearance'. " +
        "Currently shows placeholder text — AppearanceSettings component not yet wired.",
    ).toBeVisible();

    // All 4 theme radio buttons must be present
    await expect(
      page.getByTestId("theme-option-clean-light"),
      "Clean Light theme radio option must be present.",
    ).toBeVisible();
    await expect(
      page.getByTestId("theme-option-deep-ocean"),
      "Deep Ocean theme radio option must be present.",
    ).toBeVisible();
    await expect(
      page.getByTestId("theme-option-emerald-terminal"),
      "Emerald Terminal theme radio option must be present.",
    ).toBeVisible();
    await expect(
      page.getByTestId("theme-option-ink-amber"),
      "Ink & Amber theme radio option must be present.",
    ).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-1b — Selecting a theme changes data-theme on <html> immediately
  // RED:  No picker exists — cannot interact with theme options
  // GREEN: useTheme.setTheme() updates document.documentElement.dataset.theme
  // ─────────────────────────────────────────────────────────────────────────

  test("AC-1b: selecting Deep Ocean updates data-theme on <html> immediately", async ({
    page,
  }) => {
    await page.goto("/settings");

    // When: user selects Deep Ocean
    await page.getByTestId("theme-option-deep-ocean").click();

    // Then: <html data-theme="deep-ocean"> without page reload
    const htmlTheme = await page.evaluate(
      () => document.documentElement.dataset.theme,
    );
    expect(htmlTheme).toBe("deep-ocean");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-2 — Selected theme persists in localStorage; reload applies stored theme
  // RED:  No picker → nothing written to localStorage; reload reverts to prefers-color-scheme
  // GREEN: setTheme writes "fishtank-theme" to localStorage; main.tsx reads it on next load
  // ─────────────────────────────────────────────────────────────────────────

  test("AC-2: theme selection persists to localStorage and survives page reload", async ({
    page,
  }) => {
    await page.goto("/settings");

    // When: user selects Emerald Terminal
    await page.getByTestId("theme-option-emerald-terminal").click();

    // Then: localStorage["fishtank-theme"] = "emerald-terminal"
    const stored = await page.evaluate(() =>
      localStorage.getItem("fishtank-theme"),
    );
    expect(stored).toBe("emerald-terminal");

    // When: page reloads (prefers-color-scheme would be "clean-light" or system default)
    await page.reload();

    // Then: the stored theme is applied — NOT the prefers-color-scheme default
    const htmlThemeAfterReload = await page.evaluate(
      () => document.documentElement.dataset.theme,
    );
    expect(htmlThemeAfterReload).toBe("emerald-terminal");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-1b (Ink & Amber) — Selecting Ink & Amber applies correct theme tokens
  // RED:  No picker
  // GREEN: Ink & Amber tokens: sidebar-fg #a1a1aa, content-muted #52525b
  // ─────────────────────────────────────────────────────────────────────────

  test("AC-5: Ink & Amber theme applies correct sidebar-fg and content-muted tokens", async ({
    page,
  }) => {
    await page.goto("/settings");

    await page.getByTestId("theme-option-ink-amber").click();

    const tokens = await page.evaluate(() => {
      const computed = getComputedStyle(document.documentElement);
      return {
        sidebarFg: computed.getPropertyValue("--sidebar-fg").trim(),
        contentMuted: computed.getPropertyValue("--content-muted").trim(),
        topbarIconFg: computed.getPropertyValue("--topbar-icon-fg").trim(),
      };
    });

    // sidebar-fg must be #a1a1aa (~6.9:1 WCAG AA on zinc-900 background)
    expect(tokens.sidebarFg).toBe("#a1a1aa");
    // content-muted must be #52525b (~7.5:1)
    expect(tokens.contentMuted).toBe("#52525b");
    // topbar icon must contrast against dark topbar (#fff and #ffffff are equivalent)
    expect(
      tokens.topbarIconFg
        .replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i, "#$1$1$2$2$3$3")
        .toLowerCase(),
    ).toBe("#ffffff");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // T-1-4-03 — cold-load with prefers-color-scheme: dark → Deep Ocean applied
  // GREEN: main.tsx reads media query when localStorage is empty → data-theme="deep-ocean"
  // ─────────────────────────────────────────────────────────────────────────

  test("T-1-4-03: cold load with prefers-color-scheme: dark applies Deep Ocean theme", async ({
    page,
  }) => {
    // Emulate dark color scheme in the browser context
    await page.emulateMedia({ colorScheme: "dark" });

    // Clear localStorage so the media-query path triggers
    await page.addInitScript(() => {
      localStorage.removeItem("fishtank-theme");
    });

    await page.goto("/");

    // main.tsx should set data-theme="deep-ocean" when prefers dark and no stored theme
    const htmlTheme = await page.evaluate(
      () => document.documentElement.dataset.theme,
    );
    expect(htmlTheme).toBe("deep-ocean");
  });
});
