# Handoff: HexaUI — File Handling

## Overview
This package documents the **file-handling feature** for HexaUI, a multi-agent chat product. It covers four connected surfaces:

1. **Files view** — a full-screen library reached from the sidebar "Files" item, where users browse, search, filter, rename, and delete every file in their workspace.
2. **Composer attach** — a paperclip control in the message composer that lets users either upload a new file or re-attach a file they uploaded earlier.
3. **Attached pills** — chips above the composer representing files staged on the current draft; they ride along on the sent message.
4. **Undo toast** — a transient confirmation with an undo affordance after a delete.

The feature is wired live into `HexaUI Prototype.html` (clickable). Two attach-flow directions are included and toggle via a "Tweak": an anchored **popover** (default) and a centered **command palette**.

---

## About the Design Files
The files in this bundle are **design references created in HTML/CSS/React (Babel-in-browser)** — prototypes that show intended look and behavior. They are **not** production code to copy directly.

The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, SwiftUI, native, etc.), using its established component library, state management, and styling patterns. If no environment exists yet, choose the most appropriate framework and implement there. Treat the HTML/JSX as a precise spec for layout, tokens, motion, and behavior — not as files to ship.

The prototype uses React via in-browser Babel and a plain CSS token system. In a real codebase you'd map the CSS custom properties to your theme system and the React components to your component primitives.

---

## Fidelity
**High-fidelity.** Final colors, typography, spacing, border radii, motion timings, and interaction states are all specified below and present in the source. Recreate the UI pixel-accurately using your codebase's libraries, mapping the design tokens to your theme.

---

## Screens / Views

### 1. Files view (full screen)
**Purpose:** Manage every file in the workspace — browse, search, filter by kind, attach to chat, rename, delete (with undo).

**Layout**
- Replaces the chat area when the sidebar "Files" item is active (same shell: sidebar + topbar stay put).
- Vertical flex column: a scroll region (`overflow-y:auto`) containing a centered content column.
- Content column: `max-width: 940px; margin: 0 auto; padding: 38px 40px 80px`.

**Sections (top → bottom)**
1. **Masthead** — flex row, baseline-aligned, 1px bottom hairline (`--line`), `padding-bottom: 18px`.
   - Title "Files": `--font-hero`, 33px, weight 600, letter-spacing −0.025em, line-height 1.
   - Right-aligned subtitle (mono, 11.5px, uppercase, letter-spacing 0.08em, `--text-3`): `<N> files · <total size> · workspace`. Numbers bolded in `--text-2`.
2. **Toolbar** — flex row, gap 12px, `margin: 22px 0 6px`.
   - **Search**: flex-1, height 40px, `--surface` bg, 1px `--line` border, radius `--r-md`, left search icon (16px), placeholder "Search files". On focus-within: border → `--accent-line`. A clear "×" appears when non-empty.
   - **Kind filter**: pill group, gap 4px. Chips: height 30px, padding 0 12px, radius `--r-pill`, 12.5px label + optional mono 10.5px tag (`--text-3`). Default: transparent border, `--text-2`. Hover: `--surface-2` bg, `--text`. Active (`.on`): `--accent-weak` bg, `--accent-line` border, `--text`, tag → `--accent-2`. Filters: **All**, **Documents** (tag `PDF`), **Spreadsheets** (tag `CSV`), **Code** (tag `{ }`).
   - **Upload button**: default button variant (`.w-btn .w-btn-default`), upload icon + "Upload". Opens the OS file picker.
