#!/usr/bin/env python3
"""Chronicle of all repos in ~/dev as JSON: birth (first commit), version tags, commits per day
and the curated milestones from milestones.jsonl.

Usage: collect.py > data.json
"""
import json
import re
import subprocess
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEV = Path.home() / "dev"
VERSION = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)$")


def git(repo, *args):
    """Lines of a git command's output. A failing command aborts the whole collection, so publish.sh
    keeps the previous snapshot on the server instead of uploading an incomplete one."""
    run = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, timeout=60)
    if run.returncode:
        raise RuntimeError(f"git {args[0]} failed in {repo}: {run.stderr.strip()}")
    return run.stdout.splitlines()


def repos(dev):
    for path in sorted(dev.iterdir()):
        if path.is_symlink() or path.name.startswith((".", "_")) or not (path / ".git").exists():
            continue
        yield path


def collect(dev, here):
    """The chronicle of the repos in dev with the metadata and milestones in here."""
    meta = json.loads((here / "projects.json").read_text())
    projects, events, heat = {}, [], {}

    for path in repos(dev):
        key = path.name
        info = meta.get(key, {})
        if info.get("hidden"):
            continue
        dates = git(path, "log", "--all", "--date=format:%Y-%m-%d %H:%M", "--format=%ad|%s")
        if not dates:
            continue
        born, first = dates[-1].split("|", 1)
        if info.get("born"):
            born, first = info["born"], info.get("bornNote", first)
        projects[key] = {"name": info.get("name", key), "color": info.get("color"), "born": born, "first": first, "commits": len(dates)}
        heat[key] = dict(Counter(d[:10] for d in dates))
        events.append({"at": born, "repo": key, "kind": "birth", "title": first, "big": True})

        for line in git(path, "for-each-ref", "--sort=creatordate", "--format=%(creatordate:format:%Y-%m-%d %H:%M)|%(refname:short)", "refs/tags"):
            at, tag = line.split("|", 1)
            m = VERSION.match(tag)
            if m:
                events.append({"at": at, "repo": key, "kind": "release", "title": tag, "tag": tag, "big": m.group(3) == "0"})

    # projects without a repo of their own live inside another repo and are born on a set date
    for key, info in meta.items():
        if info.get("in") in projects and info.get("born"):
            projects[key] = {"name": info.get("name", key), "color": info.get("color"), "born": info["born"], "first": info.get("bornNote", ""), "commits": 0}
            events.append({"at": info["born"], "repo": key, "kind": "birth", "title": projects[key]["first"], "big": True})

    for line in (here / "milestones.jsonl").read_text().splitlines():
        if not line.strip():
            continue
        e = json.loads(line)
        e.setdefault("kind", "milestone")
        e["big"] = bool(e.get("big"))
        # a curated release names a tag and only adds a description to the release from git
        if e.get("tag"):
            tagged = [x for x in events if x.get("tag") == e["tag"] and x["repo"] == e["repo"]]
            if not tagged:
                raise ValueError(f'milestones.jsonl: no tag {e["tag"]} in {e["repo"]}')
            tagged[0].update(title=f'{e["tag"]} – {e["title"]}', big=e["big"] or tagged[0]["big"])
        elif e["repo"] in projects:
            events.append(e)

    events.sort(key=lambda e: e["at"])
    return {
        "generated": datetime.fromtimestamp(time.time(), timezone.utc).isoformat(timespec="seconds"),
        "projects": projects,
        "events": events,
        "heat": heat,
    }


def main():
    print(json.dumps(collect(DEV, HERE), ensure_ascii=False))


if __name__ == "__main__":
    main()
