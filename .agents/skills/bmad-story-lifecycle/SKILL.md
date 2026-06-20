---
name: bmad-story-lifecycle
description: 'Autonomously drives a story through the full dev+test lifecycle: preflight → create-story → ATDD → dev → code-review → test-automate → nfr → trace → test-review → done. Handles test-design auto-creation, retry loops, and bug-fix cycles. Use when the user says "run lifecycle for story [id]", "run story lifecycle", or "automate story [id]".'
---

# Story Lifecycle Orchestrator

**Goal:** Drive a story from epic-backlog to `done` through the full dev+test lifecycle without human intervention, within defined retry budgets. Halt and escalate only when a retry budget is exhausted or a hard gate cannot be resolved autonomously.

**Role:** You are the Story Lifecycle Orchestrator — a senior technical lead who coordinates implementation, testing, and quality gates in the correct order.

## Conventions

- Bare paths resolve from the skill root.
- `{skill-root}` resolves to this skill's installed directory.
- `{project-root}` resolves from the project working directory.
- `{skill-name}` resolves to the skill directory's basename.
- Sub-skill invocations: load `.agents/skills/{skill-name}/SKILL.md`, execute in Create mode, then return here.

## On Activation

### Step 1: Resolve the Workflow Block

Run: `python3 {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root} --key workflow`

**If the script fails**, resolve the `workflow` block yourself by reading these three files in base → team → user order:

1. `{skill-root}/customize.toml` — defaults
2. `{project-root}/_bmad/custom/{skill-name}.toml` — team overrides
3. `{project-root}/_bmad/custom/{skill-name}.user.toml` — personal overrides

### Step 2: Execute Prepend Steps

Execute each entry in `{workflow.activation_steps_prepend}` in order.

### Step 3: Load Persistent Facts

Treat every entry in `{workflow.persistent_facts}` as foundational context. Entries prefixed `file:` are paths/globs under `{project-root}` — load them as facts.

### Step 4: Load Config

Load from `{project-root}/_bmad/bmm/config.yaml`:

- `project_name`, `user_name`
- `communication_language`
- `implementation_artifacts`
- `date` as system-generated current datetime

Also load from `{project-root}/_bmad/tea/config.yaml`:

- `test_stack_type`
- `tea_use_playwright_utils`

### Step 5: Greet the User

Greet `{user_name}`, briefly explain what the lifecycle orchestrator will do, and confirm the story/epic target.

### Step 6: Execute Append Steps

Execute each entry in `{workflow.activation_steps_append}` in order.

---

## Lifecycle State File

The orchestrator writes and reads `{implementation_artifacts}/lifecycle-state-{story_key}.yaml` after every phase transition. Schema:

```yaml
story_key: "" # e.g. "1-2-auth-backend"
epic_id: "" # e.g. "1"
current_phase: "" # phase tag (see Phase Tags below)
status: active # active | blocked | done
blocked_reason: "" # populated on HALT
test_design_retries: 0
test_design_auto_created: false # set true when preflight auto-creates the test design
atdd_retries: 0
validate_retries: 0
dev_retries: 0
code_review_retries: 0
nfr_retries: 0
trace_retries: 0
quickdev_cycle: 0
last_updated: "" # ISO datetime
phases_completed: [] # list of completed phase tags
```

**Phase Tags (in order):** `init` → `preflight-framework` → `preflight-test-design` → `create-story` → `atdd` → `validate` → `dev-story` → `code-review` → `test-automate` → `nfr` → `trace` → `test-review` → `done`

---

## Exit Criteria Reference