3. **Column header** — CSS grid `grid-template-columns: 1fr 92px 96px 118px 96px`, gap 12px, padding `14px 14px 9px`, 1px bottom hairline. Labels (sans, 10.5px, weight 600, uppercase, letter-spacing 0.08em, `--text-3`): **Name**, **Type**, **Size** (right), **Added** (right), **Actions** (right).
4. **Rows** — same grid template. Each row: padding `13px 14px`, 1px bottom hairline (`--line-2`), `position: relative`. A full-bleed `::after` hover wash (`--surface-2`, opacity 0 → 1 over 0.12s) sits behind the content (`z-index` layering).
   - **Name cell**: flex, gap 13px. File glyph (38px, see Components) + a two-line stack:
     - Filename: 14.5px, weight 500, `--text`. The **base name truncates** (ellipsis) but the **extension is always shown** in `--text-3`, weight 400. (Implemented as `display:flex; align-items:baseline` with the base name as the only `flex:1`-shrinkable, ellipsizing span and the extension as a non-shrinking span.)
     - Source line (mono, 10.5px, letter-spacing 0.04em, `--text-3`): a 5px `--accent` dot + the originating agent (e.g. "Atlas", "Probe · research"), or "uploaded by you" with no dot when user-uploaded.
   - **Type cell**: mono 9.5px uppercase tag (`--text-3`, letter-spacing 0.12em), e.g. `PDF`, `CSV`, `YAML`, `MD`.
   - **Size cell**: mono 11.5px, tabular-nums, `--text-3`, right-aligned.
   - **Added cell**: mono 11.5px, `--text-3`, right-aligned, relative time ("just now", "4h ago", "2d ago", then "Mon D").
   - **Actions cell**: right-aligned flex, gap 2px. **Hidden by default** (`opacity:0; translateX(4px)`), revealed on row hover or when a confirm/menu is open (`opacity:1; translateX(0)` over 0.14s). Three 30×30 icon buttons (radius `--r-sm`, `--text-3`, hover `--surface-3` + `--text`):
     - **Attach** (hover → `--accent-2`): shows attach icon, or a check icon when the file is already staged on the draft.
     - **Rename** (pen icon): enters inline rename.
     - **Delete** (trash, hover → red wash + `--danger`): enters inline confirm.

**Empty state** (no files, or no matches): centered, padding 70px 20px. 56px dashed-border glyph tile with folder icon, serif 19px heading, 13.5px `--text-3` body. Copy differs for "no files yet" vs "no files match".

---

### 2. Composer attach — popover (variation A, default)
**Purpose:** From the composer, upload a new file or re-attach an existing one.

- Trigger: the composer's left **paperclip** button (`.cbtn`, 17px icon). Active state while open: `--surface-2` bg, `--text`.
- Popover anchors **above** the button (`bottom: calc(100% + 10px); left: 0`), width 340px, `--surface` bg, 1px `--line`, radius `--r-lg`, `--shadow`, `transform-origin: bottom left`.
- Contents top → bottom:
  1. **Search row** — search icon + input (13.5px), placeholder "Search files to attach", autofocus. 1px bottom hairline.
  2. **Upload row** — clickable; 32px `--accent-weak` tile with `--accent-2` upload icon, title "Upload new file" (13.5px, weight 500), subtitle "PDF, CSV, code & text" (11.5px `--text-3`). Hover `--surface-2`. 1px bottom hairline.
  3. **Section label** "From your files" (`.lbl`).
  4. **List** — max-height 264px, scroll. Rows (padding 8px, radius `--r-sm`, hover `--surface-2`): 30px glyph + name (13px) + meta line (mono 10.5px: `TYPE · size · relTime`). Already-attached rows show a trailing `--accent` check and dim to opacity 0.62. Empty: 'No files match "…".'
- Clicking a row **toggles** that file's attachment. Clicking outside or the paperclip again closes the popover.

### 3. Composer attach — command palette (variation B)
Same data and actions, presented as a centered modal:
- Full-area overlay: `color-mix(--bg 58%, transparent)` + `backdrop-filter: blur(3px)`, flex top-center, `padding-top: 13vh`.
- Palette: width 560px (max `calc(100% - 48px)`), `--surface`, 1px `--line`, radius `--r-lg`, `--shadow`, `transform-origin: top center`.
- **Search** (20px icon, 16.5px input, autofocus) + an "ESC" key chip. **Upload row** (36px tile). Section label. **List** (max-height 340px) of larger rows (34px glyph, 14px name, 11px meta that also includes the source).
- **Keyboard:** ↑/↓ move a cursor highlight (`--surface-2`), Enter attaches the cursored file, Esc closes. Footer shows the three key hints (mono 10.5px with bordered key caps).

