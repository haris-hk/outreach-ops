# Supported CLIs

outreach-ops follows the open agent-skill standard: the canonical skill lives
in `.agents/skills/outreach-ops/SKILL.md` and is registered per CLI. All CLIs
share `AGENTS.md` (canonical instructions) via thin wrappers.

| CLI | Wrapper | Invocation | Headless (batch) |
|---|---|---|---|
| Claude Code | `CLAUDE.md` | `/outreach-ops <mode>` | `claude -p` (`--cli claude`) |
| Codex | `CODEX.md` | natural language ("run the grade mode for …") | `codex exec` |
| OpenCode | `OPENCODE.md` | `/outreach-ops <mode>` | `opencode run` |
| Qwen Code | via `AGENTS.md` | `/outreach-ops <mode>` | — |
| Kimi | `KIMI.md` | `/outreach-ops <mode>` | — |
| Grok Build | via `AGENTS.md` | `/outreach-ops <mode>` | `grok -p` |
| Antigravity | `GEMINI.md` guard + `AGENTS.md` | `/outreach-ops <mode>` | — |

No agent CLI at all? The deterministic layer (scan, ledger, outcomes,
patterns, gates) works standalone; grading needs any chat LLM + the rubric in
`modes/_shared.md` pasted as context (clunky but functional).