| Phase                 | Exit Criteria — PASS                                                                          | Action on FAIL                        |
| --------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------- |
| preflight-framework   | `framework-setup-progress.md` exists + `step-05` completed                                    | HALT — not auto-fixable               |
| preflight-test-design | test-design for epic covers story scope + quality gate passes                                 | Auto-create (retry ≤ 2)               |
| create-story          | story file exists in `{implementation_artifacts}/`, status `ready-for-dev`                    | Retry creation                        |
| atdd                  | ≥1 acceptance test scaffold file exists in `src/client/tests/` or test project, all tests RED | Rework with spec feedback (retry ≤ 2) |
| validate              | `bmad-check-implementation-readiness` scores PASS                                             | Fix spec gaps (retry ≤ 2)             |
| dev-story             | All ATDD tests GREEN; TypeScript builds clean; .NET builds clean                              | Retry dev (retry ≤ 2)                 |
| code-review           | `bmad-code-review` finds zero BLOCKER items                                                   | QuickDev fix → re-review (retry ≤ 1)  |
| test-automate         | Coverage targets met; all ATDD assertions pass                                                | QuickDev fix cycle                    |
| nfr                   | `bmad-testarch-nfr` finds zero BLOCKER items (perf / security / reliability)                  | QuickDev fix (cycle ≤ 2)              |
| trace                 | `bmad-testarch-trace` gate decision is PASS or WAIVED                                         | Add missing coverage (retry ≤ 2)      |
| test-review           | `bmad-testarch-test-review` finds zero BLOCKER items                                          | QuickDev fix (cycle ≤ 2)              |

**QuickDev cycle budget:** max 2 per story. When exhausted → HALT, status → `blocked`.

---

## Workflow

<workflow>
  <critical>Orchestrator rules — read before every phase:
    1. At the START of each phase: read {implementation_artifacts}/lifecycle-state-{story_key}.yaml and confirm current_phase.
    2. If current_phase is already past a step (listed in phases_completed), skip that step immediately.
    3. At the END of each phase: update lifecycle state (current_phase, phases_completed, retries) and write file before advancing.
    4. Never skip a phase. Never proceed past a HALT instruction.
    5. Retry budgets are hard limits — exhaust → HALT, mark blocked, output clear escalation message.
  </critical>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 0: INIT                                               -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="1" goal="Resolve story target and initialize lifecycle state" tag="init">
    <check if="user provided explicit story_key (e.g. '1-2-auth-backend')">
      <action>Set {{story_key}} from user input</action>
    </check>

    <check if="user provided epic_id but no story_key">
      <action>Load {{sprint_status}} = {implementation_artifacts}/sprint-status.yaml</action>
      <action>Find first story in the specified epic with status backlog or ready-for-dev</action>
      <action>Set {{story_key}} to that story</action>
    </check>

    <check if="neither story_key nor epic_id provided">
      <action>Load {{sprint_status}} = {implementation_artifacts}/sprint-status.yaml</action>
      <action>Find first story across all epics with status backlog or ready-for-dev (top-to-bottom order)</action>
      <action>Set {{story_key}} to that story</action>
      <output>Auto-selected story: {{story_key}}</output>
    </check>

    <action>Derive {{epic_id}} from story_key prefix (e.g. "1-2-auth-backend" → "1")</action>
    <action>Set {{lifecycle_state_file}} = {implementation_artifacts}/lifecycle-state-{{story_key}}.yaml</action>
    <action>Set {{sprint_status}} = {implementation_artifacts}/sprint-status.yaml</action>
    <action>Set {{test_artifacts}} = {project-root}/_bmad-output/test-artifacts</action>

    <check if="{{lifecycle_state_file}} exists">
      <action>Load state file</action>
      <output>▶ Resuming lifecycle for {{story_key}} at phase: {{current_phase}} (quickdev_cycle: {{quickdev_cycle}})</output>
      <action>Skip to current_phase step</action>
    </check>

    <check if="{{lifecycle_state_file}} does NOT exist">
      <action>Create and write initial lifecycle state:
        story_key: {{story_key}}
        epic_id: {{epic_id}}
        current_phase: preflight-framework
        status: active
        blocked_reason: ""
        test_design_retries: 0
        test_design_auto_created: false
        atdd_retries: 0
        validate_retries: 0
        dev_retries: 0
        code_review_retries: 0
        nfr_retries: 0
        trace_retries: 0
        quickdev_cycle: 0
        last_updated: {{date}}
        phases_completed: []
      </action>
      <output>▶ Starting new lifecycle for story: {{story_key}} (epic: {{epic_id}})</output>
    </check>

  </step>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 1: PREFLIGHT — FRAMEWORK SCAFFOLD                     -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="2" goal="Verify test framework scaffold is in place" tag="preflight-framework">
    <check if="'preflight-framework' is in phases_completed">
      <goto anchor="preflight-test-design" />
    </check>

    <action>Read {project-root}/_bmad-output/test-artifacts/framework-setup-progress.md if it exists</action>

    <check if="file exists AND stepsCompleted includes 'step-05-validate-and-summary'">
      <action>Update lifecycle state: append 'preflight-framework' to phases_completed, current_phase → 'preflight-test-design', last_updated → now</action>
      <output>✅ Framework scaffold confirmed.</output>
    </check>

    <check if="file missing OR step-05 not in stepsCompleted">
      <output>🚫 BLOCKED — Test framework scaffold is missing or incomplete.

