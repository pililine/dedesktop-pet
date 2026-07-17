#!/usr/bin/env python3
"""Single source of truth for project paths (Python side).

Every pet_factory module and script resolves locations from here. Rules:
- never guess from the shell CWD, never hardcode user-absolute paths,
- Codex writes only under codex_output(), official pets/ is build output.
The Node/Vite side mirrors these rules in apps/desktop-pet/vite.config.ts.
"""
from pathlib import Path

# project root = directory containing pet_factory/
PROJECT_ROOT = Path(__file__).resolve().parent.parent

APP_ROOT = PROJECT_ROOT / "apps" / "desktop-pet"
PET_FACTORY_ROOT = PROJECT_ROOT / "pet_factory"
SOURCE_ASSETS_ROOT = PROJECT_ROOT / "source-assets"
WORK_ROOT = PROJECT_ROOT / "work"
PETS_ROOT = PROJECT_ROOT / "pets"
REPORTS_ROOT = PROJECT_ROOT / "reports"
RELEASES_ROOT = PROJECT_ROOT / "releases"
SCHEMAS_ROOT = PROJECT_ROOT / "schemas"
ARCHIVE_ROOT = PROJECT_ROOT / "archive"


def source_assets(pet_id: str) -> Path:
    return SOURCE_ASSETS_ROOT / pet_id


def codex_output(pet_id: str, action: str = "") -> Path:
    p = source_assets(pet_id) / "codex-output"
    return p / action if action else p


def approved(pet_id: str) -> Path:
    return source_assets(pet_id) / "approved"


def rejected(pet_id: str) -> Path:
    return source_assets(pet_id) / "rejected"


def manifests(pet_id: str) -> Path:
    return source_assets(pet_id) / "manifests"


def work(pet_id: str, sub: str = "") -> Path:
    p = WORK_ROOT / pet_id
    return p / sub if sub else p


def frames(pet_id: str) -> Path:
    """Authoritative per-action frame workspace feeding atlas builds."""
    return work(pet_id, "frames")


def pets(pet_id: str) -> Path:
    """Official pet package dir. Build output only — never hand-edit."""
    return PETS_ROOT / pet_id


def selftest() -> None:
    assert (PROJECT_ROOT / "pet_factory" / "paths.py").exists()
    assert (APP_ROOT / "package.json").exists(), "app root mislocated"
    for name, p in {
        "APP_ROOT": APP_ROOT,
        "source_assets": source_assets("wangdulan"),
        "codex_output": codex_output("wangdulan", "walkRight"),
        "work.frames": frames("wangdulan"),
        "pets": pets("wangdulan"),
    }.items():
        assert str(p).startswith(str(PROJECT_ROOT)), f"{name} escaped root"
        print(f"  {name:<14} -> {p.relative_to(PROJECT_ROOT)}")
    assert pets("default").joinpath("pet.json").exists(), "official niuniu missing"
    print("paths selftest OK")


if __name__ == "__main__":
    selftest()
