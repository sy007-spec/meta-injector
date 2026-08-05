#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeMode(filePath, content, mode) {
  ensureDir(path.dirname(filePath));
  if (mode === "overwrite") {
    const existedBefore = fs.existsSync(filePath);
    fs.writeFileSync(filePath, content, "utf8");
    return existedBefore ? "updated" : "created";
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf8");
    return "created";
  }
  return "exists";
}

function nowParts() {
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return { y, m, d };
}

function templates() {
  const spec = `# Project Iron Rules Spec (v1.8)

## Core Rules
- Append every raw user prompt to \`PROMPT_INPUT_LOG.md\` (append-only).
- On every new intake, check and sync rules in:
  - \`AGENTS.md\`
  - \`CLAUDE.md\`
  - \`.cursor/rules/project-iron-rules.mdc\`
  - \`.vscode/RULES.md\`
- Keep all ops under one command: \`python ops.py restart\`.
- Archive every LLM conversation output (Codex/Cursor/claude-code/VSCode) to:
  - \`LLM_OUTPUTS/YYYY/MM/DD/*.md\`
- Treat the project as an npx skill orchestration system.
- **Rule 9 (requirements spec):** Maintain a **complete, version-controlled requirements spec** for the code system *before* substantive build: spec first, implement against the spec, then update the spec from delivery feedback. Complements \`PROJECT_LLM_REQUIREMENTS.json\`.
- **Rule 10 (domain rules + skills):** This file and its sibling adapters (\`AGENTS.md\`/\`CLAUDE.md\`/Cursor/VSCode rules) are generic, cross-project governance — they must never carry project-specific business/domain knowledge. Once a host project starts doing real domain work, it must maintain its own \`DOMAIN_IRON_RULES.md\` (renamed to fit the project, e.g. \`INNOAGENT_IRON_RULES.md\`) plus a \`skills/\` directory of step-by-step playbooks, grounded in real incidents from that project's own history — not abstract best practices copied from elsewhere.
- **Rule 11 (host-owned files):** \`ops.py\`, \`PROJECT_LLM_REQUIREMENTS.json\`, and \`PROMPT_INPUT_LOG.md\` accumulate real, host-project-specific state after \`init\` (business logic, metadata bindings, append-only prompt history) and are therefore **excluded from \`sync\`'s overwrite** by design (see \`bin/project-iron-skill.js\`'s \`HOST_OWNED_FILES\`) — \`sync\` only re-applies the pure governance/rule-adapter files. Do not hand-edit this exclusion away; a host project that has customized \`ops.py\` will be destroyed by a naive full-overwrite sync.
- **Rule 12 (agent-driven data maintenance disclosure):** If AI coding agents (Codex/Claude Code/Cursor-class tools) are the *primary* mechanism by which this project's domain data enters the system — rather than humans filling in forms — the host project must: (a) adopt one consistent name for this tool category and use it everywhere, (b) state this data-entry mechanism explicitly in its domain rules file, and (c) surface the same statement visibly in the product's own UI/homepage, not only in agent-facing docs — human collaborators need to know how the data got there too.
`;

  const promptLog = `# Prompt Input Log (Append-Only)

## Entry Template
\`\`\`text
## [YYYY-MM-DD HH:mm:ss]
source: user
tags: [optional,comma,separated]
raw_prompt:
<paste original prompt here>
\`\`\`
`;

  const agents = `# Codex Project Rules Adapter

## Mandatory Rules
- Archive every raw prompt to \`PROMPT_INPUT_LOG.md\`.
- On each intake, sync \`AGENTS.md\`, \`CLAUDE.md\`, Cursor rules, and VSCode rules.
- Keep unified ops entrypoint: \`python ops.py restart\`.
- Archive every LLM conversation output to \`LLM_OUTPUTS/YYYY/MM/DD/*.md\`.
- Load project requirements from \`PROJECT_LLM_REQUIREMENTS.json\` and enforce them in every session.
- For substantive build or behavior change, author or update a **requirements spec** in-repo first; implement against it; feed back into the spec.
`;

  const claude = `# Claude Project Rules Adapter

## Mandatory Rules
- Archive every raw prompt to \`PROMPT_INPUT_LOG.md\`.
- On each intake, sync \`AGENTS.md\`, \`CLAUDE.md\`, Cursor rules, and VSCode rules.
- Keep unified ops entrypoint: \`python ops.py restart\`.
- Archive every LLM conversation output to \`LLM_OUTPUTS/YYYY/MM/DD/*.md\`.
- Load project requirements from \`PROJECT_LLM_REQUIREMENTS.json\` and enforce them in every session.
- For substantive build or behavior change, author or update a **requirements spec** in-repo first; implement against it; feed back into the spec.
`;

  const cursorRule = `---
description: Project iron rules baseline for prompt and output governance
globs:
alwaysApply: true
---

# Project Iron Rules (Cursor)

1) Archive prompts into \`PROMPT_INPUT_LOG.md\`.
2) Sync rules across AGENTS/Codex, Claude, Cursor, and VSCode on every intake.
3) Use unified ops command: \`python ops.py restart\`.
4) Archive each conversation output to \`LLM_OUTPUTS/YYYY/MM/DD/*.md\`.
5) Keep npx skill orchestration as baseline.
6) Load and enforce \`PROJECT_LLM_REQUIREMENTS.json\` as project metadata.
7) **Requirements spec first:** complete repo-controlled spec before substantive build; update spec from implementation (Rule 9).
`;

  const vscodeRule = `# VSCode Rules Adapter

## Mandatory
- Archive prompts into \`PROMPT_INPUT_LOG.md\`.
- Sync rules across AGENTS/Codex, Claude, Cursor, and VSCode on every intake.
- Use unified ops command: \`python ops.py restart\`.
- Archive each conversation output to \`LLM_OUTPUTS/YYYY/MM/DD/*.md\`.
- Keep npx skill orchestration as baseline.
- Load and enforce \`PROJECT_LLM_REQUIREMENTS.json\` as project metadata.
- **Requirements spec first** (Rule 9): spec -> build -> feed back to spec.
`;

  const cursorMetadataRule = `---
description: Project metadata contract for model behavior enforcement
globs:
alwaysApply: true
---

# Project LLM Metadata Contract

The project requirements metadata file is \`PROJECT_LLM_REQUIREMENTS.json\`.
Treat it as authoritative constraints for this repository.

Enforcement:
- Apply all enabled rules every session.
- Do not treat metadata as documentation-only.
- If a user request adds new constraints, update metadata and synced rule files.
`;

  const llmMetadata = `{
  "schema_version": "1.1.0",
  "project_mode": "npx_skill_orchestration",
  "requirements": {
    "prompt_archive_append_only": true,
    "rule_surfaces_sync_on_each_intake": true,
    "ui_language_policy": "TODO: declare this project's actual UI/documentation language policy here (do not leave a default you have not verified against the real product -- an unverified language flag that contradicts the shipped UI is worse than no flag at all)",
    "unified_ops_entrypoint": "python ops.py restart",
    "archive_every_llm_conversation_output": true,
    "llm_output_archive_path_pattern": "LLM_OUTPUTS/YYYY/MM/DD/HHmmss-topic.md",
    "requirement_driven_spec_first": true,
    "requirement_spec_workflow": "author_or_update_spec_before_build_then_feedback_to_spec",
    "tools_in_scope": [
      "codex",
      "cursor",
      "claude-code",
      "vscode"
    ]
  },
  "rule_surfaces": [
    "PROJECT_IRON_RULES_SPEC.md",
    "AGENTS.md",
    "CLAUDE.md",
    ".cursor/rules/project-iron-rules.mdc",
    ".cursor/rules/project-llm-metadata.mdc",
    ".vscode/RULES.md"
  ],
  "domain_rule_surfaces": [
    "DOMAIN_IRON_RULES.md (rename to fit your project once real domain work begins -- see Rule 10 in PROJECT_IRON_RULES_SPEC.md)",
    "skills/"
  ],
  "bindings": {
    "project_iron_core_path": "vendor/project-iron-core",
    "binding_mode": "submodule",
    "authority_hint": "host-repo-rules-first",
    "sync_forbidden_for": [
      "ops.py",
      "PROJECT_LLM_REQUIREMENTS.json",
      "PROMPT_INPUT_LOG.md",
      "DOMAIN_IRON_RULES.md",
      "skills/README.md"
    ],
    "sync_forbidden_reason": "These files accumulate real host-project state after init (business logic, metadata bindings, prompt history, or the host project's own domain rules/skills once filled in) and are excluded from sync's overwrite by design -- see Rule 11 in PROJECT_IRON_RULES_SPEC.md."
  },
  "update_policy": {
    "sync_all_surfaces_on_change": true,
    "record_raw_prompt_in_prompt_log": true
  }
}
`;

  const opsPy = `#!/usr/bin/env python3
import sys

def restart():
    # Unified project ops entrypoint.
    print("ops restart: TODO implement lifecycle/update/install/init/saas integration")

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "restart"
    if cmd == "restart":
        restart()
        return 0
    print(f"unsupported command: {cmd}")
    return 1

if __name__ == "__main__":
    raise SystemExit(main())
`;
  const archiveScript = `#!/usr/bin/env python3
"""
Archive one LLM conversation output into:
LLM_OUTPUTS/YYYY/MM/DD/HHmmss-topic.md
"""

from __future__ import annotations

import argparse
import re
from datetime import datetime
from pathlib import Path


def slugify(topic: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9\\\\u4e00-\\\\u9fff_-]+", "-", topic.strip())
    normalized = re.sub(r"-{2,}", "-", normalized).strip("-_")
    return normalized[:80] or "chat-output"


def build_output_path(project_root: Path, topic: str, ts: datetime) -> Path:
    out_dir = project_root / "LLM_OUTPUTS" / ts.strftime("%Y") / ts.strftime("%m") / ts.strftime("%d")
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{ts.strftime('%H%M%S')}-{slugify(topic)}.md"
    return out_dir / filename


def read_text(args: argparse.Namespace) -> str:
    if args.stdin:
        import sys
        return sys.stdin.read()
    if args.source_file:
        return Path(args.source_file).read_text(encoding="utf-8")
    return args.content or ""


def render_markdown(*, topic: str, source: str, model: str, text: str, ts: datetime) -> str:
    return (
        f"# {topic}\\\\n\\\\n"
        f"- source: {source}\\\\n"
        f"- model: {model}\\\\n"
        f"- archived_at: {ts.isoformat(timespec='seconds')}\\\\n\\\\n"
        "## Output\\\\n\\\\n"
        f"{text.strip()}\\\\n"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Archive LLM output to LLM_OUTPUTS date folders.")
    parser.add_argument("--project-root", default=".", help="Project root path (default: current directory).")
    parser.add_argument("--topic", required=True, help="Topic for filename and title.")
    parser.add_argument("--source", default="cursor", choices=["codex", "cursor", "claude-code", "vscode", "manual"])
    parser.add_argument("--model", default="unknown", help="Model label.")
    parser.add_argument("--source-file", help="Read output content from a text/markdown file.")
    parser.add_argument("--content", help="Inline output content.")
    parser.add_argument("--stdin", action="store_true", help="Read output content from stdin.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    text = read_text(args)
    if not text.strip():
        print("ERROR: empty output content. Use --source-file, --content, or --stdin.")
        return 2

    project_root = Path(args.project_root).resolve()
    ts = datetime.now()
    output_path = build_output_path(project_root, args.topic, ts)
    markdown = render_markdown(topic=args.topic, source=args.source, model=args.model, text=text, ts=ts)
    output_path.write_text(markdown, encoding="utf-8")
    print(str(output_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;

  const domainIronRules = `# Domain Iron Rules (rename this file to fit your project, e.g. \`<PROJECT>_IRON_RULES.md\`)

## What this file is for

\`PROJECT_IRON_RULES_SPEC.md\` and its adapters (\`AGENTS.md\`/\`CLAUDE.md\`/Cursor/VSCode rules) are generic, vendor-templated governance -- they get wholesale overwritten by \`project-iron-skill sync\` and must never carry your project's actual domain knowledge (see Rule 10/11 in \`PROJECT_IRON_RULES_SPEC.md\`).

This file is where **your project's own engineering standard** lives: the domain-specific rules and hard-won lessons for building *this particular product* correctly, so the next AI coding agent session (Codex/Claude Code/Cursor) inherits them instead of re-learning them the hard way.

**This file starts empty on purpose.** Do not fill it with generic best practices copied from a blog post. Every rule you add here should be traceable to something that actually happened in this repository -- a real bug, a real design decision, a real constraint from your actual users or business domain. Write the rule *after* the incident, grounded in what really happened, referencing the actual commit/file/date if you can.

## Suggested sections to grow over time

- **Positioning**: what is this product actually for, and who/what actually maintains it day to day (human PMs clicking a UI? AI coding agents processing raw material you feed them? both)? State this explicitly and keep it current -- see the "agent-driven data maintenance disclosure" rule below if it applies to you.
- **Data integrity rules**: what must never be fabricated, what derived metrics must trace back to real fields, what the safe default is when data is ambiguous or missing.
- **Deletion/archival semantics**: if your domain has an audit trail requirement, state the soft-delete convention here explicitly.
- **State persistence closure**: if your architecture has a write-then-project pattern (writes go to an authority store, reads come from a generated/cached projection), document the rule that every write path must refresh every downstream projection, and keep a running list of real incidents where this was violated.
- **Access control layering**: how permission tiers map to actions in your domain.
- **Cross-entity linking conventions**: how relationships between your domain objects should be modeled and surfaced in the UI.
- **Agent-driven data maintenance disclosure** (only if it applies to you): if AI coding agents are the *primary* way domain data enters your system rather than humans filling in forms, name that tool category consistently, and state the mechanism explicitly here *and* visibly in your product's own UI/homepage -- not only in agent-facing docs, since human collaborators need to understand it too.

## Companion: \`skills/\`

Once this file has real content, start extracting the *procedures* into \`skills/\` as separate, step-by-step Markdown playbooks -- one skill per recurring task, written from what you actually did, specific enough to execute without re-deriving the steps from first principles. See \`skills/README.md\`.
`;

  const skillsReadme = `# Skills Index

This is your project's own skills library -- domain-specific, step-by-step playbooks for recurring engineering tasks in *this* repository, as opposed to generic programming knowledge. It complements \`DOMAIN_IRON_RULES.md\` (rename to fit your project): that file states the *principles*, this directory encodes the *procedures* that follow from them.

## Guidelines for writing a skill here

- One skill, one file, named as a verb phrase (\`add-manageable-entity.md\`, not \`entity-management.md\`).
- Base it on a procedure you actually executed in this repository, not abstract best practice. Reference real commits/incidents where useful.
- Write steps specific enough to execute directly -- commands to run, files to touch, what "done" looks like -- not restatements of good intentions.
- If you are using Claude Code, consider also adding a thin wrapper at \`.claude/skills/<name>/SKILL.md\` (YAML frontmatter with \`name\`/\`description\`, body pointing back to the full playbook here) so the skill is auto-discoverable in future sessions instead of being a document nobody reads.

This directory starts empty. Populate it as your project's real, recurring workflows emerge -- don't pre-populate it with generic scaffolding you haven't actually needed yet.
`;

  return {
    "PROJECT_IRON_RULES_SPEC.md": spec,
    "PROMPT_INPUT_LOG.md": promptLog,
    "AGENTS.md": agents,
    "CLAUDE.md": claude,
    ".cursor/rules/project-iron-rules.mdc": cursorRule,
    ".cursor/rules/project-llm-metadata.mdc": cursorMetadataRule,
    ".vscode/RULES.md": vscodeRule,
    "PROJECT_LLM_REQUIREMENTS.json": llmMetadata,
    "ops.py": opsPy,
    "tools/archive_llm_output.py": archiveScript,
    "DOMAIN_IRON_RULES.md": domainIronRules,
    "skills/README.md": skillsReadme,
  };
}

