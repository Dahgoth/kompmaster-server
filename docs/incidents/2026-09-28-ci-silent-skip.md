# Incident: CI reported green while running no tests (2026-09-28)

**Status:** resolved
**Severity:** high — silent verification failure across 23 merged PRs
**Window:** 2026-09-25 05:42:59 UTC → 2026-09-28 23:30 UTC
**Introduced by:** `fa34132` (PR #58), 2026-09-25 02:11:37 -0300
**Found by:** reviewing CI state on Dependabot PR #93, which was about to merge a TypeScript 5→7 major

---

## 1. Summary

For three days, the `backend`, `frontend`, `e2e`, `compose` and `terraform` CI
jobs reported **success** while executing **zero** of their real steps. Lint,
typecheck, unit tests, build, Playwright e2e, `docker compose config`,
`docker compose pull`, and `terraform validate` did not run on any pull
request. All eight statuses the `main` ruleset requires were green, so every
merge in that window was gated on checks that had verified nothing.

The cause was a missing `outputs:` block on the `detect-changes` composite
action. Nothing errored, because a job whose steps are all skipped is
`success` by definition.

---

## 2. What the symptom looked like

PR #93 (`typescript` 5.9.3 → 7.0.2, `vitest` 3.2.7 → 5.0.2,
`@vitejs/plugin-react` 4.7.0 → 6.1.1) reported 14 passing checks and zero
failures. The `frontend` job's step list:

```
1. success   Set up job
2. success   actions/checkout@11d5960a
3. success   Detect frontend changes
4. skipped   actions/setup-node@49933ea5
5. skipped   Cache pnpm store
6. skipped   Cache Next.js build
7. skipped   Enable pnpm via corepack
8. skipped   pnpm install --frozen-lockfile
9. skipped   Lint frontend
10. skipped Typecheck frontend      <-- never ran
11. skipped pnpm --filter kompmaster-frontend test   <-- never ran
12. skipped Build storefront        <-- never ran
```

Step 3 **succeeded**, and its runtime output was correct:

```
base: 5050c9369dece786800f3726ce1292903a758d77
frontend changes detected:
frontend/package.json
```

So the action ran, matched the file, and wrote `frontend=true` to
`$GITHUB_OUTPUT`. The job still skipped everything after it.

---

## 3. Root cause

`fa34132` moved change detection out of `ci.yml` and into a composite action,
but **left the call-site guard expressions untouched**.

Before `fa34132`, change detection was an inline `run:` step. A regular step's
outputs are available directly to the caller, so this worked:

```yaml
- id: changes
  run: |
    echo "frontend=true" >> $GITHUB_OUTPUT
- uses: actions/setup-node@...
  if: steps.changes.outputs.frontend == 'true'
```

After `fa34132`, the same guard was reused against a **composite action** step:

```yaml
- uses: ./.github/actions/detect-changes
  id: changes
- uses: actions/setup-node@...
  if: steps.changes.outputs.frontend == 'true'   # byte-identical
```

A composite action must **declare** an `outputs:` block for its values to reach
the caller. Writing to `$GITHUB_OUTPUT` inside a composite action only populates
that action's *internal* step outputs. With no `outputs:` block,
`steps.changes.outputs.frontend` is permanently the empty string, so
`== 'true'` is permanently false.

The action declared inputs but no outputs:

```console
$ grep -c "outputs:" .github/actions/detect-changes/action.yml
0
```

This is why it was invisible: the guard expression was byte-identical before and
after, so it read as correct in review, and the job reported success.

### Traceback

| When | What | Effect |
|------|------|--------|
| 2026-09-16 `6a2a9a3` | `ci.yml` lands with inline path filtering | Works — real steps executed |
| 2026-09-25 02:11 -0300 `fa34132` | Detection extracted to composite action, `outputs:` not declared | All five guarded jobs go permanently false |
| 2026-09-25 05:42:59 UTC | **PR #58** merges `fa34132` | Regression becomes live on `main` |
| 2026-09-25 → 09-28 | 23 PRs merge | All gated on vacuous checks |
| 2026-09-28 23:06 | #93 surfaced — a TS 7 major about to merge untested | Found |

### Evidence that it did work before

Sampled runs preceding `fa34132` (real steps = install/lint/test/build that
completed):

| Run | When | backend | frontend |
|-----|------|---------|----------|
| `35146640967` | 09-16 20:27 | 1 | 1 |
| `35215147810` | 09-17 11:20 | 3 | 3 |
| `35594286403` | 09-21 11:29 | 3 | 3 |

Versus every sampled run after:

| Run | When | backend | frontend | e2e | conclusion |
|-----|------|---------|----------|-----|------------|
| `36465155898` | 09-28 18:26 | 0 | 0 | 0 | success |
| `36465278473` | 09-28 18:27 | 0 | 0 | 0 | success |
| `36472913102` | 09-28 19:32 | 0 | 0 | 0 | success |
| `36476194365` | 09-28 20:00 | 0 | 0 | 0 | success |
| `36490177873` | 09-28 22:04 | 0 | 0 | 0 | success |
| `36496224242` | 09-28 23:06 | 0 | 0 | 0 | success |

