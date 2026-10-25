"""Tests for collect.py against throwaway repos in a temporary ~/dev.

Usage: python3 -m unittest test_collect
"""
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

import collect

ENV = {**os.environ, "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t", "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@t",
       "GIT_AUTHOR_DATE": "2026-01-02T03:04:05+00:00", "GIT_COMMITTER_DATE": "2026-01-02T03:04:05+00:00"}


def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True, env=ENV, stdin=subprocess.DEVNULL).stdout.strip()


def repo(dev, name, commit=True, tag=None):
    """A repo built from plumbing: one unsigned commit of the empty tree and an optional lightweight tag."""
    path = dev / name
    path.mkdir()
    git(path, "init", "-q")
    if commit:
        sha = git(path, "commit-tree", git(path, "mktree"), "-m", "first")
        git(path, "update-ref", "refs/heads/main", sha)
        if tag:
            git(path, "update-ref", f"refs/tags/{tag}", sha)
    return path


def note(**e):
    return json.dumps({"at": "2026-01-02 03:04", "repo": "ok", **e}) + "\n"


class CollectTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp)
        self.dev = self.tmp / "dev"
        self.dev.mkdir()
        (self.tmp / "projects.json").write_text("{}")
        (self.tmp / "milestones.jsonl").write_text("")

    def collect(self):
        return collect.collect(self.dev, self.tmp)

    def test_git_error_aborts(self):
        repo(self.dev, "ok")
        (repo(self.dev, "broken") / ".git" / "HEAD").write_text("garbage\n")
        with self.assertRaises(RuntimeError):
            self.collect()

    def test_empty_repo_is_skipped(self):
        repo(self.dev, "ok")
        repo(self.dev, "empty", commit=False)
        self.assertEqual(list(self.collect()["projects"]), ["ok"])

    def test_release_note_describes_its_tag(self):
        repo(self.dev, "ok", tag="v1.0.0")
        (self.tmp / "milestones.jsonl").write_text(note(kind="release", tag="v1.0.0", title="Erstes Release", big=True))
        releases = [e for e in self.collect()["events"] if e["kind"] == "release"]
        self.assertEqual([(e["title"], e["big"]) for e in releases], [("v1.0.0 – Erstes Release", True)])

    def test_milestone_of_unknown_repo_aborts(self):
        repo(self.dev, "ok")
        (self.tmp / "milestones.jsonl").write_text(note(repo="okk", title="Vertippt"))
        with self.assertRaises(ValueError):
            self.collect()

    def test_release_note_without_tag_aborts(self):
        repo(self.dev, "ok")
        (self.tmp / "milestones.jsonl").write_text(note(kind="release", tag="v9.9.9", title="Nie getaggt"))
        with self.assertRaises(ValueError):
            self.collect()


if __name__ == "__main__":
    unittest.main()
