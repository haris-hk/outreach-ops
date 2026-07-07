# outreach-ops

One-command installer for [**outreach-ops**](https://github.com/haris-hk/outreach-ops) — the AI prospect research, grading & outreach engine — local-first, draft-only, works with any AI coding CLI.

```bash
npx @haris-hk/outreach-ops init
```

This sets up a ready-to-use workspace:

1. Clones outreach-ops at the latest stable release
2. Installs dependencies

Then open your AI coding tool in the folder. **On first launch the agent walks you through setup — your CV, profile and target roles — just by chatting.** Nothing to configure by hand. outreach-ops is AI-agnostic — Claude Code, Gemini, Codex, Qwen, OpenCode, GitHub Copilot CLI, Antigravity CLI, and Grok Build CLI all work.

The installer bootstraps CLI skill entrypoints after clone, so new CLIs (e.g. Grok) work even when `npx` pulled an older release tag.

## Usage

```bash
npx @haris-hk/outreach-ops init [folder]   # default folder: ./outreach-ops
```

Prefer the manual route? `git clone` still works exactly as before — see the [setup guide](https://github.com/haris-hk/outreach-ops/blob/main/docs/SETUP.md).

## Requirements

- Node.js 18+
- git

## License

MIT © [Haris Hussain Khan](https://github.com/haris-hk) · engine forked from [santifer/career-ops](https://github.com/santifer/career-ops) (MIT)
