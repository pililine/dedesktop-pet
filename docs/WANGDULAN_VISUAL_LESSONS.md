# Wangdulan Visual Lessons

Last updated: 2026-07-08

This document distills useful lessons from the old Codex conversation and old material-production work. It is intentionally not a chat transcript.

## Confirmed Successes

- Wangdulan's current identity direction is accepted: an adult, mostly white black-and-white cow cat with a black cap/mask, central white blaze, amber eyes, black nose, and black chin goatee.
- The photo-like/semi-realistic style works better when rendered smoothly. Do not pixelate source art just because the runtime is sprite-based.
- `idle`, `working`/`computer_type`, `review`/`reading_idle`, `interaction`, `computerIdle`, `lieDown`, `walkRight`, and mirrored `walkLeft` already have migrated source strips and approved transparent versions in `source-assets/wangdulan/approved/`.
- Simple idle or breathing loops can sometimes use a ping-pong playback strategy when the first/last pose transition is otherwise stable.
- Wangdulan and Niuniu can share the same runtime engine, but identity, approved art, and pet configuration must remain pet-specific.

## Confirmed Failures And Risks

- Generating a full multi-frame animation strip in one free pass often creates:
  - body-length changes;
  - marking drift;
  - leg-position jumps;
  - tail-pose jumps;
  - frames that look like separate illustrations rather than one continuous subject.
- Free repainting to fix small defects can make Wangdulan drift toward chibi, big-head, or different-cat proportions.
- CC scripts alone cannot invent missing anatomical motion phase.
- Automatic QA passing does not mean visual approval.
- Old Niuniu pixels must not become Wangdulan templates.
- Repeatedly patching formal atlas files is the wrong workflow; fix source candidates, then let CC rebuild.

## walkRight Diagnosis

Authoritative measurements live in:

- `work/wangdulan/walk16/measurements/keyframe-measurements.json`
- `work/wangdulan/walk16/measurements/keyframe-measurements.md`
- `work/wangdulan/walk16/measurements/high-risk-transitions.md`

Do not duplicate exact measurement numbers here; use the reports above as source of truth.

Confirmed conclusions:

- Current 8-frame `walkRight` is the main source of gait discontinuity.
- Adjacent-frame differences are much higher than calmer loops such as `idle`, `working`, and `review`.
- `K2→K3` is high risk: body length compresses, tail style changes from raised/back to lower/down, and leg phase jumps. I02 is the first validation frame for this transition.
- `K4→K5` has a large contact-point and front-leg displacement.
- `K5→K6` has a large front-leg backswing and hind-leg shift.
- `K7→K0` has a visible loop reset: body length returns and tail position resets.
- `walkLeft` currently derives from `walkRight` by mirroring, so validate `walkRight` first before deciding whether mirrored `walkLeft` remains acceptable.

## Current Production Implication

The next Codex image-production task is not to regenerate `walkRight`. It is only to generate I02 candidate in-between frames for `K2→K3`, using the task package in `work/wangdulan/walk16/tasks/I02/` and writing candidates to `source-assets/wangdulan/codex-output/walkRight/inbetweens/I02/`.
