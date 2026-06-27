---
name: bmad-story-lifecycle
description: 'Autonomously drives a story through the full dev+test lifecycle: preflight → create-story → validate → ATDD → dev → code-review → test-automate → test-review → nfr → trace → done. Hybrid execution (inline vs subagent) with model selection per phase (Sonnet for coding, Opus for analysis/writing). Handles test-design auto-creation, retry loops, and bug-fix cycles. Use when the user says "run lifecycle for story [id]", "run story lifecycle", or "automate story [id]".'
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

**Phase Tags (in order):** `init` → `preflight-framework` → `preflight-test-design` → `create-story` → `validate` → `atdd` → `dev-story` → `code-review` → `test-automate` → `test-review` → `nfr` → `trace` → `done`

---

## Exit Criteria Reference

| Phase                 | Exit Criteria — PASS                                                                          | Action on FAIL                        |
| --------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------- |
| preflight-framework   | `framework-setup-progress.md` exists + `step-05` completed                                    | HALT — not auto-fixable               |
| preflight-test-design | test-design for epic covers story scope + quality gate passes                                 | Auto-create (retry ≤ 2)               |
| create-story          | story file exists in `{implementation_artifacts}/`, status `ready-for-dev`                    | Retry creation                        |
| validate              | `bmad-check-implementation-readiness` scores PASS                                             | Fix spec gaps (retry ≤ 2)             |
| atdd                  | ≥1 acceptance test scaffold file exists in `src/client/tests/` or test project, all tests RED | Rework with spec feedback (retry ≤ 2) |
| dev-story             | All ATDD tests GREEN; TypeScript builds clean; .NET builds clean                              | Retry dev (retry ≤ 2)                 |
| code-review           | `bmad-code-review` finds zero BLOCKER items                                                   | QuickDev fix → re-review (retry ≤ 1)  |
| test-automate         | Coverage targets met; all ATDD assertions pass                                                | QuickDev fix cycle                    |
| test-review           | `bmad-testarch-test-review` finds zero BLOCKER items                                          | QuickDev fix (cycle ≤ 2)              |
| nfr                   | `bmad-testarch-nfr` finds zero BLOCKER items (perf / security / reliability)                  | QuickDev fix (cycle ≤ 2)              |
| trace                 | `bmad-testarch-trace` gate decision is PASS or WAIVED                                         | Add missing coverage (retry ≤ 2)      |

**QuickDev cycle budget:** max 2 per story. When exhausted → HALT, status → `blocked`.

---

## Execution Strategy (Hybrid: inline vs subagent + model per phase)

The orchestrator runs phases with a **hybrid execution model**. Lightweight steps (state transitions, file checks, readiness reasoning, changelog/commit) run **inline** in the orchestrator context. Heavy, self-contained skills run as **dispatched subagents** so they keep their own context window and return only a structured result. Model is chosen by task type: **Claude Sonnet (latest)** for coding tasks (writing/expanding/fixing code and tests), **Claude Opus (latest)** for reasoning, analysis, and writing tasks (more thinking).

| Phase                 | Skill                                 | Execution | Model  | Why                                              |
| --------------------- | ------------------------------------- | --------- | ------ | ------------------------------------------------ |
| init                  | —                                     | inline    | Opus   | trivial state resolution                         |
| preflight-framework   | — (file check)                        | inline    | Opus   | read a progress file                             |
| preflight-test-design | `bmad-testarch-test-design`           | subagent  | Opus   | test-strategy authoring/analysis                 |
| create-story          | `bmad-create-story`                   | subagent  | Opus   | exhaustive artifact analysis + story writing     |
| validate              | `bmad-check-implementation-readiness` | inline    | Opus   | light spec-readiness reasoning over full context |
| atdd                  | `bmad-testarch-atdd`                  | subagent  | Sonnet | writing red test scaffolds (coding)              |
| dev-story             | `bmad-dev-story`                      | subagent  | Sonnet | feature implementation (coding)                  |
| code-review           | `bmad-code-review`                    | subagent  | Opus   | adversarial review/analysis                      |
| test-automate         | `bmad-testarch-automate`              | subagent  | Sonnet | writing/expanding tests (coding)                 |
| test-review           | `bmad-testarch-test-review`           | subagent  | Opus   | test-quality review/analysis                     |
| nfr                   | `bmad-testarch-nfr`                   | subagent  | Opus   | NFR evidence analysis/writing                    |
| trace                 | `bmad-testarch-trace`                 | subagent  | Opus   | traceability matrix synthesis/writing            |
| (fix cycles)          | `bmad-quick-dev`                      | subagent  | Sonnet | targeted code/test fixes (coding)                |
| done                  | —                                     | inline    | Opus   | changelog + Conventional Commit composition      |

