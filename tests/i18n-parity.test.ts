import test from 'node:test';
import assert from 'node:assert/strict';
import { dictionaries, getMissingTranslationKeys, interpolate, locales, normalizeLocale, translate } from '../src/shared/i18n';

test('i18n dictionaries keep ru/en key parity', () => {
  assert.deepEqual(getMissingTranslationKeys('en', 'ru'), []);
  assert.deepEqual(getMissingTranslationKeys('ru', 'en'), []);
  assert.ok(Object.keys(dictionaries.en).length > 100);
  assert.equal(locales.map((locale) => locale.value).join(','), 'ru,en');
});

test('i18n normalize, fallback and interpolation are deterministic', () => {
  assert.equal(normalizeLocale('en'), 'en');
  assert.equal(normalizeLocale('de'), 'ru');
  assert.equal(interpolate('Hello {name}', { name: 'Max' }), 'Hello Max');
  assert.equal(translate('ru', '__missing_key__'), '__missing_key__');
});
