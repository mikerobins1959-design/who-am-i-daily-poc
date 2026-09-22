# Assets — Milestone 2 placeholder

Milestone 1 ships no artwork. This directory exists only to record the asset
Milestone 2 needs, so the requirement is not lost between milestones.

## Required asset

`assets/angela_host.png` — **not yet supplied.**

The client has not provided a transparent-background Angela host image, and this
project deliberately does not fabricate a replacement or edit client-owned
artwork. Milestone 2 cannot start the opening artwork and dissolve until the
client supplies this file (or approves an alternative).

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

Delivery format: PNG with a genuine alpha channel, so the visor HUD and the
dissolve into Clue 1 can composite over the page background.

## Visor HUD — overlay, not baked artwork

Per issue #1 the visor readout must be a **live DOM/CSS overlay positioned over
the image**, never text burned into the PNG. That keeps it crisp and legible at
every mobile width. The overlay must drive these values from game state:

- `DAILY WHOAMIGAME`
- `SCORE`
- `STREAK`

Because the text is dynamic, the supplied artwork should leave the visor area
clear of any pre-rendered lettering.

## Scope note

The opening artwork, dissolve/fade into Clue 1, dynamic visor HUD, social share
and styled ad placeholder are all Milestone 2. Nothing in this directory is
referenced by the Milestone 1 application.