// These files accumulate real, irreplaceable host-project state after `init`
// (business logic, host-specific metadata bindings, append-only prompt
// history, or the host project's own domain rules/skills once it starts
// growing them in place). `sync` must never overwrite them -- a project that
// has customized `ops.py` into a real application, or filled in
// DOMAIN_IRON_RULES.md/skills/README.md with real content, would have that
// work destroyed by a routine "pull latest governance" sync otherwise. They
// are only ever create-only, even when `sync` (overwrite mode) is requested
// for everything else. See Rule 11 in the `PROJECT_IRON_RULES_SPEC.md`
// template above.
const HOST_OWNED_FILES = new Set([
  "ops.py",
  "PROJECT_LLM_REQUIREMENTS.json",
  "PROMPT_INPUT_LOG.md",
  "DOMAIN_IRON_RULES.md",
  "skills/README.md",
]);

function applyScaffold(root, mode) {
  const date = nowParts();
  ensureDir(path.join(root, ".cursor", "rules"));
  ensureDir(path.join(root, ".vscode"));
  ensureDir(path.join(root, "LLM_OUTPUTS", date.y, date.m, date.d));

  const fileMap = templates();
  const outcomes = [];
  for (const [rel, content] of Object.entries(fileMap)) {
    const abs = path.join(root, rel);
    const effectiveMode = HOST_OWNED_FILES.has(rel) ? "create-only" : mode;
    outcomes.push([rel, writeMode(abs, content, effectiveMode)]);
  }
  return outcomes;
}

