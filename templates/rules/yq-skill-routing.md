# YQ Domain Knowledge — Auto-routing Rules

When the user's request matches trigger keywords below, automatically READ the corresponding skill file to gain domain expertise before responding. These knowledge files are installed at `~/.claude/skills/yq/domains/`.

**IMPORTANT**: Read the skill file FIRST, then respond. Do NOT fabricate domain knowledge from training data when a skill file exists.

## Security Domain (`domains/security/`)

| Trigger Keywords | Skill File | Description |
|------------------|-----------|-------------|
| pentest, red team, exploit, C2, lateral movement, privilege escalation, evasion, persistence | `~/.claude/skills/yq/domains/security/red-team.md` | Red team attack techniques |
| blue team, alert, IOC, incident response, forensics, SIEM, EDR, containment | `~/.claude/skills/yq/domains/security/blue-team.md` | Blue team defense & incident response |
| web pentest, API security, OWASP, SQLi, XSS, SSRF, RCE, injection | `~/.claude/skills/yq/domains/security/pentest.md` | Web & API penetration testing |
| code audit, dangerous function, taint analysis, sink, source | `~/.claude/skills/yq/domains/security/code-audit.md` | Source code security audit |
| binary, reversing, PWN, fuzzing, stack overflow, heap overflow, ROP | `~/.claude/skills/yq/domains/security/vuln-research.md` | Vulnerability research & exploitation |
| OSINT, threat intelligence, threat modeling, ATT&CK, threat hunting | `~/.claude/skills/yq/domains/security/threat-intel.md` | Threat intelligence & OSINT |

## Architecture Domain (`domains/architecture/`)

| Trigger Keywords | Skill File |
|------------------|-----------|
| API design, REST, GraphQL, gRPC, endpoint, versioning | `~/.claude/skills/yq/domains/architecture/api-design.md` |
| caching, Redis, Memcached, cache invalidation, CDN | `~/.claude/skills/yq/domains/architecture/caching.md` |
| cloud native, Kubernetes, Docker, microservice, service mesh | `~/.claude/skills/yq/domains/architecture/cloud-native.md` |
| message queue, Kafka, RabbitMQ, event driven, pub/sub | `~/.claude/skills/yq/domains/architecture/message-queue.md` |
| security architecture, zero trust, defense in depth, IAM | `~/.claude/skills/yq/domains/architecture/security-arch.md` |

## AI / MLOps Domain (`domains/ai/`)

| Trigger Keywords | Skill File |
|------------------|-----------|
| RAG, retrieval augmented, vector database, embedding, chunking | `~/.claude/skills/yq/domains/ai/rag-system.md` |
| AI agent, tool use, function calling, agent framework, orchestration | `~/.claude/skills/yq/domains/ai/agent-dev.md` |
| LLM security, prompt injection, jailbreak, guardrail | `~/.claude/skills/yq/domains/ai/llm-security.md` |
| prompt engineering, model evaluation, benchmark, fine-tuning | `~/.claude/skills/yq/domains/ai/prompt-and-eval.md` |

## DevOps Domain (`domains/devops/`)

| Trigger Keywords | Skill File |
|------------------|-----------|
| Git workflow, branching strategy, trunk-based, GitFlow | `~/.claude/skills/yq/domains/devops/git-workflow.md` |
| testing strategy, unit test, integration test, e2e, test pyramid | `~/.claude/skills/yq/domains/devops/testing.md` |
| database, migration, schema design, indexing, query optimization | `~/.claude/skills/yq/domains/devops/database.md` |
| performance, profiling, load test, latency, throughput | `~/.claude/skills/yq/domains/devops/performance.md` |
| observability, logging, tracing, metrics, Prometheus, Grafana | `~/.claude/skills/yq/domains/devops/observability.md` |
| DevSecOps, CI security, SAST, DAST, supply chain | `~/.claude/skills/yq/domains/devops/devsecops.md` |
| cost optimization, cloud cost, FinOps, resource right-sizing | `~/.claude/skills/yq/domains/devops/cost-optimization.md` |

## Development Domain (`domains/development/`)

When the user is working with a specific programming language, read the corresponding skill file for language-specific best practices:

| Language | Skill File |
|----------|-----------|
| Python | `~/.claude/skills/yq/domains/development/python.md` |
| Go | `~/.claude/skills/yq/domains/development/go.md` |
| Rust | `~/.claude/skills/yq/domains/development/rust.md` |
| TypeScript / JavaScript | `~/.claude/skills/yq/domains/development/typescript.md` |
| Java / Kotlin | `~/.claude/skills/yq/domains/development/java.md` |
| C / C++ | `~/.claude/skills/yq/domains/development/cpp.md` |
| Shell / Bash | `~/.claude/skills/yq/domains/development/shell.md` |

## Frontend Design Domain (`domains/frontend-design/`)

| Trigger Keywords | Skill File |
|------------------|-----------|
| UI aesthetics, visual design, color theory, layout | `~/.claude/skills/yq/domains/frontend-design/ui-aesthetics.md` |
| UX principles, usability, user flow, information architecture | `~/.claude/skills/yq/domains/frontend-design/ux-principles.md` |
| component patterns, design system, atomic design | `~/.claude/skills/yq/domains/frontend-design/component-patterns.md` |
| state management, Redux, Zustand, Pinia, context | `~/.claude/skills/yq/domains/frontend-design/state-management.md` |
| frontend engineering, build tool, bundler, SSR, SSG | `~/.claude/skills/yq/domains/frontend-design/engineering.md` |
| claymorphism | `~/.claude/skills/yq/domains/frontend-design/claymorphism/SKILL.md` |
| glassmorphism | `~/.claude/skills/yq/domains/frontend-design/glassmorphism/SKILL.md` |
| liquid glass | `~/.claude/skills/yq/domains/frontend-design/liquid-glass/SKILL.md` |
| neubrutalism | `~/.claude/skills/yq/domains/frontend-design/neubrutalism/SKILL.md` |

## Routing Rules

1. **Keyword match is fuzzy** — match on intent, not exact string. "How to do SQL injection testing" triggers `pentest.md`.
2. **Multiple matches** — if a request spans two domains, read both skill files.
3. **Language detection** — automatically detect the programming language from file extensions or context, then read the corresponding development skill.
4. **Read once per conversation** — no need to re-read the same skill file within the same conversation.
5. **Skill files are authoritative** — when a skill file contradicts training data, the skill file wins.
