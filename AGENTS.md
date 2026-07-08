# Codex Project Rules Adapter

## Mandatory Rules
- Treat `AGENTS.md` as the OpenAI Codex rules surface for Project Iron.
- Keep `AGENTS.md`, `CLAUDE.md`, Cursor rules, VSCode rules, and `PROJECT_LLM_REQUIREMENTS.json` in sync when templates change.
- Preserve append-only raw prompt logging through `PROMPT_INPUT_LOG.md` in generated host projects.
- Keep generated host projects on the unified ops entrypoint: `python ops.py restart`.
- Archive every generated-project LLM conversation output to `LLM_OUTPUTS/YYYY/MM/DD/*.md`.
- When changing project-iron support surfaces, update `skills/project-iron-skill/bin/project-iron-skill.js`, `README.md`, and skill README/docs together.
