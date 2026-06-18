# Motion Performance Audit

Stage: **13 — Motion and performance pass**

Date: 2026-06-18

## Scope

This pass focused on animation cost and perceived UI smoothness in the areas that previously felt heavy:

- sidebar collapse/expand
- mobile sidebar drawer
- workspace tab switches, especially Info and Settings
- batch composer open state
- gallery card/carousel transitions
- detail page request drawer and result image motion
- ambient theme background animations

## Findings

### Sidebar collapse/expand

The desktop sidebar rail transitioned `width` and `padding`. That forced layout work during collapse/expand and could make the whole workspace feel sluggish.

Fix:

- Removed `width`/`padding` transitions from the sidebar rail.
- Kept only paint/compositor-friendly visual transitions.
- Added opacity/transform transitions to sidebar text groups instead of layout-property animation.
- Added containment to isolate sidebar layout/paint.

### Mobile drawer/backdrop

The mobile backdrop transitioned `backdrop-filter`. Full-screen blur animation is expensive on mobile GPUs and can make drawer open/close feel sticky.

Fix:

- Removed animated `backdrop-filter` from the mobile drawer backdrop.
- Kept dark overlay opacity/background transition.
- Kept drawer movement on `transform`.
- Added containment to the drawer.

### Ambient theme backgrounds

Theme background pseudo-elements used infinite animations. They are mostly decorative, so they should not compete with large UI transitions.

Fix:

- Added centralized ambient animation state via `--ambient-animation-play-state`.
- Paused ambient animations while workspace transitions are active.
- Disabled ambient pseudo-element animations on mobile and under `prefers-reduced-motion`.

### Detail drawer and image motion

The detail request drawer animated `grid-template-rows` and `margin`, which are layout-heavy. Some image transitions also animated `filter`.

Fix:

- Request drawer now avoids layout-heavy transitions.
- Result/detail/attachment image motion no longer transitions `filter`.
- Kept transform/opacity animation for the visual motion that matters.

### Gallery scale

Gallery cards can become numerous. Even if each card is light, a large archive should avoid unnecessary layout/paint work for offscreen cards.

Fix:

- Added `contain: layout paint` and `content-visibility: auto` to gallery cards.
- Added an intrinsic size fallback for skipped offscreen card rendering.

## Guardrails added

New script:

```bash
npm run motion:check
```

It verifies:

- `motion.css` is imported.
- centralized motion tokens exist.
- `prefers-reduced-motion` fallback exists.
- ambient animation pause token exists.
- CSS transition declarations do not animate layout/filter-heavy properties such as `width`, `padding`, `margin`, `grid-template-*`, `backdrop-filter`, or `filter`.

`motion:check` is now part of:

```bash
npm run verify:static
```

## Validation

Static validation:

```bash
npm run verify:static
npm run debt:check:strict
```

Focused visual validation:

```bash
npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=gallery,sidebar-collapsed,settings-api,detail,batch-composer,info --out=artifacts/stage13-motion-visual
node scripts/check-screenshot-artifacts.mjs --dir=artifacts/stage13-motion-visual --viewports=desktop,mobile --scenarios=gallery,sidebar-collapsed,settings-api,detail,batch-composer,info
```

Note: the full combined screenshot capture had one Puppeteer frame-detach failure in the container after partial capture, so the missing scenarios were captured in smaller focused runs. The final artifact check passed for all targeted screenshots.

## Manual verification still recommended

Automated checks can prove the code avoids known expensive CSS transitions and that the major screens still render. They cannot fully replace a real browser performance recording.

Recommended manual checks:

- Record sidebar collapse/expand in Chrome Performance panel.
- Switch Images → Info → Settings several times.
- Open/close batch composer.
- Scroll a large gallery.
- Test on a lower-end mobile device/emulation profile.
