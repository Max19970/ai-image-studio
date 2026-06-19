#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

function requireIncludes(file, snippets) {
  const text = read(file);
  for (const snippet of snippets) {
    if (!text.includes(snippet)) failures.push(`${file} is missing ${snippet}`);
  }
}

function requireRegex(file, regex, label) {
  const text = read(file);
  if (!regex.test(text)) failures.push(`${file} is missing ${label}`);
}

requireIncludes('src/shared/ui/FloatingPopover/FloatingPopover.tsx', [
  'FloatingPopoverDismissReason',
  "'escape'",
  "'outside-pointer'",
  'initialFocusRef',
  'returnFocusOnEscape',
  'focusWithoutScroll',
  'ariaLabelledBy',
  'ariaDescribedBy',
  "role={role}",
  "dismiss('escape')",
  "dismiss('outside-pointer')"
]);

requireIncludes('src/shared/ui/PopoverSelect/PopoverSelect.tsx', [
  'handleTriggerKeyDown',
  'handleListboxKeyDown',
  'closeAndFocusTrigger',
  'aria-controls={open ? listboxId : undefined}',
  'aria-activedescendant={activeOptionId}',
  'role="listbox"',
  'role="option"',
  "event.key === 'ArrowDown'",
  "event.key === 'ArrowUp'",
  "event.key === 'Home'",
  "event.key === 'End'",
  "event.key === 'Escape'"
]);

requireIncludes('src/features/settings/components/SettingsControls.tsx', [
  'role="tooltip"',
  'aria-controls={active ? popoverId : undefined}',
  'aria-describedby={active ? popoverId : undefined}'
]);

requireIncludes('src/shared/ui/IconButton/IconButton.tsx', [
  "Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'>",
  "'aria-label': string"
]);

requireIncludes('src/interface/primitives/WorkspaceTabButton.tsx', [
  "aria-current={active ? 'page' : undefined}"
]);

requireRegex('src/shared/ui/PopoverSelect/PopoverSelect.module.css', /@media \(pointer: coarse\)[\s\S]*\.trigger[\s\S]*min-height:\s*44px[\s\S]*\.option[\s\S]*min-height:\s*44px/, 'coarse-pointer 44px select touch targets');
requireRegex('src/shared/ui/IconButton/IconButton.module.css', /@media \(pointer: coarse\)[\s\S]*\.button,[\s\S]*\.micro[\s\S]*min-height:\s*44px/, 'coarse-pointer 44px icon button touch targets');
requireRegex('src/features/composer/elements/control-menu/ComposerControlMenu.module.css', /@media \(pointer: coarse\)[\s\S]*\.trigger,[\s\S]*\.action,[\s\S]*\.modeButton[\s\S]*min-height:\s*44px/, 'coarse-pointer 44px composer controls touch targets');
requireRegex('src/features/settings/components/SettingsPopoverSelect.module.css', /@media \(max-width: 520px\)[\s\S]*\.trigger[\s\S]*min-height:\s*44px/, 'mobile settings select touch targets');

if (failures.length) {
  console.error('UI accessibility check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('UI accessibility summary:');
console.log('  FloatingPopover has dismiss reasons, Escape focus return, role/aria hooks, and outside click dismissal.');
console.log('  PopoverSelect has trigger/listbox keyboard navigation and active descendant wiring.');
console.log('  Field info popovers expose tooltip semantics.');
console.log('  Icon-only shared buttons require accessible labels.');
console.log('  Coarse-pointer touch targets are guarded for shared/composer/settings controls.');
console.log('UI accessibility check passed.');
