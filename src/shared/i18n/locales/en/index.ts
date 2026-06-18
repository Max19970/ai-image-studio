import type { Dictionary } from '../../types';
import app from './app.json';
import nav from './nav.json';
import status from './status.json';
import composer from './composer.json';
import batch from './batch.json';
import gallery from './gallery.json';
import info from './info.json';
import settings from './settings.json';
import params from './params.json';
import attachment from './attachment.json';
import detail from './detail.json';
import requestPreview from './requestPreview.json';

export const enDictionary = Object.freeze({
  ...app,
  ...nav,
  ...status,
  ...composer,
  ...batch,
  ...gallery,
  ...info,
  ...settings,
  ...params,
  ...attachment,
  ...detail,
  ...requestPreview,
}) satisfies Dictionary;
