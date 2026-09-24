# Assets — Milestone 2

The client-supplied PDF has been preserved as a lossless embedded-image
extraction at `assets/angela-source.png`. Keep this source unchanged.

## Required asset

`assets/angela_host.png` — transparent, text-free intro artwork prepared for
Milestone 2.

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

Delivery format for `angela_host.png`: PNG with a genuine alpha channel, so the
visor HUD and dissolve can composite over the page background.

## Visor HUD — overlay, not baked artwork

Per issue #1 the visor readout must be a **live DOM/CSS overlay positioned over
the image**, never text burned into the PNG. That keeps it crisp and legible at
every mobile width. The overlay must drive these values from game state:

- `DAILY WHOAMIGAME`
- `SCORE` — the current daily game's earned `state.score` (zero before a win),
  not a cumulative score.
- `STREAK` — the locally persisted `state.stats.currentStreak`.

Because the text is dynamic, the supplied artwork should leave the visor area
clear of any pre-rendered lettering.

The intro module accepts the numeric values as parameters. A future account or
statistics service can resolve authoritative values before calling it; service
access and local/remote conflict policy should remain outside the artwork and
intro module.

## Provenance

- Source: `Gemini_Generated_Image_4xkck4xkck4xkck4.pdf`, supplied by the client.
- Preserved embedded raster: `assets/angela-source.png`.
- Approved prepared derivative: `assets/angela_host.png`, created for the
  Milestone 2 intro and live HUD overlay.
- Approved edit brief: preserve Angela's outlined face, visor, and minimal neck;
  remove the textured background and embedded visor lettering; export a
  transparent PNG with a clear visor for the dynamic HTML/CSS readout.
