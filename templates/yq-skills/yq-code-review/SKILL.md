---
name: yq-code-review
description: Use when changes need reviewer-style scrutiny for correctness, regression risk, maintainability, missing tests, or delivery readiness before merge or release.
upstream:
  - yq-test-gen
  - yq-code-gen
  - yq-debug
downstream:
  - yq-code-refactor
  - yq-doc-gen
  - yq-security-scan
route_when:
  - if: 主要是解释代码
    go:
      - yq-code-explain
  - if: 主要是修 bug 或落地实现
    go:
      - yq-debug
      - yq-code-gen
  - if: 主要是安全威胁分析
    go:
      - yq-security-scan
handoff:
  next_recommended: yq-code-refactor
  alternates:
    - yq-doc-gen
    - yq-security-scan
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

## When to Use

- 用户要做 reviewer 风格审查，而不是直接修改代码
- 需要从正确性、回归风险、可维护性和缺测角度看改动
- 准备合并、提测或发布，需要判断当前改动是否具备交付条件

## Route Elsewhere

- 主要是解释代码：转 `yq-code-explain`
- 主要是修 bug 或落地实现：转 `yq-debug`、`yq-code-gen`
- 主要是安全威胁分析：转 `yq-security-scan`

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

## Related Skills

- 上游常来自 `yq-test-gen`、`yq-code-gen`、`yq-debug`
- 发现结构性问题时通常转 `yq-code-refactor`
- 需要补交付材料时接 `yq-doc-gen`
- 涉及权限、敏感数据或边界信任问题时并行看 `yq-security-scan`

## Recommended Next Step

- 如果发现中高风险问题，默认交给 `yq-code-refactor` 或 `yq-code-gen` 修复
- 如果审查通过且需要沉淀交付材料，接 `yq-doc-gen`
- 如果风险集中在安全面，改走 `yq-security-scan`

<common_mistakes>
- Discussing style while missing behavior risks
- Findings without trigger conditions and impact
- No test-gap analysis
- No explicit scope/depth, making conclusions non-reproducible
</common_mistakes>
