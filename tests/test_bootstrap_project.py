#!/usr/bin/env python3
"""
Regression tests for the submodule self-healing guards in bootstrap_project.py.

These lock in the failure mode where a submodule is registered in .gitmodules
and in the index but its worktree was never populated, which used to abort
bootstrap with "Initializer not found" and could not be recovered by re-running
the script (a second `git submodule add` fails with "already exists in the
index", and `submodule update --init` no-ops while the gitlink still matches).

Run:
    python tests/test_bootstrap_project.py
    python -m unittest tests.test_bootstrap_project -v
    IRON_SKIP_E2E=1 python tests/test_bootstrap_project.py   # unit cases only

End-to-end cases rewrite the source repo's remote URL to the local checkout,
so they run offline and never need network or SSH credentials.
"""

from __future__ import annotations

import contextlib
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = REPO_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from bootstrap_project import (  # noqa: E402
    ensure_submodule_checkout,
    get_origin_url,
    has_submodule_content,
    is_submodule_registered,
)

BOOTSTRAP = SCRIPTS_DIR / "bootstrap_project.py"
SUBMODULE_PATH = "vendor/project-iron-core"
SUBMODULE_RELPATH = Path(SUBMODULE_PATH)

# End-to-end cases shell out to git and run the full init/sync/doctor
# pipeline, so they are opt-out for quick local loops.
RUN_E2E = os.environ.get("IRON_SKIP_E2E") != "1"


def git(repo: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=str(repo),
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


@contextlib.contextmanager
def silence_child_output():
    """
    Mute child-process output at the fd level.

    `contextlib.redirect_stderr` is not enough here: git writes straight to
    fd 2, which the subprocess inherits. Without this, an intentional
    failure-path test prints "fatal: not a git repository" and looks broken.
    """
    sys.stdout.flush()
    sys.stderr.flush()
    saved_out, saved_err = os.dup(1), os.dup(2)
    devnull = os.open(os.devnull, os.O_RDWR)
    try:
        os.dup2(devnull, 1)
        os.dup2(devnull, 2)
        yield
    finally:
        # Flush before restoring the fds so buffered text drains into
        # devnull instead of resurfacing after the test has finished.
        sys.stdout.flush()
        sys.stderr.flush()
        os.dup2(saved_out, 1)
        os.dup2(saved_err, 2)
        os.close(devnull)
        os.close(saved_out)
        os.close(saved_err)


def force_rmtree(path: Path) -> None:
    """rmtree that clears the read-only bit (git object files are 444)."""
    def _on_error(func, target, exc_info):  # noqa: ANN001, ANN202
        try:
            Path(target).chmod(stat.S_IWUSR)
        except OSError:
            pass
        func(target)

    shutil.rmtree(path, onerror=_on_error)


class BootstrapTestCase(unittest.TestCase):
    """Base class providing a scratch directory that is always cleaned up."""

    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.tmp = Path(self._tmp.name)

    def make_host_project(self, name: str = "hostproj") -> Path:
        """
        Create a throwaway git repo wired so submodule ops resolve locally.

        - protocol.file.allow=always: local-path submodules are blocked by
          default since CVE-2022-39253.
        - url.<local checkout>.insteadOf <origin>: keeps the fresh-add path
          offline by resolving the source repo's public URL to this checkout.
        """
        path = self.tmp / name
        path.mkdir(parents=True)
        git(path, "init")
        git(path, "config", "user.email", "test@example.com")
        git(path, "config", "user.name", "test")
        git(path, "config", "protocol.file.allow", "always")

        origin = get_origin_url(REPO_ROOT)
        if origin:
            git(path, "config", f"url.{REPO_ROOT.as_posix()}.insteadOf", origin)
        return path

    def seed_submodule(self, target: Path) -> Path:
        """Register + populate the submodule directly, bypassing bootstrap."""
        subprocess.run(
            ["git", "-c", "protocol.file.allow=always", "submodule", "add",
             REPO_ROOT.as_posix(), SUBMODULE_PATH],
            cwd=str(target),
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        submodule_dir = target / SUBMODULE_RELPATH
        self.assertTrue(
            has_submodule_content(submodule_dir),
            "seed failed: submodule worktree is empty",
        )
        return submodule_dir

    def empty_worktree(self, submodule_dir: Path) -> None:
        """
        Reproduce the broken state: registered in .gitmodules and in the index,
        but the files are gone. The .git entry is deliberately kept.
        """
        for item in submodule_dir.iterdir():
            if item.name == ".git":
                continue
            if item.is_dir():
                force_rmtree(item)
            else:
                item.unlink()

    def run_bootstrap(self, target: Path) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(BOOTSTRAP), str(target)],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )


