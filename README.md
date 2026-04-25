# Metadata-Driven Constraint Injector Template

This is a template for bootstrapping new projects with your project-iron requirements.

It contains `skills/project-iron-skill` as an internal component of this template project.

## What it does

The bootstrap script:
- creates or uses a target project directory
- initializes git in the target if needed
- adds the **current repository** as a submodule
- runs the embedded `skills/project-iron-skill` initializer to scaffold iron-rule governance

## Script

- `scripts/bootstrap_project.py`
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