### 4. Attached pills (composer)
- Container above the textarea: flex-wrap, gap 8px, `margin-bottom: 11px`.
- Pill: flex, gap 9px, height 34px, padding `0 6px 0 9px`, `--bg-2` bg, 1px `--line`, radius `--r-sm`, max-width 240px. 22px glyph + name (12.5px, ellipsis) + mono 10.5px size + a 22px "×" remove button (hover `--surface-3`).
- **Uploading state**: instead of the size, a 46×3px track (`--accent-weak`) with a 40%-wide `--accent` bar sweeping left→right on a 1.05s loop. The "×" cancels.
- **Arrival**: when an upload completes, the pill plays a one-shot expanding ring (box-shadow bloom) then settles.
- On send, non-uploading pills are attached to the message and the tray clears.

### 5. Files on a sent message
- Inside the user bubble (`.ucard`), above the text: a vertical stack (gap 7px). Each entry: 20px glyph + name (12.5px `--text-2`) + mono 10.5px size.

### 6. Undo toast
- Fixed near the bottom center of the app area: `left:50%; bottom:26px; transform:translateX(-50%)`.
- Flex, gap 16px, padding `11px 12px 11px 16px`, `--surface`, 1px `--line`, radius `--r-md`, `--shadow`.
- Message "Deleted **<name>**" (13px) + an **Undo** button (height 30px, `--surface-2`, refresh icon + label).
- A 2px bottom **meter** (`--accent`) scales from full to zero over 5s (`transform: scaleX(1)→scaleX(0)`), matching the auto-dismiss timeout. Undo restores the file at its original index.

---

## Interactions & Behavior

**Attach / re-attach**
- Paperclip toggles the attach UI for that specific composer (hero or in-thread).
- Selecting a file in the popover/palette toggles it on the draft; the same file can't be added twice.
- "Attach to chat" from a Files-view row stages the file and switches back to the chat view.

**Upload (simulated in the prototype)**
- Opens a hidden `<input type="file" multiple>` with `accept=".pdf,.csv,.tsv,.txt,.md,.json,.yaml,.yml,.js,.ts,.py,.sh,.sql"`.
- Each picked file immediately appears as an **uploading pill**. After a simulated delay (~1.3s + 0.28s per file) it flips to done (arrival bloom) and is **prepended** to the workspace file list so it's reusable later.
- In production, replace the timeout with the real upload request; drive the pill's progress from upload progress events.

**Rename**
- Click the pen → the name becomes an inline text input (`.frename`: 14.5px, `--bg` bg, 1px `--accent-line`, radius `--r-sm`, max-width 360px), autofocused and select-all.
- **Enter** or **blur** commits (trimmed, non-empty); **Esc** cancels. Rename also updates any matching attached pill / message reference.

**Delete + undo**
- Click trash → the action area swaps to an inline confirm: "Delete?" + cancel "×" + a destructive **Delete** button (`.w-btn-destructive`).
- Confirm → the row plays a 0.34s collapse (translateX −18px + fade), then it's removed and the **undo toast** appears.
- Undo restores the file at its original index. The toast auto-dismisses after 5s (meter animation).

**Navigation**
- Sidebar "Files" sets the view to `files`; "Sessions" / "New session" / opening a recent returns to `chat`. The active sidebar item and topbar breadcrumb ("· Files") reflect the current view. The Files item shows a mono file count on the right.

**Variation toggle**
- A "Tweak" radio "Attach flow: popover | palette" switches between variations A and B at runtime.

---

## Motion & Transitions

> **Critical constraint from the prototype environment:** all entrance/exit keyframes are **transform/opacity only, and never start from `opacity:0`** unless the element is also conditionally rendered. (The prototype preview freezes CSS animations at t=0, so any animation starting at `opacity:0` would render invisible.) Entrance animations therefore animate `transform` only and leave opacity at 1. In a real app you may reintroduce opacity fades freely — but keep the timings/easings below.