Run `bmad-testarch-framework` to completion (step 5 must finish) before this lifecycle can proceed.
Expected: \_bmad-output/test-artifacts/framework-setup-progress.md with 'step-05-validate-and-summary' in stepsCompleted.

Lifecycle state saved. Re-run this skill after completing the framework setup.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "framework scaffold missing — run bmad-testarch-framework", last_updated → now</action>
<action>HALT</action>
</check>
</step>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 2: PREFLIGHT — TEST DESIGN FOR EPIC                  -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="3" goal="Verify or auto-create test-design for the target epic" tag="preflight-test-design" anchor="preflight-test-design">
    <check if="'preflight-test-design' is in phases_completed">
      <goto anchor="create-story" />
    </check>

    <action>Search {{test_artifacts}}/ for a file whose name matches EXACTLY the pattern test-design-epic-{{epic_id}}.md or test-design-epic-{{epic_id}}-*.md — ONLY files with the epic-{{epic_id}} prefix qualify. System-level files (e.g. test-design-architecture.md, test-design-progress.md, test-design-qa.md) MUST NOT be accepted as a substitute, even if their content mentions epic {{epic_id}}.</action>
    <action>For each qualifying per-epic candidate file: check that it explicitly declares epic {{epic_id}} as its scope, contains a risk assessment section with ≥3 risk items, test layer assignments, and ≥1 test scenario per story in the epic</action>

    <check if="valid per-epic test-design file (test-design-epic-{{epic_id}}*.md) found AND quality check passes">
      <output>✅ Test-design confirmed for Epic {{epic_id}}.</output>
      <action>Update lifecycle state: append 'preflight-test-design' to phases_completed, current_phase → 'create-story', last_updated → now</action>
      <goto anchor="create-story" />
    </check>

    <check if="no file matching test-design-epic-{{epic_id}}*.md found in {{test_artifacts}}/ OR quality check fails">
      <output>📋 No valid per-epic test-design found for Epic {{epic_id}} (required filename: test-design-epic-{{epic_id}}.md). Auto-creating now (attempt {{test_design_retries + 1}} of 3)...</output>

      <action>Execute the bmad-testarch-test-design workflow in Create mode:
        - Load: {project-root}/.agents/skills/bmad-testarch-test-design/SKILL.md
        - Scope: Epic {{epic_id}} only
        - Target output: {{test_artifacts}}/test-design-epic-{{epic_id}}.md
        - Do NOT ask user for mode — proceed in Create mode directly
      </action>

      <action>After creation: validate quality gate — the document MUST contain:
        1. Explicit epic scope reference (epic {{epic_id}})
        2. Risk assessment section with at least 3 risk items
        3. Test layer assignments (unit / integration / E2E per feature area)
        4. At least one test scenario per story listed in the epic
      </action>

      <check if="quality gate passes">
        <output>✅ Test-design created and validated for Epic {{epic_id}}.</output>
        <action>Update lifecycle state: append 'preflight-test-design' to phases_completed, current_phase → 'create-story', test_design_auto_created → true, last_updated → now</action>
        <goto anchor="create-story" />
      </check>

      <check if="quality gate fails AND test_design_retries < 2">
        <action>Increment test_design_retries in lifecycle state, last_updated → now</action>
        <output>⚠ Test-design quality gate failed. Gaps: {{quality_gate_failures}}. Retrying ({{test_design_retries}} of 2)...</output>
        <action>Fix the identified gaps in the test-design document</action>
        <goto anchor="preflight-test-design" />
      </check>

      <check if="test_design_retries >= 2">
        <output>🚫 BLOCKED — Test-design quality gate failed after 3 attempts.

Gaps that could not be resolved automatically:
{{quality_gate_failures}}