**Rules:**

- When dispatching a subagent, pass it the story_key, the SKILL path to load, the phase scope, and the model above. The subagent returns a structured result (gate verdict, artifact paths, counts); the orchestrator records the gate decision and advances state.
- Inline phases keep full conversational context (story file, prior gate results) — chosen where that context outweighs isolation.
- Any phase that runs **E2E or container-dependent tests** must first load `{project-root}/docs/testing/test-environment.md` and ensure the Fishtank stack is up (see that doc). The E2E gate (test-automate) hard-blocks if the stack is not healthy.

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

    <!-- ─── Releases housekeeping: stale ready-for-merge / merged-but-not-released ─── -->
    <action>Read {project-root}/releases.yaml and collect all entries where status is "ready-for-merge" OR (status is "in-progress" AND hotfix == true) — call this set {{active_releases}}</action>
    <check if="{{active_releases}} is non-empty">
      <action>Run: git fetch origin (ensure remote refs are current)</action>
      <action>Run: git branch -r --merged origin/main
        For each entry in {{active_releases}}:
          - branch = entry.branch (e.g. "release/v0.2.0" or "hotfix/v0.2.1")
          - Check whether "origin/{branch}" appears in the merged-branch output
          - If origin/{branch} no longer exists remotely (git ls-remote --heads origin {branch} returns empty),
            treat it as merged (deleted-after-merge pattern)
          - Collect all confirmed-merged entries as {{stale_releases}}
      </action>
      <check if="{{stale_releases}} is non-empty">
        <output>
⚠️ **releases.yaml housekeeping required** — the following branches are merged to `main` but their status has not been updated:

