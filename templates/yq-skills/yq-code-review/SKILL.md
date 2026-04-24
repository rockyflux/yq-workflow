---
name: yq-code-review
description: Use when changes need reviewer-style scrutiny for correctness, regression risk, maintainability, missing tests, or delivery readiness before merge or release.
---

<codex_skill_adapter>
## A. Skill Invocation
- This skill is invoked by mentioning `yq-code-review`.
- Treat all text after invocation as review args.
- If no args are present, use default review behavior.

## B. Argument Parsing
- First positional argument: review target/scope hint.
- Optional flags:
  - `--depth=quick|standard|deep`
  - `--files=file1,file2,...`

## C. Execution Style
- Prefer deterministic, scope-first review flow.
- If explicit scope is missing, fallback to changed files.
- If no files resolved, return `No review scope` with next action guidance.
</codex_skill_adapter>

<objective>
Review changed source files for bugs, security vulnerabilities, and code quality issues.

Use reviewer-style scrutiny with severity-classified findings:
- `S0-Blocker`: correctness/security release blocker
- `S1-High`: high regression or reliability risk
- `S2-Medium`: maintainability/testability degradation
- `S3-Low`: minor quality improvements

Arguments:
- Target scope (required): review target identifier (task/PR/commit range/freeform scope)
- `--depth=quick|standard|deep` (optional, default `standard`)
  - quick: fast pattern scan (~2 min)
  - standard: per-file semantic review (~5-15 min)
  - deep: cross-file call-chain/data-flow review (~15-30 min)
- `--files=file1,file2,...` (optional): explicit file list override (highest precedence)

Output: `CODE-REVIEW.md` (or task-scoped review note) + inline summary of findings and next steps.
</objective>

<context>
Review target: first positional argument after `yq-code-review`.

Optional flags:
- `--depth=VALUE`: quick|standard|deep
- `--files=file1,file2,...`: explicit review scope override

Scope resolution order:
1. `--files` explicit list
2. task/summary-declared changed files
3. git changed files fallback (staged + unstaged)

If scope is empty after resolution, return `No review scope` and request explicit targets.
</context>

<process>
This skill is a lightweight review workflow, focused on risk-first findings.

Execution gates:
1. Scope validation
2. Review depth selection
3. File scoping (`--files` > declared scope > git diff fallback)
4. Empty scope short-circuit
5. Risk-first analysis:
   - correctness/regression
   - security/trust boundary
   - maintainability/complexity
   - testing/verification gaps
6. Result presentation (severity-first findings + open questions + next steps)
</process>

<output_template>
```markdown
# Code Review
## Scope
## Findings by Severity
### S0-Blocker
### S1-High
### S2-Medium
### S3-Low
## Open Questions
## Testing Gaps
## Residual Risks
## Recommended Next Step
```

For each finding:
- **Issue**: what is wrong
- **Where**: file/symbol/path
- **Why it matters**: trigger + impact
- **Fix direction**: smallest safe fix direction
</output_template>

<route_elsewhere>
- Mostly code explanation: `yq-code-explain`
- Mostly bug fixing/implementation: `yq-debug`, `yq-code-gen`
- Security-focused threat analysis: `yq-security-scan`
</route_elsewhere>

<common_mistakes>
- Discussing style while missing behavior risks
- Findings without trigger conditions and impact
- No test-gap analysis
- No explicit scope/depth, making conclusions non-reproducible
</common_mistakes>
