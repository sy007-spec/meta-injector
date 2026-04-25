# Project Iron Core

Reusable governance core for bootstrapping projects with project-iron requirements.

It contains `skills/project-iron-skill` as an internal component of this template project.

## What it does

The bootstrap script:
- creates or uses a target project directory
- initializes git in the target if needed
- adds the **current repository** as a submodule
- runs the embedded `skills/project-iron-skill` pipeline (`init -> sync -> doctor`) to scaffold, enforce, and verify governance in one pass

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
  - `CLAUDE.md`
  - `.cursor/rules/project-iron-rules.mdc`
  - `.cursor/rules/project-llm-metadata.mdc`
  - `.vscode/RULES.md`
  - `PROJECT_LLM_REQUIREMENTS.json`
  - `ops.py`
  - `LLM_OUTPUTS/YYYY/MM/DD/`
