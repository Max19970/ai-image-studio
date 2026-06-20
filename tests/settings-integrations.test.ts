import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('settings placements expose integrations tab and desktop/mobile sections', () => {
  const tabsSource = readFileSync(new URL('../src/interface/placements/settings.tabs.placement.ts', import.meta.url), 'utf8');
  const sectionsSource = readFileSync(new URL('../src/interface/placements/settings.sections.placement.ts', import.meta.url), 'utf8');
  const definitionSource = readFileSync(new URL('../src/features/settings/sections/integrations/definition.ts', import.meta.url), 'utf8');

  assert.match(tabsSource, /settings\.tabs\.integrations/);
  assert.match(tabsSource, /tab:\s*'integrations'/);
  assert.match(sectionsSource, /settings\.sections\.integrations\.desktop/);
  assert.match(sectionsSource, /settings\.sections\.integrations\.mobile/);
  assert.match(definitionSource, /id:\s*'settingsSections\.integrations'/);
});

test('Telegram UI state stays outside the central settings page context', () => {
  const settingsPageSource = readFileSync(new URL('../src/features/settings/SettingsPage.tsx', import.meta.url), 'utf8');
  const settingsTypesSource = readFileSync(new URL('../src/features/settings/settingsTypes.ts', import.meta.url), 'utf8');
  const combined = `${settingsPageSource}\n${settingsTypesSource}`;

  assert.match(settingsTypesSource, /'integrations'/);
  assert.doesNotMatch(combined, /botToken|miniAppUrl|TelegramIntegrationPanel|useIntegrationSettingsDraft/);
  assert.doesNotMatch(settingsPageSource, /integrations\/api|loadIntegrationConfig|saveIntegrationConfig|runIntegrationAction/);
});


test('Telegram panel owns UX diagnostics without leaking into generation flows', () => {
  const panelSource = readFileSync(new URL('../src/features/settings/sections/integrations/TelegramIntegrationPanel.tsx', import.meta.url), 'utf8');
  const validationSource = readFileSync(new URL('../src/features/settings/sections/integrations/telegramPanelValidation.ts', import.meta.url), 'utf8');
  const registrySource = readFileSync(new URL('../src/domain/integrations.ts', import.meta.url), 'utf8');

  assert.match(panelSource, /validateTelegramMiniAppSession/);
  assert.match(panelSource, /send-test-message/);
  assert.match(panelSource, /getTelegramActionDisabledReason/);
  assert.match(validationSource, /saveChangesFirst/);
  assert.match(validationSource, /isValidHttpsUrl/);
  assert.match(registrySource, /send-test-message/);
  assert.doesNotMatch(panelSource, /generation|provider|gallery|batch/i);
});
