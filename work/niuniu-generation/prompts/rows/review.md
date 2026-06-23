Create one horizontal animation strip for Codex pet `niuniu`, state `review`.

Use the attached canonical base for identity. Use the attached layout guide only for slot count, spacing, centering, and padding; do not draw the guide.

Output exactly 6 full-body frames in one left-to-right row on flat pure magenta #FF00FF. Treat the row as 6 invisible equal-width slots: one centered complete pose per slot, evenly spaced, with no overlap, clipping, empty slots, labels, or borders.

Identity: same pet in every frame: the exact black-and-white cat in the reference: dominant black crown, narrow white forehead blaze, yellow-green eyes, pink nose, white chest and legs, black side patches, rounded compact body, subtle cyan pixel-edge accent. Preserve silhouette, face, proportions, markings, palette, material, style, and props.
Style: Pet-safe sprite: compact full-body mascot, readable in a 192x208 cell, clear silhouette, simple face, stable palette/materials, and crisp edges for chroma-key extraction. Style `auto`: Infer the most appropriate pet-safe style from the user request and reference images, then keep that exact style consistent across every row. User style notes: Preserve the exact semi-realistic pixel-art-adjacent sprite rendering, soft fur shading, proportions, markings, yellow-green eyes, pink nose, and subtle cyan edge accent from the reference..
Animation continuity: keep apparent pet scale and baseline stable within the row unless the state itself intentionally changes vertical position, such as `jumping`. Move the pose within the slot instead of redrawing the pet larger or smaller frame to frame.

State action: Ready-review reading loop: Niuniu sits upright holding one small open book with both front paws, reads attentively, blinks, scans across the pages, and makes a thoughtful head tilt.

State requirements:
- Keep one consistent small open book in all 6 frames, sized clearly enough to read as a book inside a 192x208 sprite cell.
- Animate a calm reading cycle through eye direction, blink, subtle page-side paw movement, and thoughtful head tilt.
- The pages must be blank with no text, symbols, diagrams, logos, or readable marks.
- Do not add magnifying glasses, loose papers, code, UI, punctuation, floating symbols, or additional props.

Clean extraction: crisp opaque edges, safe padding, no scenery, text, guide marks, checkerboard, shadows, glows, motion blur, speed lines, dust, detached effects, stray pixels, or chroma-key colors inside the pet.