function initProject(targetDir) {
  const root = path.resolve(process.cwd(), targetDir || ".");
  const outcomes = applyScaffold(root, "create-only");
  console.log("project-iron-skill init complete:");
  for (const [file, status] of outcomes) {
    console.log(`- ${status}: ${file}`);
  }
}

function syncProject(targetDir) {
  const root = path.resolve(process.cwd(), targetDir || ".");
  const outcomes = applyScaffold(root, "overwrite");
  console.log("project-iron-skill sync complete:");
  for (const [file, status] of outcomes) {
    console.log(`- ${status}: ${file}`);
  }
}

function doctorProject(targetDir) {
  const root = path.resolve(process.cwd(), targetDir || ".");
  const requiredFiles = [
    "PROJECT_IRON_RULES_SPEC.md",
    "PROMPT_INPUT_LOG.md",
    "AGENTS.md",
    "CLAUDE.md",
    ".cursor/rules/project-iron-rules.mdc",
    ".cursor/rules/project-llm-metadata.mdc",
    ".vscode/RULES.md",
    "PROJECT_LLM_REQUIREMENTS.json",
    "ops.py",
    "tools/archive_llm_output.py",
    "DOMAIN_IRON_RULES.md",
    "skills/README.md",
  ];
  const missing = requiredFiles.filter((f) => !fs.existsSync(path.join(root, f)));
  const metadataPath = path.join(root, "PROJECT_LLM_REQUIREMENTS.json");
  let metadataBindingOk = false;

  if (fs.existsSync(metadataPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
      metadataBindingOk = Boolean(parsed.bindings && parsed.bindings.project_iron_core_path);
    } catch {
      metadataBindingOk = false;
    }
  }

  console.log("project-iron-skill doctor:");
  console.log(`- target: ${root}`);
  if (missing.length) {
    console.log(`- missing files (${missing.length}):`);
    for (const file of missing) {
      console.log(`  - ${file}`);
    }
  } else {
    console.log("- required files: OK");
  }
  console.log(`- metadata binding: ${metadataBindingOk ? "OK" : "MISSING"}`);
  const ok = missing.length === 0 && metadataBindingOk;
  console.log(`- overall: ${ok ? "HEALTHY" : "NEEDS_ATTENTION"}`);
  process.exitCode = ok ? 0 : 2;
}

function help() {
  console.log("Usage:");
  console.log("  project-iron-skill init [target-dir]");
  console.log("  project-iron-skill sync [target-dir]");
  console.log("  project-iron-skill doctor [target-dir]");
  console.log("  project-iron-skill help");
}

const cmd = process.argv[2] || "help";
if (cmd === "init") {
  initProject(process.argv[3] || ".");
} else if (cmd === "sync") {
  syncProject(process.argv[3] || ".");
} else if (cmd === "doctor") {
  doctorProject(process.argv[3] || ".");
} else {
  help();
}
