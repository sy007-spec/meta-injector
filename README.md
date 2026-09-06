# Project Iron Core

Reusable governance core for bootstrapping projects with project-iron requirements.

It contains `skills/project-iron-skill` as an internal component of this template project.

## What it does

The bootstrap script:
- creates or uses a target project directory
- initializes git in the target if needed
- adds the **current repository** as a submodule
- runs the embedded `skills/project-iron-skill` pipeline (`init -> sync -> doctor`) to scaffold, enforce, and verify governance in one pass
- supports `AGENTS.md` as the OpenAI Codex rules adapter alongside Claude, Cursor, and VSCode rule surfaces

## Script

- `scripts/bootstrap_project.py`
- `scripts/archive_llm_output.py`
- Embedded skill: `skills/project-iron-skill/`

## Usage

From this repository root:

```bash
python scripts/bootstrap_project.py "D:/work/new-project"
```

Optional submodule path:

```bash
python scripts/bootstrap_project.py "D:/work/new-project" --submodule-path "vendor/project-iron-core"
```

No additional manual `init/sync/doctor` call is required after bootstrap.

## Testing

Regression tests live in `tests/` and use only the Python standard library — no
pytest or other dependency is required.

```bash
# full suite, end-to-end cases included
python tests/test_bootstrap_project.py

# unit cases only, skips the slower end-to-end runs
IRON_SKIP_E2E=1 python tests/test_bootstrap_project.py

# equivalent via unittest
python -m unittest tests.test_bootstrap_project -v
```

On Windows, set the env var first (`set IRON_SKIP_E2E=1` in cmd,
`$env:IRON_SKIP_E2E=1` in PowerShell) instead of prefixing the command.

The end-to-end cases run the full `init -> sync -> doctor` pipeline against a
throwaway git project. They rewrite the source repo's remote URL to the local
checkout via `url.<path>.insteadOf`, so they never need network access or SSH
credentials.

These tests exist because submodule bootstrap fails in ways that are invisible
from the code alone:

- a submodule registered in `.gitmodules` and in the index, but with an empty
  worktree — bootstrap must self-heal rather than fail with
  "Initializer not found"
- re-running `git submodule add` for an already-registered path, which git
  rejects with "already exists in the index"
- `git submodule update --init` silently no-op'ing when the gitlink still
  matches the index even though the files are gone
- bootstrap must remain idempotent: a second run against a healthy project
  triggers no recovery output

## Lifecycle Commands (inside target project)

```bash
# one-time scaffold
node vendor/project-iron-core/skills/project-iron-skill/bin/project-iron-skill.js init .

# force sync rule surfaces from core templates
node vendor/project-iron-core/skills/project-iron-skill/bin/project-iron-skill.js sync .

# check whether host project stays bound and healthy
node vendor/project-iron-core/skills/project-iron-skill/bin/project-iron-skill.js doctor .
```

`doctor` exits with non-zero code when required governance files are missing
or metadata binding is not declared in `PROJECT_LLM_REQUIREMENTS.json`.

### Host-owned files are excluded from `sync`

`ops.py`, `PROJECT_LLM_REQUIREMENTS.json`, and `PROMPT_INPUT_LOG.md` accumulate real, host-project-specific state after `init` — real business logic, real metadata bindings, a real append-only prompt history. `sync` therefore only ever *creates* these three if missing; it never overwrites them, even though every other governed file is fully overwritten on `sync`. This is deliberate: an earlier version of this tool did overwrite them unconditionally, which meant running `sync` against a host project that had already grown `ops.py` into a real application would silently destroy it. If you need to intentionally reset a host-owned file back to the template, delete it and re-run `init`, or diff the template in `bin/project-iron-skill.js`'s `templates()` function by hand.

### Domain rules and skills are the host project's responsibility, not this repo's

This repository stays deliberately generic — it has no idea what any given host project actually does. `init` scaffolds two empty starting points for the host project to grow on its own: `DOMAIN_IRON_RULES.md` (rename to fit the project, e.g. `INNOAGENT_IRON_RULES.md`) and `skills/README.md`. Both are in `HOST_OWNED_FILES` too, so once a host project fills them in with real content, `sync` will never overwrite that work — `sync` only ever re-creates them if they were deleted. If you rename `DOMAIN_IRON_RULES.md` (the recommended path), `sync` will just recreate a fresh, empty `DOMAIN_IRON_RULES.md` alongside your renamed file — harmless, just delete the stray file if it bothers you.

## Output Archive Command

Use project-iron-core script to write one conversation output into date-layered archive:

```bash
python vendor/project-iron-core/scripts/archive_llm_output.py --project-root . --topic "kyc-spa-delivery" --source cursor --model "codex-5.3" --source-file output.md
```

or from stdin:

```bash
echo "final response" | python vendor/project-iron-core/scripts/archive_llm_output.py --project-root . --topic "quick-note" --stdin
```

## Expected result in new project

- submodule added at `vendor/project-iron-core` (or your custom path)
- iron-rule files initialized, including:
  - `PROJECT_IRON_RULES_SPEC.md`
  - `PROMPT_INPUT_LOG.md`
  - `AGENTS.md`
  - `CLAUDE.md`
  - `.cursor/rules/project-iron-rules.mdc`
  - `.cursor/rules/project-llm-metadata.mdc`
  - `.vscode/RULES.md`
  - `PROJECT_LLM_REQUIREMENTS.json`
  - `ops.py`
  - `DOMAIN_IRON_RULES.md` (empty starting point for the host project's own domain-specific rules — rename to fit, e.g. `INNOAGENT_IRON_RULES.md`)
  - `skills/README.md` (empty starting point for the host project's own skills library)
  - `LLM_OUTPUTS/YYYY/MM/DD/`
