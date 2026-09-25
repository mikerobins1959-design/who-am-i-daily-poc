# Assets — Milestone 2

The client-supplied PDF has been preserved as a lossless embedded-image
extraction at `assets/angela-source.png`. Keep this source unchanged.

## Active client artwork

`assets/angela-final.png` — final client-supplied intro artwork, preserved
unchanged from the supplied 633x736 PNG.

This file is intentionally opaque and includes the approved `WHO AM I ?` visor
title in its pixels. The intro uses a full-viewport background and CSS edge fade
to blend the rectangular source into the page. Live score and streak values
remain DOM text positioned in the lower visor band; the duplicate dynamic title
is visually hidden but remains available as the dialog's accessible name.

## Earlier prepared asset

`assets/angela_host.png` — transparent, text-free intro artwork prepared during
Milestone 2 and retained for provenance. It is no longer the active intro asset.

The supplied source is a 960x1116 RGB PNG with no alpha channel. It has a white
textured background and visor lettering already baked into its pixels. An
approved image-preparation pass produced `angela_host.png` as a new 1163x1352
RGBA derivative with a transparent background and clear visor. The source
extraction remains unchanged. The prepared derivative is ready for
implementation review; it does not represent final client artwork sign-off.

## Specification (from GitHub issue #1)

Issue #1 is the source of truth. Summarised:

- Clean outlined line-art facial style, outline strokes only — no shading or
  colour fills.
- Slightly softer, tapered jawline.
- Narrower base of the nose.
- Slightly fuller, curved lips.
- Smooth, minimal collar and neck area, with zero mechanical pipes, neck plates
  or cybernetic textures.
- Visor with a cyan glow.

The earlier `angela_host.png` has a genuine alpha channel. The active
client-supplied `angela-final.png` is intentionally opaque.

## Visor HUD

The active artwork includes the approved game title. Dynamic values remain a
**live DOM/CSS overlay positioned over the image** so they stay current and
legible at every mobile width. The overlay drives these values from game state:

- `SCORE` — the current daily game's earned `state.score` (zero before a win),
  not a cumulative score.
- `STREAK` — the locally persisted `state.stats.currentStreak`.

The intro module accepts the numeric values as parameters. A future account or
statistics service can resolve authoritative values before calling it; service
access and local/remote conflict policy should remain outside the artwork and
intro module.

## Provenance

- Source: `Gemini_Generated_Image_4xkck4xkck4xkck4.pdf`, supplied by the client.
- Preserved embedded raster: `assets/angela-source.png`.
- Approved prepared derivative: `assets/angela_host.png`, created for the
  Milestone 2 intro and live HUD overlay.
- Final client artwork: `assets/angela-final.png`, supplied as an opaque PNG
  with the approved visor title already rendered.
- Approved edit brief: preserve Angela's outlined face, visor, and minimal neck;
  remove the textured background and embedded visor lettering; export a
  transparent PNG with a clear visor for the dynamic HTML/CSS readout.