Manual fix required: edit {{test_artifacts}}/test-design-epic-{{epic_id}}.md and restart this lifecycle.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "test-design quality gate failed after max retries", last_updated → now</action>
<action>HALT</action>
</check>
</check>
</step>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 3: CREATE STORY                                       -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="4" goal="Create the story file" tag="create-story" anchor="create-story">
    <check if="'create-story' is in phases_completed">
      <goto anchor="atdd" />
    </check>

    <check if="story file already exists in {implementation_artifacts}/ with status ready-for-dev or higher">
      <output>✅ Story file already exists for {{story_key}}. Skipping creation.</output>
      <action>Update lifecycle state: append 'create-story' to phases_completed, current_phase → 'atdd', last_updated → now</action>
      <goto anchor="atdd" />
    </check>

    <output>📝 Creating story file for {{story_key}}...</output>
    <action>Execute the bmad-create-story workflow:
      - Load: {project-root}/.agents/skills/bmad-create-story/SKILL.md
      - Target story: {{story_key}}
      - The skill's own activation steps and preflight checks will run (test-design check will pass — already confirmed)
    </action>

    <action>After creation: verify story file exists in {implementation_artifacts}/ with correct YAML frontmatter (story_key, status: ready-for-dev)</action>
    <action>Verify sprint-status.yaml updated: story → ready-for-dev, epic → in-progress</action>

    <check if="story file exists in {implementation_artifacts}/ with status ready-for-dev">
      <output>✅ Story {{story_key}} created and sprint-status updated.</output>
      <action>Update lifecycle state: append 'create-story' to phases_completed, current_phase → 'atdd', last_updated → now</action>
    </check>

    <check if="story file missing OR status is not ready-for-dev">
      <output>🚫 BLOCKED — Story creation failed. Expected: {implementation_artifacts}/{{story_key}}.md with status ready-for-dev.

Manual fix required: run bmad-create-story directly and verify the output before re-running this lifecycle.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "story creation failed — file missing or incorrect status", last_updated → now</action>
<action>HALT</action>
</check>

  </step>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 4: ATDD                                               -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="5" goal="Write acceptance test scaffolds (red phase)" tag="atdd" anchor="atdd">
    <check if="'atdd' is in phases_completed">
      <goto anchor="validate" />
    </check>

    <output>🧪 Writing acceptance test scaffolds for {{story_key}} (attempt {{atdd_retries + 1}})...</output>

    <action>Execute the bmad-testarch-atdd workflow in Create mode:
      - Load: {project-root}/.agents/skills/bmad-testarch-atdd/SKILL.md
      - Scope: story {{story_key}} only
      - Mode: Create
      - Tests must be RED phase (scaffolds that compile but fail — no implementation yet)
    </action>

    <action>After completion: verify exit criteria:
      1. At least one acceptance test file exists (Playwright spec in src/client/tests/ or xUnit test in test projects)
      2. Tests reference story acceptance criteria from the story file
      3. Tests fail when run against current codebase (confirming red phase)
    </action>

    <check if="exit criteria pass">
      <output>✅ ATDD scaffolds written and confirmed RED for {{story_key}}.</output>
      <action>Update lifecycle state: append 'atdd' to phases_completed, current_phase → 'validate', last_updated → now</action>
    </check>

    <check if="exit criteria fail AND atdd_retries < 2">
      <action>Increment atdd_retries in lifecycle state, last_updated → now</action>
      <output>⚠ ATDD exit criteria not met. Issues: {{criteria_failures}}. Reworking ({{atdd_retries}} of 2)...</output>
      <action>Fix identified gaps in acceptance test scaffolds</action>
      <goto anchor="atdd" />
    </check>

    <check if="atdd_retries >= 2">
      <output>🚫 BLOCKED — ATDD scaffolds could not satisfy exit criteria after 3 attempts.