class TestHasSubmoduleContent(BootstrapTestCase):
    """The readiness predicate that replaced the naive `exists()` check."""

    def test_missing_directory(self) -> None:
        self.assertFalse(has_submodule_content(self.tmp / "nope"))

    def test_empty_directory(self) -> None:
        (self.tmp / "empty").mkdir()
        self.assertFalse(has_submodule_content(self.tmp / "empty"))

    def test_directory_with_file(self) -> None:
        populated = self.tmp / "populated"
        populated.mkdir()
        (populated / "file.txt").write_text("x", encoding="utf-8")
        self.assertTrue(has_submodule_content(populated))

    def test_directory_with_only_subdirectory(self) -> None:
        nested = self.tmp / "nested"
        (nested / "sub").mkdir(parents=True)
        self.assertTrue(has_submodule_content(nested))

    def test_directory_with_only_git_entry(self) -> None:
        """
        A dir holding just .git means the gitlink is registered but the
        checkout never landed. This is the state the old `exists()` check
        misread as healthy, so it must stay False.
        """
        gitonly = self.tmp / "gitonly"
        (gitonly / ".git").mkdir(parents=True)
        self.assertFalse(has_submodule_content(gitonly))

    def test_git_file_plus_content_is_healthy(self) -> None:
        """A real submodule has .git plus actual files."""
        real = self.tmp / "real"
        real.mkdir()
        (real / ".git").write_text("gitdir: ../.git/modules/x\n", encoding="utf-8")
        (real / "README.md").write_text("hi", encoding="utf-8")
        self.assertTrue(has_submodule_content(real))


class TestIsSubmoduleRegistered(BootstrapTestCase):
    """Detector that lets a re-run skip `submodule add`."""

    def test_no_gitmodules(self) -> None:
        self.assertFalse(is_submodule_registered(self.tmp, SUBMODULE_PATH))

    def test_matching_entry(self) -> None:
        (self.tmp / ".gitmodules").write_text(
            f'[submodule "{SUBMODULE_PATH}"]\n'
            f"\tpath = {SUBMODULE_PATH}\n"
            "\turl = git@example.com:some/repo.git\n",
            encoding="utf-8",
        )
        self.assertTrue(is_submodule_registered(self.tmp, SUBMODULE_PATH))

    def test_different_path_not_matched(self) -> None:
        (self.tmp / ".gitmodules").write_text(
            '[submodule "vendor/other"]\n'
            "\tpath = vendor/other\n"
            "\turl = git@example.com:some/repo.git\n",
            encoding="utf-8",
        )
        self.assertFalse(is_submodule_registered(self.tmp, SUBMODULE_PATH))


class TestEnsureSubmoduleCheckoutErrors(BootstrapTestCase):
    """Failure paths must surface as RuntimeError, not a raw traceback."""

    def test_raises_when_target_is_not_a_git_repo(self) -> None:
        not_a_repo = self.tmp / "notarepo"
        not_a_repo.mkdir()
        with silence_child_output():
            with self.assertRaises(RuntimeError):
                ensure_submodule_checkout(
                    not_a_repo, not_a_repo / SUBMODULE_RELPATH, SUBMODULE_PATH
                )


@unittest.skipUnless(RUN_E2E, "set IRON_SKIP_E2E=1 to skip end-to-end cases")
class TestSelfHealsEmptyWorktree(BootstrapTestCase):
    """The original bug: re-bootstrap must recover an emptied worktree."""

    def test_recovers_and_completes(self) -> None:
        target = self.make_host_project()
        submodule_dir = self.seed_submodule(target)

        self.empty_worktree(submodule_dir)
        self.assertFalse(
            has_submodule_content(submodule_dir),
            "setup failed: worktree should be empty before the run",
        )
        self.assertTrue((target / ".gitmodules").exists())

        proc = self.run_bootstrap(target)
        self.assertEqual(
            proc.returncode, 0,
            f"bootstrap failed:\n{proc.stdout}\n{proc.stderr}",
        )

        self.assertTrue(
            has_submodule_content(submodule_dir),
            "submodule worktree was not restored",
        )
        # It must skip the add (already in the index) and then re-checkout.
        self.assertIn("already registered, skipping add", proc.stdout)
        self.assertIn("submodule worktree empty", proc.stdout)
        self.assertIn("Bootstrap complete.", proc.stdout)
        self.assertIn("overall: HEALTHY", proc.stdout)

    def test_second_run_is_idempotent(self) -> None:
        """A healthy project must not trigger any self-heal chatter."""
        target = self.make_host_project()
        self.seed_submodule(target)

        first = self.run_bootstrap(target)
        self.assertEqual(first.returncode, 0, f"first run failed:\n{first.stderr}")

        second = self.run_bootstrap(target)
        self.assertEqual(second.returncode, 0, f"second run failed:\n{second.stderr}")
        self.assertNotIn("worktree empty", second.stdout)
        self.assertNotIn("forcing submodule re-checkout", second.stdout)
        self.assertIn("Bootstrap complete.", second.stdout)


@unittest.skipUnless(RUN_E2E, "set IRON_SKIP_E2E=1 to skip end-to-end cases")
class TestFreshProject(BootstrapTestCase):
    """The normal path must still add the submodule rather than skip it."""

    def test_adds_submodule_and_completes(self) -> None:
        target = self.make_host_project("freshproj")
        self.assertFalse((target / SUBMODULE_RELPATH).exists())

        proc = self.run_bootstrap(target)
        self.assertEqual(
            proc.returncode, 0,
            f"bootstrap failed:\n{proc.stdout}\n{proc.stderr}",
        )

        self.assertTrue(
            has_submodule_content(target / SUBMODULE_RELPATH),
            "submodule worktree was not populated",
        )
        self.assertNotIn(
            "already registered, skipping add", proc.stdout,
            "fresh project should take the add path, not the skip path",
        )
        self.assertIn("Bootstrap complete.", proc.stdout)
        self.assertIn("overall: HEALTHY", proc.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
