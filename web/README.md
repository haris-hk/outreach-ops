# outreach-ops web board (alpha)

A **read-only**, zero-dependency local view over the same files the CLI and
your agent own: `data/leads.md`, `data/inbox.md`, `data/outcomes.tsv`, and the
dossiers. No build step, no framework, no accounts, binds 127.0.0.1 only.

```bash
npm run web        # → http://127.0.0.1:4870
```

Read-only is a design decision, not a limitation: writes go through the engine
scripts (which enforce ledger integrity) and your agent (which enforces the
grading threshold and draft gates). A view that can't mutate state can't
corrupt it.

Tabs mirror the TUI: ALL / PRIORITY ≥4.2 / PIPELINE / SENT / REPLIED / CALLS /
WON / NURTURE-DQ / LOST. Click a column to sort, click "open" to read a
dossier inline.