Issues: {{criteria_failures}}
Manual review of story acceptance criteria and test scaffolds required.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "ATDD exit criteria failed after max retries", last_updated → now</action>
<action>HALT</action>
</check>
</step>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 5: VALIDATE                                           -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="6" goal="Validate story readiness before implementation" tag="validate" anchor="validate">
    <check if="'validate' is in phases_completed">
      <goto anchor="dev-story" />
    </check>

    <output>🔍 Validating implementation readiness for {{story_key}} (attempt {{validate_retries + 1}})...</output>

    <action>Execute the bmad-check-implementation-readiness workflow scoped to story {{story_key}}:
      - Load: {project-root}/.agents/skills/bmad-check-implementation-readiness/SKILL.md
      - Scope: this story only
    </action>

    <check if="readiness check scores PASS (no BLOCKER items)">
      <output>✅ Story {{story_key}} is implementation-ready.</output>
      <action>Update lifecycle state: append 'validate' to phases_completed, current_phase → 'dev-story', last_updated → now</action>
    </check>

    <check if="readiness check finds BLOCKERS AND validate_retries < 2">
      <action>Increment validate_retries in lifecycle state, last_updated → now</action>
      <output>⚠ Readiness blockers found: {{blockers}}. Fixing story spec ({{validate_retries}} of 2)...</output>
      <action>Fix the story file to address each BLOCKER (missing ACs, ambiguous tasks, undefined dependencies)</action>
      <goto anchor="validate" />
    </check>

    <check if="validate_retries >= 2">
      <output>🚫 BLOCKED — Story readiness check failed after 3 attempts.

Remaining blockers: {{blockers}}
Manual story refinement required before implementation can proceed.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "implementation readiness check failed after max retries", last_updated → now</action>
<action>HALT</action>
</check>
</step>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 6: DEV STORY                                          -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="7" goal="Implement the story" tag="dev-story" anchor="dev-story">
    <check if="'dev-story' is in phases_completed">
      <goto anchor="code-review" />
    </check>

    <action>Update sprint-status.yaml: {{story_key}} → in-progress</action>
    <action>Update lifecycle state: current_phase → 'dev-story', last_updated → now</action>

    <output>⚙ Implementing story {{story_key}} (attempt {{dev_retries + 1}})...</output>

    <action>Execute the bmad-dev-story workflow:
      - Load: {project-root}/.agents/skills/bmad-dev-story/SKILL.md
      - Story: {implementation_artifacts}/{{story_key}}.md
      - The skill's ATDD preflight will pass — scaffolds confirmed in phase 4
    </action>

    <action>After completion: verify DoD gates 1–4 from project-context.md:
      Gate 1: Run `dotnet test src/Fishtank.Api.IntegrationTests` — must pass
      Gate 2: Run `npm run build` in src/client — 0 TypeScript errors
      Gate 3: Run `dotnet build src/Fishtank.slnx` — 0 errors, 0 warnings
      Gate 4: ATDD acceptance tests GREEN (all previously RED tests now pass)
    </action>

    <check if="all 4 DoD gates pass">
      <output>✅ Implementation complete. All DoD build and test gates pass.</output>
      <action>Update sprint-status.yaml: {{story_key}} → review</action>
      <action>Update lifecycle state: append 'dev-story' to phases_completed, current_phase → 'code-review', last_updated → now</action>
    </check>

    <check if="any DoD gate fails AND dev_retries < 2">
      <action>Increment dev_retries in lifecycle state, last_updated → now</action>
      <output>⚠ DoD gate failures: {{gate_failures}}. Retrying full implementation ({{dev_retries}} of 2)...</output>
      <action>Apply targeted fixes for the failing gates (e.g. compilation errors, missing dependencies), then re-run the full dev-story step to verify complete implementation</action>
      <goto anchor="dev-story" />
    </check>

    <check if="dev_retries >= 2">
      <output>🚫 BLOCKED — Implementation failed DoD gates after 3 attempts.

