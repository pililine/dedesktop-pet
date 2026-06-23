Create one horizontal animation strip for Codex pet `niuniu`, state `waiting`.

Use the attached canonical base for identity. Use the attached layout guide only for slot count, spacing, centering, and padding; do not draw the guide.

Output exactly 6 full-body frames in one left-to-right row on flat pure magenta #FF00FF. Treat the row as 6 invisible equal-width slots: one centered complete pose per slot, evenly spaced, with no overlap, clipping, empty slots, labels, or borders.

Identity: same pet in every frame: the exact black-and-white cat in the reference: dominant black crown, narrow white forehead blaze, yellow-green eyes, pink nose, white chest and legs, black side patches, rounded compact body, subtle cyan pixel-edge accent. Preserve silhouette, face, proportions, markings, palette, material, style, and props.
Style: Pet-safe sprite: compact full-body mascot, readable in a 192x208 cell, clear silhouette, simple face, stable palette/materials, and crisp edges for chroma-key extraction. Style `auto`: Infer the most appropriate pet-safe style from the user request and reference images, then keep that exact style consistent across every row. User style notes: Preserve the exact semi-realistic pixel-art-adjacent sprite rendering, soft fur shading, proportions, markings, yellow-green eyes, pink nose, and subtle cyan edge accent from the reference..
Animation continuity: keep apparent pet scale and baseline stable within the row unless the state itself intentionally changes vertical position, such as `jumping`. Move the pose within the slot instead of redrawing the pet larger or smaller frame to frame.

State action: Needs-input loop at a tiny open laptop: Niuniu sits behind the computer, watches the screen, then glances toward the user with one front paw hovering above the keyboard as if asking for approval.

State requirements:
- Keep one consistent small open laptop and keyboard directly in front of Niuniu in all 6 frames.
- Animate a patient sequence: looking at screen, ears perk, glance toward user, paw hovering over keyboard, small questioning head tilt, then return.
- The laptop screen must contain no text, code, logo, icon, or readable UI.
- Keep the motion patient and readable, without turning it into ordinary idle, typing, or review.

Clean extraction: crisp opaque edges, safe padding, no scenery, text, guide marks, checkerboard, shadows, glows, motion blur, speed lines, dust, detached effects, stray pixels, or chroma-key colors inside the pet.
