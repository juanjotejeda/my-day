# My Day: screen designs

These 24 files are the approved designs for every screen of My Day. They are the source of truth for layout, colours, type sizes, spacing, copy and interactions. Build each screen to match its file exactly. Where the written spec and a design disagree on how a screen looks, the design wins. Where they disagree on data, behaviour or security, the spec wins.

## How to read the files

Each `*.dc.html` file is one phone screen (390 px wide) from a design canvas. The format is a template, not runnable app code:

- Markup inside `<x-dc>` is the screen. Inline `style="…"` values are exact: copy colours, sizes, radii and weights as written.
- `{{name}}` is a value filled from `renderVals()` in the `<script type="text/x-dc">` block at the bottom.
- `<sc-if value="…">` shows its content conditionally. `<sc-for list="…" as="x">` repeats it per item.
- `onClick="{{fn}}"` points to a handler returned by `renderVals()`. Read the script to see what each interaction does (toasts, sheets, toggles).
- `<a href="other-screen.dc.html">` is navigation to that screen.
- Arrays like `BASE` in the script hold sample content. Use the same shape for sample data where real data is not connected yet.

Do not ship these files or their runtime. Re-implement each screen as React components in the app, sharing components (cards, rows, pills, bottom nav, sheets) across screens.

## Design rules (apply everywhere)

- One font: Roboto, weights 300 and 400 only. Hierarchy by size, never bold.
- White background. Text navy #243A63, secondary #56647D.
- Palette anchored on #D5E1F5. Tints #F4F7FC, #EAF0FA, #E3EBF8. Accents #8AA9DE, #A3BDE8, #4A6FAE.
- Energy levels: low #EAF0FA, steady #D5E1F5, peak #A3BDE8.
- Large radii (22 px cards, pills 999 px), thin 1 px lines instead of filled blocks.
- Touch targets at least 44 px. Screens are full length and scroll.
- Bottom nav on daily screens: Today, Review, Insights, Settings.

## Screens

Today (home)
- `m2-minimal-calm-now.dc.html`: Today. Contains both views, Now and Priority, switched by the toggle; also the add bar (text and voice composer), the day strip with energy track, the adjust sheet, Plan tomorrow and Close the day links.

Onboarding
- `app-o1-welcome.dc.html`: O1 Welcome
- `app-o2-connect.dc.html`: O2 Connect Google
- `app-o3-rhythm.dc.html`: O3 Your rhythm
- `app-o4-energy.dc.html`: O4 Your energy
- `app-o5-priorities.dc.html`: O5 What matters
- `app-o6-focus.dc.html`: O6 Focus and breaks
- `app-o7-ready.dc.html`: O7 First day ready

Daily use
- `app-d1-review.dc.html`: D1 Review, found in email
- `app-d2-detail.dc.html`: D2 Item detail
- `app-d3-tomorrow.dc.html`: D3 Tomorrow
- `app-d4-endofday.dc.html`: D4 End of day review
- `app-d5-insights.dc.html`: D5 Weekly insights

States
- `app-x1-empty.dc.html`: X1 Empty day
- `app-x2-offline.dc.html`: X2 Connection lost

Settings and profile
- `app-s0-settings.dc.html`: S0 Settings
- `app-s1-rhythm.dc.html`: S1 Rhythm and energy
- `app-s2-work.dc.html`: S2 Work and focus
- `app-s3-priorities.dc.html`: S3 Priorities and protected time
- `app-s4-notifications.dc.html`: S4 Notifications
- `app-s5-sources.dc.html`: S5 Sources
- `app-s6-rules.dc.html`: S6 Learned rules
- `app-s7-privacy.dc.html`: S7 Privacy and data
- `app-s8-profile.dc.html`: S8 Profile

## Night mode

Every screen has a night version: the same file name with `-night` added (Today's is `m2-minimal-calm-night.dc.html`). Night is a second colour theme, not a separate layout: build it with the same components and a second set of colour tokens.

- Night palette: background #0F1A2E, surfaces #16233B and #1C2B47, lines #22324F and #2A3D60, text #E3EBF8, secondary #9AA8C2, accents #8AA9DE, #A3BDE8 and #7F9FD8. Energy levels: low #22324F, steady #3A5583, peak #7F9FD8.
- Primary buttons flip to a light fill (#D5E1F5) with dark text (#0F1A2E).
- The user chooses. Two places switch it: the moon/sun button at the end of the date line on Today, and the Night mode switch under Settings > Appearance. Both change the same setting, which is remembered per user (store it in settings, not only in the browser). No automatic switching.