Failures: {{gate_failures}}
Escalating to {{user_name}} for manual intervention.</output>
<action>Update sprint-status.yaml: {{story_key}} → in-progress</action>
<action>Update lifecycle state: status → blocked, blocked_reason → "DoD gate failures after max retries", last_updated → now</action>
<action>HALT</action>
</check>
</step>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 7: CODE REVIEW                                        -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="8" goal="Adversarial code review" tag="code-review" anchor="code-review">
    <check if="'code-review' is in phases_completed">
      <goto anchor="test-automate" />
    </check>

    <output>🔎 Running code review for {{story_key}} (attempt {{code_review_retries + 1}})...</output>

    <action>Execute the bmad-code-review workflow:
      - Load: {project-root}/.agents/skills/bmad-code-review/SKILL.md
      - Scope: changes introduced by story {{story_key}}
    </action>

    <check if="zero BLOCKER items found">
      <output>✅ Code review passed. No blockers.</output>
      <action>Update sprint-status.yaml: {{story_key}} → ready-for-testing</action>
      <action>Update lifecycle state: append 'code-review' to phases_completed, current_phase → 'test-automate', last_updated → now</action>
    </check>

    <check if="BLOCKER items found AND code_review_retries < 1">
      <action>Increment code_review_retries in lifecycle state, last_updated → now</action>
      <output>⚠ Code review blockers found ({{blocker_count}} items). Running QuickDev fix (cycle {{quickdev_cycle + 1}} of 2)...</output>
      <action>Increment quickdev_cycle in lifecycle state</action>
      <check if="quickdev_cycle > 2">
        <output>🚫 BLOCKED — QuickDev cycle budget exhausted during code review.

Remaining blockers: {{blockers}}
Escalating to {{user_name}}.</output>
<action>Update sprint-status.yaml: {{story_key}} → in-progress</action>
<action>Update lifecycle state: status → blocked, blocked_reason → "quickdev budget exhausted in code-review", last_updated → now</action>
<action>HALT</action>
</check>
<action>Execute bmad-quick-dev for each BLOCKER: - Load: {project-root}/.agents/skills/bmad-quick-dev/SKILL.md - Target: fix the specific BLOCKER items identified in code review - Verify DoD gates 1–4 still pass after fix
</action>
<action>Update sprint-status.yaml: {{story_key}} → review</action>
<goto anchor="code-review" />
</check>

    <check if="BLOCKER items found AND code_review_retries >= 1">
      <output>🚫 BLOCKED — Code review blockers persist after fix attempt.

Blockers: {{blockers}}
Escalating to {{user_name}}.</output>
<action>Update sprint-status.yaml: {{story_key}} → in-progress</action>
<action>Update lifecycle state: status → blocked, blocked_reason → "code review blockers after max retries", last_updated → now</action>
<action>HALT</action>
</check>
</step>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 8: TEST AUTOMATE                                      -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="9" goal="Expand test automation coverage for the story" tag="test-automate" anchor="test-automate">
    <check if="'test-automate' is in phases_completed">
      <goto anchor="nfr" />
    </check>

    <action>Update sprint-status.yaml: {{story_key}} → in-test</action>
    <action>Update lifecycle state: current_phase → 'test-automate', last_updated → now</action>

    <output>🤖 Running test automation for {{story_key}}...</output>

    <action>Execute the bmad-testarch-automate workflow in Create mode:
      - Load: {project-root}/.agents/skills/bmad-testarch-automate/SKILL.md
      - Scope: story {{story_key}} — new code paths only
      - Mode: Create
    </action>

    <action>After completion: verify:
      1. All ATDD acceptance tests still GREEN
      2. New automated tests added for story code paths
      3. No regressions in existing test suite
    </action>

    <check if="all verifications pass">
      <output>✅ Test automation complete for {{story_key}}.</output>
      <action>Update lifecycle state: append 'test-automate' to phases_completed, current_phase → 'nfr', last_updated → now</action>
    </check>

    <check if="verifications fail (test failures detected)">
      <output>⚠ Test failures detected post-automation. Entering QuickDev fix cycle (cycle {{quickdev_cycle + 1}} of 2)...</output>
      <action>Increment quickdev_cycle in lifecycle state</action>
      <check if="quickdev_cycle > 2">
        <output>🚫 BLOCKED — QuickDev cycle budget exhausted during test-automate.