{{#each stale_releases}}
- `{{version}}` (branch: `{{branch}}`, current status: `{{status}}`) — update to `status: "released"` and set `released: YYYY-MM-DD`
{{/each}}

Update `releases.yaml` for each entry above, then re-run the lifecycle to continue.
        </output>
        <action>HALT</action>
      </check>
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
      <goto anchor="validate" />
    </check>

    <check if="story file already exists in {implementation_artifacts}/ with status ready-for-dev or higher">
      <output>✅ Story file already exists for {{story_key}}. Skipping creation.</output>
      <action>Update lifecycle state: append 'create-story' to phases_completed, current_phase → 'validate', last_updated → now</action>
      <goto anchor="validate" />
    </check>

    <output>📝 Creating story file for {{story_key}}...</output>
    <action>Execute the bmad-create-story workflow:
      - Load: {project-root}/.agents/skills/bmad-create-story/SKILL.md
      - Target story: {{story_key}}
      - The skill's own activation steps and preflight checks will run (test-design check will pass — already confirmed)
      - Execution: dispatch as a SUBAGENT on Claude Opus — exhaustive artifact analysis + story authoring is a writing/analysis task.
    </action>

    <action>After creation: verify story file exists in {implementation_artifacts}/ with correct YAML frontmatter (story_key, status: ready-for-dev)</action>
    <action>Verify sprint-status.yaml updated: story → ready-for-dev, epic → in-progress</action>

    <check if="story file exists in {implementation_artifacts}/ with status ready-for-dev">
      <output>✅ Story {{story_key}} created and sprint-status updated.</output>
      <action>Update lifecycle state: append 'create-story' to phases_completed, current_phase → 'validate', last_updated → now</action>
    </check>

    <check if="story file missing OR status is not ready-for-dev">
      <output>🚫 BLOCKED — Story creation failed. Expected: {implementation_artifacts}/{{story_key}}.md with status ready-for-dev.

Manual fix required: run bmad-create-story directly and verify the output before re-running this lifecycle.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "story creation failed — file missing or incorrect status", last_updated → now</action>
<action>HALT</action>
</check>

  </step>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 4: VALIDATE                                           -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- Execution: INLINE · Model: Claude Opus (reasoning/spec-analysis) -->
  <step n="5" goal="Validate story readiness before implementation" tag="validate" anchor="validate">
    <check if="'validate' is in phases_completed">
      <goto anchor="atdd" />
    </check>

    <output>🔍 Validating implementation readiness for {{story_key}} (attempt {{validate_retries + 1}})...</output>

    <action>Execute the bmad-check-implementation-readiness workflow scoped to story {{story_key}}:
      - Load: {project-root}/.agents/skills/bmad-check-implementation-readiness/SKILL.md
      - Scope: this story only
      - Execution: run INLINE (orchestrator context) on Claude Opus — readiness reasoning is light and benefits from full story context.
    </action>

    <check if="readiness check scores PASS (no BLOCKER items)">
      <output>✅ Story {{story_key}} is implementation-ready.</output>
      <action>Update lifecycle state: append 'validate' to phases_completed, current_phase → 'atdd', last_updated → now</action>
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
  <!-- PHASE 5: ATDD                                               -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- Execution: SUBAGENT · Model: Claude Sonnet (test-code authoring) -->
  <step n="6" goal="Write acceptance test scaffolds (red phase)" tag="atdd" anchor="atdd">
    <check if="'atdd' is in phases_completed">
      <goto anchor="dev-story" />
    </check>

    <output>🧪 Writing acceptance test scaffolds for {{story_key}} (attempt {{atdd_retries + 1}})...</output>

    <action>Execute the bmad-testarch-atdd workflow in Create mode:
      - Load: {project-root}/.agents/skills/bmad-testarch-atdd/SKILL.md
      - Scope: story {{story_key}} only
      - Mode: Create
      - Tests must be RED phase (scaffolds that compile but fail — no implementation yet)
      - Execution: dispatch as a SUBAGENT on Claude Sonnet (test-code authoring is a coding task).
      - If the story requires E2E/container tests, load {project-root}/docs/testing/test-environment.md for how to bring the stack up.
    </action>

    <action>After completion: verify exit criteria:
      1. At least one acceptance test file exists (Playwright spec in src/client/tests/ or xUnit test in test projects)
      2. Tests reference story acceptance criteria from the story file
      3. Tests fail when run against current codebase (confirming red phase)
    </action>

    <check if="exit criteria pass">
      <output>✅ ATDD scaffolds written and confirmed RED for {{story_key}}.</output>
      <action>Verify ATDD checklist artifact written to disk: check that {test_artifacts}/atdd-checklist-{{story_key}}.md exists as a file</action>
      <check if="atdd checklist file does NOT exist on disk">
        <output>⚠ ATDD phase passed but checklist artifact was not saved to disk. Saving now...</output>
        <action>Write the ATDD checklist to {test_artifacts}/atdd-checklist-{{story_key}}.md — include: phase gate status table (test file created, ACs referenced, compile clean, tests RED), scaffold file path, list of generated tests with AC mapping, and (if applicable) data-testid contract table</action>
        <check if="file still does not exist after save attempt">
          <output>🚫 BLOCKED — ATDD checklist artifact could not be persisted to disk.

Manual action required: save the checklist to \_bmad-output/test-artifacts/atdd-checklist-{{story_key}}.md and re-run this lifecycle.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "atdd-checklist artifact not persisted", last_updated → now</action>
<action>HALT</action>
</check>
</check>
<action>Update lifecycle state: append 'atdd' to phases_completed, current_phase → 'dev-story', last_updated → now</action>
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
  <!-- PHASE 6: DEV STORY                                          -->
  <!-- Execution: SUBAGENT · Model: Claude Sonnet (feature implementation) -->
  <!-- bmad-quick-dev fix cycles (triggered from code-review/test-automate/nfr/test-review): SUBAGENT · Claude Sonnet -->
  <!-- E2E/container DoD checks: load docs/testing/test-environment.md to bring the stack up first -->

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
      - The skill's ATDD preflight will pass — scaffolds confirmed in the atdd phase (phase 5)
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
  <!-- Execution: SUBAGENT · Model: Claude Opus (adversarial review/analysis) -->

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
  <!-- Execution: SUBAGENT · Model: Claude Sonnet (test-code authoring) -->
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
      - Execution: dispatch as a SUBAGENT on Claude Sonnet (writing/expanding test code is a coding task).
      - The base automate skill writes a generic {test_artifacts}/automation-summary.md — instruct the subagent to write the PER-STORY file {test_artifacts}/automation-summary-{{story_key}}.md.
      - If the story requires E2E/container tests, load {project-root}/docs/testing/test-environment.md for how to bring the stack up.
    </action>

    <action>After completion: verify:
      1. All ATDD acceptance tests still GREEN
      2. New automated tests added for story code paths
      3. No regressions in existing test suite
    </action>

    <check if="all verifications pass">
      <output>✅ Test automation complete for {{story_key}}.</output>
      <action>Verify automation-summary artifact written to disk: check that {test_artifacts}/automation-summary-{{story_key}}.md exists as a file</action>
      <check if="automation-summary file does NOT exist on disk">
        <output>⚠ Test-automate phase passed but the automation-summary artifact was not saved to disk. Saving now...</output>
        <action>Write the automation summary to {test_artifacts}/automation-summary-{{story_key}}.md — include: YAML frontmatter (story_key, generated date), a coverage table (AC → test file → layer → status), tests added this phase, total test counts per suite, and any intentional coverage gaps with rationale</action>
        <check if="file still does not exist after save attempt">
          <output>🚫 BLOCKED — automation-summary artifact could not be persisted to disk.

Manual action required: save the summary to \_bmad-output/test-artifacts/automation-summary-{{story_key}}.md and re-run this lifecycle.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "automation-summary artifact not persisted", last_updated → now</action>
<action>HALT</action>
</check>
</check>
<action>Update lifecycle state: append 'test-automate' to phases_completed, current_phase → 'test-review', last_updated → now</action>
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
  <!-- PHASE 9: TEST REVIEW                                        -->
  <!-- Execution: SUBAGENT · Model: Claude Opus (test-quality review/analysis) -->

  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="10" goal="Review test quality" tag="test-review" anchor="test-review">
    <check if="'test-review' is in phases_completed">
      <goto anchor="nfr" />
    </check>

    <output>🔬 Reviewing test quality for {{story_key}}...</output>

    <action>Execute the bmad-testarch-test-review workflow:
      - Load: {project-root}/.agents/skills/bmad-testarch-test-review/SKILL.md
      - Scope: tests written for story {{story_key}}
    </action>

    <check if="zero BLOCKER items — test quality acceptable">
      <output>✅ Test review passed for {{story_key}}.</output>
      <action>Update lifecycle state: append 'test-review' to phases_completed, current_phase → 'nfr', last_updated → now</action>
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
<action>Remove 'test-automate', 'test-review' from phases_completed in lifecycle state to force re-execution</action>
<goto anchor="test-automate" />
</check>

    <check if="BLOCKER items found (test quality issues only — no code changes needed)">
      <action>Fix test quality issues directly (improve assertions, add missing edge cases, remove duplicates)</action>
      <goto anchor="test-review" />
    </check>

  </step>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHASE 10: NFR AUDIT                                         -->
  <!-- Execution: SUBAGENT · Model: Claude Opus (NFR evidence analysis/writing) -->

  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="11" goal="Audit NFR evidence (performance, security, reliability)" tag="nfr" anchor="nfr">
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
      <action>Verify NFR assessment artifact written to disk: check that {test_artifacts}/nfr-assessment-{{story_key}}.md exists as a file</action>
      <check if="nfr assessment file does NOT exist on disk">
        <output>⚠ NFR audit passed but assessment artifact was not saved to disk. Saving now...</output>
        <action>Write the NFR assessment to {test_artifacts}/nfr-assessment-{{story_key}}.md — include: YAML frontmatter (story_key, generated date, verdict), evidence table per NFR category (performance, security, reliability, maintainability), and overall gate decision with rationale</action>
        <check if="file still does not exist after save attempt">
          <output>🚫 BLOCKED — NFR assessment artifact could not be persisted to disk.

Manual action required: save the assessment to \_bmad-output/test-artifacts/nfr-assessment-{{story_key}}.md and re-run this lifecycle.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "nfr-assessment artifact not persisted", last_updated → now</action>
<action>HALT</action>
</check>
</check>
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
  <!-- PHASE 11: TRACEABILITY                                      -->
  <!-- Execution: SUBAGENT · Model: Claude Opus (matrix synthesis/writing) -->

  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="12" goal="Generate traceability matrix and coverage gate" tag="trace" anchor="trace">
    <check if="'trace' is in phases_completed">
      <goto anchor="done" />
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
      <action>Verify artifact written to disk: check that {test_artifacts}/traceability-matrix-{{story_key}}.md exists as a file</action>
      <check if="traceability matrix file does NOT exist on disk">
        <output>⚠ Gate passed but traceability matrix was not saved to disk. Saving artifact now...</output>
        <action>Write the traceability matrix generated by bmad-testarch-trace to {test_artifacts}/traceability-matrix-{{story_key}}.md — use create_file or equivalent tool; do NOT rely on in-context output only</action>
        <check if="file still does not exist after save attempt">
          <output>🚫 BLOCKED — Traceability matrix could not be persisted to disk.

Manual action required: save the matrix to \_bmad-output/test-artifacts/traceability-matrix-{{story_key}}.md and re-run this lifecycle.</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "traceability matrix artifact not persisted", last_updated → now</action>
<action>HALT</action>
</check>
</check>
<action>Update lifecycle state: append 'trace' to phases_completed, current_phase → 'done', last_updated → now</action>
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
  <!-- PHASE 12: DONE                                              -->
  <!-- Execution: INLINE · Model: Claude Opus (changelog/commit composition) -->

  <!-- ═══════════════════════════════════════════════════════════ -->
  <step n="13" goal="Mark story done and update sprint tracking" tag="done" anchor="done">
    <action>Update sprint-status.yaml: {{story_key}} → done</action>

    <action>Check if {{story_key}} is the last story in epic {{epic_id}} — read sprint-status.yaml and check all stories for that epic</action>
    <check if="all stories in epic {{epic_id}} are done">
      <action>Set {{epic_all_done}} = true</action>
      <action>Update sprint-status.yaml: epic-{{epic_id}} → done</action>
      <action>Rename the active CHANGELOG.md unreleased header to a versioned release header:
        - Read releases.yaml to find the version string for epic {{epic_id}} (e.g. "v0.1.0") and the release theme (description)
        - In CHANGELOG.md, replace the line matching `## [Unreleased] — vX.Y.Z (Theme)` with `## [vX.Y.Z] — {{date}} (Theme)` where vX.Y.Z and Theme come from releases.yaml
        - If no `[Unreleased]` header is found (e.g. already renamed), skip this sub-action
        - Save CHANGELOG.md
      </action>
      <action>Update releases.yaml: set completed = {{date}} for the release matching epic {{epic_id}}</action>
      <output>🎉 Epic {{epic_id}} is now complete — all stories done!</output>
    </check>
    <check if="not all stories in epic {{epic_id}} are done">
      <action>Set {{epic_all_done}} = false</action>
    </check>

    <action>Update lifecycle state: status → done, append 'done' to phases_completed, last_updated → now</action>

    <!-- CHANGELOG update -->
    <action>Update CHANGELOG.md under the [Unreleased] section (or the active versioned section if a release is in progress):
      - Add a bullet point for each user-facing feature, API endpoint, component, or behavior shipped in this story
      - Format: "- **Feature name** — short description (`story/{{epic_id}}-{{n}}`)" where {{n}} is the story number within the epic
      - INCLUDE: new UI pages/components, new API endpoints, new config options, new runtime behaviors, security controls, data model changes
      - EXCLUDE: test files, unit tests, E2E tests, ATDD scaffolds, test framework/tooling configuration — tests are implementation details, not user-facing changelog entries
      - EXCLUDE: internal code-quality fixes or refactors unless they change observable behavior
      - EXCLUDE: BMad skill files (.agents/skills/**), lifecycle SKILL.md, sprint/planning artifacts, AI workflow configuration — these are developer-tooling changes, not product changes visible to end users
    </action>

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
| Test Review             | ✅                                                                       |
| NFR Audit               | ✅ {{nfr_retries > 0 ? "(retries: " + nfr_retries + ")" : ""}}           |
| Traceability            | ✅ {{trace_retries > 0 ? "(retries: " + trace_retries + ")" : ""}}       |

**QuickDev cycles used:** {{quickdev_cycle}} of 2
**Final status:** done
**Sprint-status updated:** {{story_key}} → done{{epic_all_done ? ", epic-{{epic_id}} → done" : ""}}
</output>

    <!-- PR readiness gate — must all be true before the user should open a PR -->
    <action>Evaluate PR readiness by checking ALL of the following conditions:
      PR-1: sprint-status.yaml shows {{story_key}} → done
      PR-2: All DoD gates still pass (dotnet test + npm run build + dotnet build — re-run if last run was >30 min ago)
      PR-3: {test_artifacts}/traceability-matrix-{{story_key}}.md exists on disk
      PR-4: {implementation_artifacts}/{{story_key}}.md status field = "review" or "done"
      PR-5: No uncommitted changes remain (git status clean, or only untracked _bmad-output files)
    </action>

    <check if="all PR-1 through PR-5 pass">
      <output>

🚀 **Story {{story_key}} is ready for PR.**

{{#if epic_all_done}}
⚠️ **This was the last story in epic {{epic_id}}!** Two PRs are required to ship this release:

1. **Now →** `story/{{story_key}}` → `release/v{{release_version}}`
2. **After PR 1 is merged →** `release/v{{release_version}}` → `main` — triggers Docker publish + GitHub Release.
{{else}}
Open a pull request: `story/{{story_key}}` → `release/v{{release_version}}`
{{/if}}

Checklist confirmed:

- ✅ PR-1: sprint-status → done
- ✅ PR-2: All DoD gates GREEN
- ✅ PR-3: Traceability matrix on disk
- ✅ PR-4: Story file status correct
- ✅ PR-5: Working tree clean
  </output>
  </check>

      <check if="any PR condition fails">
        <output>

  ⚠️ **Story {{story_key}} is NOT ready for PR — the following conditions failed:**

{{#if !PR-1}}❌ PR-1: sprint-status is not 'done' for this story{{/if}}
{{#if !PR-2}}❌ PR-2: DoD gate failure detected — fix before opening PR{{/if}}
{{#if !PR-3}}❌ PR-3: Traceability matrix missing from disk (\_bmad-output/test-artifacts/traceability-matrix-{{story_key}}.md){{/if}}
{{#if !PR-4}}❌ PR-4: Story file status incorrect (expected 'review' or 'done'){{/if}}
{{#if !PR-5}}❌ PR-5: Uncommitted changes remain — commit or stash before opening PR{{/if}}

Do NOT open a PR until all conditions are green. Fix the failing items and re-run this phase.
</output>
<action>Update lifecycle state: status → blocked, blocked_reason → "PR readiness gate failed: {{failed_conditions}}", last_updated → now</action>
<action>HALT</action>
</check>

</step>

</workflow>