`git diff` itself was never at fault — reproduced locally against
`refs/pull/93/merge`, it correctly returns `frontend/package.json` and
`pnpm-lock.yaml`. The failure was purely in the step-to-caller plumbing.

---

## 4. Blast radius

**51 PRs** merged between 2026-09-16 and the fix: **28 verified** (before
#58), **23 unverified** (#58 onward).

```
#58  #60  #61  #59  #62  #63  #64  #66  #67  #69  #70  #71
#72  #73  #74  #75  #76  #87  #94  #96  #99  #88  #89
```

Unaffected: `docs-sync`, `versions`, `commitlint` — they never used
`detect-changes`, which is why the docs-sync false failures investigated
earlier the same evening were diagnosable while the test jobs were not.

---

## 5. Decision: remove the guards rather than repair them

Options weighed:

| | Option | Why not / why |
|---|--------|----------------|
| A | Declare a static `changed` output, keep guards | Smallest diff, but **keeps the silent-failure mode**. A future rename reintroduces green-but-vacuous CI with no signal — the exact failure that cost three days. |
| B | Revert to inline logic in `ci.yml` | Proven to work, but duplicates the diff/ERE block 5× — the duplication `fa34132` existed to remove. |
| C | Drop path filtering entirely | Safest, but `e2e` boots Postgres + 2 browsers + 2 Node servers; every PR pays ~6–8 min for a job that rarely changes. |
| **D** | **Guard only `e2e`** | **Chosen.** |

**Rationale for D.** The failure mode *is* the guard: a guard that silently
evaluates false produces a green job that verified nothing, and nothing in the
system can distinguish that from a genuine pass. Removing the guard from the
four cheap jobs makes that failure mode **structurally impossible** for them,
rather than merely fixed for the current output name.

`backend` and `frontend` are the fast, high-value jobs — lint, typecheck, unit
tests, build. They now always run. `compose` and `terraform` are likewise
cheap enough to always run, and the reason they were guarded (a dead
`minio/minio` image shipped unnoticed) is precisely a case that *needs* an
unguarded check.

`e2e` is the only job where the cost justifies a guard: ~2 minutes of Postgres
plus two browser engines per run. It keeps `detect-changes`, now with a declared
`changed` output, so the guard is backed by a real, reviewable contract.

**Residual risk accepted:** `e2e` can still skip silently if its guard breaks.
Mitigation: the guard is now a single statically-declared output name on a
five-line contract, and `backend`/`frontend` running unconditionally means an
`e2e` false-skip can no longer hide a total CI outage.

**Detection gap that let this run three days:** nothing asserted that a
required check had actually executed anything. A green check that skipped
everything is indistinguishable from a pass, by design. Worth considering a
periodic canary later; not done here.

---

## 6. Changes

- `.github/actions/detect-changes/action.yml` — declares a static `changed`
  output; the dynamic `output-name` input is removed, so there is one source
  of truth instead of two.
- `.github/workflows/ci.yml` — `backend`, `frontend`, `compose`, `terraform`
  lose their `detect-changes` step and all guards. `e2e` keeps its guard,
  rewired to `steps.changes.outputs.changed`.

---

## 7. Second defect found by the same fix

Restoring the `backend` job immediately surfaced a **latent bug that the guard
had been hiding**, in its `Syntax check (backend JS files in this change set)`
step:

```yaml
files=$(git diff ... | grep -E '^backend/(src|tests|scripts)/.*\.js$')
if [ -n "$files" ]; then ... else echo "no backend JS content changes to check."; fi
```

`grep` exits 1 when it matches nothing, and GitHub executes `run:` steps under
`bash -e`. An assignment takes the exit status of its command substitution, so
the unguarded pipeline aborted the step with **exit 1 and no output** the moment
a PR touched no backend JS files — the `else` branch was unreachable.

It only reproduces on changes that touch **no** backend JS, which is why it was
invisible: the whole job was skipping anyway, and every PR since #58 that would
have tripped it was a CI/docs change.

Reproduced locally before fixing:

```console
$ bash -e step.sh          # no matching files
exit=1                     # no output at all
```

Fixed with `|| grep_exit=$?`, which makes it a compound command so `errexit`
does not fire, while still separating "no match" (1, normal) from "bad pattern"
(2, real error). Verified across three cases:

| Case | Result |
|------|--------|
| No backend JS changed | prints the explanatory line, exit 0 |
| Backend JS changed, valid | exit 0 |
| Backend JS changed, **invalid syntax** | exit 1 with the error — the check still works |

This is the same class of defect as the one above it: an unguarded command
whose "nothing to do" exit code is indistinguishable from an error. It was
introduced before `fa34132` and is unrelated to it; the path-filter bug is only
what kept it from being noticed.

## 8. Follow-up

- Re-verify the 23 unverified PRs (§4 of this document).
- Do **not** merge Dependabot major PRs until the restored jobs are green —
  #93 (`typescript` 5→7) and #98 (`release-please-action` v4→v5, node24) were
  both queued with verification switched off.
