#!/usr/bin/env python3
"""
Bootstrap a new project with project-iron governance.

What this script does:
1) Creates/uses a target project directory.
2) Ensures the target directory is a git repository.
3) Adds the current repository as a git submodule in the target project.
4) Runs the submodule's project-iron initializer for the target project.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str], cwd: Path | None = None) -> None:
    subprocess.run(cmd, cwd=str(cwd) if cwd else None, check=True)


def get_origin_url(repo_dir: Path) -> str | None:
    try:
        result = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            cwd=str(repo_dir),
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        url = result.stdout.strip()
        return url if url else None
    except subprocess.CalledProcessError:
        return None


def is_git_repo(path: Path) -> bool:
    try:
        subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            cwd=str(path),
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return True
    except subprocess.CalledProcessError:
        return False


def ensure_target_repo(target_dir: Path) -> None:
    target_dir.mkdir(parents=True, exist_ok=True)
    if not is_git_repo(target_dir):
        run(["git", "init"], cwd=target_dir)


def add_submodule(target_dir: Path, submodule_source: Path, submodule_path: str) -> Path:
    submodule_dir = target_dir / submodule_path
    if submodule_dir.exists():
        return submodule_dir

    origin_url = get_origin_url(submodule_source)
    if origin_url:
        run(
            ["git", "submodule", "add", origin_url, submodule_path],
            cwd=target_dir,
        )
    else:
        # Local path fallback for repos without origin remote.
        run(
            [
                "git",
                "-c",
                "protocol.file.allow=always",
                "submodule",
                "add",
                str(submodule_source.resolve()),
                submodule_path,
            ],
            cwd=target_dir,
        )
    return submodule_dir


def run_initializer(target_dir: Path, submodule_dir: Path) -> None:
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js is required to run project-iron initializer.")

    candidates = [
        submodule_dir / "skills" / "project-iron-skill" / "bin" / "project-iron-skill.js",
        submodule_dir
        / "meta-injector"
        / "skills"
        / "project-iron-skill"
        / "bin"
        / "project-iron-skill.js",
    ]
    initializer = next((p for p in candidates if p.exists()), None)
    if not initializer:
        joined = "\n".join(str(p) for p in candidates)
        raise RuntimeError(f"Initializer not found. Checked:\n{joined}")

    # Zero-touch bootstrap: init + sync + doctor in one execution.
    # - init: create missing governance surfaces
    # - sync: enforce latest template surfaces from project-iron-core
    # - doctor: verify binding/completeness and fail fast if drift exists
    run([node, str(initializer), "init", str(target_dir)])
    run([node, str(initializer), "sync", str(target_dir)])
    run([node, str(initializer), "doctor", str(target_dir)])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Bootstrap a new project using metadata-driven constraint injector template.",
    )
    parser.add_argument(
        "target_dir",
        help="Path to the new project directory.",
    )
    parser.add_argument(
        "--submodule-path",
        default="vendor/project-iron-core",
        help="Submodule path inside target project (default: vendor/project-iron-core).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    target_dir = Path(args.target_dir).resolve()

    # script path: <repo>/scripts/bootstrap_project.py
    current_repo = Path(__file__).resolve().parents[1]

    ensure_target_repo(target_dir)
    submodule_dir = add_submodule(target_dir, current_repo, args.submodule_path)
    run_initializer(target_dir, submodule_dir)

    print("Bootstrap complete.")
    print(f"- Target project: {target_dir}")
    print(f"- Submodule source: {current_repo}")
    print(f"- Submodule path: {submodule_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
