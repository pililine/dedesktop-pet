# Codex Image Workflow

Last updated: 2026-07-08

This is the operating rulebook for future Codex image-generation sessions in Desktop Pet Factory.

## Scope

Codex is the image-art production endpoint. It may generate candidates from task packages and identity references, but it does not own the app, formal pet package, schemas, atlas, QA approval, or release process.

## Codex Responsibilities

Codex may:

- Read the project root documentation and the current task package.
- Use photos and approved identity references to preserve a pet's identity.
- Generate image candidates requested by CC task packages.
- Create key poses or true in-between motion frames when explicitly tasked.
- Regenerate a clearly specified single frame or small candidate set.
- Write generation notes alongside candidates.

Codex must not:

- Modify application code.
- Modify Pet Factory tooling or schemas.
- Modify `pets/`, formal atlas files, or `pet.json`.
- Decide final approval.
- Treat automatic QA as visual approval.
- Build, install, release, or promote the desktop app.

## Only Writable Production Area For Codex

Normal Codex image-production writes are limited to:

```text
source-assets/<pet-id>/codex-output/
```

For Wangdulan walk16 in-betweens, the current output form is:

```text
source-assets/wangdulan/codex-output/walkRight/inbetweens/I02/
```

Codex must not write to:

```text
apps/
pet_factory/
schemas/
pets/
releases/
```

This migration produced docs as a one-time legacy handoff exception; that exception does not change the normal image-production boundary.

## Image Production Principles

- Process one explicit action or one explicit in-between frame at a time.
- Do not freely generate a complete multi-action spritesheet.
- Do not treat multi-frame animation as independent illustrations.
- Lock character identity before changing pose or props.
- Output candidates; do not automatically select the final candidate.
- Never overwrite `approved/` directly.
- Never overwrite formal pet package assets.
- A visually plausible result still needs CC measurement and user approval.

## 8-to-16 Frame Lessons

- Repeating frames does not create new motion phase.
- Alpha crossfade does not create true anatomical motion.
- Pixel averaging creates double images and ghosting.
- Higher FPS cannot fix large pose jumps when the source phase is missing.
- Only true intermediate poses improve motion continuity.
- The K8-to-K1 loop transition must also receive a real in-between when it is high risk.
- `walkRight` should be solved and approved before deciding whether `walkLeft` can remain a mirror.

## Candidate Output Notes

For each task, write a concise `generation-notes.md` that records:

- Which input files were used.
- What pose/action phase was targeted.
- Which constraints were intentionally preserved.
- Any known visual risk in each candidate.
- Whether the output uses transparent or chroma-key background.

Do not include long chat transcripts or terminal logs.
