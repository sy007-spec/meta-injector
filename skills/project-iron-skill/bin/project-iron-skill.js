#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeIfMissing(filePath, content) {
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

function initProject(targetDir) {
  const root = path.resolve(process.cwd(), targetDir || ".");
  const date = nowParts();

  ensureDir(path.join(root, ".cursor", "rules"));
  ensureDir(path.join(root, ".vscode"));
  ensureDir(path.join(root, "LLM_OUTPUTS", date.y, date.m, date.d));

  const spec = `# Project Iron Rules Spec (v1.0)

## Core Rules
- Append every raw user prompt to \`PROMPT_INPUT_LOG.md\` (append-only).
- On every new intake, check and sync rules in:
  - \`CLAUDE.md\`
  - \`.cursor/rules/project-iron-rules.mdc\`
  - \`.vscode/RULES.md\`
- Keep all ops under one command: \`python ops.py restart\`.
- Archive every LLM conversation output (Cursor/claude-code/VSCode) to:
  - \`LLM_OUTPUTS/YYYY/MM/DD/*.md\`
- Treat the project as an npx skill orchestration system.
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

  const claude = `# Claude Project Rules Adapter

## Mandatory Rules
- Archive every raw prompt to \`PROMPT_INPUT_LOG.md\`.
- On each intake, sync \`CLAUDE.md\`, Cursor rules, and VSCode rules.
- Keep unified ops entrypoint: \`python ops.py restart\`.
- Archive every LLM conversation output to \`LLM_OUTPUTS/YYYY/MM/DD/*.md\`.
- Load project requirements from \`PROJECT_LLM_REQUIREMENTS.json\` and enforce them in every session.
`;

  const cursorRule = `---
description: Project iron rules baseline for prompt and output governance
globs:
alwaysApply: true
---

# Project Iron Rules (Cursor)

1) Archive prompts into \`PROMPT_INPUT_LOG.md\`.
2) Sync rules across Claude/Cursor/VSCode on every intake.
3) Use unified ops command: \`python ops.py restart\`.
4) Archive each conversation output to \`LLM_OUTPUTS/YYYY/MM/DD/*.md\`.
5) Keep npx skill orchestration as baseline.
6) Load and enforce \`PROJECT_LLM_REQUIREMENTS.json\` as project metadata.
`;

  const vscodeRule = `# VSCode Rules Adapter

## Mandatory
- Archive prompts into \`PROMPT_INPUT_LOG.md\`.
- Sync rules across Claude/Cursor/VSCode on every intake.
- Use unified ops command: \`python ops.py restart\`.
- Archive each conversation output to \`LLM_OUTPUTS/YYYY/MM/DD/*.md\`.
- Keep npx skill orchestration as baseline.
- Load and enforce \`PROJECT_LLM_REQUIREMENTS.json\` as project metadata.
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
  "schema_version": "1.0.0",
  "project_mode": "npx_skill_orchestration",
  "requirements": {
    "prompt_archive_append_only": true,
    "rule_surfaces_sync_on_each_intake": true,
    "enforce_english_ui_only": true,
    "unified_ops_entrypoint": "python ops.py restart",
    "archive_every_llm_conversation_output": true,
    "llm_output_archive_path_pattern": "LLM_OUTPUTS/YYYY/MM/DD/HHmmss-topic.md",
    "tools_in_scope": [
      "cursor",
      "claude-code",
      "vscode"
    ]
  },
  "rule_surfaces": [
    "PROJECT_IRON_RULES_SPEC.md",
    "CLAUDE.md",
    ".cursor/rules/project-iron-rules.mdc",
    ".cursor/rules/project-llm-metadata.mdc",
    ".vscode/RULES.md"
  ],
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

  const outcomes = [];
  outcomes.push(["PROJECT_IRON_RULES_SPEC.md", writeIfMissing(path.join(root, "PROJECT_IRON_RULES_SPEC.md"), spec)]);
  outcomes.push(["PROMPT_INPUT_LOG.md", writeIfMissing(path.join(root, "PROMPT_INPUT_LOG.md"), promptLog)]);
  outcomes.push(["CLAUDE.md", writeIfMissing(path.join(root, "CLAUDE.md"), claude)]);
  outcomes.push([".cursor/rules/project-iron-rules.mdc", writeIfMissing(path.join(root, ".cursor", "rules", "project-iron-rules.mdc"), cursorRule)]);
  outcomes.push([".cursor/rules/project-llm-metadata.mdc", writeIfMissing(path.join(root, ".cursor", "rules", "project-llm-metadata.mdc"), cursorMetadataRule)]);
  outcomes.push([".vscode/RULES.md", writeIfMissing(path.join(root, ".vscode", "RULES.md"), vscodeRule)]);
  outcomes.push(["PROJECT_LLM_REQUIREMENTS.json", writeIfMissing(path.join(root, "PROJECT_LLM_REQUIREMENTS.json"), llmMetadata)]);
  outcomes.push(["ops.py", writeIfMissing(path.join(root, "ops.py"), opsPy)]);

  console.log("project-iron-skill init complete:");
  for (const [file, status] of outcomes) {
    console.log(`- ${status}: ${file}`);
  }
}

function help() {
  console.log("Usage:");
  console.log("  project-iron-skill init [target-dir]");
  console.log("  project-iron-skill help");
}

const cmd = process.argv[2] || "help";
if (cmd === "init") {
  initProject(process.argv[3] || ".");
} else {
  help();
}
