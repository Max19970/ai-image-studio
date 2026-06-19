# UI Structural Redesign — Stage 6.1 Preflight

## Scope
Small mobile correction after Stage 6. This is not a new page redesign stage.

## Problems
1. Mobile interface theme choices are horizontally compressed inside the theme strip.
2. Mobile bottom navigation always behaves like a scroll row even when there are only a few tabs. With three tabs it should center and distribute available width; only larger tab sets should become horizontally scrollable.

## Planned changes

### 1. Mobile theme strip
Files:
- `src/features/settings/mobileSettingsPrimitives.css`
- `src/features/settings/sections/interface/InterfaceSettingsSection.module.css`

Changes:
- Keep the theme options as a horizontal strip on mobile.
- Make each theme option a fixed readable card width instead of allowing flex shrink.
- Hide the strip scrollbar.
- Use scroll snap for comfortable swiping.

Expected code direction:
```css
.mobile-theme-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

:global(.mobile-theme-strip) .themeChoice {
  flex: 0 0 min(288px, calc(100vw - 76px));
  min-width: min(288px, calc(100vw - 76px));
  scroll-snap-align: start;
}
```

### 2. Adaptive mobile bottom nav
File:
- `src/features/workspace/StudioSidebar.module.css`

Changes:
- For small tab counts, center and distribute items inside the bottom nav.
- For 5+ items, switch to scrollable behavior using CSS `:has(> :nth-child(5))`.
- Keep the minimum tab width near the smallest acceptable readable/touchable width.

Expected code direction:
```css
.mobileBottomTabs {
  justify-content: center;
  overflow-x: auto;
}

.mobileBottomTabs > * {
  flex: 1 1 0;
  min-width: clamp(78px, 23vw, 96px);
  max-width: 116px;
}

.mobileBottomTabs:has(> :nth-child(5)) {
  justify-content: flex-start;
}

.mobileBottomTabs:has(> :nth-child(5)) > * {
  flex: 0 0 clamp(82px, 26vw, 116px);
  max-width: none;
}
```

## Refactoring / debt analysis
- No JSX changes required.
- No new navigation state required.
- No duplication of mobile navigation logic.
- No global CSS hack: theme strip sizing remains owned by settings/interface CSS; bottom nav behavior remains owned by `StudioSidebar` CSS.
- `:has()` is acceptable here because the screenshot/runtime target is modern Chromium and the behavior gracefully falls back to a centered row if unsupported.

## Validation plan
- `npm run build`
- `npm run verify:static`
- Visual screenshots:
  - mobile gallery nav
  - mobile settings API nav
  - mobile settings interface theme strip
