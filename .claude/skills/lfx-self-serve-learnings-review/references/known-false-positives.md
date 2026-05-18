# Known false positives — applied LAST in every review pass

Findings that match any pattern below MUST be dropped, regardless of which source (rule file, checklist, pr-knowledge file) originally produced them. This list is the floor — even a quotable pattern doesn't survive if it matches a known false positive.

Used by `/lfx-self-serve-learnings-review` (Phase 6), and also relevant filter discipline for `/lfx-review-pr` and the `lfx-self-serve-code-reviewer` agent.

---

## Angular / framework version drift

### `ChangeDetectionStrategy.OnPush` flags

**Pattern matched:** any finding stating that a component is missing `changeDetection: ChangeDetectionStrategy.OnPush`.

**Why false:** the app uses **stable zoneless change detection** (`provideZonelessChangeDetection()` in `app.config.ts`). `OnPush` is irrelevant under zoneless — the runtime is already not doing zone-based change detection.

**Source:** see `CLAUDE.md` "Development Memories" + `docs/architecture/frontend/angular-patterns.md`.

### `standalone: true` flags

**Pattern matched:** any finding stating that a component / directive / pipe is missing `standalone: true`.

**Why false:** Angular 20+ makes `standalone: true` **the default**. Adding it is redundant; flagging its absence is wrong.

### `provideZonelessChangeDetection()` marked experimental

**Pattern matched:** any finding stating `provideZonelessChangeDetection()` is experimental, in developer preview, or unstable.

**Why false:** zoneless change detection became **stable in Angular 20**. Not experimental. Not preview.

---

## Already-covered-by-tooling

### Prettier line-length / formatting on `.md` files

**Pattern matched:** prettier line-length, trailing-whitespace, or formatting nits on `*.md` files.

**Why false:** `/preflight` runs `yarn format:check` which already enforces prettier on the whole repo. Surfacing in a review is duplicate signal.

### License-header complaints on a file that has one

**Pattern matched:** finding states a `.ts` / `.html` / `.scss` is missing the MIT license header, when `head -2 <file>` confirms it's present.

**Why false:** `check-headers.sh` and the pre-commit hook already enforce this. If they pass, the file has the header — the bot misread it.

---

## Bot-quirk noise

### CodeRabbit `🏁 Script executed:` reconnaissance dumps

**Pattern matched:** any text quoting a CodeRabbit `🏁 Script executed:` block (typically a `wc` or `grep` the bot ran to verify its claim).

**Why false:** this is internal CodeRabbit reasoning, not a finding. If we quote it in our report, we're surfacing noise.

### CodeRabbit per-doc copy-editing suggestions

**Pattern matched:** suggestions to reword Helm chart descriptions, README phrasing, changelog entries, etc., when the change is purely cosmetic.

**Why false:** out of scope for the PR. The bots flag copy-editing on `Chart.yaml` / `README.md` because they touch every file; reviewers don't act on it.

### Copilot "Consider extracting helper function" for single-use helpers

**Pattern matched:** suggestion to extract a 3-5 line block into a named helper, when the block is used exactly once and inlining is clearer.

**Why false:** premature abstraction. CLAUDE.md explicitly says "three similar lines is better than a premature abstraction" — single-use extraction violates this.

### "Add Copilot custom instructions" promotional CTA

**Pattern matched:** the trailing "Improve your code reviews — add custom instructions" text Copilot appends to every PR summary.

**Why false:** promotional, not a finding.

---

## PR-description-vs-UI-text "drift" when UI is canonical

**Pattern matched:** finding stating the PR description and the UI text disagree on a label/heading.

**Why false (conditional):** only false when the UI text is the source of truth (design-led PRs where the implementation is canonical and the PR description was written first). When the UI accidentally diverges from a spec the PR cites, the finding IS valid. Author has to make the call — but the default for this codebase is "UI text is canonical for landed PRs," so default to dropping.

---

## How to add a new entry

When you encounter a bot finding the team has explicitly decided is not relevant for this codebase:

1. Add an entry here with **Pattern matched**, **Why false**, and (where applicable) **Source**.
2. If the pattern was previously in a `pr-knowledge/<file>.md`, remove it from there too — don't have a pattern in both files.
3. If the pattern is something the bots will surface forever (e.g., zoneless OnPush flags from Copilot), that's permanent. If it's a one-time misread, no need to add it.

This file should accumulate slowly. If it grows past ~50 entries, that's a signal we're being too permissive — re-audit.