| Element | Keyframe | Duration / easing |
|---|---|---|
| Files view enter | translateY(8px) → 0 | 0.4s `cubic-bezier(.2,.7,.3,1)` |
| Row enter (staggered) | translateY(12px) → 0, `animation-delay: index × 0.035s` | 0.5s `cubic-bezier(.22,1,.36,1)` |
| Row leave | fade + translateX(−18px) | 0.34s `cubic-bezier(.4,0,.6,1)` |
| Attached pill pop-in | translateY(8px) scale(.9) → 0 (springy) | 0.42s `cubic-bezier(.34,1.56,.5,1)` |
| Pill remove | scale(.86) + fade | 0.26s `cubic-bezier(.4,0,.6,1)` |
| Upload sweep | bar translateX(−110% → 280%) | 1.05s ease-in-out, infinite |
| Upload arrival | expanding box-shadow ring (7px → 0 alpha) | 0.7s ease-out |
| Popover open | translateY(8px) scale(.97) → 0 | 0.26s `cubic-bezier(.22,1,.36,1)` |
| Palette open | translateY(−14px) scale(.975) → 0 | 0.34s `cubic-bezier(.22,1,.36,1)` |
| Toast in | translateY(20px) → 0 | 0.42s `cubic-bezier(.22,1,.36,1)` |
| Toast meter | scaleX(1) → scaleX(0) | 5s linear |
| Hover washes / action reveal | opacity / translateX | 0.12–0.14s |

---

## State Management

State lives in the top-level `App` component (lift to your store/context as appropriate):

- `files: File[]` — the workspace library. Newest-first. Seeded with ~10 sample files.
- `attached: File[]` — files staged on the current draft (may include transient `uploading`/`justdone` entries).
- `view: "chat" | "files"` — which surface is shown in the main area.
- `attachOpen: null | "hero" | "foot"` — which composer's attach UI is open (only one at a time; the prototype has two composer instances).
- `toast: { file, idx, key } | null` — pending undo after a delete.
- Tweak: `attach: "popover" | "palette"`.

**File shape**
```
{
  id: string,
  name: string,            // includes extension
  bytes: number,           // size in bytes
  added: number,           // epoch ms
  source: string | null,   // originating agent label, or null = "uploaded by you"
  uploading?: boolean,     // transient (composer pill only)
  justdone?: boolean       // transient arrival flash
}
```

**Key transitions**
- Toggle attach → add/remove from `attached` by id (no duplicates).
- Upload → push uploading pill to `attached`; on completion clear `uploading`, set `justdone`, and **prepend** a persisted entry to `files`; clear `justdone` after 0.76s.
- Send → move non-uploading `attached` onto the new user message's `files`, clear `attached`, switch to `chat`.
- Rename → patch `files` (and any matching `attached` entry) by id.
- Delete → remember index, remove from `files` + `attached`, set `toast`; auto-clear after 5s.
- Undo → splice the file back into `files` at its original index; clear `toast`.

**Data note:** the prototype's file list is in-memory seed data and resets on reload; uploads are simulated. Wire `files` to your real persistence layer and replace the upload timeout with a real request.

---

## Design Tokens

These come from `theme.css` (the `.hexa` token system; dark is default, light provided). Map them to your theme.

