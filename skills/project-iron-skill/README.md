# project-iron-skill

Baseline npx skill package for bootstrapping new projects with the same governance rules.

This skill is metadata-first: it writes model-readable constraints, not only docs.

## What it initializes
- `PROJECT_IRON_RULES_SPEC.md`
- `PROMPT_INPUT_LOG.md`
- `CLAUDE.md`
- `.cursor/rules/project-iron-rules.mdc`
- `.cursor/rules/project-llm-metadata.mdc` (`alwaysApply` metadata contract)
- `.vscode/RULES.md`
- `PROJECT_LLM_REQUIREMENTS.json` (authoritative model requirements metadata)
- `ops.py`
- `LLM_OUTPUTS/YYYY/MM/DD/` (today)

## Local usage
From this repository:

```bash
node skills/project-iron-skill/bin/project-iron-skill.js init .
```

## NPX-style usage after publish
```bash
npx project-iron-skill init my-new-project
```

## Purpose
This is the first reusable skill in your npx skill orchestration system.  
It captures your standardized prompt logging, rule sync workflow, unified ops entrypoint, and date-layered LLM output archive.
It also injects project metadata so LLM tooling can enforce constraints from machine-readable sources.
