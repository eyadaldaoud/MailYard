---
name: MailCleaner
description: Gmail cleanup tool styled as a freight sorting depot — paper, ink, and powder-coated stream colors
colors:
  primary: "#171a17"
  paper: "#f4f1ea"
  paper-2: "#efe9dc"
  sheet: "#ffffff"
  sheet-soft: "#fbf9f4"
  linen: "#d8d4c9"
  linen-2: "#e7e3d8"
  ink-soft: "#5c6157"
  ink-mute: "#8b8f84"
  signal: "#ffd200"
  trash: "#d64524"
  trash-bright: "#ef6a45"
  unload: "#3557a8"
  keep: "#2e7d4f"
  keep-bright: "#5fb987"
  warn: "#a1660b"
  depot: "#1c1f1c"
typography:
  display:
    fontFamily: "Archivo, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  section: "24px"
components:
  button-dispatch:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  button-outline:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  card-sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
  nav-rail:
    backgroundColor: "{colors.depot}"
    textColor: "{colors.paper}"
---

# Design System: MailCleaner

## Overview

**Creative North Star: "The Sorting Depot"**

The interface is a freight sorting station for email. The page is a warm paper work-floor; every interactive surface is a white sheet laid on it; headers and navigation are matte-black depot chrome. Email triage is expressed as freight movement: mail arrives along color-coded "stream" bands (a 10px powder-coated strip across the top of each intake surface), is weighed on scales (counts, MB, KB in tabular numerals), and leaves through exactly one dispatch control per screen. Nothing glows, nothing floats, nothing gradients — the expressiveness comes from stamps, hairlines, bands, and industrial type.