**Colors — dark (default)**
| Token | Value | Use |
|---|---|---|
| `--bg` | `#1e1e1f` | app background |
| `--bg-2` | `#181819` | sidebar; pill background |
| `--surface` | `#282829` | inputs, popover/palette, toast, rows hover base |
| `--surface-2` | `#323234` | hover wash, cursor highlight |
| `--surface-3` | `#3d3d40` | icon-button hover |
| `--line` | `rgba(240,242,245,0.10)` | primary hairlines / borders |
| `--line-2` | `rgba(240,242,245,0.055)` | row dividers, inner hairlines |
| `--text` | `#ecedef` | primary text |
| `--text-2` | `#a3a6ac` | secondary text |
| `--text-3` | `#6e7177` | metadata, mono labels, idle icons |
| `--accent` | `#6db1ec` | source dots, focus ring, progress bar, meter, checks |
| `--accent-2` | `#84bef0` | accent icon/text on tiles |
| `--accent-weak` | `rgba(109,177,236,0.16)` | accent tile/track fills, active chip bg |
| `--accent-line` | `rgba(109,177,236,0.44)` | focus borders, active chip border |
| `--danger` | red (see theme) | delete hover wash + icon |
| `--shadow` | `0 1px 2px rgba(0,0,0,.35), 0 12px 34px rgba(0,0,0,.34)` | popover / palette / toast |

**Colors — light** (subset; full set in `theme.css`): `--bg #ffffff`, `--bg-2 #f5f6f7`, `--surface #ffffff`, `--surface-2 #f0f1f3`, `--text #191c21`, `--text-2 #5c616a`, `--text-3 #969ba3`, `--accent #2f86cf`. Accent variants `sage` and `mono` are also defined.

**Typography**
- `--font-sans` (UI): `"Hanken Grotesk", system-ui, sans-serif`
- `--font-serif` (display): `"Source Serif 4", Georgia, serif`
- `--font-mono` (metadata): `"IBM Plex Mono", ui-monospace, monospace`
- `--font-hero` (Files title): the sans by default; follows the user's chosen face Tweak.
- Sizes used here: title 33px/600; row name 14.5px/500; body 13–14.5px; mono metadata 9.5–11.5px; section labels 10.5–11.5px/600 uppercase.

**Radii:** `--r-sm 7px`, `--r-md 11px`, `--r-lg 16px`, `--r-pill 999px`.

**Spacing (comfortable / compact):** `--pad 20/14`, `--gap 14/10`, `--row-h 38/32`. The Files view uses literal paddings noted per-section above.

---

## Assets
- **Icons** — inline SVG line set in `icons.jsx` (1.6 stroke default, currentColor, no fill). File-handling additions: `trash`, `upload`, `x`, `code`, `sheet`; reused: `search`, `attach`, `pen`, `check`, `folder`, `refresh`, `arrowUp`, `mic`, `chat`, `plus`, `grid`, `sidebar`. Replace with your icon library (e.g. Lucide: trash-2, upload, x, code, table/sheet, paperclip, pencil, check, folder, rotate-ccw).
- **File-type glyphs** are **monochrome by design principle** — the agent accent is the only color, so file tiles use neutral `--surface-2` tiles with `--text-2` line icons (doc / sheet / code). Do not colorize by file type.
- **Fonts** — Hanken Grotesk, Source Serif 4, IBM Plex Mono (Google Fonts). No raster image assets.

---

## Files in this bundle
- `HexaUI Prototype.html` — entry point; loads the scripts/styles below.
- `files.jsx` — **the feature**: `FilesView`, `AttachMenu` (popover), `AttachPalette`, `FileGlyph`, `seedFiles`, and `fx` formatting helpers (`fmtSize`, `relTime`, `kindOf`, `tagOf`, `splitName`).
- `files.css` — all file-handling styles + keyframes.
- `app.jsx` — app shell wiring: state, sidebar nav, composer (attach + pills), view switching, undo toast, the attach-flow Tweak.
- `icons.jsx` — icon set (includes the new file icons).
- `theme.css` — design token system (colors, type, radii, density, themes).
- `widgets.css` — button variants (`.w-btn`, `.w-btn-default`, `.w-btn-destructive`) used by the toolbar and confirm.
- `tweaks-panel.jsx` — the Tweaks panel host (for the attach-flow toggle); not part of the shipped feature.
- `HexaUI Spec.md` — the broader HexaUI design system context.

> The bundle is self-contained for reference. Implement against your own component library and theme; use these files as the precise spec.
