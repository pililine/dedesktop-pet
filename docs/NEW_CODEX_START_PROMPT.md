You are working in the Desktop Pet Factory project root. Before doing anything, confirm that the current directory contains `Makefile`, `README.md`, `apps/`, `pet_factory/`, `pets/`, `source-assets/`, `work/`, `docs/`, `schemas/`, `tests/`, `reports/`, `releases/`, and `archive/`.

Read these files in order:

1. `README.md`
2. `docs/PROJECT_STRUCTURE.md`
3. `docs/TOOL_RESPONSIBILITIES.md`
4. `docs/PET_PRODUCTION_PIPELINE.md`
5. `docs/CODEX_IMAGE_WORKFLOW.md`
6. `docs/WANGDULAN_VISUAL_LESSONS.md`
7. `source-assets/wangdulan/identity-reference/CHARACTER.md`
8. `work/wangdulan/walk16/CURRENT.md`
9. `work/wangdulan/walk16/tasks/I02/prompt.txt`
10. `work/wangdulan/walk16/tasks/I02/acceptance-checklist.md`

After reading, summarize your understanding of the responsibilities boundary:

- Codex generates image candidates only.
- CC owns QA, slicing, approved-state management, atlas assembly, `pet.json`, app build, install, and rollback.
- The user is the visual director and approves candidates.

Then check that the `I02` inputs exist in `work/wangdulan/walk16/tasks/I02/`:

- `previous-keyframe.png`
- `next-keyframe.png`
- `identity-reference.png`
- `prompt.txt`
- `acceptance-checklist.md`
- `measurements.json`
- `task.md`

Do not modify the task package. Do not access old Codex directories. Do not modify `apps/`, `pet_factory/`, `schemas/`, `pets/`, formal atlas files, `pet.json`, or release artifacts.

Your only image-production job is to generate 2–3 candidate images for `I02` and write them to:

```text
source-assets/wangdulan/codex-output/walkRight/inbetweens/I02/
```

Allowed outputs:

- `candidate-01.png`
- `candidate-02.png`
- `candidate-03.png`
- `generation-notes.md`

When finished, report only the candidate paths and the generation notes path. Do not run QA, assemble spritesheets, build the app, install anything, or continue to other in-between tasks.