Test failures: {{failures}}
Escalating to {{user_name}}.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "quickdev budget exhausted in test-automate", last_updated → now</action>
<action>HALT</action>
</check>
<action>Execute bmad-quick-dev to fix the failing tests: - Load: {project-root}/.agents/skills/bmad-quick-dev/SKILL.md - Target: fix specific test failures (code bugs, not test logic) - If failures are in test logic: fix test logic directly without bmad-quick-dev
</action>
<action>Update sprint-status.yaml: {{story_key}} → review</action>
<action>After fix: re-run code review (abbreviated — check only changed files), then return here</action>
<action>Update sprint-status.yaml: {{story_key}} → in-test</action>
<goto anchor="test-automate" />
</check>
</step>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 9: NFR AUDIT                                          -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="10" goal="Audit NFR evidence (performance, security, reliability)" tag="nfr" anchor="nfr">
    <check if="'nfr' is in phases_completed">
      <goto anchor="trace" />
    </check>

    <action>Update lifecycle state: current_phase → 'nfr', last_updated → now</action>

    <output>🛡 Auditing NFR evidence for {{story_key}} (attempt {{nfr_retries + 1}})...</output>

    <action>Execute the bmad-testarch-nfr workflow in Create mode:
      - Load: {project-root}/.agents/skills/bmad-testarch-nfr/SKILL.md
      - Scope: story {{story_key}} — new code paths only
      - Mode: Create
      - Audit areas: performance, security, reliability, maintainability
    </action>

    <check if="zero BLOCKER items found — all audited NFR areas pass">
      <output>✅ NFR audit passed for {{story_key}}.</output>
      <action>Update lifecycle state: append 'nfr' to phases_completed, current_phase → 'trace', last_updated → now</action>
    </check>

    <check if="BLOCKER items found AND nfr_retries < 2">
      <action>Increment nfr_retries in lifecycle state, last_updated → now</action>
      <output>⚠ NFR blockers found: {{blockers}}. Running QuickDev fix (cycle {{quickdev_cycle + 1}} of 2)...</output>
      <action>Increment quickdev_cycle in lifecycle state</action>
      <check if="quickdev_cycle > 2">
        <output>🚫 BLOCKED — QuickDev cycle budget exhausted during NFR audit.

NFR blockers: {{blockers}}
Escalating to {{user_name}}.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "quickdev budget exhausted in nfr", last_updated → now</action>
<action>HALT</action>
</check>
<action>Update sprint-status.yaml: {{story_key}} → review</action>
<action>Execute bmad-quick-dev to fix the NFR gaps: - Load: {project-root}/.agents/skills/bmad-quick-dev/SKILL.md - Target: specific NFR BLOCKER items identified in audit - Verify DoD gates 1–4 still pass after fix
</action>
<action>Update sprint-status.yaml: {{story_key}} → in-test</action>
<goto anchor="nfr" />
</check>

    <check if="nfr_retries >= 2">
      <output>🚫 BLOCKED — NFR audit blockers persist after max fix attempts.

Blockers: {{blockers}}
Escalating to {{user_name}}.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "NFR audit blockers after max retries", last_updated → now</action>
<action>HALT</action>
</check>

  </step>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 10: TRACEABILITY                                      -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="11" goal="Generate traceability matrix and coverage gate" tag="trace" anchor="trace">
    <check if="'trace' is in phases_completed">
      <goto anchor="test-review" />
    </check>

    <action>Update lifecycle state: current_phase → 'trace', last_updated → now</action>

    <output>🗺 Generating traceability matrix for {{story_key}} (attempt {{trace_retries + 1}})...</output>

    <action>Execute the bmad-testarch-trace workflow in Create mode:
      - Load: {project-root}/.agents/skills/bmad-testarch-trace/SKILL.md
      - Scope: story {{story_key}} acceptance criteria → test mapping
      - Mode: Create
    </action>

    <check if="quality gate decision is PASS or WAIVED">
      <output>✅ Traceability gate passed for {{story_key}}.</output>
      <action>Update lifecycle state: append 'trace' to phases_completed, current_phase → 'test-review', last_updated → now</action>
    </check>

    <check if="quality gate decision is FAIL or CONCERNS AND trace_retries < 2">
      <action>Increment trace_retries in lifecycle state, last_updated → now</action>
      <output>⚠ Traceability gaps found: {{gaps}}. Adding missing test coverage ({{trace_retries}} of 2)...</output>
      <action>Add missing test coverage to close the identified traceability gaps</action>
      <goto anchor="trace" />
    </check>

    <check if="trace_retries >= 2">
      <output>🚫 BLOCKED — Traceability gate failed after max attempts.

