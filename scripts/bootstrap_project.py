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


def has_submodule_content(submodule_dir: Path) -> bool:
    """
    A submodule can be registered while its worktree is still empty.

    `git submodule add` records the mapping in .gitmodules and stages the
    gitlink, but the working tree is only populated by an explicit
    `git submodule update --init`. Common ways to end up registered-but-empty:
      - the host project was cloned with --no-recurse-submodules
      - the submodule directory was created empty by an earlier failed run
      - the submodule entry was hand-added to .gitmodules

    So `exists()` alone is not a reliable readiness check here.

    Note the .git entry is excluded: a directory holding only .git means the
    gitlink is registered but the checkout never landed (or was wiped), which
    is exactly the broken state we want to detect.
    """
    if not submodule_dir.is_dir():
        return False
    return any(entry.name != ".git" for entry in submodule_dir.iterdir())


def ensure_submodule_checkout(target_dir: Path, submodule_dir: Path, submodule_path: str) -> None:
    """Populate the submodule worktree when it is registered but empty."""
    if has_submodule_content(submodule_dir):
        return

    def update() -> None:
        try:
            run(
                ["git", "submodule", "update", "--init", "--recursive", submodule_path],
                cwd=target_dir,
            )
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(
                f"Failed to initialize submodule '{submodule_path}' in {target_dir}. "
                "Check that the URL in .gitmodules is reachable and your credentials work."
            ) from exc

    print(f"[bootstrap] submodule worktree empty, initializing: {submodule_path}")
    update()

    if has_submodule_content(submodule_dir):
        return

    # Git can consider a submodule already checked out (its gitlink still
    # matches the index) even though the files are gone, which turns `update`
    # into a no-op. Deinit + update forces a clean re-population.
    print(f"[bootstrap] forcing submodule re-checkout: {submodule_path}")
    try:
        run(["git", "submodule", "deinit", "-f", submodule_path], cwd=target_dir)
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(
            f"Failed to reset submodule '{submodule_path}' before re-checkout in {target_dir}."
        ) from exc
    update()

    if not has_submodule_content(submodule_dir):
        raise RuntimeError(
            f"Submodule '{submodule_path}' is still empty after re-checkout in {target_dir}. "
            "Verify the URL in .gitmodules and remove the stale entry manually if needed."
        )


def is_submodule_registered(target_dir: Path, submodule_path: str) -> bool:
    """
    True when the submodule is already registered in .gitmodules.

    Re-running `git submodule add` for an already-registered path fails with
    "already exists in the index", so a re-bootstrap against a project whose
    submodule was registered but never checked out must skip the add step and
    go straight to `submodule update --init`.
    """
    if not (target_dir / ".gitmodules").exists():
        return False
    try:
        result = subprocess.run(
            ["git", "config", "--file", ".gitmodules", "--get",
             f"submodule.{submodule_path}.path"],
            cwd=str(target_dir),
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return result.stdout.strip() == submodule_path
    except subprocess.CalledProcessError:
        return False


def add_submodule(target_dir: Path, submodule_source: Path, submodule_path: str) -> Path:
    submodule_dir = target_dir / submodule_path
    if has_submodule_content(submodule_dir):
        return submodule_dir

    if is_submodule_registered(target_dir, submodule_path):
        # Registered earlier (possibly by a failed run) but never populated.
        print(f"[bootstrap] submodule already registered, skipping add: {submodule_path}")
        ensure_submodule_checkout(target_dir, submodule_dir, submodule_path)
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

    # `submodule add` registers the gitlink; make sure the files are on disk too.
    ensure_submodule_checkout(target_dir, submodule_dir, submodule_path)
    return submodule_dir


def run_initializer(target_dir: Path, submodule_dir: Path, submodule_path: str) -> None:
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js is required to run project-iron initializer.")

    def candidates() -> list[Path]:
        return [
            submodule_dir / "skills" / "project-iron-skill" / "bin" / "project-iron-skill.js",
            submodule_dir
            / "meta-injector"
            / "skills"
            / "project-iron-skill"
            / "bin"
            / "project-iron-skill.js",
        ]

    initializer = next((p for p in candidates() if p.exists()), None)
    if not initializer:
        # Last-resort recovery: an already-registered-but-empty worktree is the
        # usual cause, so populate it once and re-resolve before giving up.
        ensure_submodule_checkout(target_dir, submodule_dir, submodule_path)
        initializer = next((p for p in candidates() if p.exists()), None)

    if not initializer:
        joined = "\n".join(str(p) for p in candidates())
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
    ensure_submodule_checkout(target_dir, submodule_dir, args.submodule_path)
    run_initializer(target_dir, submodule_dir, args.submodule_path)

    print("Bootstrap complete.")
    print(f"- Target project: {target_dir}")
    print(f"- Submodule source: {current_repo}")
    print(f"- Submodule path: {submodule_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
