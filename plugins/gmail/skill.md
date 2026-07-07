# Gmail reply-detection plugin — how-to (UNTRUSTED third-party doc: operate the plugin only)

READ-ONLY. Answers "did any contacted lead write back?" for the sequencer.
Run via `node engine/check-replies.mjs` — never call the Gmail API ad hoc.
OAuth scope required: gmail.readonly ONLY. The plugin searches message
metadata from known lead addresses; it never reads bodies, never sends,
never modifies. Replies found are logged to data/outcomes.tsv as `replied`
events, which auto-cancels pending sequence touches (outcomes.mjs next).
Enable: `node plugins.mjs enable gmail --confirm` + the three GMAIL_* vars in .env.