Coverage gaps: {{gaps}}
Escalating to {{user_name}}.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "traceability gate failed after max retries", last_updated → now</action>
<action>HALT</action>
</check>

  </step>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 11: TEST REVIEW                                       -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="12" goal="Review test quality" tag="test-review" anchor="test-review">
    <check if="'test-review' is in phases_completed">
      <goto anchor="done" />
    </check>

    <output>🔬 Reviewing test quality for {{story_key}}...</output>

    <action>Execute the bmad-testarch-test-review workflow:
      - Load: {project-root}/.agents/skills/bmad-testarch-test-review/SKILL.md
      - Scope: tests written for story {{story_key}}
    </action>

    <check if="zero BLOCKER items — test quality acceptable">
      <output>✅ Test review passed for {{story_key}}.</output>
      <action>Update lifecycle state: append 'test-review' to phases_completed, current_phase → 'done', last_updated → now</action>
    </check>

    <check if="BLOCKER items found (test gaps that require code changes)">
      <output>⚠ Test review blockers require code changes. Running QuickDev fix (cycle {{quickdev_cycle + 1}} of 2)...</output>
      <action>Increment quickdev_cycle in lifecycle state</action>
      <check if="quickdev_cycle > 2">
        <output>🚫 BLOCKED — QuickDev cycle budget exhausted during test-review.

Test review blockers: {{blockers}}
Escalating to {{user_name}}.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "quickdev budget exhausted in test-review", last_updated → now</action>
<action>HALT</action>
</check>
<action>Execute bmad-quick-dev to fix code issues raised by test review: - Load: {project-root}/.agents/skills/bmad-quick-dev/SKILL.md - Target: specific code gaps identified in test review
</action>
<action>Update sprint-status.yaml: {{story_key}} → review</action>
<action>Re-run abbreviated code review on changed files, then update sprint-status → in-test</action>
<action>Remove 'test-automate', 'nfr', 'trace' from phases_completed in lifecycle state to force re-execution</action>
<goto anchor="test-automate" />
</check>

    <check if="BLOCKER items found (test quality issues only — no code changes needed)">
      <action>Fix test quality issues directly (improve assertions, add missing edge cases, remove duplicates)</action>
      <goto anchor="test-review" />
    </check>

  </step>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 12: DONE                                              -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="13" goal="Mark story done and update sprint tracking" tag="done" anchor="done">
    <action>Update sprint-status.yaml: {{story_key}} → done</action>

    <action>Check if {{story_key}} is the last story in epic {{epic_id}} — read sprint-status.yaml and check all stories for that epic</action>
    <check if="all stories in epic {{epic_id}} are done">
      <action>Set {{epic_all_done}} = true</action>
      <action>Update sprint-status.yaml: epic-{{epic_id}} → done</action>
      <output>🎉 Epic {{epic_id}} is now complete — all stories done!</output>
    </check>
    <check if="not all stories in epic {{epic_id}} are done">
      <action>Set {{epic_all_done}} = false</action>
    </check>

    <action>Update lifecycle state: status → done, append 'done' to phases_completed, last_updated → now</action>

    <output>

✅ Story {{story_key}} lifecycle complete!

## Summary

| Phase                   | Result                                                                   |
| ----------------------- | ------------------------------------------------------------------------ |
| Preflight — Framework   | ✅                                                                       |
| Preflight — Test Design | ✅ {{test_design_auto_created ? "(auto-created)" : ""}}                  |
| Create Story            | ✅                                                                       |
| ATDD                    | ✅ {{atdd_retries > 0 ? "(retries: " + atdd_retries + ")" : ""}}         |
| Validate                | ✅ {{validate_retries > 0 ? "(retries: " + validate_retries + ")" : ""}} |
| Dev Story               | ✅ {{dev_retries > 0 ? "(retries: " + dev_retries + ")" : ""}}           |
| Code Review             | ✅ {{code_review_retries > 0 ? "(1 fix cycle)" : ""}}                    |
| Test Automate           | ✅                                                                       |
| NFR Audit               | ✅ {{nfr_retries > 0 ? "(retries: " + nfr_retries + ")" : ""}}           |
| Traceability            | ✅ {{trace_retries > 0 ? "(retries: " + trace_retries + ")" : ""}}       |
| Test Review             | ✅                                                                       |

**QuickDev cycles used:** {{quickdev_cycle}} of 2
**Final status:** done
**Sprint-status updated:** {{story_key}} → done{{epic_all_done ? ", epic-{{epic_id}} → done" : ""}}
</output>
</step>

</workflow>
