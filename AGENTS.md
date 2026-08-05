# Codex Project Rules Adapter

## Mandatory Rules
- Treat `AGENTS.md` as the OpenAI Codex rules surface for Project Iron.
- Keep `AGENTS.md`, `CLAUDE.md`, Cursor rules, VSCode rules, and `PROJECT_LLM_REQUIREMENTS.json` in sync when templates change.
- Preserve append-only raw prompt logging through `PROMPT_INPUT_LOG.md` in generated host projects.
- Keep generated host projects on the unified ops entrypoint: `python ops.py restart`.
- Archive every generated-project LLM conversation output to `LLM_OUTPUTS/YYYY/MM/DD/*.md`.
- When changing project-iron support surfaces, update `skills/project-iron-skill/bin/project-iron-skill.js`, `README.md`, and skill README/docs together.
- **`ops.py`, `PROJECT_LLM_REQUIREMENTS.json`, and `PROMPT_INPUT_LOG.md` are host-owned** (`HOST_OWNED_FILES` in `bin/project-iron-skill.js`) and must stay excluded from `sync`'s overwrite mode — they accumulate real per-host-project state after `init` that a naive full overwrite would destroy. Never remove this exclusion when editing the scaffolder.
- Every scaffolded project now also gets `DOMAIN_IRON_RULES.md` and `skills/README.md` — generic, empty-on-purpose starting points for the host project's own domain-specific engineering rules and playbooks (as opposed to this repo's cross-project generic governance). See Rule 10 in the `PROJECT_IRON_RULES_SPEC.md` template.
- If a host project's primary data-entry mechanism is AI coding agents processing raw material rather than humans filling in forms (agent-driven data maintenance), the `PROJECT_IRON_RULES_SPEC.md` template's Rule 12 requires the host project to name that tool category consistently and disclose the mechanism in both its domain rules and its own product UI — this is scaffolding guidance in the template, not something this repo enforces itself.