**The Depot Rule for accent color.** `signal` yellow (#ffd200) appears on at most one action per screen — the confirmable dispatch strip. It never colors badges, banners, nav items, or hovers. When everything is yellow, nothing dispatches.

**Key Characteristics:**
- Paper ground, sheet-white panels, linen hairline borders — no drop-shadow elevation on cards
- Stream bands (10px solid color top edge) declare each surface's disposition before its text does
- Tabular numerals everywhere numbers are weighed (`.tnum`)
- One yellow dispatch action per screen; all other confirmations are ink-solid
- Dispositions named by freight role: trash (#d64524), unload/unsubscribe queue (#3557a8), keep (#2e7d4f)

## Colors

A warm archival ground (paper, linen) against near-black ink, with four saturated powder-coat colors used as functional wayfinding, never as decoration. Backgrounds wash on accent at ~10% opacity for tinted states; borders carry the full-weight color.

### Primary
- **Ink** (#171a17): the strongest tool in the box. Body text, solid confirm buttons, 3px ticket top-edges, dark chrome focus. Doubles as the neutral "system" stream color.
- **Signal** (#ffd200): the dispatch yellow. Exactly one per screen — the weighbridge "Trash N Selected" button, the "Launch Clean Wizard" strip, selection highlights. Paired always with ink text.

### Secondary
- **Trash** (#d64524): destructive triage. Row tint washes, "Trash all" chip text, trash-candidate KPI band, stamps on sorted-out rows. `trash-bright` (#ef6a45) is its voice on dark depot chrome. `trash-deep` (#b23617) for pressed states.
- **Unload** (#3557a8): the unsubscribe queue. Unsub buttons, notifications stream bands, focus rings on search fields, link-blue accents inside the wizard.
- **Keep** (#2e7d4f): retention. "Keeping" KPI band, confirmed unsubscribes, success toasts, configured-state tints. `keep-bright` (#5fb987) speaks on dark chrome.

### Tertiary
- **Warn** (#a1660b): amber caution for setup friction — unconfigured OAuth cards, "Crucial Step" callouts. Never used as a button fill.

### Neutral
- **Paper** (#f4f1ea): the page ground. `paper-2` (#efe9dc) is the inset variant for scroll tracks and selected tabs.
- **Sheet** (#ffffff): every panel, modal, and card. `sheet-soft` (#fbf9f4) for secondary panels.
- **Linen** (#d8d4c9): all hairline borders and dividers; `linen-2` (#e7e3d8) the quieter variant for row rules.
- **Ink-soft** (#5c6157): secondary text. **Ink-mute** (#8b8f84): placeholder and caption text.
- **Depot** (#1c1f1c): nav rail and dark banner chrome; text on it is paper, accents are the `-bright` stream colors.

### Named Rules
**The One Voice Rule.** A stream-colored button carries exactly one stream color — background, border, and icon agree. Inside a blue unload button, icons are paper, never green-plus-red mixed glyphs.

**The Wash Rule.** Accents tint backgrounds at 10% opacity with full-weight borders (e.g. `bg-trash/10 border-trash/30`); solid accent fills reserve themselves for the single dispatch action of the screen.

## Typography

**Display Font:** Archivo (system-ui fallback)
**Body Font:** Archivo (system-ui fallback)
**Label/Mono Font:** Geist Mono (monospace fallback)

**Character:** Archivo's condensed grotesque voice gives the freight-office feel: bold, dead-flat, slightly industrial. Geist Mono is reserved for anything that matters to the scale — weights, counts, dates, stats — so digits align like an odometer.

### Hierarchy
- **Display** (ExtraBold, 1.5rem, tracking tight): screen titles and hero headers.
- **Headline** (Bold, 1.125rem): panel titles, sender names.
- **Title** (Semibold, 0.875rem): row subjects, button labels.
- **Body** (Regular, 0.875rem, line-height 1.5): descriptions, previews.
- **Label** (Geist Mono Bold, 0.6875rem, letter-spacing 0.08em, uppercase): KPI captions, stamps, chips, keyboard-style tattoos like `~19.9 MB`.

### Named Rules
**The Odometer Rule.** Any number the user might compare sits in `.tnum` (tabular numerals), usually Geist Mono. Counts never reflow as they tick.

## Layout

A single centered column, max-width ~72rem (1280px) with 12–24px side padding collapsing on mobile. Vertical rhythm is stacked full-width bands with 16–24px gaps — KPI strips, action rails, panels, row lists. The cleaner view stacks: category chip matrix → sender cards grid (4-up desktop) → consolidated action bar → email rows. Density is high but airy: rows keep 12–14px vertical padding with hairline separation, and the KPI row condenses to a wrap of inline tiles. The nav is a sticky top chrome (56px min-height); on mobile it collapses to icons with a hamburger overflow.

## Elevation & Depth

Depth comes from layering against the paper ground, not from shadows. Sheets sit on paper via a 1px linen border; dark chrome surfaces (nav, banners, toasts) rise via contrast alone. Shadows are rare single-accents on floating chrome only (`shadow-sm` on chips, `shadow-lg` on modals); there is no shadow scale and no box-shadow on resting cards.

### Named Rules
**The Flat Sheet Rule.** Panels are flat white sheets with hairline linen borders. Elevation is expressed by a 3px solid ink **top-edge** on the surface that owns the moment (the weighbridge ticket), not by shadow.

## Shapes

Small-corner industrial language: 4px on buttons and chips, 8px on nested panels, 12px on cards and modals. Pills (9999px) are reserved for status badges (Live Filter, Mass Alert). Distinctive silhouettes: the **stamp** — a 1.5px-border uppercase letterspaced label rotated -1.5deg, marking sorted-out rows; the **stream band** — a hard-edged 10px solid strip across a card's top edge with no radius; the **ticket** — a sheet with a 3px ink top border, reserved for weighbridge/bulk-selection strips.

## Components

### Buttons
- **Shape:** near-square, 4px radius, compact padding (6px 10–12px), 11–12px bold labels.
- **Dispatch (primary action):** signal yellow fill + ink text. One per screen. Used for "Trash N Selected" on the weighbridge ticket and "Launch Clean Wizard" on the in-page strip.
- **Solid confirm:** ink fill + paper text for flow confirmations (demo launch, wizard install). Hover shifts to paper fill w/ ink text or paper-2.
- **Stream actions:** unload-blue fill for unsubscribe jobs ("Unsub & Trash all N"), icons and spinner in paper — one voice (The One Voice Rule).
- **Outline/quiet:** sheet fill + linen border, ink text; hover darkens border to ink. Dark-chrome equivalents use paper/25 borders with paper text.
- **Focus:** 2px ink outline with 2px offset, globally.

### Chips (Category Matrix)
- **Style:** sheet fill, linen border, 8px radius (not pills) with a count in mono ink-soft.
- **State:** selected = ink border + tint wash in the category's stream color + colored dot (`bg-*`) from the neutral dot map; unselected = quiet sheet. Action chips ("Trash all 1") tint 10% in the job's stream color with matching text/border.

### Cards / Containers
- **Corner Style:** 12px for major panels; 8px for nested sender cards.
- **Background:** sheet (#fff); secondary panels sheet-soft (#fbf9f4).
- **Shadow Strategy:** none at rest (The Flat Sheet Rule).
- **Border:** 1px linen; cards carrying a disposition take a 10px stream-band top edge via `--stream-color`.
- **Internal Padding:** 12–16px; KPI tiles 16px.

### Inputs / Fields
- **Style:** sheet fill, linen border, 12px radius, 12px text, ink-mute placeholder.
- **Focus:** borders and ring shift to unload blue, 1px ring.
- **Disabled:** opacity 40–50%.

### Navigation
- **Style:** dark depot chrome rail (#1c1f1c), full-width, sticky. Tabs are quiet paper/70 text; the active tab is a raised sheet block with ink text; hover lightens to paper on a 10% paper wash.
- **Buttons in chrome:** outline paper style; the demo/exit controls are neutral outlines — yellow is banned from chrome except the tiny brand tile mark.
- **Mobile:** icons plus a hamburger menu; labels hide under `sm`.

### The Weighbridge Ticket (signature)
The bulk-selection bar: a full-width sheet with 3px ink top-edge carrying "N emails on the scale", a mono `~19.9 MB` weight, a Clear control, and the screen's single signal dispatch button ("Trash N Selected"). When rows are removed, they exit with a red-tinted slide-and-collapse animation (`.animate-row-exit`) and a rotated uppercase STAMP reading "Sorted out" over the row.

### The Stamp (signature)
Uppercase, 1.5px currentColor border, 0.22em letter-spacing, rotated -1.5deg, ink or trash colored. Marks outcomes without deleting evidence: "Sorted out", status labels, quickstart markers.

## Do's and Don'ts

### Do:
- **Do** give every intake surface a stream-band top edge and let `--stream-color` declare its disposition before its copy does.
- **Do** use tabular numerals (Geist Mono, `.tnum`) for every count, weight, and date.
- **Do** reserve signal yellow for the one confirmable dispatch action per screen; pair it with ink text, never paper text.
- **Do** tint accent states as 10–20% washes with full-color borders; keep hex-exact color to borders, icons, and bands.
- **Do** name animations after freight motion (weigh-up, row exit, parcel float) and keep them under 450ms with no bounce.

### Don't:
- **Don't** use gradients, glassmorphism, or dark-mode slate/purple palettes — the ground is warm paper, and depth is layered, not lit.
- **Don't** mix two stream colors inside one stream-colored control; a button speaks in one voice (paper icons only inside powder-coated fills).
- **Don't** add drop shadows to resting cards — depth is the 1px linen border, the 3px ink ticket edge, or nothing.
- **Don't** put yellow in nav chrome, badges, banners, or hovers; it belongs to the dispatch strip alone.
